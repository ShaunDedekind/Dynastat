import { buildTeamRosters, TeamRoster } from '@/lib/join'
import { ExportButton } from '@/components/export-button'

export const revalidate = 21600

function fmtVal(v: number) {
  if (v <= 0) return '—'
  return (v / 1000).toFixed(1) + 'k'
}

function buildMarkdown(teams: TeamRoster[]): string {
  const header = '| # | Team | Owner | Total | QB | RB | WR | TE | Age |'
  const divider = '|---|------|-------|------:|---:|---:|---:|---:|----:|'
  const rows = teams.map((t) =>
    `| ${t.rank}${t.isMe ? ' ★' : ''} | ${t.teamName} | ${t.ownerName} | ${fmtVal(t.totalValue)} | ${fmtVal(t.valueByPosition.QB)} | ${fmtVal(t.valueByPosition.RB)} | ${fmtVal(t.valueByPosition.WR)} | ${fmtVal(t.valueByPosition.TE)} | ${t.avgAge > 0 ? t.avgAge.toFixed(1) : '—'} |`
  )
  return [
    '# Power Rankings — Dynastat',
    '*Dynasty · Half-PPR · 1QB · 12 Teams*',
    '',
    header,
    divider,
    ...rows,
  ].join('\n')
}

export default async function PowerRankingsPage() {
  const teams = await buildTeamRosters()
  const markdown = buildMarkdown(teams)

  return (
    <div className="px-3 py-3 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <h1 className="font-bold text-base leading-tight">Power Rankings</h1>
          <p className="text-xs text-gray-500 mt-0.5">values refresh every 6h</p>
        </div>
        <ExportButton markdown={markdown} label="Export MD" className="shrink-0" />
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 text-xs text-gray-400 border-b border-gray-800">
              <th className="text-center py-2 px-2 font-medium w-8">#</th>
              <th className="text-left py-2 px-2 font-medium">Team</th>
              <th className="text-right py-2 px-2 font-medium">Total</th>
              {/* Position columns — desktop only */}
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">QB</th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">RB</th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">WR</th>
              <th className="text-right py-2 px-2 font-medium hidden md:table-cell">TE</th>
              <th className="text-right py-2 px-2 font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr
                key={team.rosterId}
                className={`border-b border-gray-900 last:border-0 ${
                  team.isMe
                    ? 'bg-blue-950/50'
                    : i % 2 === 0
                    ? 'bg-gray-950'
                    : 'bg-gray-950/50'
                }`}
              >
                <td className="py-2.5 px-2 text-center text-xs text-gray-500 tabular-nums">
                  {team.rank}
                </td>
                <td className="py-2.5 px-2">
                  <div className={`font-medium text-sm leading-tight ${team.isMe ? 'text-blue-300' : ''}`}>
                    {team.teamName}
                    {team.isMe && <span className="ml-1 text-blue-500 text-xs">★</span>}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight mt-0.5">{team.ownerName}</div>
                </td>
                <td className="py-2.5 px-2 text-right font-semibold tabular-nums">
                  {fmtVal(team.totalValue)}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-400 tabular-nums hidden md:table-cell">
                  {fmtVal(team.valueByPosition.QB)}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-400 tabular-nums hidden md:table-cell">
                  {fmtVal(team.valueByPosition.RB)}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-400 tabular-nums hidden md:table-cell">
                  {fmtVal(team.valueByPosition.WR)}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-400 tabular-nums hidden md:table-cell">
                  {fmtVal(team.valueByPosition.TE)}
                </td>
                <td className="py-2.5 px-2 text-right text-gray-400 tabular-nums text-xs">
                  {team.avgAge > 0 ? team.avgAge.toFixed(1) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile hint */}
      <p className="text-xs text-gray-600 mt-2 md:hidden text-center">
        QB · RB · WR · TE breakdown on wider screen
      </p>
    </div>
  )
}
