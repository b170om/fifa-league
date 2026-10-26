'use client'

import { useRef, useState } from 'react'
import { formatDay, shekel, teamLabel } from '@/lib/format'
import type { NightSummary } from '@/lib/summary'
import { activeMatches } from '@/lib/stats'
import type { Match, Player, Session } from '@/lib/types'

export function shareText(session: Session, matches: Match[], players: Player[], summary: NightSummary): string {
  const lines = [
    `פלאדלייט · ${session.title}`,
    formatDay(session.startedAt),
    '',
    ...activeMatches(matches).map((match) => {
      const aWon = match.scoreA > match.scoreB
      return `${teamLabel(aWon ? match.teamA : match.teamB, players)} ${aWon ? match.scoreA : match.scoreB}–${aWon ? match.scoreB : match.scoreA} ${teamLabel(aWon ? match.teamB : match.teamA, players)}`
    }),
    '',
    'קופה:',
    ...summary.standings.map((row) => `${row.name} ${shekel(row.pnl, { signed: true })}`),
  ]
  if (summary.mvp) lines.push('', `מצטיין: ${summary.mvp.name}`)
  if (summary.upset) lines.push(`הפתעה: ${teamLabel(summary.upset.winnerIds, players)}`)
  if (session.aiRecap) lines.push('', session.aiRecap)
  return lines.join('\n')
}

export function ShareNight({ session, matches, players, summary }: { session: Session; matches: Match[]; players: Player[]; summary: NightSummary }) {
  const ref = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const text = shareText(session, matches, players, summary)
  const shown = activeMatches(matches).slice(0, 12)

  async function saveImage() {
    const node = ref.current
    if (!node) return
    setBusy(true)
    setMessage(null)
    const previous = node.style.width
    try {
      node.style.width = '1080px'
      await document.fonts.ready
      const { toPng } = await import('html-to-image')
      const url = await toPng(node, { pixelRatio: 1, cacheBust: true, backgroundColor: '#07140e' })
      const blob = await (await fetch(url)).blob()
      const file = new File([blob], 'floodlight-night.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: session.title, text: 'סיכום פלאדלייט' })
        setMessage('נפתח שיתוף. בוואטסאפ בוחרים את הצ׳אט.')
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = 'floodlight-night.png'
        link.click()
        setMessage('התמונה ירדה. שולחים אותה לוואטסאפ מהגלריה.')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') setMessage(null)
      else setMessage('לא הצלחנו לייצא תמונה. אפשר לשלוח את הטקסט.')
    } finally {
      node.style.width = previous
      setBusy(false)
    }
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setMessage('הסיכום הועתק.')
    } catch {
      setMessage('ההעתקה נחסמה בדפדפן.')
    }
  }

  return (
    <div className="stack">
      <div className="share-wrap">
        <article ref={ref} className="share-card">
          <p style={{ margin: 0, letterSpacing: '0.16em', color: '#ffc14a', fontWeight: 800, fontSize: 18 }}>FLOODLIGHT</p>
          <h2 style={{ margin: '8px 0 0', fontSize: 54, lineHeight: 0.95 }}>{session.title}</h2>
          <p style={{ margin: '8px 0 20px', color: '#b7cbb4' }}>{formatDay(session.startedAt)} · {shekel(session.stake)} למשחק</p>
          {shown.map((match) => {
            const aWon = match.scoreA > match.scoreB
            return (
              <p key={match.id} style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>
                {teamLabel(aWon ? match.teamA : match.teamB, players)} {aWon ? match.scoreA : match.scoreB}–{aWon ? match.scoreB : match.scoreA} {teamLabel(aWon ? match.teamB : match.teamA, players)}
              </p>
            )
          })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
            {summary.standings.map((row) => (
              <p key={row.playerId} style={{ margin: 0, fontSize: 22 }}>
                {row.name} <b style={{ color: row.pnl >= 0 ? '#d6ff3f' : '#ff5d3a' }}>{shekel(row.pnl, { signed: true })}</b>
              </p>
            ))}
          </div>
          {summary.mvp && <p style={{ fontSize: 24, fontWeight: 800 }}>מצטיין הערב: {summary.mvp.name}</p>}
          {summary.upset && (
            <p style={{ fontSize: 20, color: '#ffc14a' }}>
              הפתעה: {teamLabel(summary.upset.winnerIds, players)} ניצחו עם {Math.round(summary.upset.winnerPct * 100)}% לפני המשחק
            </p>
          )}
          {session.aiRecap && <p style={{ fontSize: 20, lineHeight: 1.45 }}>{session.aiRecap}</p>}
          <p style={{ marginBottom: 0, color: '#7f987f', letterSpacing: '0.08em' }}>פלאדלייט</p>
        </article>
      </div>
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button type="button" className="btn-lime" disabled={busy} onClick={() => void saveImage()}>{busy ? 'מכין תמונה…' : 'תמונה לוואטסאפ'}</button>
        <button type="button" className="btn-ghost" onClick={whatsapp}>טקסט</button>
      </div>
      <button type="button" className="btn-ghost" onClick={() => void copy()}>העתקה</button>
      {message && <p className="muted">{message}</p>}
    </div>
  )
}
