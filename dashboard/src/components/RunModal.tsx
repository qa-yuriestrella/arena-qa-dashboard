'use client'

import { motion } from 'framer-motion'
import type { CatInfo } from '@/types'

interface Props {
  cats: CatInfo[]
  onConfirm: (cats: string) => void
  onClose: () => void
  loading: boolean
  scenarioGrep?: string
}

export function RunModal({ cats, onConfirm, onClose, loading, scenarioGrep }: Props) {
  const isAll = cats.length > 10
  const catsParam = isAll ? 'all' : cats.map(c => c.id).join(',')
  const catLabel = isAll ? 'All Tests' : cats.map(c => c.id).join(', ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!loading) onClose() }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative glass rounded-2xl p-6 w-full max-w-md z-10"
      >
        <h2 className="text-lg font-bold text-white mb-2">Confirm Test Run</h2>
        <p className="text-sm text-white/50 mb-1">
          Category: <span className="text-white font-medium">{catLabel}</span>
        </p>
        {scenarioGrep ? (
          <p className="text-sm text-white/50 mb-4">
            Scenario: <span className="text-brand-400 font-medium text-xs break-words">{scenarioGrep}</span>
          </p>
        ) : (
          <p className="text-sm text-white/50 mb-4">All scenarios will be executed.</p>
        )}
        <p className="text-xs text-white/25 mb-6">
          This triggers a GitHub Actions workflow and may take 5–120 minutes.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(catsParam)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all disabled:opacity-50"
          >
            {loading ? 'Triggering...' : 'Run Tests'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
