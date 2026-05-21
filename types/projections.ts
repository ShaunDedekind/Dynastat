export type SleeperNFLState = {
  season: string
  week: number
  season_type: 'regular' | 'pre' | 'post' | 'off'
  display_week: number
  leg: number
}

export type SleeperProjectionStats = {
  pts_half_ppr?: number
  pass_yd?: number
  pass_td?: number
  pass_int?: number
  rush_yd?: number
  rush_td?: number
  rec?: number
  rec_yd?: number
  rec_td?: number
  fum_lost?: number
}

export type ProjectionMap = Record<string, SleeperProjectionStats>
