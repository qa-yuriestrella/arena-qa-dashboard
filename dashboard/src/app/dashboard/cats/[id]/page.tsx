'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { CATS } from '@/lib/cats'
import { RunModal } from '@/components/RunModal'
import { StatusBadge } from '@/components/StatusBadge'
import type { TestRun, TestResult } from '@/types'
import { formatDuration, runDurationMs } from '@/lib/utils'

function traceViewerUrl(url: string) {
  return `https://trace.playwright.dev/?trace=${encodeURIComponent(url)}`
}

function isValidUrl(url: string): boolean {
  try { new URL(url); return true } catch { return false }
}

export default function CatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [runModalOpen, setRunModalOpen] = useState(false)
  const [pendingScenarioGrep, setPendingScenarioGrep] = useState<string | undefined>()
  const [triggering, setTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState<string | null>(null)

  // Latest historical run results (shown as dots on first load)
  const [latestRun, setLatestRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestResult[]>([])

  // Active run (just triggered — we poll this)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<TestRun | null>(null)
  const [activeResults, setActiveResults] = useState<TestResult[] | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cat = CATS.find(c => c.id === id)
  const storageKey = `active-run-${id}`

  // Load latest historical run on mount + restore active run from localStorage
  useEffect(() => {
    if (!cat) return

    // Restore in-progress run from localStorage (survives navigation)
    const savedRunId = localStorage.getItem(storageKey)
    if (savedRunId) setActiveRunId(savedRunId)

    fetch('/api/runs')
      .then(r => r.json())
      .then((runs: TestRun[]) => {
        const run = runs.find(r =>
          r.cats === 'all' || r.cats === cat.id || r.cats.split(',').includes(cat.id)
        )
        if (!run) return
        setLatestRun(run)
        return fetch(`/api/runs/${run.id}`)
          .then(r => r.json())
          .then(data => {
            if (data?.results) {
              setResults(data.results.filter((r: TestResult) => r.cat === cat.id))
            }
          })
      })
      .catch(() => {})
  }, [cat?.id])

  // Poll the active run until it finishes
  const pollActiveRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`/api/runs/${runId}`)
      if (!res.ok) return
      const data = await res.json()
      const run: TestRun = data.run
      setActiveRun(run)

      if (run.status !== 'running') {
        // Done — stop polling and clear localStorage
        if (pollingRef.current) clearInterval(pollingRef.current)
        localStorage.removeItem(storageKey)
        const catResults = (data.results as TestResult[] || []).filter(r => r.cat === cat?.id)
        setActiveResults(catResults)
        setResults(catResults)
        setLatestRun(run)
      }
    } catch {}
  }, [cat?.id, storageKey])

  useEffect(() => {
    if (!activeRunId) return
    pollActiveRun(activeRunId)
    pollingRef.current = setInterval(() => pollActiveRun(activeRunId), 2000)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [activeRunId, pollActiveRun])

  if (!cat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-white/40">Test category not found.</p>
        <button onClick={() => router.back()} className="text-sm text-brand-400 hover:text-brand-300">← Back</button>
      </div>
    )
  }

  function openRunAll() {
    setPendingScenarioGrep(undefined)
    setRunModalOpen(true)
  }

  function openRunScenario(scenario: string) {
    setPendingScenarioGrep(scenario)
    setRunModalOpen(true)
  }

  async function triggerRun(cats: string) {
    setRunModalOpen(false)
    setTriggering(true)
    setTriggerError(null)
    setActiveRun(null)
    setActiveResults(null)
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cats,
          triggeredBy: session?.user?.email,
          scenarioGrep: pendingScenarioGrep,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to trigger run')
      }
      const { runId } = await res.json()
      localStorage.setItem(storageKey, runId)
      setActiveRunId(runId)
    } catch (e: any) {
      setTriggerError(e.message)
    } finally {
      setTriggering(false)
    }
  }

  // Which results to show for scenario dots — active run wins over historical
  const displayResults = activeResults ?? results
  const resultByScenario = displayResults.reduce<Record<string, TestResult>>((acc, r) => {
    acc[r.scenario_name] = r
    return acc
  }, {})

  const isRunning = activeRun?.status === 'running'
  const runDone = activeRun && activeRun.status !== 'running'

  // Live elapsed timer
  const [elapsedMs, setElapsedMs] = useState(0)
  useEffect(() => {
    if (!isRunning || !activeRun?.created_at) { setElapsedMs(0); return }
    setElapsedMs(Date.now() - new Date(activeRun.created_at).getTime())
    const id = setInterval(() => setElapsedMs(Date.now() - new Date(activeRun.created_at).getTime()), 1000)
    return () => clearInterval(id)
  }, [isRunning, activeRun?.created_at])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg glass glass-hover text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-brand-500 bg-brand-600/10 px-1.5 py-0.5 rounded">{cat.id}</span>
              {(activeRun ?? latestRun) && <StatusBadge status={(activeRun ?? latestRun)!.status} />}
            </div>
            <h1 className="text-2xl font-bold text-white">{cat.name}</h1>
            <p className="text-sm text-white/40 mt-0.5">{cat.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(activeRun ?? latestRun) && (
            <Link
              href={`/dashboard/runs/${(activeRun ?? latestRun)!.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
            >
              View Details
            </Link>
          )}
          <button
            onClick={openRunAll}
            disabled={triggering || isRunning}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-brand rounded-xl text-white text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" />Running...</>
            ) : triggering ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" />Triggering...</>
            ) : (
              <><PlayIcon />Run {cat.id}</>
            )}
          </button>
        </div>
      </div>

      {/* Trigger error */}
      {triggerError && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-3">
          <span>{triggerError}</span>
          <button onClick={() => setTriggerError(null)} className="text-red-400/60 hover:text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      {/* Active run status panel */}
      <AnimatePresence>
        {activeRun && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass rounded-xl p-4 border ${
              isRunning ? 'border-brand-500/30' :
              activeRun.status === 'passed' ? 'border-emerald-500/30' :
              activeRun.status === 'failed' ? 'border-red-500/30' :
              'border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Spinner or icon */}
              {isRunning ? (
                <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin flex-shrink-0" />
              ) : activeRun.status === 'passed' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : activeRun.status === 'failed' ? (
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0">
                {isRunning ? (
                  <>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-white">Running tests on GitHub Actions...</p>
                      <span className="text-sm font-mono text-brand-400 tabular-nums">{formatDuration(elapsedMs)}</span>
                    </div>
                    {activeRun.current_scenario ? (
                      <p className="text-xs text-brand-400/80 mt-0.5 font-mono">
                        Scenario {activeRun.current_scenario}
                      </p>
                    ) : !activeRun.github_run_id ? (
                      <p className="text-xs text-white/30 mt-0.5">Waiting for workflow to start</p>
                    ) : (
                      <p className="text-xs text-white/30 mt-0.5">Starting tests...</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <p className={`text-sm font-medium ${
                        activeRun.status === 'passed' ? 'text-emerald-400' :
                        activeRun.status === 'failed' ? 'text-red-400' : 'text-white/60'
                      }`}>
                        {activeRun.status === 'passed' ? 'All scenarios passed' :
                         activeRun.status === 'failed' ? `${activeRun.failed_tests} scenario${activeRun.failed_tests !== 1 ? 's' : ''} failed` :
                         activeRun.status === 'error' ? 'Run error — check details' :
                         'Run cancelled'}
                      </p>
                      {(() => { const d = runDurationMs(activeRun); return d != null ? <span className="text-xs text-white/35 tabular-nums">{formatDuration(d)}</span> : null })()}
                    </div>
                    {activeRun.total_tests > 0 && (
                      <p className="text-xs text-white/40 mt-0.5">
                        {activeRun.passed_tests} passed · {activeRun.failed_tests} failed · {activeRun.skipped_tests} skipped
                        {activeRun.status === 'error' && activeRun.failure_reason && (
                          <span className="text-red-400/70"> — {activeRun.failure_reason}</span>
                        )}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {activeRun.github_run_url && (
                  <a
                    href={activeRun.github_run_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
                  >
                    GitHub
                  </a>
                )}
                <Link
                  href={`/dashboard/runs/${activeRun.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
                >
                  View Details
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scenarios list */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Test Scenarios</h2>
          <div className="flex items-center gap-3">
            {displayResults.length > 0 && (
              <span className="text-xs text-white/30">
                <span className="text-emerald-400">{displayResults.filter(r => r.status === 'passed').length} passed</span>
                {displayResults.filter(r => r.status === 'failed').length > 0 && (
                  <> · <span className="text-red-400">{displayResults.filter(r => r.status === 'failed').length} failed</span></>
                )}
              </span>
            )}
            <span className="text-xs text-white/20">{cat.scenarios.length} scenarios</span>
          </div>
        </div>

        {cat.scenarios.length === 0 ? (
          <p className="text-sm text-white/30 py-4 text-center">No scenarios mapped yet.</p>
        ) : (
          <ul className="space-y-1">
            {cat.scenarios.map((scenario, i) => {
              const result = resultByScenario[scenario]
              const isThisRunning = isRunning

              const dotColor = isThisRunning
                ? 'bg-white/20 animate-pulse'
                : result
                  ? result.status === 'passed' ? 'bg-emerald-400'
                    : result.status === 'failed' ? 'bg-red-400'
                    : 'bg-amber-400'
                  : 'bg-white/15'

              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group/item"
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-500 ${dotColor}`} />

                  {/* Scenario name */}
                  <span className={`text-sm flex-1 leading-snug transition-colors ${
                    result?.status === 'failed' ? 'text-red-300/80' :
                    result?.status === 'passed' ? 'text-white/70' :
                    'text-white/50'
                  }`}>
                    {scenario}
                  </span>

                  {/* Duration */}
                  {result?.duration_ms != null && (
                    <span className="text-xs text-white/25 flex-shrink-0">
                      {(result.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}

                  {/* Trace link */}
                  {result?.trace_url && isValidUrl(result.trace_url) && (
                    <a
                      href={traceViewerUrl(result.trace_url)}
                      target="_blank"
                      rel="noreferrer"
                      title="Open Trace Viewer"
                      className="opacity-0 group-hover/item:opacity-100 flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-600/15 hover:bg-brand-600/30 text-brand-400 hover:text-white text-xs transition-all"
                    >
                      <TraceIcon />
                      Trace
                    </a>
                  )}

                  {/* Error message inline */}
                  {result?.status === 'failed' && result.error_message && (
                    <span
                      title={result.error_message}
                      className="opacity-0 group-hover/item:opacity-100 flex-shrink-0 text-xs text-red-400/70 cursor-help max-w-[140px] truncate"
                    >
                      {result.error_message.split('\n')[0]}
                    </span>
                  )}

                  {/* Play button */}
                  <button
                    onClick={() => openRunScenario(scenario)}
                    disabled={triggering || isRunning}
                    title={`Run only: ${scenario}`}
                    className="opacity-0 group-hover/item:opacity-100 w-6 h-6 flex items-center justify-center rounded-md bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 hover:text-white transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-30 flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </motion.li>
              )
            })}
          </ul>
        )}

        {/* Inline error detail for failed scenarios */}
        <AnimatePresence>
          {runDone && activeResults && activeResults.filter(r => r.status === 'failed').length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/5 space-y-3"
            >
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Failure Details</p>
              {activeResults.filter(r => r.status === 'failed').map(r => (
                <div key={r.id} className="rounded-lg bg-red-400/5 border border-red-500/15 p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-medium text-white/80">{r.scenario_name}</span>
                    {r.trace_url && isValidUrl(r.trace_url) && (
                      <a
                        href={traceViewerUrl(r.trace_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 hover:text-white text-xs transition-all"
                      >
                        <TraceIcon />
                        Open Trace
                      </a>
                    )}
                  </div>
                  {r.error_message && (
                    <pre className="text-xs text-red-400/70 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                      {r.error_message}
                    </pre>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {runModalOpen && (
          <RunModal
            cats={[cat]}
            onConfirm={(cats) => triggerRun(cats)}
            onClose={() => setRunModalOpen(false)}
            loading={triggering}
            scenarioGrep={pendingScenarioGrep}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function TraceIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  )
}
