'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import type { TestRun, TestResult } from '@/types'
import { RunDetail } from '@/components/RunDetail'

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/runs/${params.id}`)
      .then(res => {
        if (!res.ok) { setError(true); return null }
        return res.json()
      })
      .then(data => {
        if (data) {
          setRun(data.run)
          setResults(data.results || [])
        }
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !run) return notFound()

  return <RunDetail run={run} results={results} />
}
