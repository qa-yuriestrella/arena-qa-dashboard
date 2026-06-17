/**
 * Parses Playwright JSON results and saves them to Supabase.
 * Runs after tests finish in GitHub Actions.
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RUN_ID = process.env.RUN_ID;
const GITHUB_RUN_URL = process.env.GITHUB_RUN_URL;
const RESULTS_FILE = path.join(__dirname, '..', 'test-results', 'results.json');

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
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${urlPath} → ${res.status}: ${text}`);
  }
  return method === 'GET' ? res.json() : null;
}

async function uploadTrace(localPath, scenarioTitle) {
  if (!localPath || !fs.existsSync(localPath)) return null;
  try {
    const safeName = scenarioTitle.replace(/[^a-zA-Z0-9\-]/g, '_').substring(0, 120);
    const storagePath = `${RUN_ID}/${safeName}.zip`;
    const fileBuffer = fs.readFileSync(localPath);

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/traces/${storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/zip',
          'x-upsert': 'true',
        },
        body: fileBuffer,
      }
    );

    if (!res.ok) {
      console.warn(`  trace upload failed for "${scenarioTitle}": ${res.status}`);
      return null;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/traces/${storagePath}`;
  } catch (err) {
    console.warn(`  trace upload error for "${scenarioTitle}": ${err.message}`);
    return null;
  }
}

function extractCat(titlePath) {
  const str = titlePath.join(' ');
  const match = str.match(/CAT\d+/i);
  return match ? match[0].toUpperCase() : 'UNKNOWN';
}

async function main() {
  if (!RUN_ID) {
    console.log('No RUN_ID provided — skipping Supabase save.');
    process.exit(0);
  }

  // If the supabase-reporter already saved results, just clean up and exit.
  const existing = await supabaseFetch(`test_results?run_id=eq.${RUN_ID}&select=id,status`).catch(() => []);
  if (existing.length > 0) {
    console.log(`Reporter already saved ${existing.length} results — skipping full save.`);
    // Clear progress label and ensure github_run_url is set (reporter may not have finished onEnd if cancelled)
    const runs = await supabaseFetch(`test_runs?id=eq.${RUN_ID}&select=status`).catch(() => []);
    if (runs[0]?.status === 'running') {
      const passed = existing.filter(r => r.status === 'passed').length;
      const failed = existing.filter(r => r.status === 'failed').length;
      const skipped = existing.filter(r => r.status === 'skipped').length;
      await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
        status: failed > 0 ? 'failed' : passed > 0 ? 'passed' : 'error',
        total_tests: existing.length,
        passed_tests: passed,
        failed_tests: failed,
        skipped_tests: skipped,
        current_scenario: null,
        completed_at: new Date().toISOString(),
        github_run_url: GITHUB_RUN_URL,
      });
      console.log(`Updated run status from partial results: ${failed > 0 ? 'failed' : 'passed'}`);
    } else {
      // Run already finalized by reporter, just ensure label is cleared
      await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
        current_scenario: null,
        github_run_url: GITHUB_RUN_URL,
      }).catch(() => {});
    }
    process.exit(0);
  }

  if (!fs.existsSync(RESULTS_FILE)) {
    console.error('results.json not found at', RESULTS_FILE);
    await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
      status: 'error',
      current_scenario: null,
      completed_at: new Date().toISOString(),
      failure_reason: 'Test results file not found — tests may not have run. Check the GitHub Actions log.',
    });
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  const suites = raw.suites || [];

  // First pass: collect raw results with trace paths (sync)
  const rawResults = [];
  let passed = 0, failed = 0, skipped = 0;

  function walkSuites(suitesArr, titlePath = []) {
    for (const suite of suitesArr) {
      const currentPath = [...titlePath, suite.title].filter(Boolean);
      if (suite.specs) {
        for (const spec of suite.specs) {
          for (const test of spec.tests || []) {
            const status = test.status === 'expected' ? 'passed'
              : test.status === 'skipped' ? 'skipped'
              : 'failed';

            if (status === 'passed') passed++;
            else if (status === 'failed') failed++;
            else skipped++;

            const result = test.results?.[0] || {};
            const errorMsg = result.error?.message?.substring(0, 2000) || null;
            const duration = result.duration || 0;
            const traceAttachment = result.attachments?.find(a => a.name === 'trace');

            rawResults.push({
              run_id: RUN_ID,
              cat: extractCat(currentPath),
              scenario_name: spec.title,
              status,
              duration_ms: duration,
              error_message: errorMsg,
              _tracePath: traceAttachment?.path || null,
            });
          }
        }
      }
      if (suite.suites) walkSuites(suite.suites, currentPath);
    }
  }

  walkSuites(suites);

  // Second pass: upload trace files (async, in parallel batches of 5)
  console.log(`Uploading traces for ${rawResults.length} scenarios...`);
  const BATCH = 5;
  const results = [];

  for (let i = 0; i < rawResults.length; i += BATCH) {
    const batch = rawResults.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (r) => {
        const traceUrl = await uploadTrace(r._tracePath, r.scenario_name);
        const { _tracePath, ...result } = r;
        return { ...result, trace_url: traceUrl };
      })
    );
    results.push(...batchResults);
  }

  const total = passed + failed + skipped;

  // Save individual results in batches of 50
  for (let i = 0; i < results.length; i += 50) {
    await supabaseFetch('test_results', 'POST', results.slice(i, i + 50));
  }

  // Update the run record
  await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
    status: failed > 0 ? 'failed' : 'passed',
    total_tests: total,
    passed_tests: passed,
    failed_tests: failed,
    skipped_tests: skipped,
    current_scenario: null,
    completed_at: new Date().toISOString(),
    github_run_url: GITHUB_RUN_URL,
  });

  console.log(`Done. ${passed} passed, ${failed} failed, ${skipped} skipped.`);
}

main().catch(async (err) => {
  console.error('save-results.js failed:', err.message);
  if (RUN_ID) {
    try {
      await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
        status: 'error',
        completed_at: new Date().toISOString(),
        failure_reason: `save-results.js crashed: ${err.message}`,
      });
    } catch {}
  }
  process.exit(1);
});
