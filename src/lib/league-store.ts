import type { SupabaseClient } from '@supabase/supabase-js'
import { DbError, mapDbError } from './errors'
import { formatDay } from './format'
import { lockPairs } from './rotation'
import { getReadClient, getWriteClient } from './supabase'
import type { AuditEntry, LeagueData, Match, MatchPlayer, Player, RecapSource, Session, Settings } from './types'
import type { MatchInput, SessionInput } from './validation'

type Row = Record<string, unknown>

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

async function rows(query: PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>): Promise<Row[]> {
  const { data, error } = await query
  if (error) throw mapDbError(error)
  return Array.isArray(data) ? (data as Row[]) : []
}

async function one(query: PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>): Promise<Row> {
  const { data, error } = await query
  if (error) throw mapDbError(error)
  if (!data || typeof data !== 'object') throw new DbError('הרשומה לא נמצאה', 404)
  return data as Row
}

function parsePairs(value: unknown): [string, string][] | null {
  if (!Array.isArray(value)) return null
  const pairs: [string, string][] = []
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') return null
    pairs.push([pair[0], pair[1]])
  }
  return pairs
}

function mapPlayer(row: Row): Player {
  return {
    id: str(row.id),
    name: str(row.name),
    elo: num(row.elo, 1500),
    archivedAt: nullableString(row.archived_at),
    createdAt: str(row.created_at),
  }
}

function mapSession(row: Row, playerIds: string[]): Session {
  const rotation = row.rotation
  return {
    id: str(row.id),
    title: str(row.title),
    startedAt: str(row.started_at),
    endedAt: nullableString(row.ended_at),
    stake: num(row.stake, 25),
    rotation: rotation === 'fair' || rotation === 'pairs' ? rotation : 'winner_stays',
    status: row.status === 'closed' ? 'closed' : 'live',
    lockedPairs: parsePairs(row.locked_pairs),
    playerIds,
    aiRecap: nullableString(row.ai_recap),
    aiRecapSource: row.ai_recap_source === 'model' || row.ai_recap_source === 'fallback' ? row.ai_recap_source : null,
    aiModel: nullableString(row.ai_model),
    deletedAt: nullableString(row.deleted_at),
  }
}

export async function loadLeague(): Promise<LeagueData> {
  const db = getReadClient()
  const [playerRows, matchRows, partRows, sessionRows, memberRows, settingsRow, auditRows] = await Promise.all([
    rows(db.from('players').select('*').order('created_at', { ascending: true })),
    rows(db.from('matches').select('*').order('played_at', { ascending: false })),
    rows(db.from('match_players').select('*')),
    rows(db.from('sessions').select('*').order('started_at', { ascending: false })),
    rows(db.from('session_players').select('*')),
    db.from('league_settings').select('*').eq('id', 1).maybeSingle(),
    rows(db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(80)),
  ])
  if (settingsRow.error) throw mapDbError(settingsRow.error)

  const parts = new Map<string, MatchPlayer[]>()
  for (const row of partRows) {
    const matchId = str(row.match_id)
    const list = parts.get(matchId) ?? []
    const side = row.side === 'b' ? 'b' : 'a'
    list.push({
      playerId: str(row.player_id),
      side,
      eloBefore: num(row.elo_before),
      eloAfter: num(row.elo_after),
      pnl: num(row.pnl),
    })
    parts.set(matchId, list)
  }

  const members = new Map<string, string[]>()
  for (const row of memberRows) {
    const sessionId = str(row.session_id)
    const list = members.get(sessionId) ?? []
    list.push(str(row.player_id))
    members.set(sessionId, list)
  }

  const settingsData = settingsRow.data as Row | null
  const settings: Settings = {
    defaultStake: num(settingsData?.default_stake, 25),
    eloK: num(settingsData?.elo_k, 32),
    eloStart: num(settingsData?.elo_start, 1500),
    currency: str(settingsData?.currency) || 'ILS',
  }

  const matches: Match[] = matchRows.map((row) => ({
    id: str(row.id),
    playedAt: str(row.played_at),
    createdAt: str(row.created_at) || str(row.played_at),
    mode: row.mode === '1v1' ? '1v1' : '2v2',
    sessionId: nullableString(row.session_id),
    teamA: Array.isArray(row.team_a_player_ids) ? row.team_a_player_ids.map(String) : [],
    teamB: Array.isArray(row.team_b_player_ids) ? row.team_b_player_ids.map(String) : [],
    scoreA: num(row.score_a),
    scoreB: num(row.score_b),
    stake: num(row.stake, settings.defaultStake),
    predA: row.pred_a == null ? null : num(row.pred_a),
    modelVersion: nullableString(row.model_version),
    deletedAt: nullableString(row.deleted_at),
    players: parts.get(str(row.id)) ?? [],
  }))

  return {
    players: playerRows.map(mapPlayer),
    matches,
    sessions: sessionRows.map((row) => mapSession(row, members.get(str(row.id)) ?? [])),
    settings,
    audit: auditRows.map(mapAudit),
  }
}

