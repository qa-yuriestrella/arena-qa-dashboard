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

async function supabaseFetch(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
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
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text}`);
  }
  return method === 'GET' ? res.json() : null;
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

  if (!fs.existsSync(RESULTS_FILE)) {
    console.error('results.json not found at', RESULTS_FILE);
    await supabaseFetch(`test_runs?id=eq.${RUN_ID}`, 'PATCH', {
      status: 'error',
      completed_at: new Date().toISOString(),
    });
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  const suites = raw.suites || [];

  const results = [];
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

            results.push({
              run_id: RUN_ID,
              cat: extractCat(currentPath),
              scenario_name: spec.title,
              status,
              duration_ms: duration,
              error_message: errorMsg,
            });
          }
        }
      }
      if (suite.suites) walkSuites(suite.suites, currentPath);
    }
  }

  walkSuites(suites);

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
    completed_at: new Date().toISOString(),
    github_run_url: GITHUB_RUN_URL,
  });

  console.log(`Saved ${results.length} results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
}

main().catch((err) => {
  console.error('save-results.js failed:', err.message);
  process.exit(1);
});
