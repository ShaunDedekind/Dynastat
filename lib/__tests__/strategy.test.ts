import { describe, it, expect } from 'vitest'
import {
  getPlayerRole,
  getConditionalReturn,
  isSurplus,
  flagGivingSide,
  buildSeedStrategy,
  EMPTY_STRATEGY,
} from '@/lib/strategy'
import type { Strategy } from '@/types/strategy'
import type { RosterPlayer } from '@/lib/join'

function makeStrategy(overrides: Partial<Strategy> = {}): Strategy {
  return { ...EMPTY_STRATEGY, ...overrides }
}

function makePlayer(sleeperId: string, name: string, overrides: Partial<RosterPlayer> = {}): RosterPlayer {
  return {
    sleeperId,
    name,
    position: 'QB',
    nflTeam: 'HOU',
    age: 25,
    value: 8000,
    trend30Day: 0,
    overallRank: null,
    isUntouchable: false,
    isRookie: false,
    injuryStatus: null,
    depthChartOrder: null,
    college: null,
    ...overrides,
  }
}

describe('getPlayerRole', () => {
  it('returns the role for a known sleeperId', () => {
    const s = makeStrategy({ playerRoles: { abc: 'never_trade' } })
    expect(getPlayerRole(s, 'abc')).toBe('never_trade')
  })
  it('returns null for an unknown sleeperId', () => {
    expect(getPlayerRole(EMPTY_STRATEGY, 'unknown')).toBeNull()
  })
  it('returns each role correctly', () => {
    const s = makeStrategy({ playerRoles: { a: 'hold', b: 'surplus', c: 'conditional' } })
    expect(getPlayerRole(s, 'a')).toBe('hold')
    expect(getPlayerRole(s, 'b')).toBe('surplus')
    expect(getPlayerRole(s, 'c')).toBe('conditional')
  })
})

describe('getConditionalReturn', () => {
  it('returns the return text for a conditional player', () => {
    const s = makeStrategy({ conditionalReturn: { abc: 'elite RB1 or two 1sts' } })
    expect(getConditionalReturn(s, 'abc')).toBe('elite RB1 or two 1sts')
  })
  it('returns null when not set', () => {
    expect(getConditionalReturn(EMPTY_STRATEGY, 'abc')).toBeNull()
  })
})

describe('isSurplus', () => {
  it('returns true for surplus players', () => {
    const s = makeStrategy({ playerRoles: { abc: 'surplus' } })
    expect(isSurplus(s, 'abc')).toBe(true)
  })
  it('returns false for hold, never_trade, conditional', () => {
    const s = makeStrategy({ playerRoles: { a: 'hold', b: 'never_trade', c: 'conditional' } })
    expect(isSurplus(s, 'a')).toBe(false)
    expect(isSurplus(s, 'b')).toBe(false)
    expect(isSurplus(s, 'c')).toBe(false)
  })
  it('returns false for unknown players', () => {
    expect(isSurplus(EMPTY_STRATEGY, 'unknown')).toBe(false)
  })
})

describe('flagGivingSide', () => {
  it('flags never_trade players on the giving side', () => {
    const s = makeStrategy({ playerRoles: { p1: 'never_trade' } })
    const flags = flagGivingSide(s, [makePlayer('p1', 'C.J. Stroud')])
    expect(flags).toHaveLength(1)
    expect(flags[0].type).toBe('never_trade')
    expect(flags[0].playerName).toBe('C.J. Stroud')
    expect(flags[0].conditionalReturn).toBeNull()
  })

  it('flags conditional players with their return requirement', () => {
    const s = makeStrategy({
      playerRoles: { p2: 'conditional' },
      conditionalReturn: { p2: 'young RB1 + pick' },
    })
    const flags = flagGivingSide(s, [makePlayer('p2', 'Brock Bowers')])
    expect(flags).toHaveLength(1)
    expect(flags[0].type).toBe('conditional')
    expect(flags[0].conditionalReturn).toBe('young RB1 + pick')
  })

  it('does not flag hold or surplus players on the giving side', () => {
    const s = makeStrategy({ playerRoles: { p3: 'hold', p4: 'surplus' } })
    const players = [makePlayer('p3', 'DJ Moore'), makePlayer('p4', "Wan'Dale Robinson")]
    expect(flagGivingSide(s, players)).toHaveLength(0)
  })

  it('returns empty array when players have no roles set', () => {
    expect(flagGivingSide(EMPTY_STRATEGY, [makePlayer('p99', 'Random Player')])).toHaveLength(0)
  })

  it('handles mixed roster with multiple flag types', () => {
    const s = makeStrategy({
      playerRoles: { nt: 'never_trade', cd: 'conditional', hd: 'hold', sr: 'surplus' },
      conditionalReturn: { cd: 'return text' },
    })
    const players = [
      makePlayer('nt', 'Never'),
      makePlayer('cd', 'Cond'),
      makePlayer('hd', 'Hold'),
      makePlayer('sr', 'Surp'),
    ]
    const flags = flagGivingSide(s, players)
    expect(flags).toHaveLength(2)
    expect(flags.find((f) => f.type === 'never_trade')?.playerName).toBe('Never')
    expect(flags.find((f) => f.type === 'conditional')?.conditionalReturn).toBe('return text')
  })
})

describe('buildSeedStrategy', () => {
  it('assigns never_trade to known core players', () => {
    const players = [
      makePlayer('stroud-id', 'C.J. Stroud', { position: 'QB' }),
      makePlayer('judkins-id', 'Quinshon Judkins', { position: 'RB' }),
      makePlayer('milroe-id', 'Jalen Milroe', { position: 'QB' }),
    ]
    const s = buildSeedStrategy(players)
    expect(s.playerRoles['stroud-id']).toBe('never_trade')
    expect(s.playerRoles['judkins-id']).toBe('never_trade')
    expect(s.playerRoles['milroe-id']).toBe('never_trade')
  })

  it('assigns conditional to Brock Bowers with return text', () => {
    const players = [makePlayer('bowers-id', 'Brock Bowers', { position: 'TE' })]
    const s = buildSeedStrategy(players)
    expect(s.playerRoles['bowers-id']).toBe('conditional')
    expect(s.conditionalReturn['bowers-id']).toContain('RB1')
  })

  it('gracefully skips players not on the roster', () => {
    // Empty roster — no errors, just empty roles
    const s = buildSeedStrategy([])
    expect(Object.keys(s.playerRoles)).toHaveLength(0)
  })
})
