'use client'

import Link from 'next/link'
import type { TestRun, TestResult } from '@/types'
import { StatusBadge } from './StatusBadge'
import { ProgressRing } from './ProgressRing'

interface Props {
  run: TestRun
  results: TestResult[]
}

function traceUrl(url: string) {
  return `https://trace.playwright.dev/?trace=${encodeURIComponent(url)}`
}

export function RunDetail({ run, results }: Props) {
  const passRate = run.total_tests > 0
    ? Math.round((run.passed_tests / run.total_tests) * 100)
    : null

  const failed = results.filter(r => r.status === 'failed')
  const passed = results.filter(r => r.status === 'passed')
  const skipped = results.filter(r => r.status === 'skipped')

  const byCat = results.reduce<Record<string, TestResult[]>>((acc, r) => {
    if (!acc[r.cat]) acc[r.cat] = []
    acc[r.cat].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400 transition-colors">
        Back to Dashboard
      </Link>

      {/* Summary */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-4">
            {passRate !== null && <ProgressRing percentage={passRate} size={72} />}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={run.status} />
              </div>
              <p className="text-white font-semibold">{run.cats === 'all' ? 'Full Test Run' : run.cats}</p>
              <p className="text-xs text-white/40">{new Date(run.created_at).toLocaleString('pt-BR')}</p>
              {run.status === 'error' && run.failure_reason && (
                <p className="text-xs text-red-400/70 mt-1 max-w-sm">{run.failure_reason}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-8 sm:ml-auto">
            {[
              { label: 'Passed', value: run.passed_tests, color: 'text-emerald-400' },
              { label: 'Failed', value: run.failed_tests, color: 'text-red-400' },
              { label: 'Skipped', value: run.skipped_tests, color: 'text-amber-400' },
              { label: 'Total', value: run.total_tests, color: 'text-white' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-white/40">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {run.github_run_url && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <a href={run.github_run_url} target="_blank" rel="noreferrer"
              className="text-xs text-brand-500 hover:text-brand-400 underline">
              View on GitHub Actions ↗
            </a>
          </div>
        )}
      </div>

      {/* Failed tests (highlighted) */}
      {failed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">
            Failed Tests ({failed.length})
          </h2>
          <div className="space-y-3">
            {failed.map(result => (
              <div key={result.id} className="glass rounded-xl p-4 border border-red-500/20">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-brand-500 bg-brand-600/10 px-1.5 py-0.5 rounded">{result.cat}</span>
                    <span className="text-sm font-medium text-white">{result.scenario_name}</span>
                  </div>
                  {result.trace_url && (
                    <a
                      href={traceUrl(result.trace_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 hover:text-white text-xs font-medium transition-all"
                    >
                      <TraceIcon />
                      Ver Trace
                    </a>
                  )}
                </div>
                {result.error_message && (
                  <pre className="text-xs text-red-400/80 bg-red-400/5 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono mt-2">
                    {result.error_message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All results by CAT */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">All Results by Category</h2>
        <div className="glass rounded-2xl overflow-hidden">
          {Object.entries(byCat).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catResults], i) => {
            const catPass = catResults.filter(r => r.status === 'passed').length
            const catFail = catResults.filter(r => r.status === 'failed').length
            const catPassRate = catResults.length > 0 ? Math.round((catPass / catResults.length) * 100) : 0

            return (
              <div key={cat} className={i > 0 ? 'border-t border-white/5' : ''}>
                {/* CAT header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-white/2">
                  <span className="text-xs font-mono text-brand-500 font-bold">{cat}</span>
                  <span className="text-xs text-white/30">{catResults.length} tests</span>
                  <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-emerald-400">{catPass} passed</span>
                    {catFail > 0 && <span className="text-xs text-red-400">{catFail} failed</span>}
                    <div className="flex items-center gap-1.5">
                      <ProgressRing percentage={catPassRate} size={24} showText={false} />
                      <span className="text-xs font-semibold" style={{ color: catPassRate >= 80 ? '#10b981' : catPassRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {catPassRate}%
                      </span>
                    </div>
                  </div>
                </div>
                {/* Scenarios */}
                {catResults.map(result => (
                  <div key={result.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/1 border-t border-white/3 group">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      result.status === 'passed' ? 'bg-emerald-400' :
                      result.status === 'failed' ? 'bg-red-400' : 'bg-amber-400'
                    }`} />
                    <span className="text-xs text-white/70 flex-1">{result.scenario_name}</span>
                    <span className="text-xs text-white/25 flex-shrink-0">{(result.duration_ms / 1000).toFixed(1)}s</span>
                    {result.trace_url && (
                      <a
                        href={traceUrl(result.trace_url)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open Trace Viewer"
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-600/15 hover:bg-brand-600/30 text-brand-400 hover:text-white text-xs transition-all"
                      >
                        <TraceIcon />
                        Trace
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
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
