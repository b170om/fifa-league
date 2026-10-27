'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useLeague, useTitle } from '@/components/league'
import { ShareNight } from '@/components/share-night'
import { ErrorBlock, Gate, Money } from '@/components/ui'
import { formatDayTime, teamLabel } from '@/lib/format'
import { activeMatches } from '@/lib/stats'
import { summarize } from '@/lib/summary'
import type { LeagueData } from '@/lib/types'

export default function NightSummaryPage() {
  useTitle('פלאדלייט · סיכום')
  const params = useParams<{ id: string }>()
  return (
    <Gate>
      {(data) => <Summary id={params.id} data={data} />}
    </Gate>
  )
}

function Summary({ id, data }: { id: string; data: LeagueData }) {
  const { mutate } = useLeague()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const session = data.sessions.find((item) => item.id === id)
  if (!session) return <ErrorBlock message="הערב הזה לא נמצא." />
  const matches = data.matches.filter((match) => match.sessionId === id && !match.deletedAt)
  const summary = summarize(matches, data.players, session.playerIds)

  async function recap() {
    setBusy(true)
    setError(null)
    try {
      await mutate(`/api/sessions/${id}/recap`, { method: 'POST' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'הסיכום לא נוצר')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <header className="brand">
        <div>
          <h1>{session.title}</h1>
          <small>{formatDayTime(session.startedAt)}{session.status === 'live' ? ' · עדיין פתוח' : ''}</small>
        </div>
      </header>
      {session.status === 'live' && <Link className="btn-lime" href="/night">חזרה למשחק</Link>}
      <section className="card">
        <p className="kicker">התוצאות</p>
        {activeMatches(matches).length === 0 && <p className="muted">אין משחקים בערב הזה.</p>}
        {activeMatches(matches).slice().reverse().map((match) => {
          const aWon = match.scoreA > match.scoreB
          return (
            <p key={match.id} className="row" style={{ margin: '8px 0' }}>
              <span>{teamLabel(aWon ? match.teamA : match.teamB, data.players)}</span>
              <b className="num">{aWon ? match.scoreA : match.scoreB}–{aWon ? match.scoreB : match.scoreA}</b>
            </p>
          )
        })}
      </section>
      <section className="card">
        <p className="kicker">קופת הערב</p>
        {summary.standings.map((row) => (
          <div key={row.playerId} className="row" style={{ padding: '6px 0' }}>
            <span>{row.name}</span>
            <Money amount={row.pnl} />
          </div>
        ))}
        {summary.transfers.length === 0 ? <p className="muted">אף אחד לא חייב לאף אחד.</p> : summary.transfers.map((transfer) => (
          <p key={`${transfer.fromId}-${transfer.toId}`} style={{ fontWeight: 700 }}>
            {data.players.find((player) => player.id === transfer.fromId)?.name} מעביר <span className="num">₪{transfer.amount}</span> ל{data.players.find((player) => player.id === transfer.toId)?.name}
          </p>
        ))}
      </section>
      <div className="card">
        <p className="kicker">מצטיין</p>
        <h2 className="hero-name">{summary.mvp ? summary.mvp.name : 'עוד אין'}</h2>
        {summary.mvp && <p className="hero-money"><Money amount={summary.mvp.pnl} /></p>}
      </div>
      <div className="card">
        <p className="kicker">הפתעה</p>
        {summary.upset ? (
          <p style={{ fontWeight: 700, marginTop: 0 }}>
            {teamLabel(summary.upset.winnerIds, data.players)} ניצחו עם {Math.round(summary.upset.winnerPct * 100)}% בלבד לפני הפתיחה.
          </p>
        ) : <p className="muted">המועדפים עשו את העבודה, או שאין עדיין חיזוי.</p>}
      </div>
      <section className="card">
        <p className="kicker">השדר</p>
        <p style={{ fontSize: 18, lineHeight: 1.5 }}>{session.aiRecap ?? 'עוד אין סיכום. סוגרים את הערב, או מייצרים אחד עכשיו.'}</p>
        <p className="dim">{session.aiRecapSource === 'model' ? `נכתב במודל${session.aiModel ? ` (${session.aiModel})` : ''}.` : session.aiRecap ? 'נכתב מקומית, בלי מודל.' : ''}</p>
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => void recap()}>{busy ? 'כותב…' : 'סיכום מחדש'}</button>
        {error && <p className="banner bad" role="alert">{error}</p>}
      </section>
      <ShareNight session={session} matches={matches} players={data.players} summary={summary} />
    </div>
  )
}
