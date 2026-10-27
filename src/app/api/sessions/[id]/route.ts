import { DbError } from '@/lib/errors'
import { fail, json, readJson } from '@/lib/http'
import { removeSession, updateSession } from '@/lib/league-store'
import { isUuid, parseSessionPatch } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function idOrThrow(id: string) {
  if (!isUuid(id)) throw new DbError('ערב לא תקין', 400)
  return id
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    return json(await updateSession(idOrThrow(id), parseSessionPatch(await readJson(req))))
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    return json(await removeSession(idOrThrow(id)))
  } catch (error) {
    return fail(error)
  }
}
