'use client'
import { useEffect, useState } from 'react'
import type { Match, Player } from '@/lib/database.types'
import { computeSinglesTable, type PlayerStats } from '@/lib/stats'
import FormBadge from '@/components/FormBadge'
import PageHeader from '@/components/PageHeader'

export default function TablePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ]).then(([p, m]) => { setPlayers(p); setMatches(m); setLoading(false) })
  }, [])

  const table: PlayerStats[] = loading ? [] : computeSinglesTable(matches, players)
  const singles1v1 = matches.filter((m) => m.mode === '1v1').length

  return (
    <>
      <PageHeader badge={`No. ${singles1v1}`} title="League Table" sub="Singles — who tops the table" />
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <Skeleton />
        ) : table.length === 0 ? (
          <p className="px-[18px] pt-5 text-[14px] italic text-[#6f6757]" style={{ fontFamily: 'var(--font-spectral)' }}>
            No data yet. Add players and record matches.
          </p>
        ) : (
          <div className="pb-4">
            <div className="overflow-x-auto">
              <div style={{ minWidth: 624 }}>
                {/* Header row */}
                <div className="flex items-center h-[30px] border-b-2 border-[#1c1916]">
                  <div className="sticky left-0 bg-[#ece4d2] flex-none w-[132px] pl-[18px] text-[11px] font-bold tracking-[.08em] uppercase text-[#6f6757] z-10"
                    style={{ fontFamily: 'var(--font-barlow)' }}>Player</div>
                  {['P','W','D','L','GF','GA','GD','PTS','WIN%','LAST 5'].map((h, i) => (
                    <div key={h}
                      className="text-center text-[11px] font-bold tracking-wide"
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
                    <div key={s.playerId} className="flex items-center h-[50px] border-b border-[rgba(28,25,22,0.16)]"
                      style={{ background: rowBg }}>
                      {/* Sticky name cell */}
                      <div className="sticky left-0 flex-none w-[132px] h-[50px] flex items-center gap-[11px] pl-[18px] z-10"
                        style={{ background: rowBg }}>
                        <div className="w-[23px] h-[23px] flex items-center justify-center text-[14px] flex-none"
                          style={{ fontFamily: 'var(--font-anton)', background: rankBg, color: rankColor }}>
                          {i + 1}
                        </div>
                        <div className="text-[17px] font-semibold uppercase tracking-[.01em] whitespace-nowrap"
                          style={{ fontFamily: 'var(--font-barlow)', color: cPrimary }}>
                          {s.name}
                        </div>
                      </div>
                      <StatCell w={34} color={cMuted}>{s.played}</StatCell>
                      <StatCell w={32} color={cPrimary} bold>{s.won}</StatCell>
                      <StatCell w={32} color={cMuted}>{s.drawn}</StatCell>
                      <StatCell w={32} color={cMuted}>{s.lost}</StatCell>
                      <StatCell w={40} color={cPrimary} bold>{s.goalsFor}</StatCell>
                      <StatCell w={40} color={cMuted}>{s.goalsAgainst}</StatCell>
                      <StatCell w={44} color={gdColor} bold>
                        {s.goalDiff > 0 ? '+' : ''}{s.goalDiff}
                      </StatCell>
                      <div className="flex-none w-[44px] text-center text-[19px]"
                        style={{ fontFamily: 'var(--font-anton)', color: ptsColor }}>
                        {s.points}
                      </div>
                      <StatCell w={50} color={cMuted}>{s.winPct}%</StatCell>
                      <div className="flex-none w-[128px] pl-[10px] flex gap-[5px]">
                        {s.form.map((f, j) => <FormBadge key={j} result={f} />)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 px-[18px] pt-[14px] text-[12px] font-semibold tracking-[.04em] uppercase text-[#6f6757]"
              style={{ fontFamily: 'var(--font-barlow)' }}>
              {[['#1f7a3d','Won'],['#e8e0cd','Drawn'],['#d9531e','Lost']].map(([bg, label]) => (
                <div key={label} className="flex items-center gap-[6px]">
                  <span className="w-[13px] h-[13px] border border-[rgba(28,25,22,0.4)]" style={{ background: bg }} />
                  {label}
                </div>
              ))}
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
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[50px] bg-[#e5dcc6] border border-[rgba(28,25,22,0.1)]" />
      ))}
    </div>
  )
}
