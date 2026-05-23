'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const TABS = [
  { href: '/power-rankings', label: 'Rankings' },
  { href: '/my-team', label: 'My Team' },
  { href: '/lineup', label: 'Lineup' },
  { href: '/trade', label: 'Trade' },
  { href: '/strategy', label: 'Strategy' },
  { href: '/trending', label: 'Trending' },
]

function useFreshness(renderTime: number): string {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const update = () => {
      const ms = Date.now() - renderTime
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      setLabel(h >= 1 ? `${h}h ago` : m >= 1 ? `${m}m ago` : 'just now')
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [renderTime])

  return label
}

export function Nav({ renderTime }: { renderTime: number }) {
  const pathname = usePathname()
  const freshness = useFreshness(renderTime)

  return (
    <>
      {/* Desktop: fixed top bar */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 h-12 items-center px-4 gap-1 bg-gray-900 border-b border-gray-800">
        <span className="font-bold text-sm tracking-widest text-white mr-4 shrink-0">DYNASTAT</span>
        {TABS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {label}
          </Link>
        ))}
        {/* Freshness — right-aligned */}
        {freshness && (
          <span className="ml-auto text-xs text-gray-600 tabular-nums shrink-0">
            values: {freshness}
          </span>
        )}
      </nav>

      {/* Mobile: fixed bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-gray-900 border-t border-gray-800">
        {/* Freshness strip */}
        {freshness && (
          <div className="text-center text-xs text-gray-700 py-0.5 border-b border-gray-800/50">
            values: {freshness}
          </div>
        )}
        <div className="flex h-14">
          {TABS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex items-center justify-center text-xs font-medium min-h-[44px] transition-colors ${
                pathname.startsWith(href) ? 'text-white' : 'text-gray-500'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
