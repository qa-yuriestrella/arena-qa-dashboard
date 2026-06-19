import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const STALE_MINUTES = 5
// Workflow timeout-minutes is 180; anything beyond that is an orphaned run.
const STALE_WITH_RUN_ID_MINUTES = 190

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Auto-expire stale runs: "running" with no github_run_id older than STALE_MINUTES
  const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString()
  await supabase
    .from('test_runs')
    .update({ status: 'error', completed_at: new Date().toISOString() })
    .eq('status', 'running')
    .is('github_run_id', null)
    .lt('created_at', staleThreshold)

  // Also expire runs that have a github_run_id but exceeded the max workflow duration.
  // Without this, a stuck run could block all new triggers indefinitely via the lock.
  const staleWithRunIdThreshold = new Date(Date.now() - STALE_WITH_RUN_ID_MINUTES * 60 * 1000).toISOString()
  await supabase
    .from('test_runs')
    .update({
      status: 'error',
      completed_at: new Date().toISOString(),
      failure_reason: 'Run timed out — exceeded maximum workflow duration.',
    })
    .eq('status', 'running')
    .not('github_run_id', 'is', null)
    .lt('created_at', staleWithRunIdThreshold)

  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
