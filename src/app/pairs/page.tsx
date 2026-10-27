'use client'

import { computePairStats } from '@/lib/stats'
import { useTitle } from '@/components/league'
import { Empty, Gate, Money, Pips } from '@/components/ui'

export default function PairsPage() {
  useTitle('פלאדלייט · זוגות')
  return (
    <Gate>
      {(data) => {
        const rows = computePairStats(data.matches, data.players)
        if (rows.length === 0) return <Empty title="עוד אין זוגות" body="כל משחק 2 על 2 נכנס לכאן, כולל הרווח המשותף של השניים." href="/night" action="לפתוח ערב" />
        return (
          <div className="stack">
            <header className="brand"><div><h1>הזוגות</h1><small>רווח משותף</small></div></header>
            {rows.map((row) => (
              <article key={row.key} className="card">
                <div className="row">
                  <strong>{row.names[0]} · {row.names[1]}</strong>
                  <Money amount={row.pnl} />
                </div>
                <p className="muted">{row.won}-{row.lost} · {Math.round(row.winPct * 100)}% · שערים {row.goalsFor}:{row.goalsAgainst}</p>
                <Pips form={row.form} />
              </article>
            ))}
          </div>
        )
      }}
    </Gate>
  )
}
