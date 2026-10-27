'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { balanceAssignment, randomAssignment, suggestAssignment } from '@/lib/rotation'
import { formatTime, shekel, teamLabel } from '@/lib/format'
import type { LeagueData, Rotation, Session } from '@/lib/types'
import { ScoreBoard, SidePicker, sidesFrom, teamsFrom, type SideMap } from './board'
import { useLeague } from './league'
import { Empty } from './ui'

const ROTATION_COPY: Record<Rotation, string> = {
  winner_stays: 'המנצחים נשארים. מי שמפסיד מתחלף עם מי שמחכה.',
  fair: 'כולם יושבים בערך אותו דבר, והזוגות מתחלפים.',
  pairs: 'שותף קבוע לכל הערב. בשישה, הזוג המנצח נשאר והממתינים נכנסים.',
}

export function NightFlow({ data }: { data: LeagueData }) {
  const live = data.sessions.find((session) => session.status === 'live' && !session.deletedAt)
  if (!live) return <OpenNight data={data} />
  return <Desk data={data} session={live} />
}

function OpenNight({ data }: { data: LeagueData }) {
  const { mutate } = useLeague()
  const active = data.players.filter((player) => !player.archivedAt)
  const [picked, setPicked] = useState<string[]>([])
  const [stake, setStake] = useState(data.settings.defaultStake)
  const [rotation, setRotation] = useState<Rotation>('winner_stays')
  const [saveDefault, setSaveDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id)
      if (current.length >= 6) return current
      return [...current, id]
    })
  }

  async function start() {
    setBusy(true)
    setError(null)
    try {
      await mutate('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          playerIds: picked,
          stake,
          rotation,
          saveDefaultStake: saveDefault && stake !== data.settings.defaultStake,
        }),
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'לא הצלחנו לפתוח ערב')
    } finally {
      setBusy(false)
    }
  }

  if (active.length < 4) {
    return <Empty title="עוד אין סגל" body="צריך לפחות ארבעה שחקנים כדי לפתוח ערב." href="/players" action="להוסיף שחקנים" />
  }

  const pairsBlocked = picked.length === 5
  return (
    <div className="stack">
      <header className="brand">
        <div>
          <h1>מי עולה?</h1>
          <small>FLOODLIGHT</small>
        </div>
        <span className="live-dot">{picked.length}/6</span>
      </header>
      <p className="muted">4, 5 או 6. עם חמישה או שישה, מי שנשאר בחוץ נכנס ברוטציה.</p>
      <div className="chips" style={{ marginTop: 12 }}>
        {active.map((player) => (
          <button key={player.id} type="button" className={`chip${picked.includes(player.id) ? ' on' : ''}`} onClick={() => toggle(player.id)} aria-pressed={picked.includes(player.id)}>
            {player.name}
          </button>
        ))}
      </div>
      <label className="field">
        <span>הימור לשחקן, לכל משחק</span>
        <input inputMode="numeric" value={stake} onChange={(event) => setStake(Number(event.target.value.replace(/[^\d]/g, '')) || 0)} />
      </label>
      <p className="dim">כל מנצח מקבל {shekel(stake || 0)}, כל מפסיד משלם אותו סכום. ברירת המחדל עכשיו {shekel(data.settings.defaultStake)}.</p>
      <label className="check">
        <input type="checkbox" checked={saveDefault} onChange={(event) => setSaveDefault(event.target.checked)} />
        לשמור את הסכום הזה כברירת מחדל
      </label>
      <div className="seg" style={{ marginTop: 12 }} role="group" aria-label="שיטת ערב">
        {([
          ['winner_stays', 'מנצח נשאר'],
          ['fair', 'הוגן'],
          ['pairs', 'זוגות'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" className={rotation === value ? 'on' : undefined} disabled={value === 'pairs' && pairsBlocked} onClick={() => setRotation(value)}>
            {label}
          </button>
        ))}
      </div>
      <p className="muted">{pairsBlocked && rotation === 'pairs' ? 'זוגות קבועים עובדים עם 4 או 6.' : ROTATION_COPY[rotation]}</p>
      {error && <p className="banner bad" role="alert">{error}</p>}
      <button type="button" className="btn-lime" style={{ marginTop: 8 }} disabled={busy || picked.length < 4 || picked.length > 6 || stake < 1 || (rotation === 'pairs' && pairsBlocked)} onClick={() => void start()}>
        {busy ? 'פותח…' : 'פותחים ערב'}
      </button>
    </div>
  )
}

