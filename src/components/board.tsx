'use client'

import { pct, teamLabel } from '@/lib/format'
import { teamWinProb } from '@/lib/elo'
import type { Player } from '@/lib/types'

export type SideMap = Record<string, 'a' | 'b' | 'out'>

export function sidesFrom(teamA: string[], teamB: string[], roster: string[]): SideMap {
  const sides: SideMap = {}
  for (const id of roster) sides[id] = 'out'
  for (const id of teamA) sides[id] = 'a'
  for (const id of teamB) sides[id] = 'b'
  return sides
}

export function teamsFrom(sides: SideMap, roster: string[]) {
  return {
    teamA: roster.filter((id) => sides[id] === 'a'),
    teamB: roster.filter((id) => sides[id] === 'b'),
    sitting: roster.filter((id) => sides[id] === 'out'),
  }
}

export function SidePicker({
  roster,
  players,
  sides,
  onChange,
}: {
  roster: string[]
  players: Player[]
  sides: SideMap
  onChange: (id: string, side: 'a' | 'b' | 'out') => void
}) {
  return (
    <div className="side-list">
      {roster.map((id) => {
        const name = players.find((player) => player.id === id)?.name ?? 'שחקן'
        return (
          <div key={id} className="side-line">
            <strong>{name}</strong>
            <div className="choices" role="group" aria-label={`איפה ${name}`}>
              {([['a', 'א׳'], ['b', 'ב׳'], ['out', 'בחוץ']] as const).map(([side, label]) => (
                <button key={side} type="button" className={sides[id] === side ? 'on' : undefined} onClick={() => onChange(id, side)} aria-pressed={sides[id] === side}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ScoreBoard({
  players,
  teamA,
  teamB,
  scoreA,
  scoreB,
  onScore,
}: {
  players: Player[]
  teamA: string[]
  teamB: string[]
  scoreA: number
  scoreB: number
  onScore: (side: 'a' | 'b', next: number) => void
}) {
  const ready = teamA.length === 2 && teamB.length === 2
  const prob = ready
    ? teamWinProb(
        teamA.map((id) => players.find((player) => player.id === id)?.elo ?? 1500),
        teamB.map((id) => players.find((player) => player.id === id)?.elo ?? 1500),
      )
    : null
  const left = prob == null ? 50 : Math.round(prob * 100)
  const right = 100 - left
  return (
    <div>
      <div className="board">
        <ScoreSide label="קבוצה א׳" names={teamA.length ? teamLabel(teamA, players) : 'בוחרים זוג'} score={scoreA} onDec={() => onScore('a', Math.max(0, scoreA - 1))} onInc={() => onScore('a', Math.min(30, scoreA + 1))} />
        <div className="vs">מול</div>
        <ScoreSide label="קבוצה ב׳" names={teamB.length ? teamLabel(teamB, players) : 'בוחרים זוג'} score={scoreB} onDec={() => onScore('b', Math.max(0, scoreB - 1))} onInc={() => onScore('b', Math.min(30, scoreB + 1))} />
      </div>
      {prob != null && (
        <div className="prob" style={{ gridTemplateColumns: `${Math.max(left, 8)}fr ${Math.max(right, 8)}fr` }} aria-label={`סיכוי לפני המשחק: א׳ ${pct(prob)} ב׳ ${pct(1 - prob)}`}>
          <span className="a">{left}%</span>
          <span className="b">{right}%</span>
        </div>
      )}
    </div>
  )
}

function ScoreSide({ label, names, score, onDec, onInc }: { label: string; names: string; score: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="board-side">
      <p className="kicker">{label}</p>
      <strong>{names}</strong>
      <div className="score num">{score}</div>
      <div className="step">
        <button type="button" onClick={onDec} aria-label={`הורדת שער, ${label}`}>−</button>
        <button type="button" onClick={onInc} aria-label={`הוספת שער, ${label}`}>+</button>
      </div>
    </div>
  )
}
