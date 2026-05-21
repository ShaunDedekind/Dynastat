// Vercel KV snapshot — stores daily player values for week-over-week comparison.
// Degrades silently if KV env vars aren't set (shows "—" for 7d column).
//
// Setup: Vercel dashboard → Storage → Create KV → Connect to project.
// Env vars are injected automatically: KV_REST_API_URL, KV_REST_API_TOKEN.

const KV_ENABLED = !!(process.env.KV_REST_API_URL || process.env.KV_URL)

type RosterSnapshot = {
  date: string
  totalValue: number
  playerValues: Record<string, number> // sleeperId → value
}

function dateKey(rosterId: number, daysAgo = 0): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000)
  return `snap:${rosterId}:${d.toISOString().slice(0, 10)}`
}

/** Write today's snapshot. Called on each ISR revalidation (~every 6h, overwrites same-day key). */
export async function writeSnapshot(
  rosterId: number,
  players: Array<{ sleeperId: string; value: number }>
): Promise<void> {
  if (!KV_ENABLED) return
  try {
    const { kv } = await import('@vercel/kv')
    const snapshot: RosterSnapshot = {
      date: new Date().toISOString().slice(0, 10),
      totalValue: players.reduce((s, p) => s + p.value, 0),
      playerValues: Object.fromEntries(players.map((p) => [p.sleeperId, p.value])),
    }
    // TTL: 35 days
    await kv.set(dateKey(rosterId), snapshot, { ex: 60 * 60 * 24 * 35 })
  } catch {
    // KV unavailable — degrade silently
  }
}

/**
 * Returns a map of sleeperId → (currentValue - valueFromNDaysAgo).
 * Returns null if no snapshot exists yet (first week).
 */
export async function getWeekDeltas(
  rosterId: number,
  currentPlayers: Array<{ sleeperId: string; value: number }>
): Promise<Record<string, number> | null> {
  if (!KV_ENABLED) return null
  try {
    const { kv } = await import('@vercel/kv')
    const snapshot = await kv.get<RosterSnapshot>(dateKey(rosterId, 7))
    if (!snapshot) return null
    return Object.fromEntries(
      currentPlayers.map((p) => [
        p.sleeperId,
        p.value - (snapshot.playerValues[p.sleeperId] ?? p.value),
      ])
    )
  } catch {
    return null
  }
}
