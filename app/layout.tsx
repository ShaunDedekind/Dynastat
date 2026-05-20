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
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans bg-gray-950 text-gray-100 min-h-screen antialiased`}
      >
        {/* pt-12: desktop top nav height | pb-16: mobile bottom nav height */}
        <div className="md:pt-12 pb-16 md:pb-0">{children}</div>
        <Nav />
      </body>
    </html>
  )
}
