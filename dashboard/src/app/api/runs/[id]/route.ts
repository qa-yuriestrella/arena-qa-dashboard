import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: run } = await supabase
    .from('test_runs')
    .select('*')
    .eq('id', params.id)
    .single()

  const { data: results } = await supabase
    .from('test_results')
    .select('*')
    .eq('run_id', params.id)
    .order('cat', { ascending: true })

  return NextResponse.json({ run, results })
}
