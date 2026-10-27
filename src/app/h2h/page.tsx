'use client'

import { useState } from 'react'
import { computeH2H } from '@/lib/stats'
import { useTitle } from '@/components/league'
import { Gate } from '@/components/ui'
import { formatDay, teamLabel } from '@/lib/format'

export default function H2HPage() {
  useTitle('פלאדלייט · ראש בראש')
  return (
    <Gate>
      {(data) => {
        const people = data.players.filter((player) => !player.archivedAt)
        return <Head people={people} matches={data.matches} all={data.players} />
      }}
    </Gate>
  )
}

function Head({ people, matches, all }: { people: import('@/lib/types').Player[]; matches: import('@/lib/types').Match[]; all: import('@/lib/types').Player[] }) {
  const [a, setA] = useState(people[0]?.id ?? '')
  const [b, setB] = useState(people[1]?.id ?? '')
  const ready = a && b && a !== b
  const h2h = ready ? computeH2H(matches, a, b) : null
  const name = (id: string) => all.find((player) => player.id === id)?.name ?? ''
  return (
    <div className="stack">
      <header className="brand"><div><h1>ראש בראש</h1><small>גם כשיש שותפים</small></div></header>
      <div className="btn-row">
        <label className="field" style={{ flex: 1 }}>
          <span>שחקן</span>
          <select value={a} onChange={(event) => setA(event.target.value)} aria-label="שחקן ראשון">
            {people.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>יריב</span>
          <select value={b} onChange={(event) => setB(event.target.value)} aria-label="שחקן שני">
            {people.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
          </select>
        </label>
      </div>
      {!ready && <p className="muted">בוחרים שני שחקנים שונים.</p>}
      {h2h && (
        <>
          <section className="card">
            <div className="row">
              <div><div className="score num">{h2h.winsA}</div><strong>{name(a)}</strong></div>
              <div className="vs">נגד</div>
              <div><div className="score num">{h2h.winsB}</div><strong>{name(b)}</strong></div>
            </div>
            <p className="muted">שערים {h2h.goalsA}:{h2h.goalsB}. נספר כל משחק שבו הם היו ביריבות, כולל 2 על 2.</p>
            {h2h.togetherPlayed > 0 && <p>כשותפים: {h2h.togetherWins} נצחונות מתוך {h2h.togetherPlayed}.</p>}
          </section>
          {h2h.meetings.length === 0 && <p className="muted">עוד לא נפגשו ביריבות.</p>}
          {h2h.meetings.map((meeting) => (
            <article key={meeting.matchId} className="card">
              <div className="row">
                <strong>{meeting.won ? name(a) : name(b)}</strong>
                <span className="num">{meeting.scoreFor}–{meeting.scoreAgainst}</span>
              </div>
              <p className="dim" style={{ margin: 0 }}>
                {formatDay(meeting.playedAt)}
                {meeting.partners.length > 0 && ` · עם ${teamLabel(meeting.partners, all)}`}
                {` · נגד ${teamLabel(meeting.opponents, all)}`}
              </p>
            </article>
          ))}
        </>
      )}
    </div>
  )
}
