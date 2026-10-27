'use client'

import { useState } from 'react'
import { useLeague, useTitle } from '@/components/league'
import { Avatar, Gate } from '@/components/ui'

export default function PlayersPage() {
  useTitle('פלאדלייט · שחקנים')
  return <Gate>{(data) => <Squad data={data} />}</Gate>
}

function Squad({ data }: { data: import('@/lib/types').LeagueData }) {
  const { mutate } = useLeague()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const visible = data.players.filter((player) => showArchived || !player.archivedAt)

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'לא נשמר')
    }
  }

  return (
    <div>
      <header className="brand">
        <div>
          <h1>הסגל</h1>
          <small>{data.players.filter((player) => !player.archivedAt).length} פעילים</small>
        </div>
      </header>
      <form className="field" onSubmit={(event) => {
        event.preventDefault()
        const next = name
        setName('')
        void run(() => mutate('/api/players', { method: 'POST', body: JSON.stringify({ name: next }) }))
      }}>
        <span>שחקן חדש</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="שם" aria-label="שם שחקן" />
        <button type="submit" className="btn-lime" disabled={!name.trim()}>הוספה</button>
      </form>
      {error && <p className="banner bad" role="alert">{error}</p>}
      {visible.map((player) => (
        <div key={player.id} className="person">
          <Avatar name={player.name} id={player.id} />
          <div className="grow">
            {editing?.id === player.id ? (
              <input value={editing.name} aria-label="שם חדש" onChange={(event) => setEditing({ id: player.id, name: event.target.value })} onKeyDown={(event) => {
                if (event.key === 'Enter') void run(async () => { await mutate(`/api/players/${player.id}`, { method: 'PATCH', body: JSON.stringify({ name: editing.name }) }); setEditing(null) })
              }} />
            ) : (
              <strong>{player.name}{player.archivedAt ? ' · ארכיון' : ''}</strong>
            )}
            <div className="dim">דירוג {Math.round(player.elo)}</div>
          </div>
          <button type="button" className="btn-ghost" style={{ width: 'auto', minHeight: 40 }} onClick={() => setEditing(editing?.id === player.id ? null : { id: player.id, name: player.name })}>שם</button>
          <button type="button" className="btn-heat" style={{ width: 'auto', minHeight: 40 }} onClick={() => void run(() => mutate(`/api/players/${player.id}`, { method: player.archivedAt ? 'PATCH' : 'DELETE', body: player.archivedAt ? JSON.stringify({ archived: false }) : undefined }))}>
            {player.archivedAt ? 'שחזור' : 'הסרה'}
          </button>
        </div>
      ))}
      <button type="button" className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setShowArchived((value) => !value)}>
        {showArchived ? 'הסתרת ארכיון' : 'הצגת ארכיון'}
      </button>
    </div>
  )
}
