import type { SleeperRoster, SleeperUser, SleeperPlayersMap } from '@/types/sleeper'

const BASE = 'https://api.sleeper.app/v1'
const LEAGUE_ID = '1314357948058718208'

export async function fetchRosters(): Promise<SleeperRoster[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/rosters`, {
    next: { revalidate: 21600 },
  })
  if (!res.ok) throw new Error(`Sleeper rosters ${res.status}`)
  return res.json()
}

export async function fetchUsers(): Promise<SleeperUser[]> {
  const res = await fetch(`${BASE}/league/${LEAGUE_ID}/users`, {
    next: { revalidate: 21600 },
  })
  if (!res.ok) throw new Error(`Sleeper users ${res.status}`)
  return res.json()
}

export async function fetchPlayers(): Promise<SleeperPlayersMap> {
  // ~5MB — cache 24h, player metadata barely changes
  const res = await fetch(`${BASE}/players/nfl`, {
    next: { revalidate: 86400 },
  })
  if (!res.ok) throw new Error(`Sleeper players ${res.status}`)
  return res.json()
}
