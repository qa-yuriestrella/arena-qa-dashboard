'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { CATS } from '@/lib/cats'
import { RunModal } from '@/components/RunModal'
import { StatusBadge } from '@/components/StatusBadge'
import type { TestRun, TestResult } from '@/types'

export default function CatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()

  const [runModalOpen, setRunModalOpen] = useState(false)
  const [pendingScenarioGrep, setPendingScenarioGrep] = useState<string | undefined>()
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [latestRun, setLatestRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [loadingResults, setLoadingResults] = useState(true)

  const cat = CATS.find(c => c.id === id)

  // Fetch latest run that includes this CAT
  useEffect(() => {
    if (!cat) return
    fetch('/api/runs')
      .then(r => r.json())
      .then((runs: TestRun[]) => {
        const run = runs.find(r =>
          r.cats === 'all' || r.cats === cat.id || r.cats.split(',').includes(cat.id)
        )
        if (run) {
          setLatestRun(run)
          return fetch(`/api/runs/${run.id}`)
        }
      })
      .then(r => r?.json())
      .then(data => {
        if (data?.results) {
          setResults(data.results.filter((r: TestResult) => r.cat === cat.id))
        }
        setLoadingResults(false)
      })
      .catch(() => setLoadingResults(false))
  }, [cat?.id])

  if (!cat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-white/40">Test category not found.</p>
        <button onClick={() => router.back()} className="text-sm text-brand-400 hover:text-brand-300">
          ← Back
        </button>
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
    setError(null)
    setSuccess(null)
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
      const label = pendingScenarioGrep
        ? `"${pendingScenarioGrep.substring(0, 50)}..."`
        : id
      setSuccess(`Run triggered for ${label}. Check the dashboard for status.`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTriggering(false)
    }
  }

  const resultByScenario = results.reduce<Record<string, TestResult>>((acc, r) => {
    acc[r.scenario_name] = r
    return acc
  }, {})

  const passCount = results.filter(r => r.status === 'passed').length
  const failCount = results.filter(r => r.status === 'failed').length
  const hasResults = results.length > 0

  return (
    <div className="space-y-8">
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
              <span className="text-xs font-mono text-brand-500 bg-brand-600/10 px-1.5 py-0.5 rounded">
                {cat.id}
              </span>
              {latestRun && <StatusBadge status={latestRun.status} />}
            </div>
            <h1 className="text-2xl font-bold text-white">{cat.name}</h1>
            <p className="text-sm text-white/40 mt-0.5">{cat.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {latestRun && (
            <Link
              href={`/dashboard/runs/${latestRun.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
            >
              Ver Detalhes
            </Link>
          )}
          <button
            onClick={openRunAll}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-brand rounded-xl text-white text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggering ? (
              <><span className="w-2 h-2 rounded-full bg-white animate-pulse" />Disparando...</>
            ) : (
              <><PlayIcon />Rodar {cat.id}</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      {success && (
        <div className="glass rounded-xl p-4 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between gap-3">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-400/60 hover:text-emerald-400 text-lg leading-none">×</button>
        </div>
      )}

      {/* Last run summary for this CAT */}
      {hasResults && latestRun && (
        <div className="glass rounded-xl p-4 flex items-center gap-6">
          <div className="text-xs text-white/40 uppercase tracking-wider">Último run</div>
          <div className="flex items-center gap-4">
            <span className="text-emerald-400 font-semibold text-sm">{passCount} passaram</span>
            {failCount > 0 && <span className="text-red-400 font-semibold text-sm">{failCount} falharam</span>}
            <span className="text-white/30 text-xs">{new Date(latestRun.created_at).toLocaleString('pt-BR')}</span>
          </div>
          <Link
            href={`/dashboard/runs/${latestRun.id}`}
            className="ml-auto text-xs text-brand-500 hover:text-brand-400 transition-colors"
          >
            Ver erros →
          </Link>
        </div>
      )}

      {/* Scenarios list */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
            Cenários de Teste
          </h2>
          <span className="text-xs text-white/30">
            {cat.scenarios.length} cenários
          </span>
        </div>

        {cat.scenarios.length === 0 ? (
          <p className="text-sm text-white/30 py-4 text-center">Nenhum cenário mapeado ainda.</p>
        ) : (
          <ul className="space-y-1">
            {cat.scenarios.map((scenario, i) => {
              const result = resultByScenario[scenario]
              const statusColor = result
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
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} title={result?.status} />

                  {/* Scenario name */}
                  <span className="text-sm text-white/70 flex-1 leading-snug">{scenario}</span>

                  {/* Duration if available */}
                  {result?.duration_ms != null && (
                    <span className="text-xs text-white/25 flex-shrink-0">
                      {(result.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}

                  {/* Error indicator */}
                  {result?.status === 'failed' && result.error_message && (
                    <Link
                      href={`/dashboard/runs/${latestRun?.id}`}
                      className="text-xs text-red-400/70 hover:text-red-400 flex-shrink-0"
                      title={result.error_message}
                    >
                      ver erro
                    </Link>
                  )}

                  {/* Play button for individual scenario */}
                  <button
                    onClick={() => openRunScenario(scenario)}
                    disabled={triggering}
                    title={`Rodar apenas: ${scenario}`}
                    className="opacity-0 group-hover/item:opacity-100 w-6 h-6 flex items-center justify-center rounded-md bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 hover:text-white transition-all duration-150 disabled:cursor-not-allowed flex-shrink-0"
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
