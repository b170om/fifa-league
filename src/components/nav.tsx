'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useLeague } from './league'

const moreLinks = [
  { href: '/pairs', label: 'זוגות' },
  { href: '/h2h', label: 'ראש בראש' },
  { href: '/model', label: 'המודל' },
  { href: '/players', label: 'שחקנים' },
  { href: '/history', label: 'היסטוריה' },
  { href: '/settings', label: 'הגדרות' },
]

export function Nav() {
  const path = usePathname()
  const { data } = useLeague()
  const [open, setOpen] = useState(false)
  const live = data?.sessions.some((session) => session.status === 'live' && !session.deletedAt) ?? false
  const moreOn = moreLinks.some((link) => path === link.href || path.startsWith(`${link.href}/`))

  return (
    <>
      <nav className="nav" aria-label="ניווט ראשי">
        <Tab href="/" label="בית" on={path === '/'} />
        <Tab href="/table" label="טבלה" on={path.startsWith('/table') || path.startsWith('/players/')} />
        <Link href="/night" aria-current={path.startsWith('/night') ? 'page' : undefined} className={path.startsWith('/night') ? 'on' : undefined}>
          <span className="whistle" aria-hidden>{live ? '●' : '+'}</span>
          ערב
        </Link>
        <Tab href="/money" label="קופה" on={path.startsWith('/money')} />
        <button type="button" className={`tab${moreOn ? ' on' : ''}`} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          עוד
        </button>
      </nav>
      {open && (
        <div className="sheet" role="presentation" onClick={() => setOpen(false)}>
          <div className="panel" role="dialog" aria-modal="true" aria-label="עוד עמודים" onClick={(event) => event.stopPropagation()}>
            <p className="kicker">עוד במגרש</p>
            {moreLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <button type="button" className="btn-ghost" style={{ marginTop: 12 }} onClick={() => setOpen(false)}>
              סגירה
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Tab({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link href={href} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
      {label}
    </Link>
  )
}
