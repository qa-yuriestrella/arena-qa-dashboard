'use client'

import { signOut } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null } | undefined
}

export function DashboardNav({ user }: Props) {
  return (
    <nav className="border-b border-white/5 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-600/30">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">Arena QA</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs text-white/30 hidden sm:block">{user?.email}</span>
            {user?.image && (
              <Image
                src={user.image}
                alt={user.name || ''}
                width={32}
                height={32}
                className="rounded-full border border-white/10"
              />
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