function mapAudit(row: Row): AuditEntry {
  return {
    id: str(row.id),
    entity: str(row.entity),
    entityId: nullableString(row.entity_id),
    action: str(row.action),
    summary: str(row.summary),
    createdAt: str(row.created_at),
  }
}

async function audit(db: SupabaseClient, entry: { entity: string; entityId?: string | null; action: string; summary: string; before?: unknown; after?: unknown }) {
  const { error } = await db.from('audit_log').insert({
    entity: entry.entity,
    entity_id: entry.entityId ?? null,
    action: entry.action,
    summary: entry.summary,
    before: entry.before ?? null,
    after: entry.after ?? null,
  })
  if (error) console.error('audit_log insert failed', error.code ?? '')
}

async function replay(db: SupabaseClient) {
  const { error } = await db.rpc('recompute_league')
  if (error) throw mapDbError(error)
}

async function activePlayers(db: SupabaseClient, ids: string[]): Promise<Player[]> {
  const found = await rows(db.from('players').select('*').in('id', ids))
  if (found.length !== ids.length) throw new DbError('אחד השחקנים לא נמצא', 400)
  const players = found.map(mapPlayer)
  if (players.some((p) => p.archivedAt)) throw new DbError('שחקן בארכיון לא נכנס למשחק', 400)
  return players
}

export async function createPlayer(name: string): Promise<LeagueData> {
  const db = getWriteClient()
  const { error } = await db.from('players').insert({ name }).select('id').single()
  if (error) throw mapDbError(error)
  await audit(db, { entity: 'player', action: 'create', summary: `נרשם שחקן: ${name}`, after: { name } })
  return loadLeague()
}

export async function updatePlayer(id: string, patch: { name?: string; archived?: boolean }): Promise<LeagueData> {
  const db = getWriteClient()
  const current = mapPlayer(await one(db.from('players').select('*').eq('id', id).maybeSingle()))
  const next: { name?: string; archived_at?: string | null } = {}
  if (patch.name && patch.name !== current.name) next.name = patch.name
  if (patch.archived === true && !current.archivedAt) next.archived_at = new Date().toISOString()
  if (patch.archived === false && current.archivedAt) next.archived_at = null
  if (Object.keys(next).length === 0) return loadLeague()
  const { error } = await db.from('players').update(next).eq('id', id)
  if (error) throw mapDbError(error)
  const action = patch.archived === true ? 'archive' : patch.archived === false ? 'restore' : 'update'
  const summary = patch.archived === true
    ? `${current.name} עבר לארכיון`
    : patch.archived === false
      ? `${patch.name ?? current.name} חזר מהארכיון`
      : `השם שונה מ-${current.name} ל-${patch.name}`
  await audit(db, { entity: 'player', entityId: id, action, summary, before: { name: current.name }, after: next })
  return loadLeague()
}

export async function removePlayer(id: string): Promise<LeagueData> {
  const db = getWriteClient()
  const current = mapPlayer(await one(db.from('players').select('*').eq('id', id).maybeSingle()))
  const [inMatches, inSessions] = await Promise.all([
    rows(db.from('match_players').select('id').eq('player_id', id).limit(1)),
    rows(db.from('session_players').select('player_id').eq('player_id', id).limit(1)),
  ])
  if (inMatches.length > 0 || inSessions.length > 0) {
    return updatePlayer(id, { archived: true })
  }
  const { error } = await db.from('players').delete().eq('id', id)
  if (error) throw mapDbError(error)
  await audit(db, { entity: 'player', entityId: id, action: 'delete', summary: `${current.name} נמחק`, before: { name: current.name } })
  return loadLeague()
}

