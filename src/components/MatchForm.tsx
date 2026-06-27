'use client'
import { useState } from 'react'
import type { Match, Player } from '@/lib/database.types'

interface Props {
  players: Player[]
  match?: Match
  onSave: () => void
  onCancel: () => void
}

export default function MatchForm({ players, match, onSave, onCancel }: Props) {
  const [mode, setMode] = useState<'1v1' | '2v2'>(match?.mode ?? '1v1')
  const [teamA, setTeamA] = useState<string[]>(match?.team_a_player_ids ?? [])
  const [teamB, setTeamB] = useState<string[]>(match?.team_b_player_ids ?? [])
  const [scoreA, setScoreA] = useState(match?.score_a ?? 0)
  const [scoreB, setScoreB] = useState(match?.score_b ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const slotsPerTeam = mode === '1v1' ? 1 : 2
  const allSelected = [...teamA, ...teamB]

  function togglePlayer(team: 'a' | 'b', id: string) {
    const setter = team === 'a' ? setTeamA : setTeamB
    const current = team === 'a' ? teamA : teamB
    if (current.includes(id)) {
      setter(current.filter((x) => x !== id))
    } else if (current.length < slotsPerTeam) {
      setter([...current, id])
    }
  }

  function ScoreControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center"
        >
          −
        </button>
        <span className="text-3xl font-bold w-10 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-9 h-9 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-bold text-lg flex items-center justify-center"
        >
          +
        </button>
      </div>
    )
  }

  async function submit() {
    setError('')
    if (teamA.length !== slotsPerTeam || teamB.length !== slotsPerTeam) {
      setError(`Pick ${slotsPerTeam} player(s) per team.`)
      return
    }
    const allIds = [...teamA, ...teamB]
    if (new Set(allIds).size !== allIds.length) {
      setError('A player cannot appear on both teams.')
      return
    }
    setSaving(true)
    const payload = {
      mode,
      team_a_player_ids: teamA,
      team_b_player_ids: teamB,
      score_a: scoreA,
      score_b: scoreB,
    }
    const url = match ? `/api/matches/${match.id}` : '/api/matches'
    const method = match ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      onSave()
    } else {
      const j = await res.json()
      setError(j.error)
    }
    setSaving(false)
  }

  function playerName(id: string) {
    return players.find((p) => p.id === id)?.name ?? id
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h2 className="font-bold text-green-400 mb-4">{match ? 'Edit Match' : 'New Match'}</h2>

      {/* Mode */}
      <div className="flex gap-2 mb-5">
        {(['1v1', '2v2'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setTeamA([])
              setTeamB([])
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === m ? 'bg-green-700 border-green-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Team selection */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {(['a', 'b'] as const).map((side) => {
          const current = side === 'a' ? teamA : teamB
          const label = side === 'a' ? 'Team A' : 'Team B'
          return (
            <div key={side}>
              <p className="text-xs font-medium text-gray-400 mb-2 uppercase">{label}</p>
              <div className="space-y-1">
                {players.map((p) => {
                  const selected = current.includes(p.id)
                  const onOther = (side === 'a' ? teamB : teamA).includes(p.id)
                  const disabled = onOther || (!selected && current.length >= slotsPerTeam)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => togglePlayer(side, p.id)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                        selected
                          ? 'bg-green-700 text-white'
                          : onOther
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                            : disabled
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Score */}
      <div className="flex items-center justify-around mb-5 bg-gray-800 rounded-xl py-4 px-2">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            {teamA.length > 0 ? teamA.map(playerName).join(' & ') : 'Team A'}
          </p>
          <ScoreControl value={scoreA} onChange={setScoreA} />
        </div>
        <span className="text-2xl text-gray-600 font-bold">:</span>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">
            {teamB.length > 0 ? teamB.map(playerName).join(' & ') : 'Team B'}
          </p>
          <ScoreControl value={scoreB} onChange={setScoreB} />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving…' : match ? 'Save Changes' : 'Record Match'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
