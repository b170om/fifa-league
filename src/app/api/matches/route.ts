import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('played_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { mode, team_a_player_ids, team_b_player_ids, score_a, score_b, played_at } = body

  if (!['1v1', '2v2'].includes(mode))
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })

  const expectedCount = mode === '1v1' ? 1 : 2
  if (team_a_player_ids.length !== expectedCount || team_b_player_ids.length !== expectedCount)
    return NextResponse.json({ error: 'Wrong number of players' }, { status: 400 })

  const allIds = [...team_a_player_ids, ...team_b_player_ids]
  if (new Set(allIds).size !== allIds.length)
    return NextResponse.json({ error: 'Duplicate player' }, { status: 400 })

  if (score_a < 0 || score_b < 0 || !Number.isInteger(score_a) || !Number.isInteger(score_b))
    return NextResponse.json({ error: 'Invalid scores' }, { status: 400 })

  const { data, error } = await supabase
    .from('matches')
    .insert({
      mode,
      team_a_player_ids,
      team_b_player_ids,
      score_a,
      score_b,
      played_at: played_at ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
