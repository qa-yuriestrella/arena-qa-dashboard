// @ts-check
/**
 * Playwright reporter that streams results to Supabase in real time.
 *
 * onTestBegin → updates current_scenario on test_runs (progress feedback)
 * onTestEnd   → inserts result into test_results + uploads trace
 * onEnd       → finalizes run record (status, totals, clears current_scenario)
 *
 * Only activates when RUN_ID env var is set (i.e. triggered via dashboard).
 */

const fs = require('fs')
const path = require('path')

const RUN_ID = process.env.RUN_ID
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const GITHUB_RUN_URL = process.env.GITHUB_RUN_URL

async function supabaseFetch(urlPath, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${urlPath}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=minimal' : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase ${method} ${urlPath} → ${res.status}: ${text}`)
  }
  return method === 'GET' ? res.json() : null
}

async function uploadTrace(localPath, scenarioTitle) {
  if (!localPath || !fs.existsSync(localPath)) return null
  try {
    const safeName = scenarioTitle.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 120)
    const storagePath = `${RUN_ID}/${safeName}.zip`
    const fileBuffer = fs.readFileSync(localPath)
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/traces/${storagePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/zip',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    })
    if (!res.ok) return null
    return `${SUPABASE_URL}/storage/v1/object/public/traces/${storagePath}`
  } catch {
    return null
  }
}

function extractCat(test) {
  const parts = []
  let node = test.parent
  while (node) {
    if (node.title) parts.unshift(node.title)
    node = node.parent
  }
  const str = [...parts, test.title].join(' ')
  const match = str.match(/CAT\d+/i)
  return match ? match[0].toUpperCase() : 'UNKNOWN'
}

class SupabaseReporter {
  constructor() {
    this._total = 0
    this._startedIds = new Set()  // tracks first attempts only (no retries)
    this._finalizedIds = new Set() // avoids double-saving retried tests
    this._passed = 0
    this._failed = 0
    this._skipped = 0
    this._pending = []             // fire-and-forget promises flushed in onEnd
  }

  _fire(p) {
    this._pending.push(p.catch(() => {}))
  }

  onBegin(config, suite) {
    if (!RUN_ID) return
    this._total = suite.allTests().length
  }

  onTestBegin(test, result) {
    if (!RUN_ID || result.retry > 0) return
    this._startedIds.add(test.id)
    const n = this._startedIds.size
    const label = `${n}/${this._total} · ${test.title}`
    this._fire(
      supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', { current_scenario: label })
    )
  }

  async onTestEnd(test, result) {
    if (!RUN_ID) return

    // Only save on the final attempt
    const isFinal = result.status === 'passed' || result.retry >= test.retries
    if (!isFinal || this._finalizedIds.has(test.id)) return
    this._finalizedIds.add(test.id)

    const status = result.status === 'passed' ? 'passed'
      : result.status === 'skipped' ? 'skipped'
      : 'failed'

    if (status === 'passed') this._passed++
    else if (status === 'failed') this._failed++
    else this._skipped++

    const traceAtt = result.attachments?.find(a => a.name === 'trace')
    const traceUrl = await uploadTrace(traceAtt?.path, test.title)
    const errorMsg = result.error?.message?.substring(0, 2000) || null

    this._fire(
      supabaseFetch('test_results', 'POST', [{
        run_id: RUN_ID,
        cat: extractCat(test),
        scenario_name: test.title,
        status,
        duration_ms: result.duration || 0,
        error_message: errorMsg,
        trace_url: traceUrl,
      }])
    )
  }

  async onEnd() {
    if (!RUN_ID) return
    await Promise.all(this._pending)

    const total = this._passed + this._failed + this._skipped
    await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
      status: this._failed > 0 ? 'failed' : 'passed',
      total_tests: total,
      passed_tests: this._passed,
      failed_tests: this._failed,
      skipped_tests: this._skipped,
      current_scenario: null,
      completed_at: new Date().toISOString(),
      github_run_url: GITHUB_RUN_URL || null,
    }).catch(console.error)
  }
}

module.exports = SupabaseReporter
