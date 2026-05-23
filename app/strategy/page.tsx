import { notFound } from 'next/navigation'
import { buildTeamRosters } from '@/lib/join'
import { buildSeedStrategy } from '@/lib/strategy'
import { StrategyView } from '@/components/strategy-view'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 21600

export default async function StrategyPage() {
  const teams = await buildTeamRosters()
  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)
  if (!myTeam) notFound()

  const allPlayers = teams
    .flatMap((t) => t.players)
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)

  const seed = buildSeedStrategy(myTeam.players)

  return (
    <StrategyView
      myPlayers={myTeam.players.filter((p) => p.value > 0).sort((a, b) => b.value - a.value)}
      allPlayers={allPlayers}
      seed={seed}
    />
  )
}
