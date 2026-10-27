'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ background: '#06110c', color: '#f4ffe8', fontFamily: 'sans-serif', padding: 24 }}>
        <h1>פלאדלייט נתקע</h1>
        <p>אפשר לרענן ולנסות שוב.</p>
        <button type="button" onClick={reset}>נסו שוב</button>
      </body>
    </html>
  )
}
