'use client'
import { useEffect, useState } from 'react'
import type { Match, Player } from '@/lib/database.types'
import { computePairsTable, type PairStats } from '@/lib/stats'
import FormBadge from '@/components/FormBadge'
import PageHeader from '@/components/PageHeader'

export default function PairsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ]).then(([p, m]) => { setPlayers(p); setMatches(m); setLoading(false) })
  }, [])

  const table: PairStats[] = loading ? [] : computePairsTable(matches, players)

  return (
    <>
      <PageHeader badge="2 v 2" title="The Pairs" sub="Two-on-two partnerships ranked" />
      <main className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <Skeleton />
        ) : table.length === 0 ? (
          <p className="px-[18px] pt-5 text-[14px] italic text-[#6f6757]" style={{ fontFamily: 'var(--font-spectral)' }}>
            No 2v2 matches yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 648 }}>
              {/* Header */}
              <div className="flex items-center h-[30px] border-b-2 border-[#1c1916]">
                <div className="sticky left-0 bg-[#ece4d2] flex-none w-[158px] pl-[18px] text-[11px] font-bold tracking-[.08em] uppercase text-[#6f6757] z-10"
                  style={{ fontFamily: 'var(--font-barlow)' }}>Partnership</div>
                {['P','W','D','L','GF','GA','GD','PTS','WIN%','LAST 5'].map((h, i) => (
                  <div key={h}
                    className="text-center text-[11px] font-bold"
                    style={{
                      fontFamily: 'var(--font-barlow)',
                      color: h === 'PTS' ? '#1c1916' : '#6f6757',
                      flex: `0 0 ${[34,32,32,32,40,40,44,44,50,128][i]}px`,
                      paddingLeft: h === 'LAST 5' ? 10 : 0,
                      textAlign: h === 'LAST 5' ? 'left' : 'center',
                    }}>
                    {h}
                  </div>
                ))}
              </div>

              {table.map((s, i) => {
                const top = i === 0
                const rowBg = top ? '#1c1916' : i % 2 === 0 ? '#ece4d2' : '#e5dcc6'
                const cPrimary = top ? '#f1ead8' : '#1c1916'
                const cMuted = top ? '#b3a88f' : '#6f6757'
                const gdColor = s.goalDiff > 0 ? '#1f7a3d' : s.goalDiff < 0 ? '#d9531e' : cMuted
                const ptsColor = top ? '#f1ead8' : '#1f7a3d'
                const rankBg = top ? '#d9531e' : 'transparent'
                const rankColor = top ? '#f1ead8' : '#1c1916'

                return (
                  <div key={s.pairKey} className="flex items-center h-[54px] border-b border-[rgba(28,25,22,0.16)]"
                    style={{ background: rowBg }}>
                    <div className="sticky left-0 flex-none w-[158px] h-[54px] flex items-center gap-[10px] pl-[18px] z-10"
                      style={{ background: rowBg }}>
                      <div className="w-[23px] h-[23px] flex items-center justify-center text-[14px] flex-none"
                        style={{ fontFamily: 'var(--font-anton)', background: rankBg, color: rankColor }}>
                        {i + 1}
                      </div>
                      <div className="flex flex-col leading-[1.05] min-w-0">
                        <div className="text-[14.5px] font-semibold uppercase whitespace-nowrap"
                          style={{ fontFamily: 'var(--font-barlow)', color: cPrimary }}>{s.names[0]}</div>
                        <div className="text-[14.5px] font-semibold uppercase whitespace-nowrap"
                          style={{ fontFamily: 'var(--font-barlow)', color: cPrimary }}>{s.names[1]}</div>
                      </div>
                    </div>
                    <StatCell w={34} color={cMuted}>{s.played}</StatCell>
                    <StatCell w={32} color={cPrimary} bold>{s.won}</StatCell>
                    <StatCell w={32} color={cMuted}>{s.drawn}</StatCell>
                    <StatCell w={32} color={cMuted}>{s.lost}</StatCell>
                    <StatCell w={40} color={cPrimary} bold>{s.goalsFor}</StatCell>
                    <StatCell w={40} color={cMuted}>{s.goalsAgainst}</StatCell>
                    <StatCell w={44} color={gdColor} bold>{s.goalDiff > 0 ? '+' : ''}{s.goalDiff}</StatCell>
                    <div className="flex-none w-[44px] text-center text-[19px]"
                      style={{ fontFamily: 'var(--font-anton)', color: ptsColor }}>{s.points}</div>
                    <StatCell w={50} color={cMuted}>{s.winPct}%</StatCell>
                    <div className="flex-none w-[128px] pl-[10px] flex gap-[5px]">
                      {s.form.map((f, j) => <FormBadge key={j} result={f} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function StatCell({ w, color, bold, children }: { w: number; color: string; bold?: boolean; children: React.ReactNode }) {
  return (
    <div className="text-center text-[16px]" style={{ flex: `0 0 ${w}px`, fontFamily: 'var(--font-barlow)', color, fontWeight: bold ? 600 : 500 }}>
      {children}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse px-[18px] pt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[54px] bg-[#e5dcc6] border border-[rgba(28,25,22,0.1)]" />
      ))}
    </div>
  )
}
