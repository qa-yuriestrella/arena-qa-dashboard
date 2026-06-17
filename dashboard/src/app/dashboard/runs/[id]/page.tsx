'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { TestRun, TestResult } from '@/types'
import { RunDetail } from '@/components/RunDetail'

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [run, setRun] = useState<TestRun | null>(null)
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchRun() {
    try {
      const res = await fetch(`/api/runs/${params.id}`)
      if (!res.ok) { setError(true); return null }
      const data = await res.json()
      setRun(data.run)
      setResults(data.results || [])
      setLoading(false)
      return data.run as TestRun
    } catch {
      setError(true)
      setLoading(false)
      return null
    }
  }

  useEffect(() => {
    fetchRun().then(initialRun => {
      if (!initialRun || initialRun.status !== 'running') return
      pollingRef.current = setInterval(async () => {
        const updated = await fetchRun()
        if (updated?.status !== 'running') {
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      }, 2000)
    })

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !run) return notFound()

  async function rerunRun() {
    if (!run) return
    await fetch('/api/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cats: run.cats, triggeredBy: session?.user?.email }),
    })
    router.push('/dashboard')
  }

  return <RunDetail run={run} results={results} onRerun={rerunRun} />
}
