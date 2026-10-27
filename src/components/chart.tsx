'use client'

import { useState } from 'react'
import { swatch } from '@/lib/format'
import { cumulativeSeries } from '@/lib/stats'
import type { Match, Player } from '@/lib/types'

export function PnlChart({ matches, players }: { matches: Match[]; players: Player[] }) {
  const series = cumulativeSeries(matches, players).filter((row) => row.points.some((point) => point !== 0) || row.points.length > 1)
  const [hidden, setHidden] = useState<string[]>([])
  if (series.length === 0 || series.every((row) => row.points.length < 2)) {
    return <p className="muted">הגרף יתעורר אחרי המשחק הראשון.</p>
  }
  const shown = series.filter((row) => !hidden.includes(row.playerId))
  const values = shown.flatMap((row) => row.points)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const width = 360
  const height = 160
  const pad = 8
  const xFor = (index: number, total: number) => (total <= 1 ? pad : pad + (index / (total - 1)) * (width - pad * 2))
  const yFor = (value: number) => pad + ((max - value) / span) * (height - pad * 2)
  const zero = yFor(0)

  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="רווח מצטבר לאורך המשחקים">
        <line x1={pad} x2={width - pad} y1={zero} y2={zero} stroke="rgba(244,255,232,0.2)" strokeDasharray="3 4" />
        {shown.map((row) => {
          const d = row.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index, row.points.length)} ${yFor(point)}`).join(' ')
          return <path key={row.playerId} d={d} fill="none" stroke={swatch(row.playerId)} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        })}
      </svg>
      <div className="legend">
        {series.map((row) => {
          const off = hidden.includes(row.playerId)
          return (
            <button
              key={row.playerId}
              type="button"
              className={off ? 'off' : undefined}
              style={{ borderColor: swatch(row.playerId) }}
              onClick={() => setHidden((current) => off ? current.filter((id) => id !== row.playerId) : [...current, row.playerId])}
              aria-pressed={!off}
            >
              {row.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
