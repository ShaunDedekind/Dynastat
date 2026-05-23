'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { Strategy, PlayerRole, Target } from '@/types/strategy'
import { StrategySchema } from '@/types/strategy'
import { STORAGE_KEY, getPlayerRole, getConditionalReturn } from '@/lib/strategy'
import type { RosterPlayer } from '@/lib/join'
import { ExportButton } from '@/components/export-button'
import { InjuryBadge, RookieBadge } from '@/components/player-badges'

const ROLE_LABELS: Record<PlayerRole, string> = {
  never_trade: 'Never Trade',
  conditional: 'Conditional',
  hold: 'Hold',
  surplus: 'Surplus',
}

const ROLE_COLORS: Record<PlayerRole, string> = {
  never_trade: 'bg-red-900/60 text-red-300',
  conditional: 'bg-amber-900/60 text-amber-300',
  hold: 'bg-blue-900/60 text-blue-300',
  surplus: 'bg-gray-800 text-gray-400',
}

function fmtVal(v: number) {
  return v > 0 ? v.toLocaleString() : '—'
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function buildMarkdown(strategy: Strategy, myPlayers: RosterPlayer[]): string {
  const { timeline, playerRoles, conditionalReturn, targets, constraints } = strategy
  const byId = new Map(myPlayers.map((p) => [p.sleeperId, p]))

  const roleGroups: Record<PlayerRole, RosterPlayer[]> = {
    never_trade: [],
    conditional: [],
    hold: [],
    surplus: [],
  }
  for (const [id, role] of Object.entries(playerRoles)) {
    const p = byId.get(id)
    if (p) roleGroups[role].push(p)
  }

  const playerLine = (p: RosterPlayer) =>
    `- ${p.name} (${p.position} · ${p.nflTeam ?? 'FA'} · ${p.age ?? '?'}y) · ${fmtVal(p.value)}`

  const lines: string[] = [
    '# Strategy — Dynasty',
    `*${capitalize(timeline.stance)} → Contend ${timeline.contendYear} · Half-PPR · 1QB*`,
    '',
    '## Timeline',
    `${capitalize(timeline.stance)} → Contend by **${timeline.contendYear}**`,
    '',
    '## Player Roles',
    '',
  ]

  const sections: [string, PlayerRole][] = [
    ['Never Trade', 'never_trade'],
    ['Conditional', 'conditional'],
    ['Hold', 'hold'],
    ['Surplus (actively shopping)', 'surplus'],
  ]

  for (const [title, role] of sections) {
    const players = [...roleGroups[role]].sort((a, b) => b.value - a.value)
    if (!players.length) continue
    lines.push(`### ${title}`)
    for (const p of players) {
      lines.push(playerLine(p))
      if (role === 'conditional' && conditionalReturn[p.sleeperId]) {
        lines.push(`  → "${conditionalReturn[p.sleeperId]}"`)
      }
    }
    lines.push('')
  }

  if (targets.length > 0) {
    lines.push('## Acquisition Targets', '')
    targets.forEach((t, i) => {
      const who = t.sleeperId
        ? (byId.get(t.sleeperId)?.name ?? 'Unknown player')
        : t.position
          ? t.position
          : 'Any'
      const age = t.maxAge != null ? ` · max age ${t.maxAge}` : ''
      lines.push(`${i + 1}. ${who}${age} — "${t.note}"`)
    })
    lines.push('')
  }

  lines.push('## Constraints')
  if (constraints.maxAcquireAge != null) {
    lines.push(`- Max acquire age: ${constraints.maxAcquireAge}`)
  }
  lines.push(
    `- Flag adds older than ${timeline.contendYear} contend window: ${constraints.flagAddsOlderThanContendWindow ? 'yes' : 'no'}`
  )

  return lines.join('\n')
}

type Props = {
  myPlayers: RosterPlayer[]
  allPlayers: RosterPlayer[]
  seed: Strategy
}

export function StrategyView({ myPlayers, allPlayers, seed }: Props) {
  const [strategy, setStrategy] = useState<Strategy>(seed)

  // Load from localStorage after mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      setStrategy(StrategySchema.parse(JSON.parse(raw)))
    } catch {
      // corrupt data — keep seed
    }
  }, [])

  function update(s: Strategy) {
    setStrategy(s)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }

  function setRole(sleeperId: string, role: PlayerRole | '') {
    const next = { ...strategy.playerRoles }
    const nextCond = { ...strategy.conditionalReturn }
    if (!role) {
      delete next[sleeperId]
      delete nextCond[sleeperId]
    } else {
      next[sleeperId] = role
      if (role !== 'conditional') delete nextCond[sleeperId]
    }
    update({ ...strategy, playerRoles: next, conditionalReturn: nextCond })
  }

  function setCondReturn(sleeperId: string, text: string) {
    update({ ...strategy, conditionalReturn: { ...strategy.conditionalReturn, [sleeperId]: text } })
  }

  function addTarget() {
    const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}`
    update({ ...strategy, targets: [...strategy.targets, { id, note: '' }] })
  }

  function updateTarget(id: string, patch: Partial<Target>) {
    update({
      ...strategy,
      targets: strategy.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })
  }

  function removeTarget(id: string) {
    update({ ...strategy, targets: strategy.targets.filter((t) => t.id !== id) })
  }

  const markdown = useMemo(
    () => buildMarkdown(strategy, myPlayers),
    [strategy, myPlayers]
  )

  const stanceLabel = `${capitalize(strategy.timeline.stance)} → Contend ${strategy.timeline.contendYear}`

  return (
    <div className="px-3 py-3 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h1 className="font-bold text-base leading-tight">Strategy</h1>
          <p className="text-xs text-gray-500 mt-0.5">{stanceLabel}</p>
        </div>
        <ExportButton markdown={markdown} label="Export MD" className="shrink-0" />
      </div>

      <div className="space-y-5">
        {/* TIMELINE */}
        <Section title="Timeline">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded overflow-hidden border border-gray-800">
              {(['rebuild', 'consolidate', 'contend'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => update({ ...strategy, timeline: { ...strategy.timeline, stance: s } })}
                  className={`px-3 py-1.5 text-sm font-medium min-h-[36px] transition-colors border-r border-gray-800 last:border-0 ${
                    strategy.timeline.stance === s
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {capitalize(s)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Contend year</span>
              <input
                type="number"
                value={strategy.timeline.contendYear}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  if (v >= 2024 && v <= 2040) {
                    update({ ...strategy, timeline: { ...strategy.timeline, contendYear: v } })
                  }
                }}
                className="w-20 bg-gray-800 rounded px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[36px]"
              />
            </div>
          </div>
        </Section>

        {/* PLAYER ROLES */}
        <Section title="Player Roles">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-600 border-b border-gray-900">
                <th className="text-left pb-1 pr-2 font-normal">Player</th>
                <th className="text-right pb-1 pr-2 font-normal hidden sm:table-cell">Value</th>
                <th className="text-right pb-1 font-normal">Role</th>
              </tr>
            </thead>
            <tbody>
              {myPlayers.map((p) => {
                const role = getPlayerRole(strategy, p.sleeperId) ?? ''
                const condText = getConditionalReturn(strategy, p.sleeperId) ?? ''
                return (
                  <>
                    <tr key={p.sleeperId} className="border-b border-gray-900 last:border-0">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1 flex-wrap leading-tight">
                          <span className="font-medium">{p.name}</span>
                          {role && (
                            <span className={`inline-flex items-center text-xs px-1 py-px rounded font-bold leading-none ${ROLE_COLORS[role as PlayerRole]}`}>
                              {role === 'never_trade' ? 'NT' : role === 'conditional' ? 'CD' : role === 'hold' ? 'HD' : 'SR'}
                            </span>
                          )}
                          <RookieBadge isRookie={p.isRookie} />
                          <InjuryBadge status={p.injuryStatus} />
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {p.position} · {p.nflTeam ?? 'FA'}{p.age ? ` · ${p.age}y` : ''}
                        </div>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-xs text-gray-400 hidden sm:table-cell">
                        {fmtVal(p.value)}
                      </td>
                      <td className="py-2 text-right">
                        <select
                          value={role}
                          onChange={(e) => setRole(p.sleeperId, e.target.value as PlayerRole | '')}
                          className="bg-gray-800 text-xs rounded px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-blue-600 text-gray-300"
                        >
                          <option value="">—</option>
                          {(Object.entries(ROLE_LABELS) as [PlayerRole, string][]).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {role === 'conditional' && (
                      <tr key={`${p.sleeperId}-cond`} className="border-b border-gray-900">
                        <td colSpan={3} className="pb-2 pt-0 pr-0">
                          <input
                            type="text"
                            value={condText}
                            onChange={(e) => setCondReturn(p.sleeperId, e.target.value)}
                            placeholder="Return requirement (e.g. young RB1 ≤24 + pick)…"
                            className="w-full bg-amber-950/20 border border-amber-800/40 rounded px-3 py-2 text-xs text-amber-200 placeholder-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-700 min-h-[36px]"
                          />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </Section>

        {/* TARGETS */}
        <Section title="Acquisition Targets">
          {strategy.targets.length > 0 && (
            <table className="w-full text-sm mb-2">
              <thead>
                <tr className="text-xs text-gray-600 border-b border-gray-900">
                  <th className="text-left pb-1 pr-2 font-normal w-6">#</th>
                  <th className="text-left pb-1 pr-2 font-normal">Position / Player</th>
                  <th className="text-right pb-1 pr-2 font-normal w-16">Max Age</th>
                  <th className="text-left pb-1 pr-2 font-normal">Note</th>
                  <th className="pb-1 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {strategy.targets.map((t, i) => (
                  <TargetRow
                    key={t.id}
                    target={t}
                    index={i + 1}
                    allPlayers={allPlayers}
                    onChange={(patch) => updateTarget(t.id, patch)}
                    onRemove={() => removeTarget(t.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
          <button
            onClick={addTarget}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors min-h-[36px] px-2"
          >
            + Add target
          </button>
        </Section>

        {/* CONSTRAINTS */}
        <Section title="Constraints">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 w-40 shrink-0">Max acquire age</label>
              <input
                type="number"
                value={strategy.constraints.maxAcquireAge ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : parseInt(e.target.value)
                  update({ ...strategy, constraints: { ...strategy.constraints, maxAcquireAge: v } })
                }}
                placeholder="none"
                min={18}
                max={45}
                className="w-20 bg-gray-800 rounded px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[36px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400 w-40 shrink-0">Flag adds &gt; contend yr</label>
              <button
                onClick={() =>
                  update({
                    ...strategy,
                    constraints: {
                      ...strategy.constraints,
                      flagAddsOlderThanContendWindow: !strategy.constraints.flagAddsOlderThanContendWindow,
                    },
                  })
                }
                className={`px-3 py-1.5 rounded text-xs font-medium min-h-[36px] transition-colors ${
                  strategy.constraints.flagAddsOlderThanContendWindow
                    ? 'bg-amber-800/60 text-amber-300'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {strategy.constraints.flagAddsOlderThanContendWindow ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-800">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  )
}

function TargetRow({
  target, index, allPlayers, onChange, onRemove,
}: {
  target: Target
  index: number
  allPlayers: RosterPlayer[]
  onChange: (patch: Partial<Target>) => void
  onRemove: () => void
}) {
  const [search, setSearch] = useState('')
  const [showResults, setShowResults] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedPlayer = useMemo(
    () => (target.sleeperId ? allPlayers.find((p) => p.sleeperId === target.sleeperId) : null),
    [target.sleeperId, allPlayers]
  )

  const results = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allPlayers.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [search, allPlayers])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <tr className="border-b border-gray-900 last:border-0">
      <td className="py-1.5 pr-2 text-xs text-gray-600 tabular-nums align-top pt-2">{index}</td>
      <td className="py-1.5 pr-2 align-top">
        <div className="relative" ref={ref}>
          <input
            type="text"
            value={selectedPlayer ? selectedPlayer.name : search || target.position || ''}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowResults(true)
              // If user clears, also clear the sleeperId
              if (!e.target.value) {
                onChange({ sleeperId: undefined, position: undefined })
              } else if (!target.sleeperId) {
                onChange({ position: e.target.value, sleeperId: undefined })
              }
            }}
            onFocus={() => setShowResults(true)}
            placeholder="RB, WR, or player name…"
            className="w-full bg-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[32px]"
          />
          {showResults && results.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-0.5 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-48 overflow-y-auto">
              {results.map((p) => (
                <button
                  key={p.sleeperId}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange({ sleeperId: p.sleeperId, position: p.position })
                    setSearch('')
                    setShowResults(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-700 min-h-[36px]"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-500">{p.position} · {p.nflTeam ?? 'FA'}{p.age ? ` · ${p.age}y` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="py-1.5 pr-2 align-top">
        <input
          type="number"
          value={target.maxAge ?? ''}
          onChange={(e) => onChange({ maxAge: e.target.value === '' ? undefined : parseInt(e.target.value) })}
          placeholder="—"
          min={18}
          max={45}
          className="w-14 bg-gray-800 rounded px-2 py-1 text-xs text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[32px]"
        />
      </td>
      <td className="py-1.5 pr-2 align-top">
        <input
          type="text"
          value={target.note}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="note…"
          className="w-full bg-gray-800 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[32px]"
        />
      </td>
      <td className="py-1.5 align-top">
        <button
          onClick={onRemove}
          className="text-gray-600 hover:text-red-400 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
        >
          ×
        </button>
      </td>
    </tr>
  )
}
