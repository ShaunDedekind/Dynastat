import Link from 'next/link'
import type { TeamRoster, RosterPlayer } from '@/lib/join'
import { ExportButton } from '@/components/export-button'
import { InjuryBadge, RookieBadge, StarterDot } from '@/components/player-badges'

const POS_ORDER = ['QB', 'RB', 'WR', 'TE'] as const
type Pos = (typeof POS_ORDER)[number]

function fmtVal(v: number) {
  return v > 0 ? v.toLocaleString() : '—'
}

function fmtDelta(d: number): { text: string; cls: string } {
  if (d === 0) return { text: '—', cls: 'text-gray-600' }
  const sign = d > 0 ? '+' : ''
  return { text: `${sign}${d.toLocaleString()}`, cls: d > 0 ? 'text-green-400' : 'text-red-400' }
}

function buildMarkdown(
  team: TeamRoster,
  grouped: Record<Pos, RosterPlayer[]>,
  others: RosterPlayer[],
  weekDeltas: Record<string, number> | null
): string {
  const hasWeek = weekDeltas !== null

  const posSection = (pos: Pos) => {
    const players = grouped[pos]
    if (!players.length) return ''
    const posTotal = players.reduce((s, p) => s + p.value, 0)
    const cols = hasWeek ? '| Player | Rk | Age | Value | 30d | 7d |' : '| Player | Rk | Age | Value | 30d |'
    const div = hasWeek ? '|--------|---:|----:|------:|----:|---:|' : '|--------|---:|----:|------:|----:|'
    const rows = players.map((p) => {
      const lock = p.isUntouchable ? ' 🔒' : ''
      const rookie = p.isRookie ? ' [R]' : ''
      const inj = p.injuryStatus ? ` [${p.injuryStatus}]` : ''
      const rank = p.overallRank ? `#${p.overallRank}` : '—'
      const trend = fmtDelta(p.trend30Day)
      const week = weekDeltas ? fmtDelta(weekDeltas[p.sleeperId] ?? 0) : null
      return hasWeek
        ? `| ${p.name}${lock}${rookie}${inj} | ${rank} | ${p.age ?? '—'} | ${fmtVal(p.value)} | ${trend.text} | ${week?.text ?? '—'} |`
        : `| ${p.name}${lock}${rookie}${inj} | ${rank} | ${p.age ?? '—'} | ${fmtVal(p.value)} | ${trend.text} |`
    })
    return [`## ${pos} — ${posTotal.toLocaleString()}`, cols, div, ...rows].join('\n')
  }

  return [
    `# ${team.teamName}${team.isMe ? ' ★' : ''}`,
    `*Dynasty · Half-PPR · 1QB · 12 Teams*`,
    `*Rank: #${team.rank} · Total: ${team.totalValue.toLocaleString()} · Avg Age: ${team.avgAge.toFixed(1)}*`,
    '',
    ...POS_ORDER.map(posSection).filter(Boolean),
    others.length > 0 ? '## Other\n' + others.map((p) => `- ${p.name} (${p.position})`).join('\n') : '',
  ]
    .filter((s) => s !== '')
    .join('\n\n')
}

type Props = {
  team: TeamRoster
  backHref?: string
  backLabel?: string
  weekDeltas?: Record<string, number> | null
}

export function RosterView({ team, backHref, backLabel = 'Back', weekDeltas = null }: Props) {
  const grouped = Object.fromEntries(
    POS_ORDER.map((pos) => [pos, team.players.filter((p) => p.position === pos)])
  ) as Record<Pos, RosterPlayer[]>

  const scoredSet = new Set<string>(POS_ORDER)
  const others = team.players.filter((p) => !scoredSet.has(p.position))
  const markdown = buildMarkdown(team, grouped, others, weekDeltas)

  return (
    <div className="px-3 py-3 max-w-3xl mx-auto">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-3 min-h-[36px]"
        >
          ← {backLabel}
        </Link>
      )}

      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h1 className="font-bold text-base leading-tight">
            {team.teamName}
            {team.isMe && <span className="text-blue-400 ml-1">★</span>}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {team.ownerName} · Rank #{team.rank} · {(team.totalValue / 1000).toFixed(1)}k · Age{' '}
            {team.avgAge.toFixed(1)}
          </p>
        </div>
        <ExportButton markdown={markdown} label="Export MD" className="shrink-0" />
      </div>

      <div className="space-y-4">
        {POS_ORDER.map((pos) => {
          const players = grouped[pos]
          if (!players.length) return null
          const posTotal = players.reduce((s, p) => s + p.value, 0)
          return (
            <div key={pos}>
              <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-800">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider w-8">{pos}</span>
                <span className="text-xs text-gray-600 tabular-nums">{(posTotal / 1000).toFixed(1)}k</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-600 border-b border-gray-900">
                    <th className="text-left pb-1 pr-2 font-normal">Player</th>
                    <th className="text-right pb-1 pr-2 font-normal">Value</th>
                    <th className="text-right pb-1 pr-2 font-normal">30d</th>
                    {weekDeltas !== null && (
                      <th className="text-right pb-1 font-normal hidden sm:table-cell">7d</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => {
                    const trend = fmtDelta(p.trend30Day)
                    const week = weekDeltas !== null ? fmtDelta(weekDeltas[p.sleeperId] ?? 0) : null
                    return (
                      <tr key={p.sleeperId} className="border-b border-gray-900 last:border-0">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                            <span className={`font-medium ${p.isUntouchable ? 'text-yellow-300' : ''}`}>
                              {p.name}
                            </span>
                            {p.isUntouchable && <span className="text-yellow-500 text-xs">🔒</span>}
                            <StarterDot depthOrder={p.depthChartOrder} />
                            <RookieBadge isRookie={p.isRookie} />
                            <InjuryBadge status={p.injuryStatus} />
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <span>{p.nflTeam ?? 'FA'}{p.age ? ` · ${p.age}y` : ''}</span>
                            {p.overallRank && (
                              <span className="text-gray-700 tabular-nums">· #{p.overallRank}</span>
                            )}
                            {p.college && p.isRookie && (
                              <span className="text-gray-700">· {p.college}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums font-medium">{fmtVal(p.value)}</td>
                        <td className={`py-2 text-right tabular-nums ${weekDeltas !== null ? 'pr-2' : ''} ${trend.cls}`}>
                          {trend.text}
                        </td>
                        {weekDeltas !== null && (
                          <td className={`py-2 text-right tabular-nums hidden sm:table-cell ${week?.cls ?? 'text-gray-600'}`}>
                            {week?.text ?? '—'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}

        {others.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-800">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Other</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {others.map((p) => (
                  <tr key={p.sleeperId} className="border-b border-gray-900 last:border-0">
                    <td className="py-2 pr-2">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{p.position}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-xs text-gray-600">
                      {p.value > 0 ? fmtVal(p.value) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
