'use client'

import Link from 'next/link'
import { computePlayerStats, activeMatches } from '@/lib/stats'
import { useTitle } from '@/components/league'
import { Avatar, Empty, Gate, Money, Pips } from '@/components/ui'

export default function TablePage() {
  useTitle('פלאדלייט · טבלה')
  return (
    <Gate>
      {(data) => {
        const rows = computePlayerStats(activeMatches(data.matches), data.players)
          .filter((row) => row.played > 0)
          .sort((a, b) => b.winPct - a.winPct || b.goalDiff - a.goalDiff || b.won - a.won || a.name.localeCompare(b.name, 'he'))
        if (rows.length === 0) return <Empty title="הטבלה ריקה" body="ברגע שיש משחקי זוגות, כל שחקן מקבל ניצחונות, אחוזים, שערים ורצף משלו." href="/night" action="לרשום משחק" />
        return (
          <div>
            <header className="brand">
              <div>
                <h1>הטבלה</h1>
                <small>כולל זוגות · בלי תיקו</small>
              </div>
            </header>
            <p className="dim">השערים הם שערי הקבוצה במשחקים שהשחקן שיחק.</p>
            {rows.map((row, index) => (
              <Link key={row.playerId} href={`/players/${row.playerId}`} className="person">
                <span className="num" style={{ fontFamily: 'var(--font-teko)', fontSize: 32, width: 28 }}>{index + 1}</span>
                <Avatar name={row.name} id={row.playerId} />
                <div className="grow">
                  <strong>{row.name}</strong>
                  <div className="dim">{row.won}-{row.lost} · {Math.round(row.winPct * 100)}% · שערים {row.goalsFor}:{row.goalsAgainst}</div>
                  <Pips form={row.form} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <Money amount={row.pnl} />
                  <div className="dim">{row.streak.kind === 'none' ? '' : `רצף ${row.streak.count}${row.streak.kind === 'W' ? 'נ' : 'ה'}`}</div>
                </div>
              </Link>
            ))}
          </div>
        )
      }}
    </Gate>
  )
}
