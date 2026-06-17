'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { TestRun } from '@/types'
import { StatusBadge } from './StatusBadge'
import { ProgressRing } from './ProgressRing'
import { formatDuration, runDurationMs } from '@/lib/utils'

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startedAt).getTime())
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return <span className="text-xs text-brand-400 tabular-nums">{formatDuration(elapsed)}</span>
}

interface Props {
  runs: TestRun[]
}

export function RunHistoryPanel({ runs }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? runs : runs.slice(0, 5)

  return (
    <div>
      <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Run History</h2>
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Date</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Tests</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-white/40 font-medium hidden sm:table-cell">By</th>
              <th className="text-right px-4 py-3 text-xs text-white/40 font-medium hidden md:table-cell">Duration</th>
              <th className="text-right px-4 py-3 text-xs text-white/40 font-medium">Pass Rate</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((run, i) => {
              const passRate = run.total_tests > 0
                ? Math.round((run.passed_tests / run.total_tests) * 100)
                : null
              return (
                <tr key={run.id} className="border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 text-white/60 text-xs">
                    {new Date(run.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {run.cats === 'all'
                        ? <span className="text-xs font-mono bg-brand-600/15 text-brand-400 px-1.5 py-0.5 rounded">All</span>
                        : run.cats.split(',').map(cat => (
                            <span key={cat} className="text-xs font-mono bg-white/5 text-white/60 px-1.5 py-0.5 rounded">{cat.trim()}</span>
                          ))
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs hidden sm:table-cell">
                    {run.triggered_by?.split('@')[0] || '—'}
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    {run.status === 'running'
                      ? <LiveTimer startedAt={run.created_at} />
                      : (() => { const d = runDurationMs(run); return d != null ? <span className="text-xs text-white/35 tabular-nums">{formatDuration(d)}</span> : null })()
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {passRate !== null && (
                        <>
                          <span className="text-xs font-semibold" style={{ color: passRate >= 80 ? '#10b981' : passRate >= 50 ? '#f59e0b' : '#ef4444' }}>
                            {passRate}%
                          </span>
                          <ProgressRing percentage={passRate} size={24} showText={false} />
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/runs/${run.id}`}
                      className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {runs.length > 5 && (
          <div className="px-4 py-3 border-t border-white/5">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
            >
              {expanded ? 'Show less' : `Show all ${runs.length} runs`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
