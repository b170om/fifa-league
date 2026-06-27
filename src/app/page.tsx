'use client'
import { useEffect, useState } from 'react'
import type { Match, Player } from '@/lib/database.types'
import { computeSinglesTable, type PlayerStats } from '@/lib/stats'
import FormBadge from '@/components/FormBadge'
import Link from 'next/link'

export default function TablePage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

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

  const table: PlayerStats[] = loading ? [] : computeSinglesTable(matches, players)

  return (
    <div>
      <h1 className="text-xl font-bold text-green-400 mb-4 mt-2">Singles Table</h1>
      {loading ? (
        <Skeleton />
      ) : table.length === 0 ? (
        <p className="text-gray-500 text-sm">No data yet. Add players and record matches.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-xs uppercase">
                <th className="px-3 py-2 text-left w-6">#</th>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-2 py-2 text-center">P</th>
                <th className="px-2 py-2 text-center">W</th>
                <th className="px-2 py-2 text-center">D</th>
                <th className="px-2 py-2 text-center">L</th>
                <th className="px-2 py-2 text-center">GF</th>
                <th className="px-2 py-2 text-center">GA</th>
                <th className="px-2 py-2 text-center">GD</th>
                <th className="px-2 py-2 text-center font-bold text-white">Pts</th>
                <th className="px-2 py-2 text-center">Win%</th>
                <th className="px-3 py-2 text-center">Form</th>
              </tr>
            </thead>
            <tbody>
              {table.map((s, i) => (
                <tr key={s.playerId} className="border-t border-gray-800 hover:bg-gray-900/50">
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      href={`/h2h?a=${s.playerId}`}
                      className="hover:text-green-400 transition-colors"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-center text-gray-300">{s.played}</td>
                  <td className="px-2 py-2.5 text-center text-green-400">{s.won}</td>
                  <td className="px-2 py-2.5 text-center text-gray-400">{s.drawn}</td>
                  <td className="px-2 py-2.5 text-center text-red-400">{s.lost}</td>
                  <td className="px-2 py-2.5 text-center text-gray-300">{s.goalsFor}</td>
                  <td className="px-2 py-2.5 text-center text-gray-300">{s.goalsAgainst}</td>
                  <td
                    className={`px-2 py-2.5 text-center font-medium ${s.goalDiff > 0 ? 'text-green-400' : s.goalDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}
                  >
                    {s.goalDiff > 0 ? '+' : ''}
                    {s.goalDiff}
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-white">{s.points}</td>
                  <td className="px-2 py-2.5 text-center text-gray-400">{s.winPct}%</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-0.5 justify-center">
                      {s.form.map((f, j) => (
                        <FormBadge key={j} result={f} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-900 border-t border-gray-800 first:border-0" />
      ))}
    </div>
  )
}
