import { buildTeamRosters } from '@/lib/join'
import { fetchValues } from '@/lib/fantasycalc'
import { ExportButton } from '@/components/export-button'
import { InjuryBadge, RookieBadge } from '@/components/player-badges'
import { MY_ROSTER_ID } from '@/lib/constants'

export const revalidate = 21600

function fmtTrend(t: number) {
  return t >= 0 ? `+${t.toLocaleString()}` : t.toLocaleString()
}

function fmtVal(v: number) {
  return v > 0 ? (v / 1000).toFixed(1) + 'k' : '—'
}

type TrendRow = {
  sleeperId: string
  name: string
  position: string
  value: number
  trend: number
  isMine: boolean
  isRookie: boolean
  injuryStatus: string | null
}

function buildMarkdown(rising: TrendRow[], falling: TrendRow[]): string {
  const header = '| Player | Pos | Value | 30d |'
  const divider = '|--------|-----|------:|----:|'
  const row = (r: TrendRow) =>
    `| ${r.name}${r.isMine ? ' ●' : ''}${r.isRookie ? ' [R]' : ''}${r.injuryStatus ? ` [${r.injuryStatus}]` : ''} | ${r.position} | ${fmtVal(r.value)} | ${fmtTrend(r.trend)} |`
  return [
    '# Trending — 30-Day Movers',
    '*Dynasty · Half-PPR · 1QB · 12 Teams · ● = my roster*',
    '', '## ▲ Rising', header, divider, ...rising.map(row),
    '', '## ▼ Falling', header, divider, ...falling.map(row),
  ].join('\n')
}

export default async function TrendingPage() {
  const [values, teams] = await Promise.all([fetchValues(), buildTeamRosters()])

  const myTeam = teams.find((t) => t.rosterId === MY_ROSTER_ID)
  const myIds = new Set(myTeam?.players.map((p) => p.sleeperId) ?? [])

  // Build enriched roster map for rookie/injury data
  const rosterMap = new Map(teams.flatMap((t) => t.players).map((p) => [p.sleeperId, p]))

  const rows: TrendRow[] = values
    .filter((v) => v.player.sleeperId && v.trend30Day !== 0 && v.value > 0)
    .map((v) => {
      const rp = rosterMap.get(v.player.sleeperId!)
      return {
        sleeperId: v.player.sleeperId!,
        name: v.player.name,
        position: v.player.position,
        value: v.value,
        trend: v.trend30Day,
        isMine: myIds.has(v.player.sleeperId!),
        isRookie: rp?.isRookie ?? false,
        injuryStatus: rp?.injuryStatus ?? null,
      }
    })
    .sort((a, b) => Math.abs(b.trend) - Math.abs(a.trend))

  const rising = rows.filter((r) => r.trend > 0).slice(0, 30)
  const falling = rows.filter((r) => r.trend < 0).slice(0, 30)
  const markdown = buildMarkdown(rising, falling)

  const TrendTable = ({ rows, color }: { rows: TrendRow[]; color: 'green' | 'red' }) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-gray-400 border-b border-gray-800">
          <th className="text-left py-2 pr-2 font-medium">Player</th>
          <th className="text-left py-2 pr-2 font-medium w-10">Pos</th>
          <th className="text-right py-2 pr-2 font-medium w-16 hidden sm:table-cell">Value</th>
          <th className="text-right py-2 font-medium w-20">30d</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.sleeperId} className={`border-b border-gray-900 last:border-0 ${r.isMine ? 'bg-blue-950/30' : ''}`}>
            <td className="py-2 pr-2">
              <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                <span className={`font-medium ${r.isMine ? 'text-blue-300' : ''}`}>{r.name}</span>
                {r.isMine && <span className="text-blue-500 text-xs">●</span>}
                <RookieBadge isRookie={r.isRookie} />
                <InjuryBadge status={r.injuryStatus} />
              </div>
            </td>
            <td className="py-2 pr-2 text-gray-500 text-xs">{r.position}</td>
            <td className="py-2 pr-2 text-right tabular-nums text-gray-400 text-sm hidden sm:table-cell">
              {fmtVal(r.value)}
            </td>
            <td className={`py-2 text-right tabular-nums text-sm font-medium ${color === 'green' ? 'text-green-400' : 'text-red-400'}`}>
              {fmtTrend(r.trend)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="px-3 py-3 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <h1 className="font-bold text-base">Trending</h1>
          <p className="text-xs text-gray-500 mt-0.5">30-day movers · ● = my roster · [R] = rookie</p>
        </div>
        <ExportButton markdown={markdown} label="Export MD" className="shrink-0" />
      </div>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-800">
            <span className="text-xs font-bold text-green-500 uppercase tracking-wider">▲ Rising</span>
            <span className="text-xs text-gray-600">{rising.length} players</span>
          </div>
          <TrendTable rows={rising} color="green" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-800">
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">▼ Falling</span>
            <span className="text-xs text-gray-600">{falling.length} players</span>
          </div>
          <TrendTable rows={falling} color="red" />
        </div>
      </div>
    </div>
  )
}
