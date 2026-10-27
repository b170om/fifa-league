'use client'

import Link from 'next/link'
import { initial, shekel, swatch } from '@/lib/format'
import type { LeagueData } from '@/lib/types'
import { useLeague } from './league'

export function LoadingBlock() {
  return (
    <div className="stack" aria-busy="true" aria-live="polite">
      <p className="kicker">טוען את הליגה</p>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card" role="alert">
      <p className="kicker">משהו נתקע</p>
      <p style={{ margin: '0 0 14px', fontWeight: 700 }}>{message}</p>
      {onRetry && (
        <button type="button" className="btn-lime" onClick={onRetry}>
          נסו שוב
        </button>
      )}
    </div>
  )
}

export function Gate({ children }: { children: (data: LeagueData) => React.ReactNode }) {
  const { status, data, error, reload } = useLeague()
  if (!data && status !== 'ready') {
    if (status === 'error') return <ErrorBlock message={error ?? 'הליגה לא נטענה'} onRetry={() => void reload()} />
    return <LoadingBlock />
  }
  if (!data) return <ErrorBlock message={error ?? 'הליגה לא נטענה'} onRetry={() => void reload()} />
  return (
    <>
      {error && status === 'error' && (
        <div className="banner bad" role="alert" style={{ marginBottom: 12 }}>
          {error}
          <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => void reload()}>
            רענון
          </button>
        </div>
      )}
      {children(data)}
    </>
  )
}

export function Avatar({ name, id, size = 40 }: { name: string; id: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: swatch(id), width: size, height: size, fontSize: size * 0.42 }} aria-hidden>
      {initial(name)}
    </span>
  )
}

export function Money({ amount, signed = true }: { amount: number; signed?: boolean }) {
  const tone = amount > 0 ? 'up' : amount < 0 ? 'down' : 'flat'
  return <span className={`money num ${tone}`}>{shekel(amount, { signed })}</span>
}

export function Pips({ form }: { form: ('W' | 'L')[] }) {
  if (form.length === 0) return <span className="dim">—</span>
  return (
    <span className="pips" aria-label="חמישה אחרונים, החדש מימין">
      {form.map((result, index) => (
        <i key={`${result}-${index}`} className={result === 'W' ? 'win' : 'loss'}>
          {result === 'W' ? 'נ' : 'ה'}
        </i>
      ))}
    </span>
  )
}

export function Empty({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="card">
      <h2 className="hero-name" style={{ fontSize: 28 }}>{title}</h2>
      <p className="muted">{body}</p>
      {href && action && (
        <Link className="btn-lime" href={href} style={{ marginTop: 8 }}>
          {action}
        </Link>
      )}
    </div>
  )
}
