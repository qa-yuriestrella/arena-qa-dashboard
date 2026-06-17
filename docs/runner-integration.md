# Arena QA Dashboard — Runner Integration

## Overview

The dashboard uses **GitHub Actions** as the test runner. Communication is async and polling-based: the dashboard triggers the workflow via the GitHub API, the runner executes tests and streams results directly to Supabase via a custom Playwright reporter, and the dashboard polls Supabase every 2–10s to display live progress.

```
Dashboard (Next.js) ──POST──▶ /api/trigger
                                  │
                                  ├─▶ Supabase: INSERT test_runs (status: running)
                                  │
                                  └─▶ GitHub API: workflow_dispatch
                                            │
                                            ▼
                                   GitHub Actions Runner
                                            │
                                   Playwright + supabase-reporter.js
                                            │
                                   Per-scenario (real time):
                                   ├─▶ Supabase: UPDATE test_runs.current_scenario
                                   └─▶ Supabase: INSERT test_results
                                            │
                                   On completion:
                                   └─▶ Supabase: UPDATE test_runs (status, totals)
                                            │
                                   save-results.js (safety net)
                                   └─▶ skips if reporter already saved results;
                                       handles partial results on cancelled runs
```

---

## 1. Triggering a Run

### Endpoint: `POST /api/trigger`

1. Creates a record in `test_runs` with `status: 'running'`
2. Calls `triggerWorkflow()` via Octokit to dispatch the `workflow_dispatch` event
3. In background, polls the GitHub API for up to 15s to find the `github_run_id` and saves it to the record

**`workflow_dispatch` payload:**

```json
{
  "ref": "main",
  "inputs": {
    "cats": "CAT03,CAT07,CAT10",
    "run_id": "<supabase uuid>",
    "triggered_by": "yuri.silva@arena.im",
    "scenario_grep": ""
  }
}
```

**Required environment variables in Vercel:**

| Variable | Description |
|---|---|
| `GITHUB_PAT` | Personal Access Token with `actions:write` permission |
| `GITHUB_REPO_OWNER` | `stationfy` |
| `GITHUB_REPO_NAME` | `arena-qa` |
| `GITHUB_WORKFLOW_ID` | `run-tests.yml` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Service role key (full DB access) |

---

## 2. Runner Execution (GitHub Actions)

**File:** `.github/workflows/run-tests.yml`

### Inputs received:

| Input | Example | Usage |
|---|---|---|
| `cats` | `"CAT03,CAT10"` or `"all"` | Filters which `.feature` files to run |
| `run_id` | `"uuid-..."` | Identifier for saving results |
| `triggered_by` | `"email@arena.im"` | Audit log |
| `scenario_grep` | `""` or `"login"` | Additional scenario filter |

### Runner pipeline:

```
1.  Checkout code
2.  Setup Node.js 22 + yarn cache
3.  yarn install
4.  Cache Playwright browsers (chromium)
5.  Cache generated BDD specs
6.  yarn bddgen  →  generates .features-gen/
7.  Identify which CAT*.feature files to run
8.  Playwright + supabase-reporter.js  →  streams results to Supabase in real time
9.  node scripts/save-results.js  →  safety net (skips if reporter already saved)
10. Upload artifacts (HTML report, videos)
```

**Config:** 2 workers, 180min timeout, 1 retry per scenario.

---

## 3. Real-Time Reporter (`scripts/supabase-reporter.js`)

A custom Playwright reporter that runs alongside the tests and streams data to Supabase without waiting for all tests to finish.

### What it does:

| Event | Action |
|---|---|
| `onBegin` | Counts total scenarios |
| `onTestBegin` | PATCH `test_runs.current_scenario` → `"3/14 · Scenario title"` |
| `onTestEnd` | Uploads trace zip to Supabase Storage, INSERT into `test_results` |
| `onEnd` | Flushes all pending writes, UPDATE `test_runs` with final status and totals |

### Key behaviors:

- Only activates when `RUN_ID` env var is set (i.e. triggered via dashboard)
- Retried tests: only saves the final attempt result (avoids duplicates)
- `onTestEnd` is synchronous — the async chain (trace upload + DB insert) is pushed to an internal `_pending` queue and flushed atomically in `onEnd`
- All Supabase errors are swallowed to avoid breaking test execution

