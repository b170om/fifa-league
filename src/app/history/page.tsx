'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDayTime, teamLabel } from '@/lib/format'
import { useLeague, useTitle } from '@/components/league'
import { ScoreBoard, SidePicker, sidesFrom, teamsFrom } from '@/components/board'
import { Gate } from '@/components/ui'

export default function HistoryPage() {
  useTitle('פלאדלייט · היסטוריה')
  return <Gate>{(data) => <Archive data={data} />}</Gate>
}

function Archive({ data }: { data: import('@/lib/types').LeagueData }) {
  const { mutate } = useLeague()
  const [tab, setTab] = useState<'games' | 'audit'>('games')
  const [showDeleted, setShowDeleted] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const matches = data.matches.filter((match) => showDeleted || !match.deletedAt)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'לא נשמר')
    }
  }

  return (
    <div className="stack">
      <header className="brand"><div><h1>היסטוריה</h1><small>אפשר לתקן</small></div></header>
      <div className="seg">
        <button type="button" className={tab === 'games' ? 'on' : undefined} onClick={() => setTab('games')}>משחקים</button>
        <button type="button" className={tab === 'audit' ? 'on' : undefined} onClick={() => setTab('audit')}>שינויים</button>
      </div>
      {error && <p className="banner bad" role="alert">{error}</p>}
      {tab === 'audit' && (
        data.audit.length === 0 ? <p className="muted">עוד אין שינויים.</p> : data.audit.map((entry) => (
          <article key={entry.id} className="card">
            <strong>{entry.summary}</strong>
            <p className="dim" style={{ margin: 0 }}>{formatDayTime(entry.createdAt)} · {entry.action}</p>
          </article>
        ))
      )}
      {tab === 'games' && (
        <>
          <label className="check">
            <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />
            להציג גם ארכיון
          </label>
          {matches.length === 0 && <p className="muted">אין משחקים.</p>}
          {matches.map((match) => {
            const session = data.sessions.find((item) => item.id === match.sessionId)
            const roster = session?.playerIds ?? [...match.teamA, ...match.teamB]
            return (
              <article key={match.id} className="card" style={{ opacity: match.deletedAt ? 0.6 : 1 }}>
                <div className="row">
                  <div>
                    <strong>{teamLabel(match.teamA, data.players)} {match.scoreA}–{match.scoreB} {teamLabel(match.teamB, data.players)}</strong>
                    <p className="dim" style={{ margin: 0 }}>{session ? session.title : 'בלי ערב'} · {formatDayTime(match.playedAt)} · ₪{match.stake}</p>
                  </div>
                </div>
                <div className="btn-row" style={{ marginTop: 8 }}>
                  {session && <Link className="btn-ghost" href={`/night/${session.id}`}>סיכום</Link>}
                  {!match.deletedAt && <button type="button" className="btn-ghost" onClick={() => setEditing(editing === match.id ? null : match.id)}>עריכה</button>}
                  <button type="button" className={match.deletedAt ? 'btn-lime' : 'btn-heat'} onClick={() => void run(() => mutate(match.deletedAt ? `/api/matches/${match.id}/restore` : `/api/matches/${match.id}`, { method: match.deletedAt ? 'POST' : 'DELETE' }))}>
                    {match.deletedAt ? 'שחזור' : 'ארכיון'}
                  </button>
                </div>
                {editing === match.id && !match.deletedAt && (
                  <Editor
                    roster={roster}
                    players={data.players}
                    teamA={match.teamA}
                    teamB={match.teamB}
                    scoreA={match.scoreA}
                    scoreB={match.scoreB}
                    stake={match.stake}
                    onCancel={() => setEditing(null)}
                    onSave={(value) => void run(async () => {
                      await mutate(`/api/matches/${match.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ ...value, sessionId: match.sessionId }),
                      })
                      setEditing(null)
                    })}
                  />
                )}
              </article>
            )
          })}
          {data.sessions.filter((session) => session.deletedAt).map((session) => (
            <button key={session.id} type="button" className="btn-ghost" onClick={() => void run(() => mutate(`/api/sessions/${session.id}/restore`, { method: 'POST' }))}>
              שחזור {session.title}
            </button>
          ))}
        </>
      )}
    </div>
  )
}

function Editor({
  roster, players, teamA, teamB, scoreA: initialA, scoreB: initialB, stake: initialStake, onSave, onCancel,
}: {
  roster: string[]
  players: import('@/lib/types').Player[]
  teamA: string[]
  teamB: string[]
  scoreA: number
  scoreB: number
  stake: number
  onSave: (value: { teamA: string[]; teamB: string[]; scoreA: number; scoreB: number; stake: number }) => void
  onCancel: () => void
}) {
  const [sides, setSides] = useState(sidesFrom(teamA, teamB, roster))
  const [scoreA, setScoreA] = useState(initialA)
  const [scoreB, setScoreB] = useState(initialB)
  const [stake, setStake] = useState(initialStake)
  const teams = teamsFrom(sides, roster)
  const draw = scoreA === scoreB
  return (
    <div style={{ marginTop: 12 }}>
      <ScoreBoard players={players} teamA={teams.teamA} teamB={teams.teamB} scoreA={scoreA} scoreB={scoreB} onScore={(side, next) => (side === 'a' ? setScoreA(next) : setScoreB(next))} />
      <SidePicker roster={roster} players={players} sides={sides} onChange={(id, side) => setSides({ ...sides, [id]: side })} />
      <label className="field"><span>הימור</span><input inputMode="numeric" value={stake} onChange={(event) => setStake(Number(event.target.value.replace(/[^\d]/g, '')) || 0)} /></label>
      {draw && <p className="banner">שער זהב. אין תיקו.</p>}
      <div className="btn-row">
        <button type="button" className="btn-lime" disabled={draw || teams.teamA.length !== 2 || teams.teamB.length !== 2} onClick={() => onSave({ teamA: teams.teamA, teamB: teams.teamB, scoreA, scoreB, stake })}>שמירה</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>ביטול</button>
      </div>
    </div>
  )
}
