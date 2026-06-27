import type { Match, Player } from '@/lib/database.types'

interface Props {
  match: Match
  players: Player[]
  onEdit: () => void
  onDelete: () => void
}

function playerNames(ids: string[], players: Player[]) {
  return ids.map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' & ')
}

export default function MatchCard({ match, players, onEdit, onDelete }: Props) {
  const date = new Date(match.played_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const aWon = match.score_a > match.score_b
  const bWon = match.score_b > match.score_a
  const draw = match.score_a === match.score_b

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{date}</span>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {match.mode}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex-1 text-right text-sm font-medium ${aWon ? 'text-green-400' : draw ? 'text-gray-300' : 'text-gray-500'}`}>
          {playerNames(match.team_a_player_ids, players)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xl font-bold w-7 text-center ${aWon ? 'text-green-400' : draw ? 'text-gray-300' : 'text-gray-500'}`}>
            {match.score_a}
          </span>
          <span className="text-gray-600 font-bold">:</span>
          <span className={`text-xl font-bold w-7 text-center ${bWon ? 'text-green-400' : draw ? 'text-gray-300' : 'text-gray-500'}`}>
            {match.score_b}
          </span>
        </div>
        <div className={`flex-1 text-left text-sm font-medium ${bWon ? 'text-green-400' : draw ? 'text-gray-300' : 'text-gray-500'}`}>
          {playerNames(match.team_b_player_ids, players)}
        </div>
        <div className="flex gap-2 ml-2">
          <button onClick={onEdit} className="text-xs text-gray-500 hover:text-white">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-600 hover:text-red-400">Del</button>
        </div>
      </div>
    </div>
  )
}
