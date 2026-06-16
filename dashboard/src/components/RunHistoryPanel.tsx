'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { TestRun } from '@/types'
import { StatusBadge } from './StatusBadge'
import { ProgressRing } from './ProgressRing'

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
                    {new Date(run.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-white/80 text-xs font-mono">
                    {run.cats === 'all' ? 'All' : run.cats}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs hidden sm:table-cell">
                    {run.triggered_by?.split('@')[0] || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {passRate !== null && <ProgressRing percentage={passRate} size={32} />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/runs/${run.id}`}
                      className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
                    >
                      Details →
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
