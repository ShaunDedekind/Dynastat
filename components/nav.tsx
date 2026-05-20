'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/power-rankings', label: 'Rankings' },
  { href: '/my-team', label: 'My Team' },
  { href: '/trade', label: 'Trade' },
  { href: '/trending', label: 'Trending' },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: fixed top bar */}
      <nav className="hidden md:flex fixed top-0 inset-x-0 z-50 h-12 items-center px-4 gap-1 bg-gray-900 border-b border-gray-800">
        <span className="font-bold text-sm tracking-widest text-white mr-4 shrink-0">
          DYNASTAT
        </span>
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
      </nav>

      {/* Mobile: fixed bottom bar — thumb zone */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex h-16 bg-gray-900 border-t border-gray-800">
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
      </nav>
    </>
  )
}
