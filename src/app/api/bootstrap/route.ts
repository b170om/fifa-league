import { fail, json } from '@/lib/http'
import { loadLeague } from '@/lib/league-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return json(await loadLeague())
  } catch (error) {
    return fail(error)
  }
}
