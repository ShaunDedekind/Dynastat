import { fetchRosters, fetchUsers, fetchPlayers } from '@/lib/sleeper'
import { fetchValues } from '@/lib/fantasycalc'
import { MY_ROSTER_ID, SCORED_POSITIONS, ScoredPosition, isUntouchable } from '@/lib/constants'

export type RosterPlayer = {
  sleeperId: string
  name: string
  position: string
  nflTeam: string | null
  age: number | null
  value: number       // 0 if not in FantasyCalc (K, DEF, unranked rookies)
  trend30Day: number  // point delta over 30 days
  isUntouchable: boolean
}

export type TeamRoster = {
  rosterId: number
  ownerName: string
  teamName: string
  isMe: boolean
  players: RosterPlayer[]       // sorted by value desc
  totalValue: number
  valueByPosition: Record<ScoredPosition, number>
  avgAge: number                // value-weighted, excludes null ages and value=0
  rank?: number                 // assigned after sort
}

export async function buildTeamRosters(): Promise<TeamRoster[]> {
  // DB SEAM: This function fetches live and joins in memory.
  // To add season-long value history (FantasyCalc only gives 30-day trends):
  //   1. Write the returned TeamRoster[] to a `team_snapshots` table after building
  //   2. Add a separate query path that reads historical snapshots for trend overlays
  // Insert point: replace the `return sorted` below with a write+return.

  const [rosters, users, players, values] = await Promise.all([
    fetchRosters(),
    fetchUsers(),
    fetchPlayers(),
    fetchValues(),
  ])

  // userId → display info
  const userMap = new Map(users.map((u) => [u.user_id, u]))

  // sleeperId → FantasyCalc value object
  const fcMap = new Map<string, (typeof values)[number]>()
  for (const v of values) {
    if (v.player.sleeperId) {
      fcMap.set(v.player.sleeperId, v)
    }
  }

  const teamRosters: TeamRoster[] = rosters.map((roster) => {
    const user = userMap.get(roster.owner_id)
    const ownerName = user?.display_name ?? `Roster ${roster.roster_id}`
    const teamName = user?.metadata?.team_name ?? ownerName

    // roster.players already includes taxi squad — no double-counting
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
      }
    })

    const totalValue = enrichedPlayers.reduce((sum, p) => sum + p.value, 0)

    const valueByPosition = Object.fromEntries(
      SCORED_POSITIONS.map((pos) => [
        pos,
        enrichedPlayers
          .filter((p) => p.position === pos)
          .reduce((sum, p) => sum + p.value, 0),
      ])
    ) as Record<ScoredPosition, number>

    // Value-weighted average age — excludes unranked/unvalued players and null ages
    const valuedWithAge = enrichedPlayers.filter((p) => p.age !== null && p.value > 0)
    const weightedAgeSum = valuedWithAge.reduce((sum, p) => sum + p.age! * p.value, 0)
    const valueWeight = valuedWithAge.reduce((sum, p) => sum + p.value, 0)
    const avgAge = valueWeight > 0 ? weightedAgeSum / valueWeight : 0

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

  const sorted = teamRosters
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((t, i) => ({ ...t, rank: i + 1 }))

  return sorted
}

/** Milliseconds since a Date — for computing data freshness display */
export function getFreshness(fetchedAt: Date): string {
  const diffMs = Date.now() - fetchedAt.getTime()
  const diffH = Math.round(diffMs / 1000 / 60 / 60)
  if (diffH < 1) return 'just now'
  return `${diffH}h ago`
}
