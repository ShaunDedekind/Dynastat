const INJURY_MAP: Record<string, { label: string; cls: string }> = {
  Questionable: { label: 'Q', cls: 'bg-yellow-900/80 text-yellow-300' },
  Doubtful: { label: 'D', cls: 'bg-orange-900/80 text-orange-300' },
  Out: { label: 'OUT', cls: 'bg-red-900/80 text-red-300' },
  IR: { label: 'IR', cls: 'bg-red-900/80 text-red-300' },
  PUP: { label: 'PUP', cls: 'bg-red-900/80 text-red-300' },
  COV: { label: 'COV', cls: 'bg-purple-900/80 text-purple-300' },
}

export function InjuryBadge({ status }: { status: string | null }) {
  if (!status) return null
  const cfg = INJURY_MAP[status] ?? {
    label: status.slice(0, 3).toUpperCase(),
    cls: 'bg-gray-800 text-gray-400',
  }
  return (
    <span className={`inline-flex items-center text-xs px-1 py-px rounded font-bold leading-none ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

export function RookieBadge({ isRookie }: { isRookie: boolean }) {
  if (!isRookie) return null
  return (
    <span className="inline-flex items-center text-xs px-1 py-px rounded font-bold leading-none bg-yellow-900/80 text-yellow-300">
      R
    </span>
  )
}

export function StarterDot({ depthOrder }: { depthOrder: number | null }) {
  if (!depthOrder) return null
  if (depthOrder === 1) return <span className="text-green-500 text-xs leading-none" title="Starter">●</span>
  if (depthOrder === 2) return <span className="text-gray-600 text-xs leading-none" title="Backup">●</span>
  return null
}
