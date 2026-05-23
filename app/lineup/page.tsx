import { notFound } from 'next/navigation'
import { buildTeamRosters } from '@/lib/join'
import { fetchRosters } from '@/lib/sleeper'
import { fetchNFLState, fetchProjections, isProjectionsAvailable, calcHalfPPR } from '@/lib/projections'
import { LineupView } from '@/components/lineup-view'
import type { LineupPlayer } from '@/lib/lineup'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 3600

export default async function LineupPage() {
  const [teams, rosters, nflState] = await Promise.all([
    buildTeamRosters(),
    fetchRosters(),
    fetchNFLState(),
  ])

  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)
  if (!myTeam) notFound()

  const myRoster = rosters.find((r) => r.roster_id === MY_ROSTER_ID)
  const taxiIds = new Set(myRoster?.taxi ?? [])
  const reserveIds = new Set(myRoster?.reserve ?? [])

  const available = isProjectionsAvailable(nflState)
  let projMap = null

  if (available) {
    try {
      projMap = await fetchProjections(nflState.season, nflState.display_week)
    } catch {
      projMap = null
    }
  }

  const lineupPlayers: LineupPlayer[] = myTeam.players.map((p) => {
    const proj = projMap?.[p.sleeperId]
    let projectedPoints: number | null = null
    let hasProjection = false
    if (proj !== undefined) {
      projectedPoints = proj.pts_half_ppr ?? calcHalfPPR(proj)
      hasProjection = true
    }
    return {
      ...p,
      projectedPoints,
      hasProjection,
      isLineupIneligible: taxiIds.has(p.sleeperId) || reserveIds.has(p.sleeperId),
    }
  })

  return (
    <LineupView
      players={lineupPlayers}
      isOffSeason={!available}
      season={nflState.season}
      week={nflState.display_week}
      teamName={myTeam.teamName}
    />
  )
}
