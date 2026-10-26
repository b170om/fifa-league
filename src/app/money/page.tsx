'use client'

import { useState } from 'react'
import { shekel } from '@/lib/format'
import { activeMatches } from '@/lib/stats'
import { summarize } from '@/lib/summary'
import { useTitle } from '@/components/league'
import { Gate, Money } from '@/components/ui'

export default function MoneyPage() {
  useTitle('פלאדלייט · קופה')
  return <Gate>{(data) => <Ledger data={data} />}</Gate>
}

function Ledger({ data }: { data: import('@/lib/types').LeagueData }) {
  const nights = data.sessions.filter((session) => !session.deletedAt)
  const [scope, setScope] = useState<string>('all')
  const session = nights.find((item) => item.id === scope)
  const matches = activeMatches(data.matches).filter((match) => scope === 'all' || match.sessionId === scope)
  const summary = summarize(matches, data.players, session?.playerIds)
  const max = Math.max(1, ...summary.standings.map((row) => Math.abs(row.pnl)))
  const text = [
    scope === 'all' ? 'פלאדלייט · כל הקופה' : `פלאדלייט · ${session?.title ?? 'ערב'}`,
    ...summary.transfers.map((transfer) => {
      const from = data.players.find((player) => player.id === transfer.fromId)?.name
      const to = data.players.find((player) => player.id === transfer.toId)?.name
      return `${from} מעביר ${shekel(transfer.amount)} ל${to}`
    }),
  ].join('\n')

  return (
    <div className="stack">
      <header className="brand">
        <div>
          <h1>הקופה</h1>
          <small>מינימום העברות</small>
        </div>
      </header>
      <label className="field">
        <span>טווח</span>
        <select value={scope} onChange={(event) => setScope(event.target.value)} aria-label="טווח קופה">
          <option value="all">הכל</option>
          {nights.map((night) => <option key={night.id} value={night.id}>{night.title}</option>)}
        </select>
      </label>
      <p className="muted">כל מנצח ב־{shekel(session?.stake ?? data.settings.defaultStake)} למשחק, כל מפסיד באותו סכום. ההעברות כאן מאפסות את החוב במספר הצעדים הקטן ביותר.</p>
      <section className="card bars">
        {summary.standings.map((row) => (
          <div key={row.playerId}>
            <div className="bar-label"><span>{row.name}</span><Money amount={row.pnl} /></div>
            <div className="track" aria-hidden>
              <span style={{ width: `${(Math.abs(row.pnl) / max) * 100}%`, background: row.pnl >= 0 ? 'var(--lime)' : 'var(--heat)' }} />
            </div>
          </div>
        ))}
      </section>
      <section className="card">
        <p className="kicker">מעבירים</p>
        {summary.transfers.length === 0 && <p className="muted">אין מה להעביר.</p>}
        {summary.transfers.map((transfer) => (
          <p key={`${transfer.fromId}-${transfer.toId}-${transfer.amount}`} style={{ fontWeight: 800, fontSize: 18 }}>
            {data.players.find((player) => player.id === transfer.fromId)?.name} → {data.players.find((player) => player.id === transfer.toId)?.name} <span className="num">₪{transfer.amount}</span>
          </p>
        ))}
        <button type="button" className="btn-ghost" onClick={() => void navigator.clipboard.writeText(text)}>העתקה לוואטסאפ</button>
      </section>
    </div>
  )
}
