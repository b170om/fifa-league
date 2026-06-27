import type { Metadata, Viewport } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'FIFA League',
  description: 'Weekly FIFA league among friends',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-gray-100 antialiased">
        <Nav />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-24 pt-4">{children}</main>
      </body>
    </html>
  )
}
