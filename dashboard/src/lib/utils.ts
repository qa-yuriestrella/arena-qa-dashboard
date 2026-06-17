export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`
}

export function runDurationMs(run: { duration_ms: number | null; created_at: string; completed_at: string | null }): number | null {
  if (run.duration_ms != null) return run.duration_ms
  if (run.completed_at) return new Date(run.completed_at).getTime() - new Date(run.created_at).getTime()
  return null
}