export async function createSession(input: SessionInput): Promise<LeagueData> {
  const db = getWriteClient()
  const open = await rows(db.from('sessions').select('id').eq('status', 'live').is('deleted_at', null).limit(1))
  if (open.length > 0) throw new DbError('יש כבר ערב פתוח. סוגרים אותו לפני שפותחים חדש.', 409)
  const roster = await activePlayers(db, input.playerIds)
  const locked = input.rotation === 'pairs' ? lockPairs(roster.map((p) => ({ id: p.id, elo: p.elo }))) : null
  const created = await one(
    db.from('sessions').insert({
      title: input.title,
      stake: input.stake,
      rotation: input.rotation,
      locked_pairs: locked,
      status: 'live',
    }).select('*').single(),
  )
  const { error: memberError } = await db.from('session_players').insert(
    input.playerIds.map((playerId) => ({ session_id: created.id, player_id: playerId })),
  )
  if (memberError) throw mapDbError(memberError)
  if (input.saveDefaultStake) {
    const { error } = await db.from('league_settings').update({
      default_stake: input.stake,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
    if (error) throw mapDbError(error)
  }
  await audit(db, {
    entity: 'session',
    entityId: str(created.id),
    action: 'create',
    summary: `נפתח ${input.title} · ₪${input.stake} · ${roster.map((p) => p.name).join(', ')}`,
    after: { title: input.title, stake: input.stake, rotation: input.rotation },
  })
  return loadLeague()
}

export async function updateSession(id: string, patch: { title?: string; stake?: number }): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('sessions').select('*').eq('id', id).maybeSingle())
  if (current.deleted_at) throw new DbError('הערב בארכיון', 400)
  const next: { title?: string; stake?: number } = {}
  if (patch.title) next.title = patch.title
  if (patch.stake) next.stake = patch.stake
  if (Object.keys(next).length === 0) return loadLeague()
  const { error } = await db.from('sessions').update(next).eq('id', id)
  if (error) throw mapDbError(error)
  await audit(db, {
    entity: 'session',
    entityId: id,
    action: 'update',
    summary: `עודכן ${patch.title ?? str(current.title)}${patch.stake ? ` · הימור ₪${patch.stake} למשחקים הבאים` : ''}`,
    before: { title: current.title, stake: current.stake },
    after: next,
  })
  return loadLeague()
}

async function sessionRoster(db: SupabaseClient, sessionId: string): Promise<{ session: Row; playerIds: string[] }> {
  const session = await one(db.from('sessions').select('*').eq('id', sessionId).maybeSingle())
  const members = await rows(db.from('session_players').select('player_id').eq('session_id', sessionId))
  return { session, playerIds: members.map((row) => str(row.player_id)) }
}

export async function createMatch(input: MatchInput): Promise<LeagueData> {
  const db = getWriteClient()
  if (!input.sessionId) throw new DbError('כל משחק שייך לערב', 400)
  const { session, playerIds } = await sessionRoster(db, input.sessionId)
  if (session.deleted_at) throw new DbError('הערב בארכיון', 400)
  if (session.status === 'closed') throw new DbError('הערב סגור. פותחים ערב חדש.', 400)
  const ids = [...input.teamA, ...input.teamB]
  if (ids.some((id) => !playerIds.includes(id))) throw new DbError('השחקן לא נמצא בערב הזה', 400)
  await activePlayers(db, ids)
  const stake = input.stake ?? num(session.stake, 25)
  const inserted = await one(
    db.from('matches').insert({
      mode: '2v2',
      session_id: input.sessionId,
      team_a_player_ids: input.teamA,
      team_b_player_ids: input.teamB,
      score_a: input.scoreA,
      score_b: input.scoreB,
      stake,
      played_at: input.playedAt ?? new Date().toISOString(),
    }).select('id').single(),
  )
  await replay(db)
  await audit(db, {
    entity: 'match',
    entityId: str(inserted.id),
    action: 'create',
    summary: `תוצאה נשמרה: ${input.scoreA}–${input.scoreB} על ₪${stake}`,
    after: { scoreA: input.scoreA, scoreB: input.scoreB, stake, teamA: input.teamA, teamB: input.teamB },
  })
  return loadLeague()
}

export async function updateMatch(id: string, input: MatchInput): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('matches').select('*').eq('id', id).maybeSingle())
  if (current.deleted_at) throw new DbError('המשחק בארכיון. קודם משחזרים אותו.', 400)
  const sessionId = nullableString(current.session_id)
  if (sessionId) {
    const { session, playerIds } = await sessionRoster(db, sessionId)
    if (session.deleted_at) throw new DbError('הערב של המשחק בארכיון', 400)
    const ids = [...input.teamA, ...input.teamB]
    if (ids.some((playerId) => !playerIds.includes(playerId))) throw new DbError('השחקן לא נמצא בערב הזה', 400)
  }
  await activePlayers(db, [...input.teamA, ...input.teamB])
  const stake = input.stake ?? num(current.stake, 25)
  const { error } = await db.from('matches').update({
    team_a_player_ids: input.teamA,
    team_b_player_ids: input.teamB,
    score_a: input.scoreA,
    score_b: input.scoreB,
    stake,
    played_at: input.playedAt ?? current.played_at,
  }).eq('id', id)
  if (error) throw mapDbError(error)
  await replay(db)
  await audit(db, {
    entity: 'match',
    entityId: id,
    action: 'update',
    summary: `תוצאה עודכנה ל-${input.scoreA}–${input.scoreB} (היה ${num(current.score_a)}–${num(current.score_b)})`,
    before: { scoreA: current.score_a, scoreB: current.score_b, stake: current.stake },
    after: { scoreA: input.scoreA, scoreB: input.scoreB, stake },
  })
  return loadLeague()
}

