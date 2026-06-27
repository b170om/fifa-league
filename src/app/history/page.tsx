'use client'
import { useEffect, useState } from 'react'
import type { Match, Player } from '@/lib/database.types'
import PageHeader from '@/components/PageHeader'
import MatchForm from '@/components/MatchForm'

function playerNames(ids: string[], players: Player[]) {
  return ids.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ')
}

function groupByDate(matches: Match[]) {
  const groups = new Map<string, Match[]>()
  for (const m of matches) {
    const date = new Date(m.played_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(m)
  }
  return [...groups.entries()]
}

export default function HistoryPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Match | null>(null)

  async function load() {
    const [p, m] = await Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ])
    setPlayers(p); setMatches(m); setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteMatch(id: string) {
    if (!confirm('Delete this match?')) return
    await fetch(`/api/matches/${id}`, { method: 'DELETE' })
    await load()
  }

  const groups = groupByDate(matches)

  return (
    <>
      <PageHeader badge="Archive" title="Results" sub="Every matchnight, in full" />
      <main className="flex-1 overflow-y-auto">
        {editing && (
          <div className="border-b-2 border-[#1c1916] pb-2">
            <MatchForm
              players={players}
              match={editing}
              onSave={async () => { setEditing(null); await load() }}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : matches.length === 0 ? (
          <p className="px-[18px] pt-5 text-[14px] italic text-[#6f6757]" style={{ fontFamily: 'var(--font-spectral)' }}>
            No matches yet. File the first result!
          </p>
        ) : (
          <div className="px-[18px] pb-6">
            {groups.map(([date, ms], gi) => (
              <div key={date} className="mt-[18px]">
                <div className="flex items-baseline justify-between border-b-2 border-[#1c1916] pb-[5px]">
                  <div className="text-[17px] uppercase"
                    style={{ fontFamily: 'var(--font-anton)', color: gi === 0 ? '#d9531e' : '#1c1916' }}>
                    {gi === 0 ? 'Latest' : `Matchday`}
                  </div>
                  <div className="text-[13px] italic text-[#6f6757]"
                    style={{ fontFamily: 'var(--font-spectral)' }}>{date}</div>
                </div>

                {ms.map((m) => {
                  const aWin = m.score_a > m.score_b
                  const bWin = m.score_b > m.score_a
                  const draw = m.score_a === m.score_b
                  return (
                    <div key={m.id} className="py-[11px] border-b border-[rgba(28,25,22,0.16)]">
                      <div className="flex items-center justify-between mb-[6px]">
                        <div className="text-[10px] font-bold tracking-[.14em] uppercase"
                          style={{ fontFamily: 'var(--font-barlow)', color: m.mode === '2v2' ? '#d9531e' : '#1f7a3d' }}>
                          {m.mode === '2v2' ? 'Doubles · 2v2' : 'Singles · 1v1'}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => setEditing(m)}
                            className="text-[11px] font-bold tracking-[.08em] uppercase text-[#9a9180] hover:text-[#1c1916]"
                            style={{ fontFamily: 'var(--font-barlow)' }}>Edit</button>
                          <button onClick={() => deleteMatch(m.id)}
                            className="text-[11px] font-bold tracking-[.08em] uppercase text-[#d9531e] opacity-60 hover:opacity-100"
                            style={{ fontFamily: 'var(--font-barlow)' }}>Del</button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="flex-1 text-right text-[15px] uppercase leading-[1.05]"
                          style={{ fontFamily: 'var(--font-barlow)', color: aWin ? '#1c1916' : draw ? '#4d4639' : '#9a9180', fontWeight: aWin ? 700 : 500 }}>
                          {playerNames(m.team_a_player_ids, players)}
                        </div>
                        <div className="flex items-center gap-[8px] px-[14px]"
                          style={{ fontFamily: 'var(--font-anton)', fontSize: 24 }}>
                          <span>{m.score_a}</span>
                          <span className="text-[16px] text-[#9a9180]">–</span>
                          <span>{m.score_b}</span>
                        </div>
                        <div className="flex-1 text-left text-[15px] uppercase leading-[1.05]"
                          style={{ fontFamily: 'var(--font-barlow)', color: bWin ? '#1c1916' : draw ? '#4d4639' : '#9a9180', fontWeight: bWin ? 700 : 500 }}>
                          {playerNames(m.team_b_player_ids, players)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function Skeleton() {
  return (
    <div className="px-[18px] pt-4 animate-pulse space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[60px] bg-[#e5dcc6]" />
      ))}
    </div>
  )
}
