import type { Match, Player } from './types'

export type Result = 'W' | 'L'

export interface PartnerSnap {
  playerId: string
  name: string
  played: number
  won: number
  lost: number
  winPct: number
  pnl: number
  goalDiff: number
}

export interface PlayerStats {
  playerId: string
  name: string
  elo: number
  played: number
  won: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  winPct: number
  pnl: number
  form: Result[]
  streak: { kind: Result | 'none'; count: number }
  bestStreak: number
  bestPartner: PartnerSnap | null
  worstPartner: PartnerSnap | null
}

export interface PairStats {
  key: string
  playerIds: [string, string]
  names: [string, string]
  played: number
  won: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  winPct: number
  pnl: number
  form: Result[]
}

export interface H2HMeeting {
  matchId: string
  playedAt: string
  mode: Match['mode']
  scoreFor: number
  scoreAgainst: number
  won: boolean
  partners: string[]
  opponents: string[]
}

export interface H2H {
  winsA: number
  winsB: number
  goalsA: number
  goalsB: number
  meetings: H2HMeeting[]
  togetherPlayed: number
  togetherWins: number
}

export function activeMatches(matches: Match[]): Match[] {
  return matches
    .filter((m) => m.deletedAt == null && m.scoreA !== m.scoreB)
    .slice()
    .sort((a, b) => {
      const time = new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
      if (time !== 0) return time
      const created = a.createdAt.localeCompare(b.createdAt)
      if (created !== 0) return created
      return a.id.localeCompare(b.id)
    })
}

export function playedIn(match: Match, playerId: string): boolean {
  return match.teamA.includes(playerId) || match.teamB.includes(playerId)
}

export function onSideA(match: Match, playerId: string): boolean {
  return match.teamA.includes(playerId)
}

export function playerWon(match: Match, playerId: string): boolean {
  const home = onSideA(match, playerId)
  return home ? match.scoreA > match.scoreB : match.scoreB > match.scoreA
}

export function playerPnl(match: Match, playerId: string): number {
  const row = match.players.find((p) => p.playerId === playerId)
  if (row) return row.pnl
  return playerWon(match, playerId) ? match.stake : -match.stake
}

function resultOf(match: Match, playerId: string): Result {
  return playerWon(match, playerId) ? 'W' : 'L'
}

function emptyPartner(id: string, name: string): PartnerSnap {
  return { playerId: id, name, played: 0, won: 0, lost: 0, winPct: 0, pnl: 0, goalDiff: 0 }
}

export function computePlayerStats(matches: Match[], players: Player[]): PlayerStats[] {
  const live = activeMatches(matches)
  const names = new Map(players.map((p) => [p.id, p.name]))
  const base = new Map<string, PlayerStats>()
  for (const player of players) {
    base.set(player.id, {
      playerId: player.id,
      name: player.name,
      elo: player.elo,
      played: 0,
      won: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      winPct: 0,
      pnl: 0,
      form: [],
      streak: { kind: 'none', count: 0 },
      bestStreak: 0,
      bestPartner: null,
      worstPartner: null,
    })
  }

  const partners = new Map<string, Map<string, PartnerSnap>>()

  for (const match of live) {
    const participants = [...match.teamA, ...match.teamB]
    for (const id of participants) {
      const stats = base.get(id)
      if (!stats) continue
      const won = playerWon(match, id)
      const forGoals = onSideA(match, id) ? match.scoreA : match.scoreB
      const against = onSideA(match, id) ? match.scoreB : match.scoreA
      stats.played += 1
      stats.goalsFor += forGoals
      stats.goalsAgainst += against
      stats.goalDiff += forGoals - against
      stats.pnl += playerPnl(match, id)
      if (won) stats.won += 1
      else stats.lost += 1
      stats.form.push(resultOf(match, id))
    }

    if (match.teamA.length === 2) addPartners(match, match.teamA, names, partners)
    if (match.teamB.length === 2) addPartners(match, match.teamB, names, partners)
  }

  const rows: PlayerStats[] = []
  for (const stats of base.values()) {
    stats.winPct = stats.played ? stats.won / stats.played : 0
    stats.form = stats.form.slice(-5).reverse()
    stats.streak = currentStreak(live, stats.playerId)
    stats.bestStreak = bestWinStreak(live, stats.playerId)
    const mine = [...(partners.get(stats.playerId)?.values() ?? [])]
    mine.sort((a, b) => b.winPct - a.winPct || b.pnl - a.pnl || b.played - a.played || a.name.localeCompare(b.name, 'he'))
    stats.bestPartner = mine[0] ?? null
    stats.worstPartner = mine.length > 1 ? mine[mine.length - 1] : null
    rows.push(stats)
  }

  return rows.sort((a, b) => b.pnl - a.pnl || b.winPct - a.winPct || b.goalDiff - a.goalDiff || a.name.localeCompare(b.name, 'he'))
}

function addPartners(
  match: Match,
  pair: string[],
  names: Map<string, string>,
  partners: Map<string, Map<string, PartnerSnap>>,
) {
  const [left, right] = pair
  bump(partners, names, match, left, right)
  bump(partners, names, match, right, left)
}

