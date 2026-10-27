import { fail, json, readJson } from '@/lib/http'
import { createPlayer } from '@/lib/league-store'
import { cleanName } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await readJson(req)
    if (!body || typeof body !== 'object') throw new Error('הבקשה לא תקינה')
    const name = cleanName((body as { name?: unknown }).name)
    return json(await createPlayer(name), 201)
  } catch (error) {
    return fail(error)
  }
}
