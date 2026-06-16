import type { CatInfo, TestRun } from '@/types'

interface Props {
  cat: CatInfo
  latestRun: TestRun | null
  onRun: () => void
  isRunning: boolean
  disabled?: boolean
}

export function CatCard({ cat, latestRun, onRun, isRunning, disabled }: Props) {
  // For now, show overall status since we don't have per-CAT latest status
  // This would be enhanced with per-CAT data from test_results
  const isActive = !disabled && !isRunning

  return (
    <div className="glass glass-hover rounded-xl p-4 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-brand-500 bg-brand-600/10 px-1.5 py-0.5 rounded">
            {cat.id}
          </span>
        </div>
        <button
          onClick={onRun}
          disabled={!isActive}
          title={`Run ${cat.id}`}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg bg-brand-600/20 hover:bg-brand-600/40 text-brand-400 hover:text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      <h3 className="font-semibold text-white text-sm mb-1">{cat.name}</h3>
      <p className="text-xs text-white/35 leading-relaxed">{cat.description}</p>

      {disabled && (
        <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-400/60">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          In Progress
        </div>
      )}
    </div>
  )
}
