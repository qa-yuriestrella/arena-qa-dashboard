import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { triggerWorkflow, findNewWorkflowRun } from '@/lib/github'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cats, triggeredBy, scenarioGrep } = await req.json()
  if (!cats) return NextResponse.json({ error: 'cats is required' }, { status: 400 })

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

  const triggeredAt = new Date()

  try {
    await triggerWorkflow(cats, run.id, triggeredBy || session.user?.email || '', scenarioGrep)
  } catch (e: any) {
    await supabase.from('test_runs').update({ status: 'error' }).eq('id', run.id)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // Find the GitHub run ID in the background so we can track/cancel it
  findNewWorkflowRun(triggeredAt).then(async (githubRunId) => {
    if (githubRunId) {
      const owner = process.env.GITHUB_REPO_OWNER
      const repo = process.env.GITHUB_REPO_NAME
      const github_run_url = owner && repo
        ? `https://github.com/${owner}/${repo}/actions/runs/${githubRunId}`
        : null
      await supabase.from('test_runs').update({
        github_run_id: String(githubRunId),
        ...(github_run_url && { github_run_url }),
      }).eq('id', run.id)
    }
  }).catch(() => {})

  return NextResponse.json({ runId: run.id })
}
