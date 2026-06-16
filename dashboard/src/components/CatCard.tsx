'use client'

import Link from 'next/link'
import type { CatInfo, TestRun } from '@/types'

interface Props {
  cat: CatInfo
  latestRun: TestRun | null
  onRun: () => void
  isRunning: boolean
  disabled?: boolean
}

export function CatCard({ cat, latestRun, onRun, isRunning, disabled }: Props) {
  const isActive = !disabled && !isRunning

  return (
    <div className="relative glass rounded-xl transition-all duration-200 group">
      {/* Clickable body navigates to detail page */}
      {disabled ? (
        <div className="p-4">
          <CardContent cat={cat} disabled />
        </div>
      ) : (
        <Link href={`/dashboard/cats/${cat.id}`} className="block p-4 glass-hover rounded-xl">
          <CardContent cat={cat} disabled={false} />
        </Link>
      )}

      {/* Play button — always on top, stops propagation */}
      {!disabled && (
        <button
          onClick={(e) => { e.preventDefault(); onRun() }}
          disabled={!isActive}
          title={`Run ${cat.id}`}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 hover:text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed z-10"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
    </div>
  )
}

function CardContent({ cat, disabled }: { cat: CatInfo; disabled: boolean }) {
  return (
    <>
      <div className="flex items-start justify-between mb-3 pr-6">
        <span className="text-xs font-mono text-brand-500 bg-brand-600/10 px-1.5 py-0.5 rounded">
          {cat.id}
        </span>
      </div>
      <h3 className="font-semibold text-white text-sm mb-1">{cat.name}</h3>
      <p className="text-xs text-white/35 leading-relaxed">{cat.description}</p>
      {cat.scenarios.length > 0 && (
        <p className="text-xs text-white/25 mt-2">{cat.scenarios.length} scenarios</p>
      )}
      {disabled && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400/60">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          In Progress
        </div>
      )}
    </>
  )
}
