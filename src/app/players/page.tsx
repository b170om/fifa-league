'use client'
import { useEffect, useRef, useState } from 'react'
import type { Player } from '@/lib/database.types'
import type { Match } from '@/lib/database.types'
import PageHeader from '@/components/PageHeader'

function init(name: string) { return name[0].toUpperCase() }

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [p, m] = await Promise.all([
      fetch('/api/players').then((r) => r.json()),
      fetch('/api/matches').then((r) => r.json()),
    ])
    setPlayers(p); setMatches(m); setLoading(false)
  }

  useEffect(() => { load() }, [])

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(''), 1700) }

  function openAdd() {
    setShowAdd(true); setNewName(''); setError('')
    setTimeout(() => inputRef.current?.focus(), 60)
  }
  function closeAdd() { setShowAdd(false); setNewName(''); setError('') }

  async function addPlayer() {
    const n = newName.trim()
    if (!n) { inputRef.current?.focus(); return }
    setError('')
    const res = await fetch('/api/players', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    if (res.ok) { closeAdd(); await load(); flash(n + ' registered') }
    else { const j = await res.json(); setError(j.error) }
  }

  async function saveEdit() {
    if (!editing?.name.trim()) return
    const res = await fetch(`/api/players/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editing.name.trim() }),
    })
    if (res.ok) { setEditing(null); await load() }
  }

  async function deletePlayer(id: string) {
    if (!confirm('Remove this player?')) return
    await fetch(`/api/players/${id}`, { method: 'DELETE' })
    await load()
  }

  function playerStats(id: string) {
    let p = 0, w = 0, d = 0, l = 0
    for (const m of matches) {
      const onA = m.team_a_player_ids.includes(id)
      const onB = m.team_b_player_ids.includes(id)
      if (!onA && !onB) continue
      p++
      const sf = onA ? m.score_a : m.score_b
      const sa = onA ? m.score_b : m.score_a
      if (sf > sa) w++; else if (sf === sa) d++; else l++
    }
    return { p, w, d, l }
  }

  const avatarColors = ['#d9531e','#1f7a3d','#1c1916','#6f6757','#9a9180','#b3a88f','#4d4639','#2a5a3a']

  return (
    <>
      <PageHeader badge={`${players.length} Strong`} title="The Squad" sub="Everyone in the league" />
      <main className="flex-1 overflow-y-auto relative">
        <div className="px-[18px] pt-4 pb-6">
          <button onClick={openAdd}
            className="w-full h-[46px] border-[1.5px] border-[#1c1916] bg-[#ece4d2] flex items-center justify-center gap-[9px] text-[14px] font-bold tracking-[.1em] uppercase"
            style={{ fontFamily: 'var(--font-barlow)' }}>
            <span className="w-[18px] h-[18px] bg-[#d9531e] text-[#f1ead8] flex items-center justify-center text-[13px]"
              style={{ fontFamily: 'var(--font-anton)' }}>+</span>
            Register a player
          </button>

          <div className="mt-[14px] flex flex-col">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[62px] bg-[#e5dcc6] border-b border-[rgba(28,25,22,0.16)] animate-pulse" />
              ))
            ) : players.length === 0 ? (
              <p className="text-[14px] italic text-[#6f6757] pt-4" style={{ fontFamily: 'var(--font-spectral)' }}>
                No players yet. Register the first one!
              </p>
            ) : (
              players.map((p, i) => {
                const avBg = avatarColors[i % avatarColors.length]
                const stats = playerStats(p.id)
                const isLeader = i === 0

                return (
                  <div key={p.id} className="flex items-center gap-[13px] border-b border-[rgba(28,25,22,0.16)] py-[11px] px-[4px]"
                    style={{ background: isLeader ? 'rgba(217,83,30,0.08)' : 'transparent' }}>
                    <div className="w-10 h-10 border-[1.5px] border-[#1c1916] flex items-center justify-center text-[18px] flex-none"
                      style={{ fontFamily: 'var(--font-anton)', background: avBg, color: '#f1ead8' }}>
                      {init(p.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editing?.id === p.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 bg-transparent border-b-2 border-[#1c1916] text-[17px] font-semibold uppercase outline-none py-[2px]"
                            style={{ fontFamily: 'var(--font-barlow)' }}
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                            autoFocus
                          />
                          <button onClick={saveEdit} className="text-[11px] font-bold uppercase text-[#1f7a3d]" style={{ fontFamily: 'var(--font-barlow)' }}>Save</button>
                          <button onClick={() => setEditing(null)} className="text-[11px] font-bold uppercase text-[#9a9180]" style={{ fontFamily: 'var(--font-barlow)' }}>✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="text-[17px] font-semibold uppercase"
                            style={{ fontFamily: 'var(--font-barlow)', color: '#1c1916' }}>{p.name}</div>
                          {isLeader && (
                            <div className="text-[9.5px] font-bold tracking-[.1em] uppercase text-[#f1ead8] bg-[#d9531e] px-[6px] py-[2px]"
                              style={{ fontFamily: 'var(--font-barlow)' }}>Leader</div>
                          )}
                        </div>
                      )}
                      {editing?.id !== p.id && (
                        <div className="text-[13px] italic text-[#6f6757] mt-[1px]"
                          style={{ fontFamily: 'var(--font-spectral)' }}>
                          {stats.p} played — {stats.w}W · {stats.d}D · {stats.l}L
                        </div>
                      )}
                    </div>
                    {editing?.id !== p.id && (
                      <div className="flex gap-3">
                        <button onClick={() => setEditing({ id: p.id, name: p.name })}
                          className="text-[11px] font-bold tracking-[.08em] uppercase text-[#9a9180]"
                          style={{ fontFamily: 'var(--font-barlow)' }}>Edit</button>
                        <button onClick={() => deletePlayer(p.id)}
                          className="text-[11px] font-bold tracking-[.08em] uppercase text-[#d9531e] opacity-50 hover:opacity-100"
                          style={{ fontFamily: 'var(--font-barlow)' }}>Del</button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Add player modal */}
        {showAdd && (
          <div className="absolute inset-0 bg-[rgba(28,25,22,0.55)] flex items-center justify-center z-40 px-6">
            <div className="w-full max-w-[302px] bg-[#ece4d2] border-[2.5px] border-[#1c1916] shadow-[5px_5px_0_rgba(28,25,22,0.9)] p-[17px_18px_18px]">
              <div className="flex items-center justify-between text-[11px] font-bold tracking-[.18em] uppercase text-[#6f6757]"
                style={{ fontFamily: 'var(--font-barlow)' }}>
                <span>New Entry</span>
                <button onClick={closeAdd} className="text-[20px] text-[#1c1916] leading-none">×</button>
              </div>
              <div className="h-[2px] bg-[#1c1916] my-[8px]" />
              <div className="text-[29px] leading-[0.88] uppercase"
                style={{ fontFamily: 'var(--font-anton)' }}>Register<br />a player</div>
              <div className="text-[11px] font-bold tracking-[.12em] uppercase text-[#6f6757] mt-[17px] mb-[2px]"
                style={{ fontFamily: 'var(--font-barlow)' }}>Player name</div>
              <input
                ref={inputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addPlayer(); if (e.key === 'Escape') closeAdd() }}
                placeholder="e.g. Nico"
                className="w-full bg-transparent border-b-2 border-[#1c1916] text-[23px] font-semibold uppercase outline-none py-[4px_0_7px] text-[#1c1916]"
                style={{ fontFamily: 'var(--font-barlow)', paddingBottom: 7 }}
              />
              {error && (
                <p className="text-[12px] text-[#d9531e] font-semibold mt-2"
                  style={{ fontFamily: 'var(--font-barlow)' }}>{error}</p>
              )}
              <div className="text-[12.5px] italic text-[#6f6757] mt-[10px]"
                style={{ fontFamily: 'var(--font-spectral)' }}>
                Starts with a clean record — 0 played.
              </div>
              <div className="flex gap-[8px] mt-[18px]">
                <button onClick={closeAdd}
                  className="flex-1 h-[46px] border-2 border-[#1c1916] bg-[#ece4d2] text-[14px] font-bold tracking-[.08em] uppercase"
                  style={{ fontFamily: 'var(--font-barlow)' }}>Cancel</button>
                <button onClick={addPlayer}
                  className="flex-[1.5] h-[46px] text-[#f1ead8] text-[14px] font-bold tracking-[.08em] uppercase"
                  style={{ fontFamily: 'var(--font-barlow)', background: '#1f7a3d' }}>Add to squad</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 -rotate-[3.5deg] border-[2.5px] border-[#d9531e] text-[#d9531e] text-[15px] font-bold tracking-[.1em] uppercase px-[18px] py-[9px] whitespace-nowrap z-20 shadow-[3px_3px_0_rgba(28,25,22,0.9)]"
            style={{ fontFamily: 'var(--font-barlow)', background: '#ece4d2' }}>
            {toast}
          </div>
        )}
      </main>
    </>
  )
}
