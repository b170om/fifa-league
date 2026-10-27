import { DbError } from '@/lib/errors'
import { fail, json } from '@/lib/http'
import { restoreMatch } from '@/lib/league-store'
import { isUuid } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!isUuid(id)) throw new DbError('משחק לא תקין', 400)
    return json(await restoreMatch(id))
  } catch (error) {
    return fail(error)
  }
}
