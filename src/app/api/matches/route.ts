import { fail, json, readJson } from '@/lib/http'
import { createMatch } from '@/lib/league-store'
import { parseMatchInput } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    return json(await createMatch(parseMatchInput(await readJson(req))), 201)
  } catch (error) {
    return fail(error)
  }
}
