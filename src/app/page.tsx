'use client'

import Link from 'next/link'
import { formatDayTime, teamLabel } from '@/lib/format'
import { activeMatches, computePlayerStats } from '@/lib/stats'
import { summarize } from '@/lib/summary'
import { PnlChart } from '@/components/chart'
import { useTitle } from '@/components/league'
import { Avatar, Empty, Gate, Money, Pips } from '@/components/ui'

export default function HomePage() {
  useTitle('פלאדלייט')
  return (
    <Gate>
      {(data) => {
        const live = data.sessions.find((session) => session.status === 'live' && !session.deletedAt)
        const table = computePlayerStats(activeMatches(data.matches), data.players).filter((row) => row.played > 0)
        const recent = activeMatches(data.matches).slice(-3).reverse()
        const leader = table[0]
        return (
          <div className="stack">
            <header className="brand">
              <div>
                <h1>פלאדלייט</h1>
                <small>FLOODLIGHT LEAGUE</small>
              </div>
              {live ? <span className="live-dot"><i />ערב פתוח</span> : <span className="dim">אין ערב פתוח</span>}
            </header>

            {live && (
              <Link href="/night" className="card" style={{ display: 'block', marginTop: 16 }}>
                <p className="kicker">חוזרים לדשא</p>
                <div className="row">
                  <strong style={{ fontSize: 22 }}>{live.title}</strong>
                  <span className="money num">{`₪${live.stake}`}</span>
                </div>
                <p className="muted" style={{ marginBottom: 0 }}>{live.playerIds.map((id) => data.players.find((player) => player.id === id)?.name).filter(Boolean).join(' · ')}</p>
              </Link>
            )}

            {!leader && (
              <div style={{ marginTop: 16 }}>
                <Empty title="הדשא עוד יבש" body="פותחים ערב, בוחרים ארבעה עד שישה, ורושמים תוצאה בלי תיקו." href="/night" action="לפתוח ערב" />
              </div>
            )}

            {leader && (
              <>
                <section className="card" style={{ marginTop: 16 }}>
                  <p className="kicker">מוביל הקופה</p>
                  <div className="row">
                    <div>
                      <h2 className="hero-name">{leader.name}</h2>
                      <p className="hero-money"><Money amount={leader.pnl} /></p>
                    </div>
                    <Avatar name={leader.name} id={leader.playerId} size={64} />
                  </div>
                  <p className="muted">{leader.won} נצחונות · {Math.round(leader.winPct * 100)}% · דירוג {Math.round(leader.elo)}</p>
                  <Pips form={leader.form} />
                </section>
                <h2 className="section">הקופה</h2>
                <div className="card">
                  {table.slice(1).map((row) => (
                    <Link key={row.playerId} href={`/players/${row.playerId}`} className="person">
                      <Avatar name={row.name} id={row.playerId} />
                      <div className="grow">
                        <strong>{row.name}</strong>
                        <div className="dim">{row.won}-{row.lost} · {Math.round(row.winPct * 100)}%</div>
                      </div>
                      <Money amount={row.pnl} />
                    </Link>
                  ))}
                  <Link href="/money" className="btn-ghost" style={{ marginTop: 8 }}>מי חייב למי</Link>
                </div>
                <h2 className="section">לאורך הזמן</h2>
                <div className="card">
                  <PnlChart matches={data.matches} players={data.players} />
                </div>
                <h2 className="section">אחרונים</h2>
                {recent.map((match) => {
                  const aWon = match.scoreA > match.scoreB
                  return (
                    <article key={match.id} className="card">
                      <div className="row">
                        <strong>{teamLabel(aWon ? match.teamA : match.teamB, data.players)}</strong>
                        <span className="num" style={{ fontFamily: 'var(--font-teko)', fontSize: 28 }}>{match.scoreA}–{match.scoreB}</span>
                      </div>
                      <p className="dim" style={{ margin: 0 }}>נגד {teamLabel(aWon ? match.teamB : match.teamA, data.players)} · {formatDayTime(match.playedAt)}</p>
                    </article>
                  )
                })}
                <p className="dim">הסיכום של הערב כולל רווח, מצטיין והפתעה. {summarize(activeMatches(data.matches), data.players).transfers.length > 0 ? 'יש חובות פתוחים בקופה.' : 'הקופה כרגע מאוזנת.'}</p>
              </>
            )}
          </div>
        )
      }}
    </Gate>
  )
}
