export type OptimizeMethod = 'value' | 'projection'

export type LineupSlot =
  | 'QB'
  | 'RB1'
  | 'RB2'
  | 'WR1'
  | 'WR2'
  | 'WR3'
  | 'TE'
  | 'FLEX1'
  | 'FLEX2'

export type LineupPlayer = {
  sleeperId: string
  name: string
  position: string
  nflTeam: string | null
  age: number | null
  value: number
  trend30Day: number
  overallRank: number | null
  isUntouchable: boolean
  isRookie: boolean
  injuryStatus: string | null
  depthChartOrder: number | null
  college: string | null
  projectedPoints: number | null
  hasProjection: boolean
  isLineupIneligible: boolean
}

export type StarterEntry = {
  slot: LineupSlot
  player: LineupPlayer | null
}

export type LineupResult = {
  starters: StarterEntry[]
  bench: LineupPlayer[]
  totalStartingValue: number
  totalProjectedPoints: number | null
  method: OptimizeMethod
}

const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])
const SCORED = new Set(['QB', 'RB', 'WR', 'TE'])

function metric(p: LineupPlayer, method: OptimizeMethod): number {
  if (method === 'projection') {
    return p.projectedPoints ?? -Infinity
  }
  return p.value
}

export function optimizeLineup(players: LineupPlayer[], method: OptimizeMethod): LineupResult {
  const eligible = players.filter((p) => !p.isLineupIneligible)
  const ineligible = players.filter((p) => p.isLineupIneligible)

  const scoredEligible = eligible.filter((p) => SCORED.has(p.position))
  const unscoredEligible = eligible.filter((p) => !SCORED.has(p.position))

  const sortedByPos: Record<string, LineupPlayer[]> = {
    QB: scoredEligible.filter((p) => p.position === 'QB').sort((a, b) => metric(b, method) - metric(a, method)),
    RB: scoredEligible.filter((p) => p.position === 'RB').sort((a, b) => metric(b, method) - metric(a, method)),
    WR: scoredEligible.filter((p) => p.position === 'WR').sort((a, b) => metric(b, method) - metric(a, method)),
    TE: scoredEligible.filter((p) => p.position === 'TE').sort((a, b) => metric(b, method) - metric(a, method)),
  }

  const assigned = new Set<string>()
  const starters: StarterEntry[] = []

  function take(pos: string, slot: LineupSlot): void {
    const available = sortedByPos[pos].filter((p) => !assigned.has(p.sleeperId))
    const player = available[0] ?? null
    if (player) assigned.add(player.sleeperId)
    starters.push({ slot, player })
  }

  take('QB', 'QB')
  take('RB', 'RB1')
  take('RB', 'RB2')
  take('WR', 'WR1')
  take('WR', 'WR2')
  take('WR', 'WR3')
  take('TE', 'TE')

  const flexPool = scoredEligible
    .filter((p) => FLEX_ELIGIBLE.has(p.position) && !assigned.has(p.sleeperId))
    .sort((a, b) => metric(b, method) - metric(a, method))

  const flex1 = flexPool[0] ?? null
  const flex2 = flexPool[1] ?? null
  if (flex1) assigned.add(flex1.sleeperId)
  if (flex2) assigned.add(flex2.sleeperId)
  starters.push({ slot: 'FLEX1', player: flex1 })
  starters.push({ slot: 'FLEX2', player: flex2 })

  const bench = [
    ...[...scoredEligible.filter((p) => !assigned.has(p.sleeperId)), ...unscoredEligible].sort(
      (a, b) => metric(b, method) - metric(a, method)
    ),
    ...ineligible,
  ]

  const starterPlayers = starters.map((s) => s.player).filter((p): p is LineupPlayer => p !== null)
  const totalStartingValue = starterPlayers.reduce((s, p) => s + p.value, 0)
  const totalProjectedPoints =
    method === 'projection'
      ? starterPlayers.reduce((s, p) => s + (p.projectedPoints ?? 0), 0)
      : null

  return { starters, bench, totalStartingValue, totalProjectedPoints, method }
}
