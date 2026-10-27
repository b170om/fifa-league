import type { Rotation } from './types'

export interface RatedPlayer {
  id: string
  elo: number
}

export interface PlayedMatch {
  teamA: string[]
  teamB: string[]
  scoreA: number
  scoreB: number
}

export interface Assignment {
  teamA: [string, string]
  teamB: [string, string]
  sitting: string[]
  label: string
}

function byEloThenId(a: RatedPlayer, b: RatedPlayer): number {
  return b.elo - a.elo || a.id.localeCompare(b.id)
}

function asPair(ids: string[]): [string, string] {
  if (ids.length !== 2) throw new Error('צריך בדיוק שני שחקנים בקבוצה')
  return [ids[0], ids[1]]
}

/** Strongest paired with weakest, so the sides are close. */
export function lockPairs(players: RatedPlayer[]): [string, string][] {
  if (players.length < 4 || players.length % 2 !== 0) {
    throw new Error('זוגות קבועים עובדים עם 4 או 6 שחקנים')
  }
  const sorted = [...players].sort(byEloThenId)
  const pairs: [string, string][] = []
  for (let i = 0; i < sorted.length / 2; i += 1) {
    pairs.push([sorted[i].id, sorted[sorted.length - 1 - i].id])
  }
  return pairs
}

