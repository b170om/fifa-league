'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Match, Player } from '@/lib/database.types'
import { computeH2H } from '@/lib/stats'
import MatchCard from '@/components/MatchCard'

function H2HContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [playerA, setPlayerA] = useState(params.get('a') ?? '')
  const [playerB, setPlayerB] = useState(params.get('b') ?? '')

  useEffect(() => {
    Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ]).then(([p, m]) => {
      setPlayers(p)
      setMatches(m)
      setLoading(false)
    })
  }, [])

  const pA = players.find((p) => p.id === playerA)
  const pB = players.find((p) => p.id === playerB)
  const h2h = pA && pB ? computeH2H(matches, pA, pB) : null

  const total = h2h ? h2h.playerA.wins + h2h.playerB.wins + h2h.draws : 0
  const aBarPct = total > 0 ? Math.round((h2h!.playerA.wins / total) * 100) : 0
  const bBarPct = total > 0 ? Math.round((h2h!.playerB.wins / total) * 100) : 0
  const dBarPct = total > 0 ? 100 - aBarPct - bBarPct : 0

  return (
    <div>
      <h1 className="text-xl font-bold text-green-400 mb-4 mt-2">Head to Head</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Player A</p>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
            value={playerA}
            onChange={(e) => {
              setPlayerA(e.target.value)
              router.replace(`/h2h?a=${e.target.value}&b=${playerB}`)
            }}
          >
            <option value="">Select…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === playerB}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Player B</p>
          <select
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
            value={playerB}
            onChange={(e) => {
              setPlayerB(e.target.value)
              router.replace(`/h2h?a=${playerA}&b=${e.target.value}`)
            }}
          >
            <option value="">Select…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === playerA}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="h-32 bg-gray-900 rounded-xl animate-pulse" />}

      {!loading && h2h && total > 0 && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <div className="flex justify-between text-center mb-4">
              <div>
                <p className="text-2xl font-bold text-green-400">{h2h.playerA.wins}</p>
                <p className="text-xs text-gray-400 mt-1">{h2h.playerA.name}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-500">{h2h.draws}</p>
                <p className="text-xs text-gray-400 mt-1">Draws</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{h2h.playerB.wins}</p>
                <p className="text-xs text-gray-400 mt-1">{h2h.playerB.name}</p>
              </div>
            </div>
            <div className="flex rounded-full overflow-hidden h-3">
              {aBarPct > 0 && (
                <div className="bg-green-600 transition-all" style={{ width: `${aBarPct}%` }} />
              )}
              {dBarPct > 0 && (
                <div className="bg-gray-600 transition-all" style={{ width: `${dBarPct}%` }} />
              )}
              {bBarPct > 0 && (
                <div className="bg-blue-600 transition-all" style={{ width: `${bBarPct}%` }} />
              )}
            </div>
            <div className="flex justify-between mt-3 text-xs text-gray-500">
              <span>Goals: {h2h.playerA.goals}</span>
              <span>{total} matches</span>
              <span>Goals: {h2h.playerB.goals}</span>
            </div>
          </div>

          <h2 className="font-semibold text-gray-300 mb-3 text-sm">Match History</h2>
          <div className="space-y-3">
            {h2h.matches.map((m) => (
              <MatchCard key={m.id} match={m} players={players} onEdit={() => {}} onDelete={() => {}} />
            ))}
          </div>
        </>
      )}

      {!loading && h2h && total === 0 && (
        <p className="text-gray-500 text-sm">No 1v1 matches between these players yet.</p>
      )}

      {!loading && (!playerA || !playerB) && (
        <p className="text-gray-500 text-sm">Select two players to see their head-to-head record.</p>
      )}
    </div>
  )
}

export default function H2HPage() {
  return (
    <Suspense>
      <H2HContent />
    </Suspense>
  )
}
