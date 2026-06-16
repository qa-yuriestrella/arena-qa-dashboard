import { Octokit } from '@octokit/rest'

function getOctokit() {
  const token = process.env.GITHUB_PAT
  if (!token) throw new Error('GITHUB_PAT env var is not set')
  return new Octokit({ auth: token })
}

const OWNER = () => process.env.GITHUB_REPO_OWNER || 'stationfy'
const REPO = () => process.env.GITHUB_REPO_NAME || 'arena-qa'
const WORKFLOW_ID = () => process.env.GITHUB_WORKFLOW_ID || 'run-tests.yml'

export async function triggerWorkflow(cats: string, runId: string, triggeredBy: string) {
  await getOctokit().actions.createWorkflowDispatch({
    owner: OWNER(),
    repo: REPO(),
    workflow_id: WORKFLOW_ID(),
    ref: 'main',
    inputs: { cats, run_id: runId, triggered_by: triggeredBy },
  })
}

// Polls GitHub API for up to maxWaitMs to find the run that was just triggered.
// workflow_dispatch doesn't return a run ID so we find the newest run created after `after`.
export async function findNewWorkflowRun(after: Date, maxWaitMs = 15000): Promise<number | null> {
  const octokit = getOctokit()
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000))
    const { data } = await octokit.actions.listWorkflowRuns({
      owner: OWNER(),
      repo: REPO(),
      workflow_id: WORKFLOW_ID(),
      per_page: 5,
    })
    const match = data.workflow_runs.find(
      r => new Date(r.created_at) >= after
    )
    if (match) return match.id
  }
  return null
}

export async function getWorkflowRunStatus(githubRunId: number) {
  const { data } = await getOctokit().actions.getWorkflowRun({
    owner: OWNER(),
    repo: REPO(),
    run_id: githubRunId,
  })
  return { status: data.status, conclusion: data.conclusion, html_url: data.html_url }
}

export async function cancelWorkflowRun(githubRunId: number) {
  await getOctokit().actions.cancelWorkflowRun({
    owner: OWNER(),
    repo: REPO(),
    run_id: githubRunId,
  })
}
