import { fail, json, readJson } from '@/lib/http'
import { updateSettings } from '@/lib/league-store'
import { parseSettingsInput } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  try {
    const input = parseSettingsInput(await readJson(req))
    return json(await updateSettings(input.defaultStake))
  } catch (error) {
    return fail(error)
  }
}
