export type SleeperRoster = {
  roster_id: number
  owner_id: string
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null
  taxi: string[] | null
}

export type SleeperUser = {
  user_id: string
  display_name: string
  metadata: { team_name?: string } | null
}

export type SleeperPlayer = {
  player_id: string
  full_name: string | null
  position: string | null
  age: number | null
  team: string | null
  years_exp: number | null         // 0 = rookie
  injury_status: string | null     // "Questionable" | "Doubtful" | "Out" | "IR" | "PUP" | null
  depth_chart_order: number | null // 1 = starter
  practice_participation: string | null // "LP" | "FP" | "DNP" | null
  college: string | null
}

export type SleeperPlayersMap = Record<string, SleeperPlayer>
