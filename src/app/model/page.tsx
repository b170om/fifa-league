'use client'

import { brierScore, brierSkill, calibration, hitRate } from '@/lib/elo'
import { activeMatches } from '@/lib/stats'
import { useTitle } from '@/components/league'
import { Gate } from '@/components/ui'
import { formatDay, pct, teamLabel } from '@/lib/format'

export default function ModelPage() {
  useTitle('פלאדלייט · המודל')
  return (
    <Gate>
      {(data) => {
        const matches = activeMatches(data.matches).flatMap((match) => match.predA == null ? [] : [{ ...match, predA: match.predA }])
        const scored = matches.map((match) => ({ predA: match.predA, scoreA: match.scoreA, scoreB: match.scoreB }))
        const hits = hitRate(scored)
        const brier = brierScore(scored)
        const skill = brierSkill(brier)
        const bins = calibration(scored)
        return (
          <div className="stack">
            <header className="brand">
              <div>
                <h1>המודל</h1>
                <small>ELO · ממוצע זוג</small>
              </div>
            </header>
            <section className="card">
              <p className="kicker">איך זה עובד</p>
              <p>לכל שחקן יש דירוג. הוא מתחיל ב-{data.settings.eloStart}. החוזק של זוג הוא הממוצע של השניים.</p>
              <p>הסיכוי של קבוצה א׳ לנצח הוא 1 חלקי 1 ועוד 10 בחזקת הפרש הדירוגים חלקי 400.</p>
              <p>אחרי המשחק כל שחקן בזוג זז ב-{data.settings.eloK} כפול (תוצאה פחות הסיכוי). ניצחון נספר כ-1, הפסד כ-0. אין תיקו.</p>
              <p className="dim">עריכה של תוצאה ישנה מחשבת מחדש את כל מה שבא אחריה, כי הדירוג תלוי בסדר. עם מעט משחקים המספרים רועשים. זה לא מכונת הימורים.</p>
            </section>
            <div className="btn-row">
              <Metric label="פגיעה במועדף" value={hits.rate == null ? '—' : pct(hits.rate)} note={hits.decided ? `${hits.hits} מתוך ${hits.decided}` : 'עוד אין משחקים עם עדיפות'} />
              <Metric label="ברייר" value={brier == null ? '—' : brier.toFixed(3)} note={skill == null ? '0.25 זה מטבע' : `מיומנות ${skill.toFixed(2)} מול מטבע`} />
            </div>
            <section className="card">
              <p className="kicker">כיול</p>
              <p className="dim">בכל תא: הסיכוי הממוצע שנתנו, מול כמה פעמים א׳ באמת ניצחה.</p>
              {bins.map((bin) => (
                <div key={`${bin.from}-${bin.to}`} className="row" style={{ padding: '8px 0', borderTop: '1px solid var(--line-soft)' }}>
                  <span className="num">{Math.round(bin.from * 100)}–{Math.round(bin.to * 100)}%</span>
                  <span>{bin.count === 0 ? 'אין משחקים' : `${Math.round((bin.avgPred ?? 0) * 100)}% חזוי · ${Math.round((bin.avgActual ?? 0) * 100)}% בפועל · ${bin.count}`}</span>
                </div>
              ))}
            </section>
            <h2 className="section">קריאות אחרונות</h2>
            {matches.slice().reverse().slice(0, 12).map((match) => {
              const toss = Math.abs(match.predA - 0.5) < 1e-9
              const favorite = toss ? null : match.predA > 0.5 ? match.teamA : match.teamB
              const aWon = match.scoreA > match.scoreB
              const hit = !toss && (match.predA > 0.5) === aWon
              return (
                <article key={match.id} className="card">
                  <div className="row">
                    <strong>{teamLabel(match.teamA, data.players)} {match.scoreA}–{match.scoreB} {teamLabel(match.teamB, data.players)}</strong>
                    <span className={toss ? 'dim' : hit ? 'money up' : 'money down'}>{toss ? 'חצי-חצי' : hit ? 'פגיעה' : 'פספוס'}</span>
                  </div>
                  <p className="dim" style={{ margin: 0 }}>{formatDay(match.playedAt)} · {Math.round(match.predA * 100)}% לא׳ · {favorite ? `מועדף: ${teamLabel(favorite, data.players)}` : 'אין מועדף'}</p>
                </article>
              )
            })}
          </div>
        )
      }}
    </Gate>
  )
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <section className="card">
      <p className="kicker">{label}</p>
      <p className="hero-money" style={{ fontSize: 42 }}>{value}</p>
      <p className="dim">{note}</p>
    </section>
  )
}