export function balanceAssignment(players: RatedPlayer[]): Assignment {
  const sorted = [...players].sort(byEloThenId)
  if (sorted.length === 4) {
    return {
      teamA: [sorted[0].id, sorted[3].id],
      teamB: [sorted[1].id, sorted[2].id],
      sitting: [],
      label: 'איזון לפי דירוג',
    }
  }
  if (sorted.length === 5) {
    const sitting = sorted[2].id
    const court = sorted.filter((p) => p.id !== sitting)
    return {
      teamA: [court[0].id, court[3].id],
      teamB: [court[1].id, court[2].id],
      sitting: [sitting],
      label: 'איזון לפי דירוג',
    }
  }
  if (sorted.length === 6) {
    return {
      teamA: [sorted[0].id, sorted[5].id],
      teamB: [sorted[1].id, sorted[4].id],
      sitting: [sorted[2].id, sorted[3].id],
      label: 'איזון לפי דירוג',
    }
  }
  throw new Error('בערב משחקים 4, 5 או 6')
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

export function randomAssignment(players: RatedPlayer[], rng: () => number = Math.random): Assignment {
  if (players.length < 4 || players.length > 6) throw new Error('בערב משחקים 4, 5 או 6')
  const ids = shuffle(players.map((p) => p.id), rng)
  return {
    teamA: [ids[0], ids[1]],
    teamB: [ids[2], ids[3]],
    sitting: ids.slice(4),
    label: 'ערבוב',
  }
}

interface SitState {
  sits: Map<string, number>
  lastSat: Map<string, number>
  streak: Map<string, number>
}

function sitState(roster: string[], matches: PlayedMatch[]): SitState {
  const sits = new Map(roster.map((id) => [id, 0]))
  const lastSat = new Map(roster.map((id) => [id, -1]))
  const streak = new Map(roster.map((id) => [id, 0]))
  matches.forEach((match, index) => {
    const playing = new Set([...match.teamA, ...match.teamB])
    for (const id of roster) {
      if (playing.has(id)) {
        streak.set(id, (streak.get(id) ?? 0) + 1)
      } else {
        sits.set(id, (sits.get(id) ?? 0) + 1)
        lastSat.set(id, index)
        streak.set(id, 0)
      }
    }
  })
  return { sits, lastSat, streak }
}

function pickSitters(roster: string[], matches: PlayedMatch[], count: number): string[] {
  if (count <= 0) return []
  const { sits, lastSat } = sitState(roster, matches)
  return [...roster]
    .sort((a, b) => {
      const sitDiff = (sits.get(a) ?? 0) - (sits.get(b) ?? 0)
      if (sitDiff !== 0) return sitDiff
      const recency = (lastSat.get(a) ?? -1) - (lastSat.get(b) ?? -1)
      if (recency !== 0) return recency
      return a.localeCompare(b)
    })
    .slice(0, count)
}

function pairCourt(court: RatedPlayer[], gameIndex: number): { teamA: [string, string]; teamB: [string, string] } {
  const method = ((gameIndex % 3) + 3) % 3
  if (method === 0) {
    const sorted = [...court].sort(byEloThenId)
    return {
      teamA: [sorted[0].id, sorted[3].id],
      teamB: [sorted[1].id, sorted[2].id],
    }
  }
  const sorted = [...court].sort((a, b) => a.id.localeCompare(b.id))
  if (method === 1) {
    return { teamA: [sorted[0].id, sorted[1].id], teamB: [sorted[2].id, sorted[3].id] }
  }
  return { teamA: [sorted[0].id, sorted[2].id], teamB: [sorted[1].id, sorted[3].id] }
}

function samePair(pair: string[], ids: string[]): boolean {
  if (pair.length !== 2 || ids.length !== 2) return false
  const left = [...pair].sort().join('|')
  const right = [...ids].sort().join('|')
  return left === right
}

function pairsRotation(
  locked: [string, string][],
  matches: PlayedMatch[],
): Assignment {
  if (locked.length === 2) {
    const flip = matches.length % 2 === 1
    return {
      teamA: flip ? locked[1] : locked[0],
      teamB: flip ? locked[0] : locked[1],
      sitting: [],
      label: 'זוגות קבועים',
    }
  }
  if (locked.length !== 3) throw new Error('זוגות קבועים עובדים עם 4 או 6 שחקנים')

  if (matches.length === 0) {
    return { teamA: locked[0], teamB: locked[1], sitting: [...locked[2]], label: 'זוגות קבועים' }
  }

  const last = matches[matches.length - 1]
  const winners = last.scoreA > last.scoreB ? last.teamA : last.teamB
  const losers = last.scoreA > last.scoreB ? last.teamB : last.teamA
  const waiting = locked.find((pair) => pair.every((id) => !winners.includes(id) && !losers.includes(id)))
  const winningPair = locked.find((pair) => samePair(pair, winners)) ?? asPair(winners)
  const losingPair = locked.find((pair) => samePair(pair, losers)) ?? asPair(losers)
  if (!waiting) {
    const playing = new Set([...winners, ...losers])
    return {
      teamA: asPair(winners),
      teamB: asPair(losers),
      sitting: locked.flat().filter((id) => !playing.has(id)),
      label: 'זוגות קבועים',
    }
  }
  return {
    teamA: asPair(winningPair),
    teamB: asPair(waiting),
    sitting: [...losingPair],
    label: 'מנצח נשאר',
  }
}

function fairRotation(players: RatedPlayer[], matches: PlayedMatch[]): Assignment {
  const roster = [...players].map((p) => p.id).sort()
  const sitting = pickSitters(roster, matches, players.length - 4)
  const sit = new Set(sitting)
  const court = players.filter((p) => !sit.has(p.id))
  const paired = pairCourt(court, matches.length)
  return { ...paired, sitting, label: 'רוטציה הוגנת' }
}

function winnerStays(players: RatedPlayer[], matches: PlayedMatch[]): Assignment {
  if (matches.length === 0) return { ...balanceAssignment(players), label: 'מנצח נשאר' }
  const roster = players.map((p) => p.id)
  const last = matches[matches.length - 1]
  const winners = last.scoreA > last.scoreB ? last.teamA : last.teamB
  const losers = last.scoreA > last.scoreB ? last.teamB : last.teamA
  const playing = new Set([...last.teamA, ...last.teamB])
  const sitting = roster.filter((id) => !playing.has(id))

  if (players.length === 4) {
    return { teamA: asPair(winners), teamB: asPair(losers), sitting: [], label: 'עוד סיבוב' }
  }

  if (players.length === 6) {
    if (sitting.length !== 2) return balanceAssignment(players)
    return { teamA: asPair(winners), teamB: asPair(sitting), sitting: [...losers], label: 'מנצח נשאר' }
  }

  if (sitting.length !== 1 || losers.length !== 2) return balanceAssignment(players)
  const { sits, streak } = sitState(roster, matches)
  const ranked = [...losers].sort((a, b) => {
    const sitDiff = (sits.get(a) ?? 0) - (sits.get(b) ?? 0)
    if (sitDiff !== 0) return sitDiff
    const streakDiff = (streak.get(b) ?? 0) - (streak.get(a) ?? 0)
    if (streakDiff !== 0) return streakDiff
    return a.localeCompare(b)
  })
  const out = ranked[0]
  const stay = ranked[1]
  return {
    teamA: asPair(winners),
    teamB: [stay, sitting[0]],
    sitting: [out],
    label: 'מנצח נשאר',
  }
}

export function suggestAssignment(opts: {
  players: RatedPlayer[]
  rotation: Rotation
  lockedPairs: [string, string][] | null
  matches: PlayedMatch[]
}): Assignment {
  const { players, rotation, lockedPairs, matches } = opts
  if (players.length < 4 || players.length > 6) throw new Error('בערב משחקים 4, 5 או 6')
  const live = matches.filter((m) => m.scoreA !== m.scoreB)
  if (rotation === 'pairs') {
    const pairs = lockedPairs ?? lockPairs(players)
    return pairsRotation(pairs, live)
  }
  if (rotation === 'fair') return fairRotation(players, live)
  return winnerStays(players, live)
}