export async function softDeleteMatch(id: string): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('matches').select('*').eq('id', id).maybeSingle())
  if (current.deleted_at) return loadLeague()
  const { error } = await db.from('matches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw mapDbError(error)
  await replay(db)
  await audit(db, {
    entity: 'match',
    entityId: id,
    action: 'delete',
    summary: `משחק הועבר לארכיון: ${num(current.score_a)}–${num(current.score_b)}`,
    before: { scoreA: current.score_a, scoreB: current.score_b },
  })
  return loadLeague()
}

export async function restoreMatch(id: string): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('matches').select('*').eq('id', id).maybeSingle())
  if (!current.deleted_at) return loadLeague()
  const { error } = await db.from('matches').update({ deleted_at: null }).eq('id', id)
  if (error) throw mapDbError(error)
  await replay(db)
  await audit(db, {
    entity: 'match',
    entityId: id,
    action: 'restore',
    summary: `משחק שוחזר: ${num(current.score_a)}–${num(current.score_b)}`,
  })
  return loadLeague()
}

export async function saveRecap(id: string, recap: string, source: RecapSource, model: string | null, close: boolean): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('sessions').select('*').eq('id', id).maybeSingle())
  if (current.deleted_at) throw new DbError('הערב בארכיון', 400)
  const next: Record<string, unknown> = {
    ai_recap: recap,
    ai_recap_source: source,
    ai_model: model,
  }
  if (close && current.status !== 'closed') {
    next.status = 'closed'
    next.ended_at = new Date().toISOString()
  }
  const { error } = await db.from('sessions').update(next).eq('id', id)
  if (error) throw mapDbError(error)
  await audit(db, {
    entity: 'session',
    entityId: id,
    action: close ? 'close' : 'recap',
    summary: close
      ? `${str(current.title)} נסגר. הסיכום ${source === 'model' ? 'נכתב מהמודל' : 'נכתב מקומית'}.`
      : `הסיכום של ${str(current.title)} עודכן`,
    after: { source, model },
  })
  return loadLeague()
}

export async function removeSession(id: string): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('sessions').select('*').eq('id', id).maybeSingle())
  const anyMatches = await rows(db.from('matches').select('id').eq('session_id', id).limit(1))
  if (anyMatches.length === 0) {
    const { error } = await db.from('sessions').delete().eq('id', id)
    if (error) throw mapDbError(error)
    await audit(db, { entity: 'session', entityId: id, action: 'delete', summary: `${str(current.title)} בוטל לפני שהתחיל` })
    return loadLeague()
  }
  const now = new Date().toISOString()
  const { error: matchError } = await db.from('matches').update({ deleted_at: now }).eq('session_id', id).is('deleted_at', null)
  if (matchError) throw mapDbError(matchError)
  const { error } = await db.from('sessions').update({ deleted_at: now, status: 'closed' }).eq('id', id)
  if (error) throw mapDbError(error)
  await replay(db)
  await audit(db, { entity: 'session', entityId: id, action: 'delete', summary: `${str(current.title)} והמשחקים שלו עברו לארכיון` })
  return loadLeague()
}

export async function restoreSession(id: string): Promise<LeagueData> {
  const db = getWriteClient()
  const current = await one(db.from('sessions').select('*').eq('id', id).maybeSingle())
  const { error: matchError } = await db.from('matches').update({ deleted_at: null }).eq('session_id', id)
  if (matchError) throw mapDbError(matchError)
  const { error } = await db.from('sessions').update({ deleted_at: null }).eq('id', id)
  if (error) throw mapDbError(error)
  await replay(db)
  await audit(db, { entity: 'session', entityId: id, action: 'restore', summary: `${str(current.title)} שוחזר יחד עם המשחקים` })
  return loadLeague()
}

export async function updateSettings(defaultStake: number): Promise<LeagueData> {
  const db = getWriteClient()
  const { error } = await db.from('league_settings').update({
    default_stake: defaultStake,
    updated_at: new Date().toISOString(),
  }).eq('id', 1)
  if (error) throw mapDbError(error)
  await audit(db, { entity: 'settings', action: 'update', summary: `ברירת המחדל להימור עודכנה ל-₪${defaultStake}`, after: { defaultStake } })
  return loadLeague()
}

export function defaultSessionTitle(date = new Date()): string {
  return `ערב ${formatDay(date)}`
}
