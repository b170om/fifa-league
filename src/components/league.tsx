'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { LeagueData } from '@/lib/types'

type Status = 'loading' | 'error' | 'ready'

interface LeagueContextValue {
  status: Status
  data: LeagueData | null
  error: string | null
  reload: () => Promise<void>
  mutate: (url: string, init?: RequestInit) => Promise<LeagueData>
}

const LeagueContext = createContext<LeagueContextValue | null>(null)

function isLeague(value: unknown): value is LeagueData {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<LeagueData>
  return Array.isArray(row.players) && Array.isArray(row.matches) && Array.isArray(row.sessions) && !!row.settings
}

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [data, setData] = useState<LeagueData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap', { cache: 'no-store' })
      const body: unknown = await res.json().catch(() => null)
      if (!res.ok || !isLeague(body)) {
        const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'הליגה לא נטענה'
        setStatus('error')
        setError(message)
        return
      }
      setData(body)
      setError(null)
      setStatus('ready')
    } catch {
      setStatus('error')
      setError('אין חיבור. בודקים את הרשת ומנסים שוב.')
    }
  }, [])

  useEffect(() => {
    // The fetch resolves later; this is the mount load, not a derived state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial league fetch
    void reload()
  }, [reload])

  const mutate = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
    const body: unknown = await res.json().catch(() => null)
    if (!res.ok || !isLeague(body)) {
      const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'השמירה נכשלה'
      throw new Error(message)
    }
    setData(body)
    setError(null)
    setStatus('ready')
    return body
  }, [])

  const value = useMemo(() => ({ status, data, error, reload, mutate }), [status, data, error, reload, mutate])
  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>
}

export function useLeague() {
  const value = useContext(LeagueContext)
  if (!value) throw new Error('useLeague מחוץ לספק')
  return value
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
