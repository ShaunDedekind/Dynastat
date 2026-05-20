import type { TeamRoster, RosterPlayer } from '@/lib/join'
import { SCORED_POSITIONS, ScoredPosition } from '@/lib/constants'

export type BuySellCandidate = {
  player: RosterPlayer
  reason: string
}

export type TradePartner = {
  rosterId: number
  teamName: string
  ownerName: string
  rank: number
  surplusPositions: ScoredPosition[]
  topPlayers: RosterPlayer[]
  score: number
}

const MIN_VALUE = 2000
const MIN_TREND = 100
const POSITION_THRESHOLD = 1500 // $1.5k above/below avg = meaningful surplus/deficit

/** My players that are rising in value but aging — good time to sell */
export function getSellCandidates(myPlayers: RosterPlayer[]): BuySellCandidate[] {
  return myPlayers
    .filter(
      (p) =>
        p.trend30Day >= MIN_TREND &&
        p.age !== null &&
        p.age >= 27 &&
        p.value >= MIN_VALUE &&
        !p.isUntouchable
    )
    .sort((a, b) => b.trend30Day - a.trend30Day)
    .slice(0, 6)
    .map((p) => ({
      player: p,
      reason: `+${p.trend30Day.toLocaleString()} this month · ${p.age}yo · sell at peak`,
    }))
}

/** Players on other rosters whose value is dipping but age says they'll bounce */
export function getBuyCandidates(
  allTeams: TeamRoster[],
  myRosterId: number
): BuySellCandidate[] {
  const myIds = new Set(
    allTeams.find((t) => t.rosterId === myRosterId)?.players.map((p) => p.sleeperId) ?? []
  )
  return allTeams
    .flatMap((t) => t.players)
    .filter(
      (p) =>
        !myIds.has(p.sleeperId) &&
        p.trend30Day <= -MIN_TREND &&
        (p.age === null || p.age <= 26) &&
        p.value >= MIN_VALUE
    )
    .sort((a, b) => a.trend30Day - b.trend30Day)
    .slice(0, 8)
    .map((p) => ({
      player: p,
      reason: `${p.trend30Day.toLocaleString()} this month · ${p.age ?? '?'}yo · still ${(p.value / 1000).toFixed(1)}k`,
    }))
}

/** Teams with positional surplus that matches my positional needs */
export function getTradeTargets(
  allTeams: TeamRoster[],
  myRosterId: number
): TradePartner[] {
  const myTeam = allTeams.find((t) => t.rosterId === myRosterId)
  if (!myTeam) return []

  const leagueAvg = Object.fromEntries(
    SCORED_POSITIONS.map((pos) => [
      pos,
      allTeams.reduce((s, t) => s + t.valueByPosition[pos], 0) / allTeams.length,
    ])
  ) as Record<ScoredPosition, number>

  const myDelta = Object.fromEntries(
    SCORED_POSITIONS.map((pos) => [pos, myTeam.valueByPosition[pos] - leagueAvg[pos]])
  ) as Record<ScoredPosition, number>

  const myDeficit = SCORED_POSITIONS.filter((pos) => myDelta[pos] < -POSITION_THRESHOLD)

  return allTeams
    .filter((t) => t.rosterId !== myRosterId)
    .map((team) => {
      const theirDelta = Object.fromEntries(
        SCORED_POSITIONS.map((pos) => [pos, team.valueByPosition[pos] - leagueAvg[pos]])
      ) as Record<ScoredPosition, number>

      // Positions they have extra that I need
      const tradeFit = myDeficit.filter((pos) => theirDelta[pos] > POSITION_THRESHOLD)
      if (tradeFit.length === 0) return null

      const score = tradeFit.reduce(
        (s, pos) => s + Math.abs(myDelta[pos]) + theirDelta[pos],
        0
      )

      const topPlayers = team.players
        .filter((p) => tradeFit.includes(p.position as ScoredPosition) && p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)

      return {
        rosterId: team.rosterId,
        teamName: team.teamName,
        ownerName: team.ownerName,
        rank: team.rank,
        surplusPositions: tradeFit,
        topPlayers,
        score,
      }
    })
    .filter((t): t is TradePartner => t !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}
