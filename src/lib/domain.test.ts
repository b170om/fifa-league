import assert from 'node:assert/strict'
import { test } from 'vitest'
import { brierScore, brierSkill, calibration, expectedScore, hitRate, teamWinProb } from './elo'
import { balanceAssignment, lockPairs, randomAssignment, suggestAssignment } from './rotation'
import { minTransfers } from './settle'
import { computeH2H, computePairStats, computePlayerStats } from './stats'
import { fallbackRecap, recapFacts, summarize } from './summary'
import type { Match, Player } from './types'
import { parseMatchInput, parseSessionInput } from './validation'

const players: Player[] = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'יובל', elo: 1500, archivedAt: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', name: 'אופיר', elo: 1500, archivedAt: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'דני', elo: 1600, archivedAt: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'נועם', elo: 1400, archivedAt: null, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', name: 'עידו', elo: 1550, archivedAt: null, createdAt: '2026-01-01T00:00:00Z' },
]

function match(partial: Partial<Match> & Pick<Match, 'id' | 'teamA' | 'teamB' | 'scoreA' | 'scoreB'>): Match {
  const stake = partial.stake ?? 25
  const aWon = partial.scoreA > partial.scoreB
  const playersRows = [...partial.teamA, ...partial.teamB].map((id) => ({
    playerId: id,
    side: (partial.teamA.includes(id) ? 'a' : 'b') as 'a' | 'b',
    eloBefore: 1500,
    eloAfter: 1500,
    pnl: (partial.teamA.includes(id) ? aWon : !aWon) ? stake : -stake,
  }))
  return {
    playedAt: '2026-10-26T18:00:00Z',
    createdAt: '2026-10-26T18:00:00Z',
    mode: '2v2',
    sessionId: '11111111-1111-4111-8111-111111111111',
    stake,
    predA: null,
    modelVersion: 'elo-avg-v1',
    deletedAt: null,
    players: playersRows,
    ...partial,
  }
}

test('even teams are 50/50 and a stronger side is the favorite', () => {
  assert.equal(expectedScore(1500, 1500), 0.5)
  const p = teamWinProb([1600, 1600], [1500, 1500])
  assert.ok(p > 0.6 && p < 0.7)
})

test('hit rate ignores toss-ups and Brier punishes confident misses', () => {
  const rows = [
    { predA: 0.7, scoreA: 2, scoreB: 1 },
    { predA: 0.8, scoreA: 0, scoreB: 3 },
    { predA: 0.5, scoreA: 1, scoreB: 0 },
  ]
  const hits = hitRate(rows)
  assert.deepEqual({ hits: hits.hits, decided: hits.decided }, { hits: 1, decided: 2 })
  const brier = brierScore(rows.filter((r) => r.predA !== 0.5))
  assert.ok(brier != null && brier > 0.2)
  assert.ok((brierSkill(0) ?? 0) > 0.99)
  assert.equal(brierSkill(0.25), 0)
  const bins = calibration(rows)
  assert.equal(bins.length, 5)
  assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), 3)
})

test('settlement uses as few transfers as possible', () => {
  const transfers = minTransfers([
    { playerId: 'a', amount: 50 },
    { playerId: 'b', amount: 25 },
    { playerId: 'c', amount: -75 },
  ])
  assert.equal(transfers.length, 2)
  assert.equal(transfers.reduce((sum, t) => sum + t.amount, 0), 75)
  assert.deepEqual(
    minTransfers([
      { playerId: 'a', amount: 25 },
      { playerId: 'b', amount: -25 },
    ]),
    [{ fromId: 'b', toId: 'a', amount: 25 }],
  )
  assert.deepEqual(minTransfers([{ playerId: 'a', amount: 0 }]), [])
})

test('2v2 feeds individual records, pairs, and opponent H2H, with no draws', () => {
  const games = [
    match({
      id: 'm1',
      teamA: [players[0].id, players[1].id],
      teamB: [players[2].id, players[3].id],
      scoreA: 3,
      scoreB: 1,
      playedAt: '2026-10-26T18:00:00Z',
    }),
    match({
      id: 'm2',
      teamA: [players[0].id, players[2].id],
      teamB: [players[1].id, players[3].id],
      scoreA: 1,
      scoreB: 2,
      playedAt: '2026-10-26T19:00:00Z',
      deletedAt: '2026-10-26T19:05:00Z',
    }),
  ]
  const table = computePlayerStats(games, players)
  const yuval = table.find((row) => row.name === 'יובל')
  assert.ok(yuval)
  assert.equal(yuval.played, 1)
  assert.equal(yuval.won, 1)
  assert.equal(yuval.lost, 0)
  assert.equal(yuval.goalsFor, 3)
  assert.equal(yuval.pnl, 25)
  assert.equal(yuval.streak.kind, 'W')
  assert.equal(yuval.bestPartner?.name, 'אופיר')
  assert.equal(yuval.worstPartner, null)

  const pairs = computePairStats(games, players)
  assert.equal(pairs.length, 2)
  const h2h = computeH2H(games, players[0].id, players[2].id)
  assert.equal(h2h.winsA, 1)
  assert.equal(h2h.winsB, 0)
  assert.equal(h2h.meetings.length, 1)
  assert.equal(h2h.togetherPlayed, 0)
})

