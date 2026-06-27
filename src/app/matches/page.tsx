'use client'
import { useEffect, useState } from 'react'
import type { Match, Player } from '@/lib/database.types'
import MatchForm from '@/components/MatchForm'
import MatchCard from '@/components/MatchCard'

export default function MatchesPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Match | null>(null)

  async function load() {
    const [p, m] = await Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ])
    setPlayers(p)
    setMatches(m)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function deleteMatch(id: string) {
    if (!confirm('Delete this match?')) return
    await fetch(`/api/matches/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 mt-2">
        <h1 className="text-xl font-bold text-green-400">Match History</h1>
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Match
          </button>
        )}
      </div>

      {(showForm || editing) && (
        <div className="mb-6">
          <MatchForm
            players={players}
            match={editing ?? undefined}
            onSave={async () => {
              setShowForm(false)
              setEditing(null)
              await load()
            }}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-900 rounded-xl" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <p className="text-gray-500 text-sm">No matches yet.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              players={players}
              onEdit={() => setEditing(m)}
              onDelete={() => deleteMatch(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
