import { buildTeamRosters } from '@/lib/join'

// Matches the slowest data source (6h)
export const revalidate = 21600

export default async function PowerRankingsPage() {
  const teams = await buildTeamRosters()

  // Raw data dump — verify the join looks correct before building UI
  const summary = teams.map((t) => ({
    rank: t.rank,
    team: t.teamName,
    owner: t.ownerName,
    isMe: t.isMe,
    totalValue: t.totalValue,
    avgAge: +t.avgAge.toFixed(1),
    byPosition: t.valueByPosition,
    playerCount: t.players.length,
    top5: t.players.slice(0, 5).map((p) => ({
      name: p.name,
      pos: p.position,
      age: p.age,
      value: p.value,
      trend: p.trend30Day,
      untouchable: p.isUntouchable || undefined,
    })),
  }))

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg font-bold">Power Rankings</h1>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
          data join verification — UI next
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Check: 12 teams, correct player counts, your team (isMe: true) on roster 3,
        untouchables flagged, values non-zero for starters.
      </p>
      <pre className="text-xs text-gray-300 bg-gray-900 rounded p-4 overflow-auto whitespace-pre-wrap leading-5">
        {JSON.stringify(summary, null, 2)}
      </pre>
    </div>
  )
}
