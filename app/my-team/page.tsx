import { notFound } from 'next/navigation'
import { buildTeamRosters } from '@/lib/join'
import { RosterView } from '@/components/roster-view'
import { writeSnapshot, getWeekDeltas } from '@/lib/snapshot'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 21600

export default async function MyTeamPage() {
  const teams = await buildTeamRosters()
  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)
  if (!myTeam) notFound()

  // Write today's snapshot + read 7-day-ago snapshot in parallel
  const [, weekDeltas] = await Promise.all([
    writeSnapshot(MY_ROSTER_ID, myTeam.players),
    getWeekDeltas(MY_ROSTER_ID, myTeam.players),
  ])

  return <RosterView team={myTeam} weekDeltas={weekDeltas} />
}
