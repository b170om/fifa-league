'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Table' },
  { href: '/pairs', label: 'Pairs' },
  { href: '/matches', label: 'Matches' },
  { href: '/players', label: 'Players' },
  { href: '/h2h', label: 'H2H' },
]

export default function Nav() {
  const path = usePathname()
  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-gray-800">
      <div className="max-w-2xl mx-auto px-4 flex items-center gap-1 h-12 overflow-x-auto">
        <span className="text-green-500 font-bold text-lg mr-3 shrink-0">⚽ FIFA</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded text-sm font-medium shrink-0 transition-colors ${
              path === l.href
                ? 'bg-green-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