**Required env vars in the "Run tests" step:**

| Variable | Source |
|---|---|
| `SUPABASE_URL` | `secrets.SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | `secrets.SUPABASE_SERVICE_KEY` |
| `RUN_ID` | `inputs.run_id` |
| `GITHUB_RUN_URL` | `github.server_url/github.repository/actions/runs/github.run_id` |

---

## 4. Safety Net (`scripts/save-results.js`)

Runs after tests with `if: always()` — ensures results are saved even if the reporter failed or the run was cancelled mid-way.

### Logic:

1. Queries `test_results` for existing rows with this `run_id`
2. **If rows exist** (reporter ran successfully):
   - If run is still `running` (cancelled mid-way): computes totals from existing rows and updates `test_runs`
   - Otherwise: just clears `current_scenario` and ensures `github_run_url` is set
3. **If no rows exist** (reporter didn't run): falls back to full save from `test-results/results.json`

### Status mapping (fallback path):

| Playwright status | Supabase status |
|---|---|
| `expected` | `passed` |
| `skipped` | `skipped` |
| anything else | `failed` |

---

## 5. Supabase Schema

### `test_runs`

```sql
id               uuid         PK, auto
created_at       timestamptz
triggered_by     text
cats             text         -- "CAT03,CAT10" or "all"
status           text         -- running | passed | failed | error | cancelled
github_run_id    text
github_run_url   text
total_tests      int
passed_tests     int
failed_tests     int
skipped_tests    int
completed_at     timestamptz
duration_ms      int
failure_reason   text
current_scenario text         -- live progress: "3/14 · Scenario title" (null when idle)
```

### `test_results`

```sql
id             uuid         PK, auto
run_id         uuid         FK → test_runs.id (cascade delete)
cat            text         -- "CAT03"
scenario_name  text
status         text         -- passed | failed | skipped
duration_ms    int
error_message  text         -- max 2000 chars
trace_url      text         -- Supabase Storage URL
created_at     timestamptz
```

---

## 6. Dashboard Polling

The dashboard uses polling — no webhooks.

| Context | Interval | Endpoint |
|---|---|---|
| Run list (idle) | 10s | `GET /api/runs` |
| Run list (running) | 5s | `GET /api/runs` |
| Detail page (running) | 2s | `GET /api/runs/[id]` |
| Detail page (done) | stops | — |

`GET /api/runs/[id]` also syncs status by querying the GitHub API for runs stuck in `running` with a `github_run_id` set (detects workflow that finished outside the dashboard).

---

## 7. Stale Run Detection

`GET /api/runs` auto-expires orphan runs:

- Run with `status: 'running'` for more than **5 minutes** without a `github_run_id` → marked as `error`
- Prevents failed dispatches from leaving runs stuck indefinitely

---

## 8. End-to-End Flow

```
User clicks "Run" on the dashboard
  │
  ▼
POST /api/trigger
  ├── Supabase: INSERT test_runs { status: 'running' }
  ├── GitHub: workflow_dispatch { cats, run_id, triggered_by }
  └── Background: poll GitHub API 15s → UPDATE test_runs.github_run_id

GitHub Actions runner starts
  └── Playwright + supabase-reporter.js
        ├── Per scenario start: UPDATE test_runs.current_scenario
        ├── Per scenario end:   INSERT test_results + upload trace
        └── On finish:          UPDATE test_runs { status, totals, current_scenario: null }

save-results.js (always runs)
  └── If reporter saved results: just cleans up
      If reporter failed:        full save from results.json

Dashboard polling (2–10s)
  ├── GET /api/runs        → updates run list
  └── GET /api/runs/[id]  → updates active run detail + live scenario progress
```

---

## 9. Adding a New Runner

To connect an alternative runner (e.g. self-hosted, another CI):

1. The runner must accept the same 4 inputs: `cats`, `run_id`, `triggered_by`, `scenario_grep`
2. Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RUN_ID`, `GITHUB_RUN_URL`
3. Reference `scripts/supabase-reporter.js` in the Playwright config reporter list
4. Run `scripts/save-results.js` after tests as a safety net
5. The runner needs access to Supabase Storage for trace uploads
6. Update `dashboard/src/lib/github.ts` to point to the new dispatch system
7. No schema or dashboard page changes needed