test('winner stays, fair sits, and fixed pairs', () => {
  const roster = players.slice(0, 5).map((p) => ({ id: p.id, elo: p.elo }))
  const first = suggestAssignment({ players: roster, rotation: 'winner_stays', lockedPairs: null, matches: [] })
  assert.equal(first.sitting.length, 1)
  assert.equal(first.teamA.length + first.teamB.length, 4)

  const next = suggestAssignment({
    players: roster,
    rotation: 'winner_stays',
    lockedPairs: null,
    matches: [{ teamA: first.teamA, teamB: first.teamB, scoreA: 2, scoreB: 0 }],
  })
  assert.deepEqual([...next.teamA].sort(), [...first.teamA].sort())
  assert.equal(next.sitting.length, 1)
  assert.ok(next.teamB.includes(first.sitting[0]))

  const fairPlayers = roster
  const seen = new Map(fairPlayers.map((p) => [p.id, 0]))
  let history: { teamA: string[]; teamB: string[]; scoreA: number; scoreB: number }[] = []
  for (let i = 0; i < 5; i += 1) {
    const game = suggestAssignment({ players: fairPlayers, rotation: 'fair', lockedPairs: null, matches: history })
    for (const id of game.sitting) seen.set(id, (seen.get(id) ?? 0) + 1)
    history = [...history, { teamA: game.teamA, teamB: game.teamB, scoreA: 1, scoreB: 0 }]
  }
  for (const count of seen.values()) assert.equal(count, 1)

  const four = players.slice(0, 4).map((p) => ({ id: p.id, elo: p.elo }))
  const pairs = lockPairs(four)
  assert.equal(pairs.length, 2)
  assert.equal(new Set(pairs.flat()).size, 4)
  const paired = suggestAssignment({ players: four, rotation: 'pairs', lockedPairs: pairs, matches: [] })
  assert.deepEqual(paired.sitting, [])
  const balanced = balanceAssignment(four)
  assert.equal(new Set([...balanced.teamA, ...balanced.teamB]).size, 4)
  const random = randomAssignment(four, () => 0.5)
  assert.equal(new Set([...random.teamA, ...random.teamB, ...random.sitting]).size, 4)
})

test('night summary picks the profit leader and the real upset', () => {
  const games = [
    match({
      id: 'm1',
      teamA: [players[0].id, players[1].id],
      teamB: [players[2].id, players[3].id],
      scoreA: 4,
      scoreB: 1,
      predA: 0.2,
    }),
  ]
  const summary = summarize(games, players, players.slice(0, 4).map((p) => p.id))
  assert.equal(summary.mvp?.pnl, 25)
  assert.ok(summary.mvp && ['יובל', 'אופיר'].includes(summary.mvp.name))
  assert.equal(summary.upset?.winnerIds[0], players[0].id)
  assert.ok(summary.transfers.length >= 1)
  assert.equal(summary.nets.reduce((sum, net) => sum + net.amount, 0), 0)
  const facts = recapFacts({
    title: 'ערב בדיקה',
    when: 'יום א׳',
    stake: 25,
    matches: games,
    players,
    summary,
  })
  const text = fallbackRecap(facts)
  assert.match(text, /יובל/)
  assert.match(text, /4–1/)
  assert.doesNotMatch(text, /עידו/)
})

test('match input rejects draws, duplicates, and bad stakes', () => {
  const ids = players.slice(0, 4).map((p) => p.id)
  assert.throws(() => parseMatchInput({ teamA: ids.slice(0, 2), teamB: ids.slice(2), scoreA: 1, scoreB: 1, stake: 25 }), /שער זהב/)
  assert.throws(() => parseMatchInput({ teamA: [ids[0], ids[0]], teamB: ids.slice(2), scoreA: 1, scoreB: 0, stake: 25 }), /פעמיים/)
  assert.throws(() => parseMatchInput({ teamA: ids.slice(0, 2), teamB: ids.slice(2), scoreA: 1, scoreB: 0, stake: 0 }), /הימור/)
  const ok = parseMatchInput({ teamA: ids.slice(0, 2), teamB: ids.slice(2), scoreA: 2, scoreB: 1, stake: 40 })
  assert.equal(ok.stake, 40)
  assert.throws(
    () => parseSessionInput({ playerIds: ids.concat(players[4].id), stake: 25, rotation: 'pairs' }, 'ערב'),
    /4 או 6/,
  )
})
