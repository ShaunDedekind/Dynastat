export const LEAGUE_ID = '1314357948058718208'
export const MY_ROSTER_ID = 3

// Normalize names for untouchable matching — Sleeper omits periods (CJ not C.J.)
const norm = (n: string) => n.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()

const UNTOUCHABLE_LIST = ['Brock Bowers', 'CJ Stroud', 'C.J. Stroud', 'DJ Moore', 'D.J. Moore', 'Jalen Milroe']
export const UNTOUCHABLE_NAMES = new Set(UNTOUCHABLE_LIST.map(norm))

export function isUntouchable(fullName: string | null): boolean {
  if (!fullName) return false
  return UNTOUCHABLE_NAMES.has(norm(fullName))
}

export const SCORED_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const
export type ScoredPosition = (typeof SCORED_POSITIONS)[number]
