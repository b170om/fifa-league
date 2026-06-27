import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { mode, team_a_player_ids, team_b_player_ids, score_a, score_b, played_at } = body

  if (mode && !['1v1', '2v2'].includes(mode))
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })

  if (team_a_player_ids && team_b_player_ids) {
    const allIds = [...team_a_player_ids, ...team_b_player_ids]
    if (new Set(allIds).size !== allIds.length)
      return NextResponse.json({ error: 'Duplicate player' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('matches')
    .update({ mode, team_a_player_ids, team_b_player_ids, score_a, score_b, played_at })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
