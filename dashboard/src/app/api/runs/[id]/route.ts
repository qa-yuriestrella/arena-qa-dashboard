import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { getWorkflowRunStatus, cancelWorkflowRun } from '@/lib/github'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: run } = await supabase
    .from('test_runs')
    .select('*')
    .eq('id', params.id)
    .single()

  // Sync status from GitHub if run is stuck in "running"
  if (run?.status === 'running' && run.github_run_id) {
    try {
      const gh = await getWorkflowRunStatus(Number(run.github_run_id))
      if (gh.status === 'completed') {
        const newStatus = gh.conclusion === 'success' ? 'passed'
          : gh.conclusion === 'cancelled' ? 'cancelled'
          : 'failed'
        await supabase.from('test_runs').update({
          status: newStatus,
          completed_at: new Date().toISOString(),
        }).eq('id', params.id)
        run.status = newStatus
      }
    } catch {}
  }

  const { data: results } = await supabase
    .from('test_results')
    .select('*')
    .eq('run_id', params.id)
    .order('cat', { ascending: true })

  return NextResponse.json({ run, results })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: run } = await supabase
    .from('test_runs')
    .select('github_run_id, status')
    .eq('id', params.id)
    .single()

  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  if (run.status !== 'running') return NextResponse.json({ error: 'Run is not active' }, { status: 400 })

  // No github_run_id: just mark as cancelled in Supabase (stuck/orphan run)
  if (!run.github_run_id) {
    await supabase.from('test_runs').update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  }

  try {
    await cancelWorkflowRun(Number(run.github_run_id))
    await supabase.from('test_runs').update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    }).eq('id', params.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
