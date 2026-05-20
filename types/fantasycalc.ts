export type FCPlayerInfo = {
  id: number
  name: string
  position: string
  sleeperId: string | null
}

export type FCValue = {
  player: FCPlayerInfo
  value: number
  trend30Day: number
  overallRank?: number
}
