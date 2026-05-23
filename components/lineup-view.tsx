'use client'

import { useState, useMemo } from 'react'
import { optimizeLineup } from '@/lib/lineup'
import type { LineupPlayer, LineupResult, OptimizeMethod, LineupSlot } from '@/lib/lineup'
import { ExportButton } from '@/components/export-button'
import { InjuryBadge, RookieBadge, StarterDot } from '@/components/player-badges'

const SLOT_LABEL: Record<LineupSlot, string> = {
  QB: 'QB',
  RB1: 'RB',
  RB2: 'RB',
  WR1: 'WR',
  WR2: 'WR',
  WR3: 'WR',
  TE: 'TE',
  FLEX1: 'FLEX',
  FLEX2: 'FLEX',
}

function fmtVal(v: number): string {
  return v > 0 ? v.toLocaleString() : '—'
}

function fmtDelta(d: number): { text: string; cls: string } {
  if (d === 0) return { text: '—', cls: 'text-gray-600' }
  const sign = d > 0 ? '+' : ''
  return { text: `${sign}${d.toLocaleString()}`, cls: d > 0 ? 'text-green-400' : 'text-red-400' }
}

function buildMarkdown(
  result: LineupResult,
  teamName: string,
  season: string,
  week: number,
  isOffSeason: boolean
): string {
  const methodLabel = result.method === 'value' ? 'By Value' : 'By Projection'
  const weekLabel = isOffSeason ? 'Off-season' : `Week ${week}`
  const metricHeader = result.method === 'value' ? 'Value' : 'Pts'
  const totalStr =
    result.method === 'value'
      ? `Starting Value: ${(result.totalStartingValue / 1000).toFixed(1)}k`
      : result.totalProjectedPoints !== null
        ? `Projected: ${result.totalProjectedPoints.toFixed(1)} pts`
        : 'Projected: —'

  const starterRows = result.starters.map(({ slot, player }) => {
    const label = SLOT_LABEL[slot]
    if (!player) return `| ${label} | — | — | — | — | — | — |`
    const delta = fmtDelta(player.trend30Day)
    const metric =
      result.method === 'value'
        ? fmtVal(player.value)
        : player.projectedPoints !== null
          ? player.projectedPoints.toFixed(1)
          : '—'
    return `| ${label} | ${player.name} | ${player.position} | ${player.nflTeam ?? 'FA'} | ${player.age ?? '—'} | ${metric} | ${delta.text} |`
  })

  const benchRows = result.bench.map((p) => {
    const delta = fmtDelta(p.trend30Day)
    const metric =
      result.method === 'value'
        ? fmtVal(p.value)
        : p.projectedPoints !== null
          ? p.projectedPoints.toFixed(1)
          : '—'
    const tag = p.isLineupIneligible ? ' [TAXI/IR]' : ''
    return `| ${p.name}${tag} | ${p.position} | ${p.nflTeam ?? 'FA'} | ${p.age ?? '—'} | ${metric} | ${delta.text} |`
  })

  return [
    `# Lineup — ${teamName}`,
    `*Dynasty · Half-PPR · 1QB · ${methodLabel}*`,
    `*${weekLabel} · ${season} Season · ${totalStr}*`,
    '',
    '## Starters',
    '',
    `| Slot | Player | Pos | Team | Age | ${metricHeader} | 30d |`,
    `|------|--------|-----|------|----:|------:|----:|`,
    ...starterRows,
    '',
    '## Bench',
    '',
    `| Player | Pos | Team | Age | ${metricHeader} | 30d |`,
    `|--------|-----|------|----:|------:|----:|`,
    ...benchRows,
  ].join('\n')
}

type Props = {
  players: LineupPlayer[]
  isOffSeason: boolean
  season: string
  week: number
  teamName: string
}

