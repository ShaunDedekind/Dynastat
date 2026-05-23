'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import type { RosterPlayer } from '@/lib/join'
import type { BuySellCandidate, TradePartner } from '@/lib/analysis'
import { InjuryBadge, RookieBadge } from '@/components/player-badges'
import type { Strategy } from '@/types/strategy'
import { StrategySchema } from '@/types/strategy'
import { STORAGE_KEY, EMPTY_STRATEGY, getPlayerRole, getConditionalReturn, isSurplus } from '@/lib/strategy'

const AGE_RISK_THRESHOLD = 29

type TradeSide = { players: RosterPlayer[]; picksValue: string }
const EMPTY_SIDE: TradeSide = { players: [], picksValue: '' }

function sideTotal(side: TradeSide) {
  return side.players.reduce((s, p) => s + p.value, 0) + (parseInt(side.picksValue) || 0)
}

function getVerdict(giving: number, receiving: number) {
  if (giving === 0 && receiving === 0) return { label: 'Add players to evaluate', color: 'text-gray-500', arrow: '' }
  if (giving === 0 || receiving === 0) return { label: 'Incomplete', color: 'text-gray-500', arrow: '' }
  const pct = ((receiving - giving) / giving) * 100
  if (pct >= 15) return { label: 'Win', color: 'text-green-400', arrow: '▲' }
  if (pct >= 5) return { label: 'Slight Win', color: 'text-green-600', arrow: '▲' }
  if (pct >= -5) return { label: 'Fair', color: 'text-gray-300', arrow: '●' }
  if (pct >= -15) return { label: 'Slight Loss', color: 'text-red-600', arrow: '▼' }
  return { label: 'Loss', color: 'text-red-400', arrow: '▼' }
}

function SidePanel({
  side, label, strategy, onRemove, onPicksChange,
}: {
  side: TradeSide; label: string; strategy: Strategy
  onRemove: (id: string) => void; onPicksChange: (v: string) => void
}) {
  const total = sideTotal(side)
  const isGiving = label === 'Giving'
  return (
    <div className="bg-gray-900 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</h2>
        <span className="text-sm font-bold tabular-nums">{total > 0 ? (total / 1000).toFixed(1) + 'k' : '—'}</span>
      </div>
      {side.players.length === 0 ? (
        <p className="text-xs text-gray-700 py-1">No players added</p>
      ) : (
        side.players.map((p) => {
          const role = getPlayerRole(strategy, p.sleeperId)
          const condReturn = role === 'conditional' ? getConditionalReturn(strategy, p.sleeperId) : null
          const surplus = isSurplus(strategy, p.sleeperId)
          return (
            <div key={p.sleeperId} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-sm font-medium leading-tight">
                    <span className="truncate">{p.name}</span>
                    {p.isUntouchable && <span className="text-yellow-500 text-xs shrink-0">🔒</span>}
                    {surplus && (
                      <span className="inline-flex items-center text-xs px-1 py-px rounded font-bold leading-none bg-gray-800 text-gray-500 shrink-0">
                        MOVABLE
                      </span>
                    )}
                    <RookieBadge isRookie={p.isRookie} />
                    <InjuryBadge status={p.injuryStatus} />
                  </div>
                  <div className="text-xs text-gray-500">
                    {p.position} · {p.nflTeam ?? 'FA'} · {p.age ? `${p.age}y` : '—'}
                    {label === 'Receiving' && p.age !== null && p.age >= AGE_RISK_THRESHOLD && (
                      <span className="ml-1 text-amber-500">⚠</span>
                    )}
                  </div>
                </div>
                <span className="text-gray-300 tabular-nums text-sm shrink-0">{(p.value / 1000).toFixed(1)}k</span>
                <button
                  onClick={() => onRemove(p.sleeperId)}
                  className="text-gray-600 hover:text-red-400 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center text-lg"
                >×</button>
              </div>
              {isGiving && role === 'never_trade' && (
                <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 rounded px-2 py-1">
                  🚫 Never trade — {p.name}
                </div>
              )}
              {isGiving && role === 'conditional' && (
                <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded px-2 py-1">
                  ⚡ Conditional: {condReturn ?? 'set return requirement in Strategy'}
                </div>
              )}
            </div>
          )
        })
      )}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
        <label className="text-xs text-gray-500 shrink-0">Picks $</label>
        <input
          type="number" value={side.picksValue} onChange={(e) => onPicksChange(e.target.value)}
          placeholder="0" min="0"
          className="w-full bg-gray-800 text-sm rounded px-2 py-1.5 text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[36px]"
        />
      </div>
    </div>
  )
}

