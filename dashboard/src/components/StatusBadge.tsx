interface Props {
  status: string
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  running: { label: 'Running', className: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  passed: { label: 'Passed', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  failed: { label: 'Failed', className: 'text-red-400 bg-red-400/10 border-red-400/20' },
  error: { label: 'Error', className: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  cancelled: { label: 'Cancelled', className: 'text-gray-400 bg-gray-400/10 border-gray-400/20' },
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_MAP[status] || STATUS_MAP.error
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
      {config.label}
    </span>
  )
}
