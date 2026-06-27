'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Match, Player } from '@/lib/database.types'
import { computeH2H } from '@/lib/stats'
import PageHeader from '@/components/PageHeader'

function playerNames(ids: string[], players: Player[]) {
  return ids.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ')
}

function H2HContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [playerA, setPlayerA] = useState(params.get('a') ?? '')
  const [playerB, setPlayerB] = useState(params.get('b') ?? '')

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ]).then(([p, m]) => { setPlayers(p); setMatches(m); setLoading(false) })
  }, [])

  const pA = players.find((p) => p.id === playerA)
  const pB = players.find((p) => p.id === playerB)
  const h2h = pA && pB ? computeH2H(matches, pA, pB) : null
  const total = h2h ? h2h.playerA.wins + h2h.playerB.wins + h2h.draws : 0
  const aBarPct = total > 0 ? Math.round((h2h!.playerA.wins / total) * 100) : 0
  const bBarPct = total > 0 ? Math.round((h2h!.playerB.wins / total) * 100) : 0
  const dBarPct = 100 - aBarPct - bBarPct

  return (
    <>
      <PageHeader badge="H2H" title="Head to Head" sub="1v1 record between two players" />
      <main className="flex-1 overflow-y-auto px-[18px] pb-6">
        <div className="grid grid-cols-2 gap-3 mt-4">
          {(['a', 'b'] as const).map((side) => {
            const val = side === 'a' ? playerA : playerB
            const other = side === 'a' ? playerB : playerA
            return (
              <div key={side}>
                <p className="text-[11px] font-bold tracking-[.1em] uppercase text-[#6f6757] mb-1"
                  style={{ fontFamily: 'var(--font-barlow)' }}>Player {side.toUpperCase()}</p>
                <select
                  className="w-full bg-[#ece4d2] border-2 border-[#1c1916] px-3 py-2 text-[14px] font-semibold uppercase outline-none"
                  style={{ fontFamily: 'var(--font-barlow)' }}
                  value={val}
                  onChange={(e) => {
                    if (side === 'a') { setPlayerA(e.target.value); router.replace(`/h2h?a=${e.target.value}&b=${playerB}`) }
                    else { setPlayerB(e.target.value); router.replace(`/h2h?a=${playerA}&b=${e.target.value}`) }
                  }}
                >
                  <option value="">Select…</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === other}>{p.name}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>

        {loading && <div className="h-32 bg-[#e5dcc6] mt-4 animate-pulse" />}

        {!loading && h2h && total > 0 && (
          <>
            <div className="border-2 border-[#1c1916] mt-4 p-5">
              <div className="flex justify-between text-center mb-4">
                <div>
                  <p className="text-[28px]" style={{ fontFamily: 'var(--font-anton)', color: '#1f7a3d' }}>{h2h.playerA.wins}</p>
                  <p className="text-[11px] font-bold uppercase text-[#6f6757] mt-1" style={{ fontFamily: 'var(--font-barlow)' }}>{h2h.playerA.name}</p>
                </div>
                <div>
                  <p className="text-[28px]" style={{ fontFamily: 'var(--font-anton)', color: '#6f6757' }}>{h2h.draws}</p>
                  <p className="text-[11px] font-bold uppercase text-[#6f6757] mt-1" style={{ fontFamily: 'var(--font-barlow)' }}>Draws</p>
                </div>
                <div>
                  <p className="text-[28px]" style={{ fontFamily: 'var(--font-anton)', color: '#d9531e' }}>{h2h.playerB.wins}</p>
                  <p className="text-[11px] font-bold uppercase text-[#6f6757] mt-1" style={{ fontFamily: 'var(--font-barlow)' }}>{h2h.playerB.name}</p>
                </div>
              </div>
              <div className="flex h-3 overflow-hidden">
                {aBarPct > 0 && <div className="bg-[#1f7a3d]" style={{ width: `${aBarPct}%` }} />}
                {dBarPct > 0 && <div className="bg-[#9a9180]" style={{ width: `${dBarPct}%` }} />}
                {bBarPct > 0 && <div className="bg-[#d9531e]" style={{ width: `${bBarPct}%` }} />}
              </div>
              <div className="flex justify-between mt-3 text-[12px] font-semibold uppercase text-[#6f6757]"
                style={{ fontFamily: 'var(--font-barlow)' }}>
                <span>Goals: {h2h.playerA.goals}</span>
                <span>{total} matches</span>
                <span>Goals: {h2h.playerB.goals}</span>
              </div>
            </div>

            <div className="mt-4 border-b-2 border-[#1c1916] pb-[5px]">
              <span className="text-[17px] uppercase" style={{ fontFamily: 'var(--font-anton)' }}>Match History</span>
            </div>
            {h2h.matches.map((m) => {
              const aWin = m.score_a > m.score_b, bWin = m.score_b > m.score_a, draw = m.score_a === m.score_b
              return (
                <div key={m.id} className="py-[11px] border-b border-[rgba(28,25,22,0.16)]">
                  <div className="flex items-center">
                    <div className="flex-1 text-right text-[15px] uppercase"
                      style={{ fontFamily: 'var(--font-barlow)', color: aWin ? '#1c1916' : draw ? '#4d4639' : '#9a9180', fontWeight: aWin ? 700 : 500 }}>
                      {playerNames(m.team_a_player_ids, players)}
                    </div>
                    <div className="flex items-center gap-[8px] px-[14px] text-[24px]"
                      style={{ fontFamily: 'var(--font-anton)' }}>
                      <span>{m.score_a}</span>
                      <span className="text-[16px] text-[#9a9180]">–</span>
                      <span>{m.score_b}</span>
                    </div>
                    <div className="flex-1 text-left text-[15px] uppercase"
                      style={{ fontFamily: 'var(--font-barlow)', color: bWin ? '#1c1916' : draw ? '#4d4639' : '#9a9180', fontWeight: bWin ? 700 : 500 }}>
                      {playerNames(m.team_b_player_ids, players)}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {!loading && h2h && total === 0 && (
          <p className="pt-5 text-[14px] italic text-[#6f6757]" style={{ fontFamily: 'var(--font-spectral)' }}>No 1v1 matches between these players yet.</p>
        )}
        {!loading && (!playerA || !playerB) && (
          <p className="pt-5 text-[14px] italic text-[#6f6757]" style={{ fontFamily: 'var(--font-spectral)' }}>Select two players above.</p>
        )}
      </main>
    </>
  )
}

export default function H2HPage() {
  return <Suspense><H2HContent /></Suspense>
}
