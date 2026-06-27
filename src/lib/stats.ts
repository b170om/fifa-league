import type { Match, Player } from './database.types'

export interface PlayerStats {
  playerId: string
  name: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  winPct: number
  form: ('W' | 'D' | 'L')[]
}

export interface PairStats {
  pairKey: string
  playerIds: [string, string]
  names: [string, string]
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  winPct: number
  form: ('W' | 'D' | 'L')[]
}

function outcome(scoreFor: number, scoreAgainst: number): 'W' | 'D' | 'L' {
  if (scoreFor > scoreAgainst) return 'W'
  if (scoreFor === scoreAgainst) return 'D'
  return 'L'
}

function points(result: 'W' | 'D' | 'L'): number {
  return result === 'W' ? 3 : result === 'D' ? 1 : 0
}

export function computeSinglesTable(matches: Match[], players: Player[]): PlayerStats[] {
  const map = new Map<string, PlayerStats>()

  for (const p of players) {
    map.set(p.id, {
      playerId: p.id,
      name: p.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      winPct: 0,
      form: [],
    })
  }

  // Only 1v1 matches for singles table
  const singles = matches
    .filter((m) => m.mode === '1v1')
    .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())

  for (const m of singles) {
    const aId = m.team_a_player_ids[0]
    const bId = m.team_b_player_ids[0]
    const resA = outcome(m.score_a, m.score_b)
    const resB = outcome(m.score_b, m.score_a)

    for (const [id, sf, sa, res] of [
      [aId, m.score_a, m.score_b, resA],
      [bId, m.score_b, m.score_a, resB],
    ] as [string, number, number, 'W' | 'D' | 'L'][]) {
      const s = map.get(id)
      if (!s) continue
      s.played++
      s.goalsFor += sf
      s.goalsAgainst += sa
      s.goalDiff += sf - sa
      if (res === 'W') s.won++
      else if (res === 'D') s.drawn++
      else s.lost++
      s.points += points(res)
      s.form.push(res)
    }
  }

  const result: PlayerStats[] = []
  for (const s of map.values()) {
    s.winPct = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0
    s.form = s.form.slice(-5)
    result.push(s)
  }

  return result.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff)
}

export function computePairsTable(matches: Match[], players: Player[]): PairStats[] {
  const playerMap = new Map(players.map((p) => [p.id, p.name]))
  const map = new Map<string, PairStats>()

  const doubles = matches
    .filter((m) => m.mode === '2v2')
    .sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime())

  function pairKey(ids: string[]): string {
    return [...ids].sort().join('|')
  }

  for (const m of doubles) {
    for (const [ids, sf, sa] of [
      [m.team_a_player_ids, m.score_a, m.score_b],
      [m.team_b_player_ids, m.score_b, m.score_a],
    ] as [string[], number, number][]) {
      if (ids.length < 2) continue
      const key = pairKey(ids)
      const res = outcome(sf, sa)

      if (!map.has(key)) {
        const sorted = [...ids].sort()
        map.set(key, {
          pairKey: key,
          playerIds: [sorted[0], sorted[1]],
          names: [playerMap.get(sorted[0]) ?? '?', playerMap.get(sorted[1]) ?? '?'],
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
          winPct: 0,
          form: [],
        })
      }

      const s = map.get(key)!
      s.played++
      s.goalsFor += sf
      s.goalsAgainst += sa
      s.goalDiff += sf - sa
      if (res === 'W') s.won++
      else if (res === 'D') s.drawn++
      else s.lost++
      s.points += points(res)
      s.form.push(res)
    }
  }

  const result: PairStats[] = []
  for (const s of map.values()) {
    s.winPct = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0
    s.form = s.form.slice(-5)
    result.push(s)
  }

  return result.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff)
}

export interface H2HStats {
  playerA: { id: string; name: string; wins: number; goals: number }
  playerB: { id: string; name: string; wins: number; goals: number }
  draws: number
  matches: Match[]
}

export function computeH2H(matches: Match[], playerA: Player, playerB: Player): H2HStats {
  const relevant = matches.filter(
    (m) =>
      m.mode === '1v1' &&
      ((m.team_a_player_ids.includes(playerA.id) && m.team_b_player_ids.includes(playerB.id)) ||
        (m.team_a_player_ids.includes(playerB.id) && m.team_b_player_ids.includes(playerA.id)))
  )

  let aWins = 0,
    bWins = 0,
    draws = 0,
    aGoals = 0,
    bGoals = 0

  for (const m of relevant) {
    const aIsTeamA = m.team_a_player_ids.includes(playerA.id)
    const sf = aIsTeamA ? m.score_a : m.score_b
    const sa = aIsTeamA ? m.score_b : m.score_a
    aGoals += sf
    bGoals += sa
    const res = outcome(sf, sa)
    if (res === 'W') aWins++
    else if (res === 'L') bWins++
    else draws++
  }

  return {
    playerA: { id: playerA.id, name: playerA.name, wins: aWins, goals: aGoals },
    playerB: { id: playerB.id, name: playerB.name, wins: bWins, goals: bGoals },
    draws,
    matches: relevant.sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    ),
  }
}
