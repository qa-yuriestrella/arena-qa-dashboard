import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_PAT })

const OWNER = process.env.GITHUB_REPO_OWNER!
const REPO = process.env.GITHUB_REPO_NAME!
const WORKFLOW_ID = process.env.GITHUB_WORKFLOW_ID || 'run-tests.yml'

export async function triggerWorkflow(cats: string, runId: string, triggeredBy: string) {
  await octokit.actions.createWorkflowDispatch({
    owner: OWNER,
    repo: REPO,
    workflow_id: WORKFLOW_ID,
    ref: 'main',
    inputs: {
      cats,
      run_id: runId,
      triggered_by: triggeredBy,
    },
  })
}

export async function getWorkflowRunStatus(githubRunId: string) {
  const { data } = await octokit.actions.getWorkflowRun({
    owner: OWNER,
    repo: REPO,
    run_id: Number(githubRunId),
  })
  return data
}

export async function getLatestWorkflowRun() {
  const { data } = await octokit.actions.listWorkflowRuns({
    owner: OWNER,
    repo: REPO,
    workflow_id: WORKFLOW_ID,
    per_page: 1,
  })
  return data.workflow_runs[0] || null
}