type Props = {
  myRoster: RosterPlayer[]
  allPlayers: RosterPlayer[]
  sellCandidates: BuySellCandidate[]
  buyCandidates: BuySellCandidate[]
  tradePartners: TradePartner[]
}

export function TradeEvaluator({ myRoster, allPlayers, sellCandidates, buyCandidates, tradePartners }: Props) {
  const [giving, setGiving] = useState<TradeSide>(EMPTY_SIDE)
  const [receiving, setReceiving] = useState<TradeSide>(EMPTY_SIDE)
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<'giving' | 'receiving'>('receiving')
  const [intelTab, setIntelTab] = useState<'partners' | 'sell' | 'buy'>('partners')
  const [strategy, setStrategy] = useState<Strategy>(EMPTY_STRATEGY)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try { setStrategy(StrategySchema.parse(JSON.parse(raw))) } catch { /* use empty */ }
  }, [])

  const givingTotal = sideTotal(giving)
  const receivingTotal = sideTotal(receiving)
  const diff = receivingTotal - givingTotal
  const verdict = getVerdict(givingTotal, receivingTotal)
  const ageRisks = receiving.players.filter((p) => p.age !== null && p.age >= AGE_RISK_THRESHOLD)

  const addedIds = useMemo(
    () => new Set([...giving.players.map((p) => p.sleeperId), ...receiving.players.map((p) => p.sleeperId)]),
    [giving.players, receiving.players]
  )

  const addToSide = useCallback((player: RosterPlayer, side: 'giving' | 'receiving') => {
    if (addedIds.has(player.sleeperId)) return
    if (side === 'giving') setGiving((prev) => ({ ...prev, players: [...prev.players, player] }))
    else setReceiving((prev) => ({ ...prev, players: [...prev.players, player] }))
  }, [addedIds])

  const addPlayer = useCallback((p: RosterPlayer) => {
    addToSide(p, target)
    setSearch('')
  }, [target, addToSide])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    const pool = q ? allPlayers.filter((p) => p.name.toLowerCase().includes(q))
      : target === 'giving' ? myRoster : []
    return pool.filter((p) => !addedIds.has(p.sleeperId)).slice(0, 10)
  }, [search, target, allPlayers, myRoster, addedIds])

  const getMarkdown = () => {
    const d = receivingTotal - givingTotal
    const sign = d >= 0 ? '+' : ''
    const gStr = giving.players.map((p) => `${p.name} (${(p.value / 1000).toFixed(1)}k)`).join(', ') || '—'
    const rStr = receiving.players.map((p) => `${p.name} (${(p.value / 1000).toFixed(1)}k)`).join(', ') || '—'
    const gPicks = parseInt(giving.picksValue) ? ` + Picks ($${giving.picksValue})` : ''
    const rPicks = parseInt(receiving.picksValue) ? ` + Picks ($${receiving.picksValue})` : ''
    const lines = [
      '# Trade Analysis — Dynastat',
      '',
      `**Giving:** ${gStr}${gPicks}`,
      `**Receiving:** ${rStr}${rPicks}`,
      '',
      `**Verdict:** ${verdict.arrow} ${verdict.label}`,
      `**Values:** ${(givingTotal / 1000).toFixed(1)}k → ${(receivingTotal / 1000).toFixed(1)}k (${sign}${(d / 1000).toFixed(1)}k)`,
    ]
    if (ageRisks.length > 0)
      lines.push('', `**⚠ Timeline risk (2027 window):** ${ageRisks.map((p) => `${p.name} (${p.age})`).join(', ')}`)
    const neverFlags = giving.players.filter((p) => getPlayerRole(strategy, p.sleeperId) === 'never_trade')
    const condFlags = giving.players.filter((p) => getPlayerRole(strategy, p.sleeperId) === 'conditional')
    if (neverFlags.length > 0)
      lines.push('', `**🚫 Never trade:** ${neverFlags.map((p) => p.name).join(', ')}`)
    for (const p of condFlags) {
      const ret = getConditionalReturn(strategy, p.sleeperId)
      lines.push('', `**⚡ Conditional (${p.name}):** ${ret ?? 'set return requirement in Strategy'}`)
    }
    return lines.join('\n')
  }

  const IntelRow = ({ player, reason, trend, side }: { player: RosterPlayer; reason: string; trend?: number; side: 'giving' | 'receiving' }) => {
    const added = addedIds.has(player.sleeperId)
    return (
      <button
        onClick={() => addToSide(player, side)}
        disabled={added}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left min-h-[44px] transition-colors ${added ? 'opacity-40 cursor-default bg-gray-800' : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600'}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium leading-tight">
            <span className="truncate">{player.name}</span>
            <RookieBadge isRookie={player.isRookie} />
            <InjuryBadge status={player.injuryStatus} />
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{reason}</div>
        </div>
        {trend !== undefined && (
          <span className={`text-xs tabular-nums shrink-0 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend.toLocaleString()}
          </span>
        )}
        <span className="text-xs text-gray-500 tabular-nums shrink-0">{(player.value / 1000).toFixed(1)}k</span>
        <span className="text-gray-600 text-sm">{added ? '✓' : '+'}</span>
      </button>
    )
  }

  return (
    <div className="px-3 py-3 max-w-3xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-base">Trade Evaluator</h1>
        <button
          onClick={async () => navigator.clipboard.writeText(getMarkdown())}
          className="min-h-[44px] px-4 py-2 rounded text-sm font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
        >Export MD</button>
      </div>

      {/* Verdict */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
        <span className={`font-bold text-base ${verdict.color}`}>{verdict.arrow} {verdict.label}</span>
        <div className="flex items-center gap-3 text-sm tabular-nums">
          <span className="text-gray-400">{(givingTotal / 1000).toFixed(1)}k → {(receivingTotal / 1000).toFixed(1)}k</span>
          {(givingTotal > 0 || receivingTotal > 0) && (
            <span className={diff >= 0 ? 'text-green-400' : 'text-red-400'}>
              {diff >= 0 ? '+' : ''}{(diff / 1000).toFixed(1)}k
            </span>
          )}
        </div>
      </div>

      {ageRisks.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg px-3 py-2 text-xs text-amber-300">
          ⚠ Timeline risk for 2027 window: {ageRisks.map((p) => `${p.name} (${p.age})`).join(', ')}
        </div>
      )}

      {/* Intelligence */}
      <div className="bg-gray-900 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Intelligence</h2>
          <span className="text-xs text-gray-600">tap to add to trade</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(['partners', 'sell', 'buy'] as const).map((tab) => (
            <button key={tab} onClick={() => setIntelTab(tab)}
              className={`py-1.5 rounded text-xs font-medium min-h-[36px] transition-colors ${intelTab === tab ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab === 'partners' ? 'Trade Targets' : tab === 'sell' ? '▲ Sell High' : '▼ Buy Low'}
            </button>
          ))}
        </div>

        {intelTab === 'partners' && (
          <div className="space-y-3">
            {tradePartners.length === 0 ? (
              <p className="text-xs text-gray-600 px-1">No strong positional matches — your needs and their surpluses don&apos;t align yet</p>
            ) : tradePartners.map((partner) => (
              <div key={partner.rosterId} className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/team/${partner.rosterId}`} className="text-sm font-medium hover:underline">
                      {partner.teamName}
                    </Link>
                    <span className="text-xs text-gray-500">#{partner.rank}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    has {partner.surplusPositions.join('/')} to offer
                  </span>
                </div>
                {partner.topPlayers.map((p) => (
                  <IntelRow key={p.sleeperId} player={p} reason={`${p.position} · ${p.nflTeam ?? 'FA'} · ${p.age ?? '?'}y`} side="receiving" />
                ))}
              </div>
            ))}
          </div>
        )}

        {intelTab === 'sell' && (
          <div className="space-y-1">
            {sellCandidates.length === 0 ? (
              <p className="text-xs text-gray-600 px-1">No sell candidates — aging players aren&apos;t rising right now</p>
            ) : sellCandidates.map(({ player, reason }) => (
              <IntelRow key={player.sleeperId} player={player} reason={reason} trend={player.trend30Day} side="giving" />
            ))}
          </div>
        )}

        {intelTab === 'buy' && (
          <div className="space-y-1">
            {buyCandidates.length === 0 ? (
              <p className="text-xs text-gray-600 px-1">No buy candidates found</p>
            ) : buyCandidates.map(({ player, reason }) => (
              <IntelRow key={player.sleeperId} player={player} reason={reason} trend={player.trend30Day} side="receiving" />
            ))}
          </div>
        )}
      </div>

      {/* Sides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SidePanel side={giving} label="Giving" strategy={strategy}
          onRemove={(id) => setGiving((prev) => ({ ...prev, players: prev.players.filter((p) => p.sleeperId !== id) }))}
          onPicksChange={(v) => setGiving((prev) => ({ ...prev, picksValue: v }))}
        />
        <SidePanel side={receiving} label="Receiving" strategy={strategy}
          onRemove={(id) => setReceiving((prev) => ({ ...prev, players: prev.players.filter((p) => p.sleeperId !== id) }))}
          onPicksChange={(v) => setReceiving((prev) => ({ ...prev, picksValue: v }))}
        />
      </div>

      {/* Search */}
      <div className="bg-gray-900 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {(['giving', 'receiving'] as const).map((side) => (
            <button key={side} onClick={() => { setTarget(side); setSearch('') }}
              className={`py-2.5 rounded text-sm font-medium min-h-[44px] capitalize transition-colors ${target === side ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >+ {side === 'giving' ? 'Giving' : 'Receiving'}</button>
          ))}
        </div>
        <input
          type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={target === 'giving' ? 'Search (blank = my roster)…' : 'Search all 12 rosters…'}
          className="w-full bg-gray-800 rounded px-3 py-2.5 text-sm min-h-[44px] focus:outline-none focus:ring-1 focus:ring-blue-600"
          autoComplete="off" autoCorrect="off" spellCheck={false}
        />
        {searchResults.length > 0 && (
          <div className="rounded overflow-hidden divide-y divide-gray-800/50">
            {searchResults.map((p) => (
              <button key={p.sleeperId} onClick={() => addPlayer(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-left min-h-[44px] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span>{p.name}</span>
                    {p.isUntouchable && <span className="text-yellow-500 text-xs">🔒</span>}
                    <RookieBadge isRookie={p.isRookie} />
                    <InjuryBadge status={p.injuryStatus} />
                  </div>
                  <span className="text-xs text-gray-500">{p.position} · {p.nflTeam ?? 'FA'} · {p.age ? `${p.age}y` : '—'}</span>
                </div>
                <span className="text-sm text-gray-300 tabular-nums shrink-0">{(p.value / 1000).toFixed(1)}k</span>
              </button>
            ))}
          </div>
        )}
        {!search && target === 'receiving' && <p className="text-xs text-gray-600 px-1">Type to search all 12 rosters</p>}
        {search && searchResults.length === 0 && <p className="text-xs text-gray-600 px-1">No players found</p>}
      </div>
    </div>
  )
}
