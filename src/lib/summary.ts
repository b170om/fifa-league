import { playerName, shekel, teamLabel } from './format'
import { minTransfers, type Transfer } from './settle'
import { activeMatches, onSideA, playerPnl, playerWon, playedIn } from './stats'
import type { Match, Player } from './types'

export interface Standing {
  playerId: string
  name: string
  pnl: number
  wins: number
  losses: number
  goalsFor: number
  goalsAgainst: number
}

export interface Upset {
  match: Match
  winnerPct: number
  winnerIds: string[]
  loserIds: string[]
}

export interface Mvp {
  playerId: string
  name: string
  pnl: number
  wins: number
}

export interface NightSummary {
  standings: Standing[]
  mvp: Mvp | null
  upset: Upset | null
  transfers: Transfer[]
  nets: { playerId: string; name: string; amount: number }[]
}

export function summarize(matches: Match[], players: Player[], includeIds?: string[]): NightSummary {
  const live = activeMatches(matches)
  const ids = new Set<string>(includeIds ?? [])
  if (!includeIds) {
    for (const match of live) {
      for (const id of [...match.teamA, ...match.teamB]) ids.add(id)
    }
  }
  const standings: Standing[] = [...ids].map((id) => {
    const mine = live.filter((m) => playedIn(m, id))
    let goalsFor = 0
    let goalsAgainst = 0
    let wins = 0
    let pnl = 0
    for (const match of mine) {
      const home = onSideA(match, id)
      goalsFor += home ? match.scoreA : match.scoreB
      goalsAgainst += home ? match.scoreB : match.scoreA
      if (playerWon(match, id)) wins += 1
      pnl += playerPnl(match, id)
    }
    return {
      playerId: id,
      name: playerName(players, id),
      pnl,
      wins,
      losses: mine.length - wins,
      goalsFor,
      goalsAgainst,
    }
  })
  standings.sort((a, b) => b.pnl - a.pnl || b.wins - a.wins || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || a.name.localeCompare(b.name, 'he'))

  const played = standings.filter((s) => s.wins + s.losses > 0)
  const mvp = played[0]
    ? { playerId: played[0].playerId, name: played[0].name, pnl: played[0].pnl, wins: played[0].wins }
    : null

  let upset: Upset | null = null
  for (const match of live) {
    if (match.predA == null) continue
    const aWon = match.scoreA > match.scoreB
    const winnerPct = aWon ? match.predA : 1 - match.predA
    if (winnerPct >= 0.5) continue
    if (!upset || winnerPct < upset.winnerPct) {
      upset = {
        match,
        winnerPct,
        winnerIds: aWon ? match.teamA : match.teamB,
        loserIds: aWon ? match.teamB : match.teamA,
      }
    }
  }

  const nets = standings.map((s) => ({ playerId: s.playerId, name: s.name, amount: s.pnl }))
  return {
    standings,
    mvp,
    upset,
    nets,
    transfers: minTransfers(nets.map((n) => ({ playerId: n.playerId, amount: n.amount }))),
  }
}

export interface RecapFacts {
  title: string
  when: string
  stake: number
  matchCount: number
  matches: { score: string; winners: string; losers: string; winnerPct: number | null }[]
  standings: { name: string; pnl: string; wins: number; losses: number }[]
  mvp: string | null
  upset: string | null
  transfers: string[]
  stakeNote: string
}

export function recapFacts(opts: {
  title: string
  when: string
  stake: number
  matches: Match[]
  players: Player[]
  summary: NightSummary
}): RecapFacts {
  const { title, when, stake, matches, players, summary } = opts
  const played = activeMatches(matches)
  const stakes = [...new Set(played.map((match) => match.stake))]
  const stakeNote = stakes.length <= 1
    ? `₪${stakes[0] ?? stake} על כל שחקן בכל משחק`
    : `הימור הערב ₪${stake}, ובחלק מהמשחקים ${stakes.filter((amount) => amount !== stake).map((amount) => `₪${amount}`).join(' ו')}`
  return {
    title,
    when,
    stake,
    matchCount: matches.length,
    matches: activeMatches(matches).map((match) => {
      const aWon = match.scoreA > match.scoreB
      const winners = aWon ? match.teamA : match.teamB
      const losers = aWon ? match.teamB : match.teamA
      const winnerPct = match.predA == null ? null : Math.round((aWon ? match.predA : 1 - match.predA) * 100)
      return {
        score: aWon ? `${match.scoreA}–${match.scoreB}` : `${match.scoreB}–${match.scoreA}`,
        winners: teamLabel(winners, players),
        losers: teamLabel(losers, players),
        winnerPct,
      }
    }),
    standings: summary.standings.map((s) => ({
      name: s.name,
      pnl: shekel(s.pnl, { signed: true }),
      wins: s.wins,
      losses: s.losses,
    })),
    mvp: summary.mvp ? `${summary.mvp.name} ${shekel(summary.mvp.pnl, { signed: true })} (${summary.mvp.wins} ניצחונות)` : null,
    upset: summary.upset
      ? `${teamLabel(summary.upset.winnerIds, players)} ניצחו את ${teamLabel(summary.upset.loserIds, players)} למרות סיכוי של ${Math.round(summary.upset.winnerPct * 100)}%`
      : null,
    transfers: summary.transfers.map(
      (t) => `${playerName(players, t.fromId)} מעביר ${shekel(t.amount)} ל${playerName(players, t.toId)}`,
    ),
    stakeNote,
  }
}

export function fallbackRecap(facts: RecapFacts): string {
  const bits: string[] = []
  const heading = facts.title.includes(facts.when) ? facts.title : `${facts.title}, ${facts.when}`
  bits.push(`${heading}. ${facts.matchCount} משחקים, ${facts.stakeNote}.`)
  if (facts.mvp) bits.push(`המצטיין: ${facts.mvp}.`)
  const blowout = facts.matches.slice().sort((a, b) => {
    const gap = (score: string) => {
      const [x, y] = score.split('–').map(Number)
      return Math.abs(x - y)
    }
    return gap(b.score) - gap(a.score)
  })[0]
  if (blowout) bits.push(`התוצאה הבולטת: ${blowout.winners} ${blowout.score} על ${blowout.losers}.`)
  if (facts.upset) bits.push(`הפתעה: ${facts.upset}.`)
  else if (facts.matchCount > 0) bits.push('בלי הפתעה גדולה. מי שהדירוג אהב, בדרך כלל ניצח.')
  if (facts.transfers.length > 0) bits.push(`בקופה: ${facts.transfers.join('. ')}.`)
  else bits.push('הקופה מאוזנת. אף אחד לא חייב לאף אחד.')
  return bits.join(' ')
}