function bump(
  partners: Map<string, Map<string, PartnerSnap>>,
  names: Map<string, string>,
  match: Match,
  playerId: string,
  partnerId: string,
) {
  let mine = partners.get(playerId)
  if (!mine) {
    mine = new Map()
    partners.set(playerId, mine)
  }
  const snap = mine.get(partnerId) ?? emptyPartner(partnerId, names.get(partnerId) ?? 'שחקן')
  const won = playerWon(match, playerId)
  const forGoals = onSideA(match, playerId) ? match.scoreA : match.scoreB
  const against = onSideA(match, playerId) ? match.scoreB : match.scoreA
  snap.played += 1
  if (won) snap.won += 1
  else snap.lost += 1
  snap.winPct = snap.won / snap.played
  snap.pnl += playerPnl(match, playerId)
  snap.goalDiff += forGoals - against
  mine.set(partnerId, snap)
}

function currentStreak(matches: Match[], playerId: string): { kind: Result | 'none'; count: number } {
  const mine = matches.filter((m) => playedIn(m, playerId))
  if (mine.length === 0) return { kind: 'none', count: 0 }
  const kind = resultOf(mine[mine.length - 1], playerId)
  let count = 0
  for (let i = mine.length - 1; i >= 0; i -= 1) {
    if (resultOf(mine[i], playerId) !== kind) break
    count += 1
  }
  return { kind, count }
}

function bestWinStreak(matches: Match[], playerId: string): number {
  let best = 0
  let run = 0
  for (const match of matches) {
    if (!playedIn(match, playerId)) continue
    if (playerWon(match, playerId)) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

export function computePairStats(matches: Match[], players: Player[]): PairStats[] {
  const names = new Map(players.map((p) => [p.id, p.name]))
  const map = new Map<string, PairStats>()
  for (const match of activeMatches(matches)) {
    for (const side of [match.teamA, match.teamB]) {
      if (side.length !== 2) continue
      const ids = [...side].sort() as [string, string]
      const key = ids.join('|')
      let row = map.get(key)
      if (!row) {
        row = {
          key,
          playerIds: ids,
          names: [names.get(ids[0]) ?? 'שחקן', names.get(ids[1]) ?? 'שחקן'],
          played: 0,
          won: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          winPct: 0,
          pnl: 0,
          form: [],
        }
        map.set(key, row)
      }
      const isA = match.teamA.includes(ids[0]) && match.teamA.includes(ids[1])
      const forGoals = isA ? match.scoreA : match.scoreB
      const against = isA ? match.scoreB : match.scoreA
      const won = forGoals > against
      row.played += 1
      row.goalsFor += forGoals
      row.goalsAgainst += against
      row.goalDiff += forGoals - against
      row.pnl += playerPnl(match, ids[0]) + playerPnl(match, ids[1])
      if (won) row.won += 1
      else row.lost += 1
      row.form.push(won ? 'W' : 'L')
    }
  }
  const rows = [...map.values()]
  for (const row of rows) {
    row.winPct = row.played ? row.won / row.played : 0
    row.form = row.form.slice(-5).reverse()
  }
  return rows.sort((a, b) => b.pnl - a.pnl || b.winPct - a.winPct || b.goalDiff - a.goalDiff)
}

/** Head to head counts every match where the two players were on opposite sides, including 2v2. */
export function computeH2H(matches: Match[], playerA: string, playerB: string): H2H {
  const meetings: H2HMeeting[] = []
  let winsA = 0
  let winsB = 0
  let goalsA = 0
  let goalsB = 0
  let togetherPlayed = 0
  let togetherWins = 0

  for (const match of activeMatches(matches).slice().reverse()) {
    const aIn = playedIn(match, playerA)
    const bIn = playedIn(match, playerB)
    if (!aIn || !bIn) continue
    const aHome = onSideA(match, playerA)
    const bHome = onSideA(match, playerB)
    if (aHome === bHome) {
      togetherPlayed += 1
      if (playerWon(match, playerA)) togetherWins += 1
      continue
    }
    const scoreFor = aHome ? match.scoreA : match.scoreB
    const scoreAgainst = aHome ? match.scoreB : match.scoreA
    const won = scoreFor > scoreAgainst
    if (won) winsA += 1
    else winsB += 1
    goalsA += scoreFor
    goalsB += scoreAgainst
    const partners = (aHome ? match.teamA : match.teamB).filter((id) => id !== playerA)
    const opponents = (aHome ? match.teamB : match.teamA).filter((id) => id !== playerB)
    meetings.push({
      matchId: match.id,
      playedAt: match.playedAt,
      mode: match.mode,
      scoreFor,
      scoreAgainst,
      won,
      partners,
      opponents,
    })
  }

  return { winsA, winsB, goalsA, goalsB, meetings, togetherPlayed, togetherWins }
}

export function cumulativeSeries(matches: Match[], players: Player[]): { playerId: string; name: string; points: number[] }[] {
  const live = activeMatches(matches)
  const activePlayers = players.filter((p) => !p.archivedAt || live.some((m) => playedIn(m, p.id)))
  const running = new Map(activePlayers.map((p) => [p.id, 0]))
  const points = new Map(activePlayers.map((p) => [p.id, [0]]))
  for (const match of live) {
    for (const player of activePlayers) {
      if (playedIn(match, player.id)) {
        running.set(player.id, (running.get(player.id) ?? 0) + playerPnl(match, player.id))
      }
      points.get(player.id)?.push(running.get(player.id) ?? 0)
    }
  }
  return activePlayers.map((p) => ({ playerId: p.id, name: p.name, points: points.get(p.id) ?? [0] }))
}
