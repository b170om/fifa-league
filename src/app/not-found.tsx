import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="card">
      <p className="kicker">404</p>
      <h1 className="hero-name">הכדור יצא החוצה</h1>
      <p className="muted">העמוד הזה לא קיים.</p>
      <Link className="btn-lime" href="/">חזרה הביתה</Link>
    </div>
  )
}
