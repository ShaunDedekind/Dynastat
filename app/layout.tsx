import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/nav'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Dynastat',
  description: 'Dynasty fantasy football dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Passed to Nav so it can compute "values: Xh ago" on the client.
  // With ISR, this timestamp reflects when data was last fetched.
  const renderTime = Date.now()

  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans bg-gray-950 text-gray-100 min-h-screen antialiased`}
      >
        <div className="md:pt-12 pb-16 md:pb-0">{children}</div>
        <Nav renderTime={renderTime} />
      </body>
    </html>
  )
}
