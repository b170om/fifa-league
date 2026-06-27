'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function TableIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}
function PairsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="9" cy="12" r="4.5" /><circle cx="15" cy="12" r="4.5" />
    </svg>
  )
}
function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
      <circle cx="12" cy="12" r="8.5" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="12" x2="15" y2="13.5" />
    </svg>
  )
}
function SquadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
      <circle cx="12" cy="8" r="4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  )
}

const tabs = [
  { href: '/', label: 'Table', icon: <TableIcon /> },
  { href: '/pairs', label: 'Pairs', icon: <PairsIcon /> },
  { href: '/matches', label: 'Result', icon: null },
  { href: '/history', label: 'History', icon: <HistoryIcon /> },
  { href: '/players', label: 'Squad', icon: <SquadIcon /> },
]

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#ece4d2] border-t-2 border-[#1c1916]"
      style={{ maxWidth: 430, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%' }}
    >
      <div className="flex h-[72px]">
        {tabs.map((tab) => {
          const active = tab.href === '/' ? path === '/' : path.startsWith(tab.href)
          const isResult = tab.label === 'Result'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-[5px]"
              style={{
                borderTop: `3px solid ${active ? '#1f7a3d' : 'transparent'}`,
                color: active ? '#1c1916' : '#6f6757',
              }}
            >
              {isResult ? (
                <div
                  className="w-7 h-7 flex items-center justify-center border border-[#1c1916]"
                  style={{ background: active ? '#1f7a3d' : '#1c1916' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f1ead8" strokeWidth="3" strokeLinecap="square">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              ) : (
                tab.icon
              )}
              <span
                className="text-[10px] font-bold tracking-[.08em] uppercase"
                style={{ fontFamily: 'var(--font-barlow)' }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
