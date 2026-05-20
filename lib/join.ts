import { fetchRosters, fetchUsers, fetchPlayers } from '@/lib/sleeper'
import { fetchValues } from '@/lib/fantasycalc'
import { MY_ROSTER_ID, SCORED_POSITIONS, ScoredPosition, isUntouchable } from '@/lib/constants'

export type RosterPlayer = {
  sleeperId: string
  name: string
  position: string
  nflTeam: string | null
  age: number | null
  value: number
  trend30Day: number
  isUntouchable: boolean
  isRookie: boolean
  injuryStatus: string | null
  depthChartOrder: number | null
  college: string | null
}

export type TeamRoster = {
  rosterId: number
  ownerName: string
  teamName: string
  isMe: boolean
  players: RosterPlayer[]
  totalValue: number
  valueByPosition: Record<ScoredPosition, number>
  avgAge: number
  rank: number
}

type TeamRosterUnranked = Omit<TeamRoster, 'rank'>

export async function buildTeamRosters(): Promise<TeamRoster[]> {
  // DB SEAM: replace `return sorted` with a write to `team_snapshots` table,
  // then return from DB for full season value history (FC only gives 30-day trends).

  const [rosters, users, players, values] = await Promise.all([
    fetchRosters(),
    fetchUsers(),
    fetchPlayers(),
    fetchValues(),
  ])

  const userMap = new Map(users.map((u) => [u.user_id, u]))

  const fcMap = new Map<string, (typeof values)[number]>()
  for (const v of values) {
    if (v.player.sleeperId) fcMap.set(v.player.sleeperId, v)
  }

  const unranked: TeamRosterUnranked[] = rosters.map((roster) => {
    const user = userMap.get(roster.owner_id)
    const ownerName = user?.display_name ?? `Roster ${roster.roster_id}`
    const teamName = user?.metadata?.team_name ?? ownerName

    const playerIds = roster.players ?? []

    const enrichedPlayers: RosterPlayer[] = playerIds.map((id) => {
      const sp = players[id]
      const fc = fcMap.get(id)
      const name = sp?.full_name ?? `Unknown (${id})`
      return {
        sleeperId: id,
        name,
        position: sp?.position ?? 'UNK',
        nflTeam: sp?.team ?? null,
        age: sp?.age ?? null,
        value: fc?.value ?? 0,
        trend30Day: fc?.trend30Day ?? 0,
        isUntouchable: isUntouchable(name),
        isRookie: (sp?.years_exp ?? 1) === 0,
        injuryStatus: sp?.injury_status ?? null,
        depthChartOrder: sp?.depth_chart_order ?? null,
        college: sp?.college ?? null,
      }
    })

    const totalValue = enrichedPlayers.reduce((s, p) => s + p.value, 0)

    const valueByPosition = Object.fromEntries(
      SCORED_POSITIONS.map((pos) => [
        pos,
        enrichedPlayers.filter((p) => p.position === pos).reduce((s, p) => s + p.value, 0),
      ])
    ) as Record<ScoredPosition, number>

    const withAge = enrichedPlayers.filter((p) => p.age !== null && p.value > 0)
    const wAgeSum = withAge.reduce((s, p) => s + p.age! * p.value, 0)
    const wSum = withAge.reduce((s, p) => s + p.value, 0)
    const avgAge = wSum > 0 ? wAgeSum / wSum : 0

    return {
      rosterId: roster.roster_id,
      ownerName,
      teamName,
      isMe: roster.roster_id === MY_ROSTER_ID,
      players: [...enrichedPlayers].sort((a, b) => b.value - a.value),
      totalValue,
      valueByPosition,
      avgAge,
    }
  })

  return unranked
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((t, i): TeamRoster => ({ ...t, rank: i + 1 }))
}
