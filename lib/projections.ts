import type { SleeperNFLState, SleeperProjectionStats, ProjectionMap } from '@/types/projections'

const BASE = 'https://api.sleeper.app/v1'

export async function fetchNFLState(): Promise<SleeperNFLState> {
  const res = await fetch(`${BASE}/state/nfl`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Sleeper NFL state ${res.status}`)
  return res.json()
}

export function isProjectionsAvailable(state: SleeperNFLState): boolean {
  return state.season_type === 'regular' || state.season_type === 'post'
}

export async function fetchProjections(season: string, week: number): Promise<ProjectionMap> {
  const res = await fetch(`${BASE}/projections/nfl/${season}/${week}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Sleeper projections ${res.status}`)
  return res.json()
}

export function calcHalfPPR(stats: SleeperProjectionStats): number {
  return (
    (stats.pass_yd ?? 0) * 0.04 +
    (stats.pass_td ?? 0) * 4 +
    (stats.pass_int ?? 0) * -2 +
    (stats.rush_yd ?? 0) * 0.1 +
    (stats.rush_td ?? 0) * 6 +
    (stats.rec ?? 0) * 0.5 +
    (stats.rec_yd ?? 0) * 0.1 +
    (stats.rec_td ?? 0) * 6 +
    (stats.fum_lost ?? 0) * -2
  )
}
