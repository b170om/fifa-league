'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTitle } from '@/components/league'
import { ErrorBlock, Gate, Money, Pips } from '@/components/ui'
import { activeMatches, computePlayerStats } from '@/lib/stats'

export default function PlayerPage() {
  const params = useParams<{ id: string }>()
  useTitle('פלאדלייט · שחקן')
  return (
    <Gate>
      {(data) => {
        const player = data.players.find((item) => item.id === params.id)
        if (!player) return <ErrorBlock message="השחקן לא נמצא." />
        const stats = computePlayerStats(activeMatches(data.matches), data.players).find((row) => row.playerId === player.id)
        return (
          <div className="stack">
            <Link href="/table" className="dim">חזרה לטבלה</Link>
            <header className="brand">
              <div>
                <h1>{player.name}</h1>
                <small>דירוג {Math.round(player.elo)}</small>
              </div>
            </header>
            <section className="card">
              <p className="kicker">קופה</p>
              <p className="hero-money"><Money amount={stats?.pnl ?? 0} /></p>
              <p className="muted">{stats?.won ?? 0} נצחונות · {stats?.lost ?? 0} הפסדים · {Math.round((stats?.winPct ?? 0) * 100)}%</p>
              <p>שערים {stats?.goalsFor ?? 0}:{stats?.goalsAgainst ?? 0} · רצף שיא {stats?.bestStreak ?? 0}</p>
              <Pips form={stats?.form ?? []} />
            </section>
            <Partner title="השותף הכי טוב" snap={stats?.bestPartner ?? null} />
            <Partner title="השותף הכי פחות מוצלח" snap={stats?.worstPartner ?? null} />
          </div>
        )
      }}
    </Gate>
  )
}

function Partner({ title, snap }: { title: string; snap: { name: string; played: number; won: number; winPct: number; pnl: number } | null }) {
  return (
    <section className="card">
      <p className="kicker">{title}</p>
      {snap ? (
        <>
          <h2 className="hero-name" style={{ fontSize: 28 }}>{snap.name}</h2>
          <p className="muted">{snap.won} מתוך {snap.played} · {Math.round(snap.winPct * 100)}% · <Money amount={snap.pnl} /></p>
        </>
      ) : <p className="muted">עוד אין עם מי להשוות.</p>}
    </section>
  )
}
