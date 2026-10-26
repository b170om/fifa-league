import { DbError } from '@/lib/errors'
import { fail, json } from '@/lib/http'
import { writeRecap } from '@/lib/ai-recap'
import { loadLeague, saveRecap } from '@/lib/league-store'
import { formatDay } from '@/lib/format'
import { recapFacts, summarize } from '@/lib/summary'
import { isUuid } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!isUuid(id)) throw new DbError('ערב לא תקין', 400)
    const league = await loadLeague()
    const session = league.sessions.find((item) => item.id === id && !item.deletedAt)
    if (!session) throw new DbError('הערב לא נמצא', 404)
    if (session.status === 'closed' && session.aiRecap) {
      return json(league)
    }
    const matches = league.matches.filter((match) => match.sessionId === id && !match.deletedAt)
    const summary = summarize(matches, league.players, session.playerIds)
    const facts = recapFacts({
      title: session.title,
      when: formatDay(session.startedAt),
      stake: session.stake,
      matches,
      players: league.players,
      summary,
    })
    const recap = await writeRecap(facts)
    return json(await saveRecap(id, recap.text, recap.source, recap.model, true))
  } catch (error) {
    return fail(error)
  }
}
