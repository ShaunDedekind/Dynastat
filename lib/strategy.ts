import type { RosterPlayer } from '@/lib/join'
import type { Strategy, PlayerRole } from '@/types/strategy'

export const STORAGE_KEY = 'dynastat:strategy'

export const EMPTY_STRATEGY: Strategy = {
  timeline: { stance: 'rebuild', contendYear: 2027 },
  playerRoles: {},
  conditionalReturn: {},
  targets: [],
  constraints: { flagAddsOlderThanContendWindow: true },
}

function normName(s: string): string {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
}

function findId(players: RosterPlayer[], q: string): string | undefined {
  const nq = normName(q)
  return players.find((p) => normName(p.name).includes(nq))?.sleeperId
}

export function buildSeedStrategy(myPlayers: RosterPlayer[]): Strategy {
  const roles: Record<string, PlayerRole> = {}
  const conditional: Record<string, string> = {}

  function set(name: string, role: PlayerRole, ret?: string) {
    const id = findId(myPlayers, name)
    if (!id) return
    roles[id] = role
    if (ret) conditional[id] = ret
  }

  set('cj stroud', 'never_trade')
  set('quinshon judkins', 'never_trade')
  set('jalen milroe', 'never_trade')
  set('brock bowers', 'conditional', 'young RB1 (≤24) or elite WR1 + meaningful pick')
  set('dj moore', 'hold')

  for (const name of [
    "wan'dale robinson",
    'jakobi meyers',
    'andrei iosivas',
    'luke mccaffrey',
    'tez johnson',
    'jalen royals',
    'brenton strange',
  ]) {
    set(name, 'surplus')
  }

  return {
    timeline: { stance: 'rebuild', contendYear: 2027 },
    playerRoles: roles,
    conditionalReturn: conditional,
    targets: [],
    constraints: { maxAcquireAge: 29, flagAddsOlderThanContendWindow: true },
  }
}

// Pure domain helpers — no React, no localStorage, fully testable

export function getPlayerRole(strategy: Strategy, sleeperId: string): PlayerRole | null {
  return strategy.playerRoles[sleeperId] ?? null
}

export function getConditionalReturn(strategy: Strategy, sleeperId: string): string | null {
  return strategy.conditionalReturn[sleeperId] ?? null
}

export function isSurplus(strategy: Strategy, sleeperId: string): boolean {
  return strategy.playerRoles[sleeperId] === 'surplus'
}

export type GivingFlag = {
  type: 'never_trade' | 'conditional'
  sleeperId: string
  playerName: string
  conditionalReturn: string | null
}

export function flagGivingSide(strategy: Strategy, players: RosterPlayer[]): GivingFlag[] {
  const flags: GivingFlag[] = []
  for (const p of players) {
    const role = getPlayerRole(strategy, p.sleeperId)
    if (role === 'never_trade') {
      flags.push({ type: 'never_trade', sleeperId: p.sleeperId, playerName: p.name, conditionalReturn: null })
    } else if (role === 'conditional') {
      flags.push({ type: 'conditional', sleeperId: p.sleeperId, playerName: p.name, conditionalReturn: getConditionalReturn(strategy, p.sleeperId) })
    }
  }
  return flags
}
