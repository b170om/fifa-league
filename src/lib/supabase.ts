import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ConfigError } from './errors'

const options = { auth: { persistSession: false, autoRefreshToken: false } } as const

function url(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!value) throw new ConfigError('חסר NEXT_PUBLIC_SUPABASE_URL בשרת.')
  return value
}

/** Reads work with the anon key. The service role is used when it is set. */
export function getReadClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new ConfigError('חסר מפתח קריאה לסופאבייס. צריך NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  return createClient(url(), key, options)
}

/** Writes and the rating replay run only with the service role. It never reaches the browser. */
export function getWriteClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new ConfigError('כדי לשמור תוצאות צריך SUPABASE_SERVICE_ROLE_KEY בשרת. זה לא מפתח לדפדפן, ואין סיסמה למשתמשים.')
  }
  return createClient(url(), key, options)
}
