import { notFound } from 'next/navigation'
import { buildTeamRosters } from '@/lib/join'
import { RosterView } from '@/components/roster-view'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 21600

export default async function MyTeamPage() {
  const teams = await buildTeamRosters()
  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)
  if (!myTeam) notFound()
  return <RosterView team={myTeam} />
}
