import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { triggerWorkflow } from '@/lib/github'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cats, triggeredBy } = await req.json()
  if (!cats) return NextResponse.json({ error: 'cats is required' }, { status: 400 })

  // Create a run record in Supabase first
  const { data: run, error } = await supabase
    .from('test_runs')
    .insert({
      triggered_by: triggeredBy || session.user?.email,
      cats,
      status: 'running',
    })
    .select()
    .single()

  if (error || !run) {
    return NextResponse.json({ error: 'Failed to create run record' }, { status: 500 })
  }

  // Trigger GitHub Actions workflow
  try {
    await triggerWorkflow(cats, run.id, triggeredBy || session.user?.email || '')
    return NextResponse.json({ runId: run.id })
  } catch (e: any) {
    // Mark run as error if workflow trigger failed
    await supabase.from('test_runs').update({ status: 'error' }).eq('id', run.id)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
