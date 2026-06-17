'use client'

import { useState, useEffect } from 'react'
import { formatDuration } from '@/lib/utils'

interface Props {
  startedAt: string
  className?: string
}

export function LiveTimer({ startedAt, className = 'text-xs text-brand-400 tabular-nums' }: Props) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startedAt).getTime())
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - new Date(startedAt).getTime()), 1000)
    return () => clearInterval(id)
  }, [startedAt])
  return <span className={className}>{formatDuration(elapsed)}</span>
}
