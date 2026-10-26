export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export class DbError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = 'DbError'
    this.status = status
  }
}

export function mapDbError(error: { message?: string; code?: string; details?: string } | null): DbError {
  const code = error?.code ?? ''
  const message = error?.message ?? 'המסד לא זמין'
  if (code === '42P01' || code === 'PGRST202' || code === 'PGRST205' || code === 'PGRST204' || /relation .* does not exist/i.test(message) || /schema cache/i.test(message) || /recompute_league/i.test(message)) {
    return new DbError('חסרות טבלאות של גרסה 2. צריך להריץ את מיגרציית סופאבייס ואז לרענן.', 503)
  }
  if (code === '23505') return new DbError('יש כבר שחקן פעיל עם השם הזה', 409)
  if (code === '23503') return new DbError('אי אפשר למחוק שחקן שמופיע בהיסטוריה. אפשר להעביר לארכיון.', 409)
  if (code === '23514' || /אין תיקו|שער זהב|ההימור|שחקן לא קיים|פעמיים|קבוצה/.test(message)) {
    return new DbError(message, 400)
  }
  if (/JWT|Invalid API key|apikey/i.test(message)) {
    return new DbError('מפתח סופאבייס לא תקין. בודקים את משתני הסביבה בשרת.', 503)
  }
  return new DbError(message, 500)
}
