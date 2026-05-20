export type SleeperRoster = {
  roster_id: number
  owner_id: string
  players: string[] | null  // sleeper player IDs; null if roster empty
  starters: string[] | null
  reserve: string[] | null  // IR
  taxi: string[] | null     // taxi squad (subset of players)
}

export type SleeperUser = {
  user_id: string
  display_name: string
  metadata: {
    team_name?: string
  } | null
}

// Only the fields we actually use from the ~5MB players map
export type SleeperPlayer = {
  player_id: string
  full_name: string | null
  position: string | null
  age: number | null
  team: string | null
}

export type SleeperPlayersMap = Record<string, SleeperPlayer>
