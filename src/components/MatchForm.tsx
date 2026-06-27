'use client'
import { useState } from 'react'
import type { Match, Player } from '@/lib/database.types'

interface Props {
  players: Player[]
  match?: Match
  onSave: () => void
  onCancel: () => void
}

function init(name: string) { return name[0].toUpperCase() }

export default function MatchForm({ players, match, onSave, onCancel }: Props) {
  const [mode, setMode] = useState<'1v1' | '2v2'>(match?.mode ?? '1v1')
  const [teamA, setTeamA] = useState<(string | null)[]>(
    match ? match.team_a_player_ids : [null]
  )
  const [teamB, setTeamB] = useState<(string | null)[]>(
    match ? match.team_b_player_ids : [null]
  )
  const [scoreA, setScoreA] = useState(match?.score_a ?? 0)
  const [scoreB, setScoreB] = useState(match?.score_b ?? 0)
  const [active, setActive] = useState<{ team: 'A' | 'B'; idx: number }>({ team: 'A', idx: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const slotsPerTeam = mode === '1v1' ? 1 : 2
  const allSelected = new Set([...teamA, ...teamB].filter(Boolean) as string[])
  const canSave = !teamA.some((x) => x == null) && !teamB.some((x) => x == null)

  function switchMode(m: '1v1' | '2v2') {
    const n = m === '2v2' ? 2 : 1
    const fix = (arr: (string | null)[]) => {
      const c = arr.slice(0, n)
      while (c.length < n) c.push(null)
      return c
    }
    setMode(m)
    setTeamA(fix(teamA))
    setTeamB(fix(teamB))
    setActive({ team: 'A', idx: 0 })
  }

  function slotClick(team: 'A' | 'B', idx: number) {
    const arr = team === 'A' ? [...teamA] : [...teamB]
    if (arr[idx]) {
      arr[idx] = null
      team === 'A' ? setTeamA(arr) : setTeamB(arr)
      setActive({ team, idx })
    } else {
      setActive({ team, idx })
    }
  }

  function pick(name: string) {
    let A = [...teamA], B = [...teamB]
    const ai = A.indexOf(name), bi = B.indexOf(name)
    if (ai >= 0) { A[ai] = null; setTeamA(A); return }
    if (bi >= 0) { B[bi] = null; setTeamB(B); return }
    let t = active.team, i = active.idx
    let tgt = t === 'A' ? A : B
    if (tgt[i] != null) {
      const slots: [('A' | 'B'), number][] = [['A',0],['A',1],['B',0],['B',1]]
      for (const [tt, ii] of slots) {
        const a = tt === 'A' ? A : B
        if (ii < a.length && a[ii] == null) { t = tt; i = ii; break }
      }
    }
    if (t === 'A') A[i] = name; else B[i] = name
    let na = { team: t, idx: i }
    const slots: [('A' | 'B'), number][] = [['A',0],['A',1],['B',0],['B',1]]
    for (const [tt, ii] of slots) {
      const a = tt === 'A' ? A : B
      if (ii < a.length && a[ii] == null) { na = { team: tt, idx: ii }; break }
    }
    setTeamA(A); setTeamB(B); setActive(na)
  }

  function score(team: 'A' | 'B', delta: number) {
    if (team === 'A') setScoreA((v) => Math.max(0, Math.min(30, v + delta)))
    else setScoreB((v) => Math.max(0, Math.min(30, v + delta)))
  }

  async function submit() {
    setError('')
    if (!canSave) { setError('Pick all players first'); return }
    const allIds = [...teamA, ...teamB] as string[]
    if (new Set(allIds).size !== allIds.length) { setError('Duplicate player'); return }
    setSaving(true)
    const url = match ? `/api/matches/${match.id}` : '/api/matches'
    const res = await fetch(url, {
      method: match ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, team_a_player_ids: teamA, team_b_player_ids: teamB, score_a: scoreA, score_b: scoreB }),
    })
    if (res.ok) { onSave() }
    else { const j = await res.json(); setError(j.error) }
    setSaving(false)
  }

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? '?'

  function TeamPanel({ team }: { team: 'A' | 'B' }) {
    const slots = team === 'A' ? teamA : teamB
    const sc = team === 'A' ? scoreA : scoreB
    const label = team === 'A' ? 'Home' : 'Away'
    const labelColor = team === 'A' ? '#1f7a3d' : '#d9531e'

    return (
      <div className="flex-1 flex flex-col items-center px-3 pt-[13px] pb-[14px]">
        <div className="text-[11px] font-bold tracking-[.18em] uppercase mb-[11px]"
          style={{ fontFamily: 'var(--font-barlow)', color: labelColor }}>{label}</div>
        <div className="w-full flex flex-col gap-[7px]">
          {slots.map((nm, idx) => {
            const filled = !!nm
            const isActive = active.team === team && active.idx === idx
            return (
              <button key={idx} onClick={() => slotClick(team, idx)}
                className="h-[44px] flex items-center gap-[9px] px-[10px] w-full"
                style={{
                  background: isActive ? 'rgba(31,122,61,0.1)' : '#f3edde',
                  border: isActive ? '2px solid #1f7a3d' : '1.5px solid rgba(28,25,22,0.35)',
                }}>
                <div className="w-6 h-6 flex items-center justify-center text-[13px] flex-none"
                  style={{ fontFamily: 'var(--font-anton)', background: filled ? '#1f7a3d' : '#e5dcc6', color: filled ? '#f1ead8' : '#9a9180' }}>
                  {filled ? init(playerName(nm!)) : '+'}
                </div>
                <div className="text-[14px] font-semibold uppercase whitespace-nowrap overflow-hidden text-ellipsis"
                  style={{ fontFamily: 'var(--font-barlow)', color: filled ? '#1c1916' : '#9a9180' }}>
                  {filled ? playerName(nm!) : 'Add player'}
                </div>
              </button>
            )
          })}
        </div>
        <div className="text-[58px] leading-none mt-[14px]"
          style={{ fontFamily: 'var(--font-anton)' }}>{sc}</div>
        <div className="flex gap-[9px] mt-[11px]">
          <button onClick={() => score(team, -1)}
            className="w-[42px] h-[42px] border border-[#1c1916] bg-[#ece4d2] flex items-center justify-center text-[22px]"
            style={{ fontFamily: 'var(--font-anton)' }}>–</button>
          <button onClick={() => score(team, 1)}
            className="w-[42px] h-[42px] flex items-center justify-center text-[22px] text-[#f1ead8]"
            style={{ fontFamily: 'var(--font-anton)', background: '#1f7a3d' }}>+</button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-[18px] pb-[18px] pt-4">
      {/* Mode toggle */}
      <div className="flex border-2 border-[#1c1916]">
        {(['1v1', '2v2'] as const).map((m) => (
          <button key={m} onClick={() => switchMode(m)}
            className="flex-1 h-[42px] text-[15px] font-bold tracking-[.08em] uppercase border-r last:border-r-0 border-[#1c1916]"
            style={{ fontFamily: 'var(--font-barlow)', background: mode === m ? '#1c1916' : '#ece4d2', color: mode === m ? '#f1ead8' : '#1c1916' }}>
            {m}
          </button>
        ))}
      </div>

      {/* Score panels */}
      <div className="flex border-2 border-t-0 border-[#1c1916] mt-[14px]">
        <TeamPanel team="A" />
        <div className="w-[2px] bg-[#1c1916] relative flex items-center justify-center">
          <div className="absolute bg-[#ece4d2] text-[15px] py-[5px] italic"
            style={{ fontFamily: 'var(--font-spectral)' }}>v</div>
        </div>
        <TeamPanel team="B" />
      </div>

      {/* Player picker */}
      <div className="flex items-center gap-[9px] mt-5">
        <div className="text-[11px] font-bold tracking-[.14em] uppercase text-[#6f6757] whitespace-nowrap"
          style={{ fontFamily: 'var(--font-barlow)' }}>
          {mode === '2v2' ? 'Tap to fill 4 spots' : 'Tap to fill both spots'}
        </div>
        <div className="flex-1 h-px bg-[#1c1916]" />
      </div>
      <div className="mt-[11px] flex flex-wrap gap-[7px]">
        {players.map((p) => {
          const on = allSelected.has(p.id)
          return (
            <button key={p.id} onClick={() => pick(p.id)}
              className="h-[36px] flex items-center gap-[7px] px-[11px] pl-[7px] border-[1.5px] border-[#1c1916]"
              style={{ background: on ? '#1c1916' : '#f3edde' }}>
              <div className="w-[22px] h-[22px] flex items-center justify-center text-[12px]"
                style={{ fontFamily: 'var(--font-anton)', background: on ? '#1f7a3d' : '#e5dcc6', color: on ? '#f1ead8' : '#1c1916' }}>
                {init(p.name)}
              </div>
              <div className="text-[14px] font-semibold uppercase"
                style={{ fontFamily: 'var(--font-barlow)', color: on ? '#f1ead8' : '#1c1916' }}>
                {p.name}
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-[#d9531e] font-semibold uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-barlow)' }}>{error}</p>
      )}

      <div className="flex gap-[8px] mt-[22px]">
        <button onClick={submit} disabled={saving}
          className="flex-[1.5] h-[52px] text-[17px] font-bold tracking-[.1em] uppercase flex items-center justify-center gap-[10px]"
          style={{ fontFamily: 'var(--font-barlow)', background: '#1c1916', color: '#f1ead8', opacity: canSave ? 1 : 0.5 }}>
          {saving ? 'Saving…' : match ? 'Update Result' : 'File Result →'}
        </button>
        <button onClick={onCancel}
          className="flex-1 h-[52px] border-2 border-[#1c1916] text-[14px] font-bold tracking-[.08em] uppercase"
          style={{ fontFamily: 'var(--font-barlow)', background: '#ece4d2', color: '#1c1916' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
