'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { CATS } from '@/lib/cats'
import { RunModal } from '@/components/RunModal'
import { AnimatePresence } from 'framer-motion'

export default function CatDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const cat = CATS.find(c => c.id === id)

  if (!cat) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-white/40">Test category not found.</p>
        <button onClick={() => router.back()} className="text-sm text-brand-400 hover:text-brand-300">
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  async function triggerRun(cats: string) {
    setRunModalOpen(false)
    setTriggering(true)
    setError(null)
    setSuccess(false)
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
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg glass glass-hover text-white/50 hover:text-white transition-colors"
            title="Back"
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
              {!cat.active && (
                <span className="text-xs text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  Work in Progress
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{cat.name}</h1>
            <p className="text-sm text-white/40 mt-0.5">{cat.description}</p>
          </div>
        </div>

        {cat.active && (
          <button
            onClick={() => setRunModalOpen(true)}
            disabled={triggering}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-brand rounded-xl text-white text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggering ? (
              <>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run {cat.id}
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/30 text-red-400 text-sm flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 text-lg leading-none">×</button>
        </div>
      )}

      {success && (
        <div className="glass rounded-xl p-4 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between gap-3">
          <span>Run triggered! Check the dashboard for status.</span>
          <button onClick={() => setSuccess(false)} className="text-emerald-400/60 hover:text-emerald-400 text-lg leading-none">×</button>
        </div>
      )}

      {/* Scenarios list */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
            Test Scenarios
          </h2>
          <span className="text-xs text-white/30">
            {cat.scenarios.length} {cat.scenarios.length === 1 ? 'scenario' : 'scenarios'}
          </span>
        </div>

        {cat.scenarios.length === 0 ? (
          <p className="text-sm text-white/30 py-4 text-center">No scenarios mapped yet.</p>
        ) : (
          <ul className="space-y-2">
            {cat.scenarios.map((scenario, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-brand-600/15 text-brand-500 flex-shrink-0">
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="text-sm text-white/70">{scenario}</span>
              </motion.li>
            ))}
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
          />
        )}
      </AnimatePresence>
    </div>
  )
}
