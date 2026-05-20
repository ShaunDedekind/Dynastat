'use client'

import { useState } from 'react'

type Props = {
  markdown: string
  label?: string
  className?: string
}

export function ExportButton({ markdown, label = 'Export MD', className = '' }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`min-h-[44px] px-4 py-2 rounded text-sm font-medium transition-colors tabular-nums ${
        copied
          ? 'bg-green-900 text-green-300'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600 active:bg-gray-500'
      } ${className}`}
    >
      {copied ? `✓ Copied (${markdown.length.toLocaleString()} chars)` : label}
    </button>
  )
}
