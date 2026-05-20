import { buildTeamRosters } from '@/lib/join'
import { TradeEvaluator } from '@/components/trade-evaluator'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 21600

export default async function TradePage() {
  const teams = await buildTeamRosters()
  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)

  // All rostered players across the league, sorted by value — used for search
  const allPlayers = teams
    .flatMap((t) => t.players)
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <TradeEvaluator
      myRoster={myTeam?.players.filter((p) => p.value > 0) ?? []}
      allPlayers={allPlayers}
    />
  )
}
