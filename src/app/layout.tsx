import type { Metadata, Viewport } from 'next'
import { Anton, Barlow_Condensed, Spectral } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
const barlow = Barlow_Condensed({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow',
})
const spectral = Spectral({
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-spectral',
})

export const metadata: Metadata = {
  title: 'Floodlight League',
  description: 'Weekly FIFA league among friends',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${barlow.variable} ${spectral.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#ece4d2] text-[#1c1916]">
        <div className="flex-1 max-w-[430px] mx-auto w-full flex flex-col pb-[72px]">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
