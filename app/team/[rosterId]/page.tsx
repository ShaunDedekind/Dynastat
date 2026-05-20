import { notFound } from 'next/navigation'
import { buildTeamRosters } from '@/lib/join'
import { RosterView } from '@/components/roster-view'

export const revalidate = 21600

export default async function TeamPage({
  params,
}: {
  params: Promise<{ rosterId: string }>
}) {
  const { rosterId } = await params
  const id = parseInt(rosterId, 10)
  if (isNaN(id)) notFound()

  const teams = await buildTeamRosters()
  const team = teams.find((t) => t.rosterId === id)
  if (!team) notFound()

  return <RosterView team={team} backHref="/power-rankings" backLabel="Rankings" />
}
