import { buildTeamRosters } from '@/lib/join'
import { TradeEvaluator } from '@/components/trade-evaluator'
import { getSellCandidates, getBuyCandidates, getTradeTargets } from '@/lib/analysis'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 21600

export default async function TradePage() {
  const teams = await buildTeamRosters()
  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)

  const allPlayers = teams
    .flatMap((t) => t.players)
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)

  const sellCandidates = getSellCandidates(myTeam?.players ?? [])
  const buyCandidates = getBuyCandidates(teams, MY_ROSTER_ID)
  const tradePartners = getTradeTargets(teams, MY_ROSTER_ID)

  return (
    <TradeEvaluator
      myRoster={myTeam?.players.filter((p) => p.value > 0) ?? []}
      allPlayers={allPlayers}
      sellCandidates={sellCandidates}
      buyCandidates={buyCandidates}
      tradePartners={tradePartners}
    />
  )
}
