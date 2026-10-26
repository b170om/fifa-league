import { fail, json, readJson } from '@/lib/http'
import { createSession, defaultSessionTitle } from '@/lib/league-store'
import { parseSessionInput } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const input = parseSessionInput(await readJson(req), defaultSessionTitle())
    return json(await createSession(input), 201)
  } catch (error) {
    return fail(error)
  }
}
