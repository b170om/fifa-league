'use client'

import { useState } from 'react'
import { shekel } from '@/lib/format'
import { useLeague, useTitle } from '@/components/league'
import { Gate } from '@/components/ui'

export default function SettingsPage() {
  useTitle('פלאדלייט · הגדרות')
  return (
    <Gate>
      {(data) => <Form initial={data.settings.defaultStake} k={data.settings.eloK} />}
    </Gate>
  )
}

function Form({ initial, k }: { initial: number; k: number }) {
  const { mutate } = useLeague()
  const [stake, setStake] = useState(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="stack">
      <header className="brand"><div><h1>הגדרות</h1><small>בלי סיסמה</small></div></header>
      <section className="card">
        <p>כל מי שיש לו את הקישור יכול לרשום תוצאה. אין התחברות ואין קוד. מחיקה היא ארכיון, ואפשר לשחזר מההיסטוריה.</p>
        <label className="field">
          <span>הימור ברירת מחדל לשחקן</span>
          <input inputMode="numeric" value={stake} onChange={(event) => setStake(Number(event.target.value.replace(/[^\d]/g, '')) || 0)} />
        </label>
        <p className="dim">אפשר עדיין לשנות סכום לערב שלם או למשחק בודד. קבוע הדירוג K הוא {k}.</p>
        {error && <p className="banner bad" role="alert">{error}</p>}
        {message && <p className="banner">{message}</p>}
        <button type="button" className="btn-lime" disabled={stake < 1} onClick={() => {
          setError(null)
          setMessage(null)
          void mutate('/api/settings', { method: 'PATCH', body: JSON.stringify({ defaultStake: stake }) })
            .then(() => setMessage(`נשמר. ערב חדש ייפתח על ${shekel(stake)}.`))
            .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'לא נשמר'))
        }}>שמירה</button>
      </section>
    </div>
  )
}
