'use client'
import { useEffect, useState } from 'react'
import type { Player } from '@/lib/database.types'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const data = await fetch('/api/players').then((r) => r.json())
    setPlayers(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addPlayer() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setName('')
      await load()
    } else {
      const j = await res.json()
      setError(j.error)
    }
    setSaving(false)
  }

  async function saveEdit() {
    if (!editing || !editing.name.trim()) return
    setSaving(true)
    setError('')
    const res = await fetch(`/api/players/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name }),
    })
    if (res.ok) {
      setEditing(null)
      await load()
    } else {
      const j = await res.json()
      setError(j.error)
    }
    setSaving(false)
  }

  async function deletePlayer(id: string) {
    if (!confirm('Delete this player? Their match history will remain.')) return
    await fetch(`/api/players/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-green-400 mb-4 mt-2">Players</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
          placeholder="New player name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
        />
        <button
          onClick={addPlayer}
          disabled={saving || !name.trim()}
          className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-900 rounded-lg" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <p className="text-gray-500 text-sm">No players yet.</p>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
              {editing?.id === p.id ? (
                <>
                  <input
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-600"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                    autoFocus
                  />
                  <button onClick={saveEdit} disabled={saving} className="text-green-400 text-sm font-medium hover:text-green-300">Save</button>
                  <button onClick={() => setEditing(null)} className="text-gray-500 text-sm hover:text-gray-300">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{p.name}</span>
                  <button onClick={() => setEditing({ id: p.id, name: p.name })} className="text-gray-400 text-sm hover:text-white">Rename</button>
                  <button onClick={() => deletePlayer(p.id)} className="text-red-500 text-sm hover:text-red-400">Delete</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
