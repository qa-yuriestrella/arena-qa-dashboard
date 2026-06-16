'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { CATS } from '@/lib/cats'
import type { TestRun, CatInfo } from '@/types'
import { CatCard } from '@/components/CatCard'
import { RunModal } from '@/components/RunModal'
import { RunHistoryPanel } from '@/components/RunHistoryPanel'
import { StatusBadge } from '@/components/StatusBadge'
import { ProgressRing } from '@/components/ProgressRing'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [runs, setRuns] = useState<TestRun[]>([])
  const [latestRun, setLatestRun] = useState<TestRun | null>(null)
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [runAllMode, setRunAllMode] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/runs')
    if (res.ok) {
      const data: TestRun[] = await res.json()
      setRuns(data)
      if (data.length > 0) setLatestRun(data[0])
    }
  }, [])

  // Sync GitHub status for the running run (detects stuck runs)
  const syncRunningStatus = useCallback(async (runId: string) => {
    const res = await fetch(`/api/runs/${runId}`)
    if (res.ok) {
      const { run } = await res.json()
      if (run && run.status !== 'running') {
        await fetchRuns()
      }
    }
  }, [fetchRuns])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 10000)
    return () => clearInterval(interval)
  }, [fetchRuns])

  // Fast polling + GitHub status sync when a run is active
  useEffect(() => {
    if (latestRun?.status !== 'running') return
    const interval = setInterval(() => {
      fetchRuns()
      if (latestRun?.id) syncRunningStatus(latestRun.id)
    }, 5000)
    return () => clearInterval(interval)
  }, [latestRun?.status, latestRun?.id, fetchRuns, syncRunningStatus])

  async function triggerRun(cats: string) {
    setRunModalOpen(false)
    setTriggering(true)
    setError(null)
    try {
      const res = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cats, triggeredBy: session?.user?.email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to trigger run')
      }
      await fetchRuns()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTriggering(false)
    }
  }

  async function cancelRun() {
    if (!latestRun || latestRun.status !== 'running') return
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/runs/${latestRun.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel run')
      }
      await fetchRuns()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCancelling(false)
    }
  }

  function openRunModal(cats: string[]) {
    setSelectedCats(cats)
    setRunAllMode(cats.length === 0)
    setRunModalOpen(true)
  }

  const activeCats = CATS.filter(c => c.active)
  const inactiveCats = CATS.filter(c => !c.active)
  const isRunning = latestRun?.status === 'running'

  const passRate = latestRun && latestRun.total_tests > 0
    ? Math.round((latestRun.passed_tests / latestRun.total_tests) * 100)
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">
            {activeCats.length} test categories · Staging environment
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isRunning && (
            <button
              onClick={cancelRun}
              disabled={cancelling}
              title="Cancel or force-stop this run"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cancelling ? (
                <span className="w-3 h-3 rounded-full border border-red-400 border-t-transparent animate-spin" />
              ) : (
                <StopIcon />
              )}
              {cancelling ? 'Cancelling...' : latestRun?.github_run_id ? 'Cancel Run' : 'Force Stop'}
            </button>
          )}
          <button
            onClick={() => openRunModal([])}
            disabled={triggering || isRunning}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-brand rounded-xl text-white text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon />
                Run All Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Latest run summary */}
      {latestRun && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              {passRate !== null && (
                <ProgressRing percentage={passRate} size={64} />
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-white/40 uppercase tracking-wider">Latest Run</span>
                  <StatusBadge status={latestRun.status} />
                </div>
                <p className="text-sm text-white/60">
                  {latestRun.cats === 'all' ? 'All tests' : latestRun.cats} ·{' '}
                  {new Date(latestRun.created_at).toLocaleString('pt-BR')}
                </p>
                {isRunning && !latestRun.github_run_id && (
                  <p className="text-xs text-white/30 mt-1">Waiting for GitHub to start workflow...</p>
                )}
                {latestRun.status === 'error' && latestRun.failure_reason && (
                  <p className="text-xs text-red-400/70 mt-1 max-w-xs">{latestRun.failure_reason}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 sm:ml-auto">
              {[
                { label: 'Passed', value: latestRun.passed_tests, color: 'text-emerald-400' },
                { label: 'Failed', value: latestRun.failed_tests, color: 'text-red-400' },
                { label: 'Skipped', value: latestRun.skipped_tests, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-white/40">{label}</div>
                </div>
              ))}

              {latestRun.github_run_url && (
                <a
                  href={latestRun.github_run_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-500 hover:text-brand-400 underline"
                >
                  View on GitHub ↗
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      {/* CAT Cards Grid */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Active Tests</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeCats.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <CatCard
                cat={cat}
                latestRun={latestRun}
                onRun={() => openRunModal([cat.id])}
                isRunning={isRunning}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Inactive CATs */}
      {inactiveCats.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white/30 uppercase tracking-wider mb-4">Work In Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-50">
            {inactiveCats.map((cat) => (
              <CatCard
                key={cat.id}
                cat={cat}
                latestRun={null}
                onRun={() => {}}
                isRunning={false}
                disabled
              />
            ))}
          </div>
        </div>
      )}

      {/* Run History */}
      {runs.length > 0 && (
        <RunHistoryPanel runs={runs} />
      )}

      {/* Run Modal */}
      <AnimatePresence>
        {runModalOpen && (
          <RunModal
            cats={runAllMode ? activeCats : activeCats.filter(c => selectedCats.includes(c.id))}
            onConfirm={(cats) => triggerRun(cats)}
            onClose={() => setRunModalOpen(false)}
            loading={triggering}
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

function StopIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  )
}
