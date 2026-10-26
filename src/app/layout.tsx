import type { Metadata, Viewport } from 'next'
import { Rubik, Teko } from 'next/font/google'
import { LeagueProvider } from '@/components/league'
import { Nav } from '@/components/nav'
import './globals.css'

const rubik = Rubik({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
})

const teko = Teko({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-teko',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'פלאדלייט',
  description: 'ליגת הפיפא של החבר׳ה. זוגות, הימור, ומי חייב למי בסוף הערב.',
  applicationName: 'פלאדלייט',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06110c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${teko.variable}`}>
      <body>
        <div className="stadium">
          <div className="beam" aria-hidden />
          <svg className="markings" viewBox="0 0 400 800" preserveAspectRatio="xMidYMin slice" aria-hidden>
            <rect x="48" y="120" width="304" height="460" fill="none" stroke="rgba(214,255,63,0.13)" strokeWidth="2" />
            <line x1="48" y1="350" x2="352" y2="350" stroke="rgba(214,255,63,0.16)" strokeWidth="2" />
            <circle cx="200" cy="350" r="62" fill="none" stroke="rgba(214,255,63,0.16)" strokeWidth="2" />
            <circle cx="200" cy="350" r="4" fill="rgba(255,193,74,0.8)" />
          </svg>
          <LeagueProvider>
            <div className="phone">{children}</div>
            <Nav />
          </LeagueProvider>
        </div>
      </body>
    </html>
  )
}