export function LineupView({ players, isOffSeason, season, week, teamName }: Props) {
  const [method, setMethod] = useState<OptimizeMethod>('value')

  const result = useMemo(() => optimizeLineup(players, method), [players, method])

  const markdown = buildMarkdown(result, teamName, season, week, isOffSeason)
  const weekLabel = isOffSeason ? 'Off-season' : `Week ${week} · ${season}`

  return (
    <div className="px-3 py-3 max-w-3xl mx-auto">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h1 className="font-bold text-base leading-tight">Optimal Lineup</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {teamName} · {weekLabel}
          </p>
        </div>
        <ExportButton markdown={markdown} label="Export MD" className="shrink-0" />
      </div>

      {/* Method toggle */}
      <div className="grid grid-cols-2 gap-1 bg-gray-900 rounded-lg p-1 mb-3">
        {(['value', 'projection'] as const).map((m) => {
          const isDisabled = m === 'projection' && isOffSeason
          return (
            <button
              key={m}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) setMethod(m)
              }}
              title={isDisabled ? 'Projections unavailable off-season' : undefined}
              className={`py-1.5 rounded text-sm font-medium min-h-[36px] transition-colors ${
                method === m
                  ? 'bg-gray-700 text-white'
                  : isDisabled
                    ? 'text-gray-700 cursor-not-allowed opacity-40'
                    : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {m === 'value' ? 'By Value' : isOffSeason ? 'By Projection (off-season)' : 'By Projection'}
            </button>
          )
        })}
      </div>

      {/* Summary bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {method === 'value' ? 'Starting Value' : `Week ${week} Projection`}
        </span>
        <span className="font-bold tabular-nums text-sm">
          {method === 'value'
            ? `${(result.totalStartingValue / 1000).toFixed(1)}k`
            : result.totalProjectedPoints !== null
              ? `${result.totalProjectedPoints.toFixed(1)} pts`
              : '—'}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StartersPanel result={result} method={method} />
        <BenchPanel result={result} method={method} />
      </div>
    </div>
  )
}

function StartersPanel({ result, method }: { result: LineupResult; method: OptimizeMethod }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-800">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Starters</span>
        <span className="text-xs text-gray-600 tabular-nums">
          {(result.totalStartingValue / 1000).toFixed(1)}k
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-600 border-b border-gray-900">
            <th className="text-left pb-1 pr-1 font-normal w-10">Slot</th>
            <th className="text-left pb-1 pr-2 font-normal">Player</th>
            <th className="text-right pb-1 pr-2 font-normal">{method === 'value' ? 'Value' : 'Pts'}</th>
            <th className="text-right pb-1 font-normal">30d</th>
          </tr>
        </thead>
        <tbody>
          {result.starters.map(({ slot, player }) => {
            const label = SLOT_LABEL[slot]
            if (!player) {
              return (
                <tr key={slot} className="border-b border-gray-900 last:border-0">
                  <td className="py-1.5 pr-1 text-xs text-gray-700 font-medium">{label}</td>
                  <td className="py-1.5 pr-2 text-xs text-gray-700 italic" colSpan={3}>
                    — Empty —
                  </td>
                </tr>
              )
            }
            const delta = fmtDelta(player.trend30Day)
            return (
              <tr key={slot} className="border-b border-gray-900 last:border-0">
                <td className="py-1.5 pr-1 text-xs text-gray-500 font-medium">{label}</td>
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1 flex-wrap leading-tight">
                    <span className={`font-medium ${player.isUntouchable ? 'text-yellow-300' : ''}`}>
                      {player.name}
                    </span>
                    {player.isUntouchable && <span className="text-yellow-500 text-xs">🔒</span>}
                    <StarterDot depthOrder={player.depthChartOrder} />
                    <RookieBadge isRookie={player.isRookie} />
                    <InjuryBadge status={player.injuryStatus} />
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {player.nflTeam ?? 'FA'}
                    {player.age ? ` · ${player.age}y` : ''}
                    {player.overallRank && (
                      <span className="text-gray-700 tabular-nums"> · #{player.overallRank}</span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                  {method === 'value' ? (
                    fmtVal(player.value)
                  ) : player.projectedPoints !== null ? (
                    player.projectedPoints.toFixed(1)
                  ) : (
                    <span className="text-gray-700 font-normal">no proj</span>
                  )}
                </td>
                <td className={`py-1.5 text-right tabular-nums text-xs ${delta.cls}`}>
                  {delta.text}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BenchPanel({ result, method }: { result: LineupResult; method: OptimizeMethod }) {
  if (!result.bench.length) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-1 pb-1 border-b border-gray-800">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bench</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-600 border-b border-gray-900">
            <th className="text-left pb-1 pr-2 font-normal">Player</th>
            <th className="text-right pb-1 pr-2 font-normal">{method === 'value' ? 'Value' : 'Pts'}</th>
            <th className="text-right pb-1 font-normal">30d</th>
          </tr>
        </thead>
        <tbody>
          {result.bench.map((p) => {
            const delta = fmtDelta(p.trend30Day)
            return (
              <tr key={p.sleeperId} className="border-b border-gray-900 last:border-0">
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1 flex-wrap leading-tight">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-gray-600">{p.position}</span>
                    <StarterDot depthOrder={p.depthChartOrder} />
                    <RookieBadge isRookie={p.isRookie} />
                    <InjuryBadge status={p.injuryStatus} />
                    {p.isLineupIneligible && (
                      <span className="inline-flex items-center text-xs px-1 py-px rounded font-bold leading-none bg-gray-800 text-gray-500">
                        TAXI
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.nflTeam ?? 'FA'}
                    {p.age ? ` · ${p.age}y` : ''}
                    {method === 'projection' && !p.hasProjection && (
                      <span className="text-gray-700"> · no proj</span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                  {method === 'value' ? (
                    fmtVal(p.value)
                  ) : p.projectedPoints !== null ? (
                    p.projectedPoints.toFixed(1)
                  ) : (
                    <span className="text-gray-700 font-normal">—</span>
                  )}
                </td>
                <td className={`py-1.5 text-right tabular-nums text-xs ${delta.cls}`}>
                  {delta.text}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