function Desk({ data, session }: { data: LeagueData; session: Session }) {
  const router = useRouter()
  const { mutate } = useLeague()
  const rosterPlayers = session.playerIds.map((id) => data.players.find((player) => player.id === id)).filter((player): player is NonNullable<typeof player> => !!player)
  const games = data.matches.filter((match) => match.sessionId === session.id && !match.deletedAt)
  const suggestion = useMemo(
    () => suggestAssignment({
      players: rosterPlayers.map((player) => ({ id: player.id, elo: player.elo })),
      rotation: session.rotation,
      lockedPairs: session.lockedPairs,
      matches: games.map((match) => ({ teamA: match.teamA, teamB: match.teamB, scoreA: match.scoreA, scoreB: match.scoreB })),
    }),
    [games, rosterPlayers, session.lockedPairs, session.rotation],
  )
  const [manual, setManual] = useState<SideMap | null>(null)
  const [scoreA, setScoreA] = useState(0)
  const [scoreB, setScoreB] = useState(0)
  const [stake, setStake] = useState(session.stake)
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mix, setMix] = useState(0)

  const sides = manual ?? sidesFrom(suggestion.teamA, suggestion.teamB, session.playerIds)
  const { teamA, teamB } = teamsFrom(sides, session.playerIds)
  const valid = teamA.length === 2 && teamB.length === 2 && new Set([...teamA, ...teamB]).size === 4
  const draw = scoreA === scoreB

  function apply(next: { teamA: [string, string]; teamB: [string, string] }) {
    setManual(sidesFrom(next.teamA, next.teamB, session.playerIds))
    setEditing(null)
  }

  async function save() {
    if (!valid || draw) {
      setError(draw ? 'אין תיקו. ממשיכים לשער זהב.' : 'צריך שני זוגות, בלי כפילויות.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await mutate(editing ? `/api/matches/${editing}` : '/api/matches', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ sessionId: session.id, teamA, teamB, scoreA, scoreB, stake }),
      })
      setManual(null)
      setEditing(null)
      setScoreA(0)
      setScoreB(0)
      setStake(session.stake)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'השמירה נכשלה')
    } finally {
      setBusy(false)
    }
  }

  async function closeNight() {
    if (!window.confirm('לסגור את הערב ולהכין סיכום?')) return
    setBusy(true)
    setError(null)
    try {
      await mutate(`/api/sessions/${session.id}/close`, { method: 'POST' })
      router.push(`/night/${session.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'לא הצלחנו לסגור')
      setBusy(false)
    }
  }

  async function cancelNight() {
    const message = games.length ? 'הערב והמשחקים שלו יעברו לארכיון. אפשר לשחזר אחר כך.' : 'לבטל את הערב?'
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      await mutate(`/api/sessions/${session.id}`, { method: 'DELETE' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'לא בוטל')
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('להעביר את המשחק לארכיון?')) return
    setBusy(true)
    setError(null)
    try {
      await mutate(`/api/matches/${id}`, { method: 'DELETE' })
      if (editing === id) setEditing(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'לא נמחק')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <header className="brand">
        <div>
          <h1>{session.title}</h1>
          <small>{ROTATION_COPY[session.rotation]}</small>
        </div>
      </header>
      <div className="card">
        <p className="kicker">{editing ? 'עריכת תוצאה' : suggestion.label}</p>
        <ScoreBoard
          players={data.players}
          teamA={teamA}
          teamB={teamB}
          scoreA={scoreA}
          scoreB={scoreB}
          onScore={(side, next) => (side === 'a' ? setScoreA(next) : setScoreB(next))}
        />
        {draw && (scoreA > 0 || scoreB > 0) && <p className="banner" style={{ marginTop: 12 }}>שער זהב. אין תיקו בליגה.</p>}
        <label className="field">
          <span>הימור במשחק הזה</span>
          <input inputMode="numeric" value={stake} onChange={(event) => setStake(Number(event.target.value.replace(/[^\d]/g, '')) || 0)} />
        </label>
        <div className="btn-row">
          <button type="button" className="btn-ghost" onClick={() => apply(suggestion)}>ההצעה</button>
          <button type="button" className="btn-ghost" onClick={() => apply(balanceAssignment(rosterPlayers))}>איזון</button>
          <button type="button" className="btn-ghost" onClick={() => { setMix((n) => n + 1); apply(randomAssignment(rosterPlayers, mulberry(mix + 1))) }}>ערבוב</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <SidePicker
            roster={session.playerIds}
            players={data.players}
            sides={sides}
            onChange={(id, side) => setManual({ ...sides, [id]: side })}
          />
        </div>
        {error && <p className="banner bad" role="alert" style={{ marginTop: 12 }}>{error}</p>}
        <button type="button" className="btn-lime" style={{ marginTop: 12 }} disabled={busy || !valid || draw || stake < 1} onClick={() => void save()}>
          {busy ? 'שומר…' : editing ? 'עדכון תוצאה' : 'סגירת משחק'}
        </button>
        {editing && (
          <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => { setEditing(null); setManual(null); setScoreA(0); setScoreB(0) }}>
            ביטול עריכה
          </button>
        )}
      </div>

      <h2 className="section">הערב עד עכשיו</h2>
      {games.length === 0 && <p className="muted">עוד לא נבעט כלום.</p>}
      {games.map((match) => (
        <article key={match.id} className="card">
          <div className="row">
            <strong>{teamLabel(match.scoreA > match.scoreB ? match.teamA : match.teamB, data.players)}</strong>
            <span className="num" style={{ fontFamily: 'var(--font-teko)', fontSize: 28 }}>{Math.max(match.scoreA, match.scoreB)}–{Math.min(match.scoreA, match.scoreB)}</span>
          </div>
          <p className="dim" style={{ margin: '4px 0 0' }}>
            נגד {teamLabel(match.scoreA > match.scoreB ? match.teamB : match.teamA, data.players)} · {shekel(match.stake)} · {formatTime(match.playedAt)}
            {match.predA != null && ` · לפני המשחק ${Math.round((match.scoreA > match.scoreB ? match.predA : 1 - match.predA) * 100)}% למנצחים`}
          </p>
          <div className="btn-row" style={{ marginTop: 10 }}>
            <button type="button" className="btn-ghost" onClick={() => {
              setEditing(match.id)
              setManual(sidesFrom(match.teamA, match.teamB, session.playerIds))
              setScoreA(match.scoreA)
              setScoreB(match.scoreB)
              setStake(match.stake)
            }}>עריכה</button>
            <button type="button" className="btn-heat" onClick={() => void remove(match.id)}>ארכיון</button>
          </div>
        </article>
      ))}

      <button type="button" className="btn-amber" disabled={busy || games.length === 0} onClick={() => void closeNight()}>
        סוגרים ערב
      </button>
      <button type="button" className="btn-ghost" disabled={busy} onClick={() => void cancelNight()}>
        {games.length ? 'ארכיון לכל הערב' : 'ביטול הערב'}
      </button>
    </div>
  )
}

function mulberry(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
