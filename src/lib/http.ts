import { NextResponse } from 'next/server'
import { ConfigError, DbError } from './errors'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new DbError('הבקשה לא בפורמט תקין', 400)
  }
}

export function fail(error: unknown) {
  if (error instanceof ConfigError) return json({ error: error.message }, 503)
  if (error instanceof DbError) return json({ error: error.message }, error.status)
  if (error instanceof Error) return json({ error: error.message }, 400)
  return json({ error: 'משהו השתבש. נסו שוב.' }, 500)
}
