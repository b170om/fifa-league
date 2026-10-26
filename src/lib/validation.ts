import type { Rotation } from './types'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function cleanName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('חסר שם')
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 1 || name.length > 40) throw new Error('השם צריך להיות בין תו אחד ל-40')
  return name
}

export function cleanTitle(value: unknown): string {
  if (typeof value !== 'string') throw new Error('חסרה כותרת')
  const title = value.trim().replace(/\s+/g, ' ')
  if (title.length < 1 || title.length > 60) throw new Error('הכותרת צריכה להיות עד 60 תווים')
  return title
}

export function cleanStake(value: unknown): number {
  const stake = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  if (!Number.isInteger(stake) || stake < 1 || stake > 10000) {
    throw new Error('ההימור צריך להיות מספר שלם בין 1 ל-10,000')
  }
  return stake
}

export function cleanScore(value: unknown, label: string): number {
  const score = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  if (!Number.isInteger(score) || score < 0 || score > 30) {
    throw new Error(`${label} צריך להיות מספר שלם בין 0 ל-30`)
  }
  return score
}

export function assertNoDraw(scoreA: number, scoreB: number) {
  if (scoreA === scoreB) throw new Error('אין תיקו. ממשיכים לשער זהב')
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('הבקשה לא תקינה')
  return value as Record<string, unknown>
}

function idList(value: unknown, expected: number, label: string): string[] {
  if (!Array.isArray(value) || value.length !== expected) throw new Error(label)
  if (!value.every(isUuid)) throw new Error(label)
  return value
}

export interface MatchInput {
  sessionId: string | null
  teamA: [string, string]
  teamB: [string, string]
  scoreA: number
  scoreB: number
  stake: number | null
  playedAt: string | null
}

export function parseMatchInput(value: unknown): MatchInput {
  const body = asRecord(value)
  const teamA = idList(body.teamA, 2, 'בכל קבוצה צריך שני שחקנים') as [string, string]
  const teamB = idList(body.teamB, 2, 'בכל קבוצה צריך שני שחקנים') as [string, string]
  const all = [...teamA, ...teamB]
  if (new Set(all).size !== all.length) throw new Error('אי אפשר לשים את אותו שחקן פעמיים')
  const scoreA = cleanScore(body.scoreA, 'התוצאה')
  const scoreB = cleanScore(body.scoreB, 'התוצאה')
  assertNoDraw(scoreA, scoreB)
  let stake: number | null = null
  if (body.stake != null && body.stake !== '') stake = cleanStake(body.stake)
  let sessionId: string | null = null
  if (body.sessionId != null && body.sessionId !== '') {
    if (!isUuid(body.sessionId)) throw new Error('ערב לא תקין')
    sessionId = body.sessionId
  }
  let playedAt: string | null = null
  if (body.playedAt != null && body.playedAt !== '') {
    if (typeof body.playedAt !== 'string' || Number.isNaN(new Date(body.playedAt).getTime())) {
      throw new Error('תאריך לא תקין')
    }
    playedAt = new Date(body.playedAt).toISOString()
  }
  return { sessionId, teamA, teamB, scoreA, scoreB, stake, playedAt }
}

export interface SessionInput {
  title: string
  playerIds: string[]
  stake: number
  rotation: Rotation
  saveDefaultStake: boolean
}

export function parseSessionInput(value: unknown, fallbackTitle: string): SessionInput {
  const body = asRecord(value)
  const playerIdsRaw = body.playerIds
  if (!Array.isArray(playerIdsRaw) || playerIdsRaw.length < 4 || playerIdsRaw.length > 6 || !playerIdsRaw.every(isUuid)) {
    throw new Error('בוחרים 4, 5 או 6 שחקנים')
  }
  if (new Set(playerIdsRaw).size !== playerIdsRaw.length) throw new Error('אי אפשר לבחור את אותו שחקן פעמיים')
  const rotation = body.rotation
  if (rotation !== 'winner_stays' && rotation !== 'fair' && rotation !== 'pairs') {
    throw new Error('שיטת רוטציה לא מוכרת')
  }
  if (rotation === 'pairs' && playerIdsRaw.length === 5) {
    throw new Error('זוגות קבועים עובדים עם 4 או 6 שחקנים')
  }
  const title = body.title == null || body.title === '' ? fallbackTitle : cleanTitle(body.title)
  return {
    title,
    playerIds: playerIdsRaw,
    stake: cleanStake(body.stake),
    rotation,
    saveDefaultStake: body.saveDefaultStake === true,
  }
}

export interface SettingsInput {
  defaultStake: number
}

export function parsePlayerPatch(value: unknown): { name?: string; archived?: boolean } {
  const body = asRecord(value)
  const patch: { name?: string; archived?: boolean } = {}
  if (body.name != null && body.name !== '') patch.name = cleanName(body.name)
  if (body.archived != null) {
    if (typeof body.archived !== 'boolean') throw new Error('בקשה לא תקינה')
    patch.archived = body.archived
  }
  if (patch.name == null && patch.archived == null) throw new Error('אין מה לעדכן')
  return patch
}

export function parseSessionPatch(value: unknown): { title?: string; stake?: number } {
  const body = asRecord(value)
  const patch: { title?: string; stake?: number } = {}
  if (body.title != null && body.title !== '') patch.title = cleanTitle(body.title)
  if (body.stake != null && body.stake !== '') patch.stake = cleanStake(body.stake)
  if (!patch.title && patch.stake == null) throw new Error('אין מה לעדכן')
  return patch
}

export function parseSettingsInput(value: unknown): SettingsInput {
  const body = asRecord(value)
  return { defaultStake: cleanStake(body.defaultStake) }
}
