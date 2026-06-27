'use client'
import { useEffect, useState } from 'react'
import type { Match, Player } from '@/lib/database.types'
import MatchForm from '@/components/MatchForm'
import PageHeader from '@/components/PageHeader'
import { useRouter } from 'next/navigation'

export default function NewMatchPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetch('/api/players').then((r) => r.json()).then((p) => { setPlayers(p); setLoading(false) })
  }, [])

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1700)
  }

  return (
    <>
      <PageHeader badge="Live" title="New Result" sub="File tonight's scoreline" />
      <main className="flex-1 overflow-y-auto relative">
        {loading ? (
          <div className="px-[18px] pt-8 text-[14px] text-[#6f6757] italic" style={{ fontFamily: 'var(--font-spectral)' }}>
            Loading squad…
          </div>
        ) : players.length < 2 ? (
          <div className="px-[18px] pt-8">
            <p className="text-[14px] italic text-[#6f6757]" style={{ fontFamily: 'var(--font-spectral)' }}>
              You need at least 2 players. Head to Squad to register them.
            </p>
          </div>
        ) : (
          <MatchForm
            players={players}
            onSave={() => { flash('Result filed'); setTimeout(() => router.push('/history'), 400) }}
            onCancel={() => router.push('/history')}
          />
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
