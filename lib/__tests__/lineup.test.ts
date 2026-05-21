import { describe, it, expect } from 'vitest'
import { optimizeLineup } from '@/lib/lineup'
import type { LineupPlayer } from '@/lib/lineup'

function p(
  sleeperId: string,
  position: string,
  value: number,
  overrides: Partial<LineupPlayer> = {}
): LineupPlayer {
  return {
    sleeperId,
    name: `Player ${sleeperId}`,
    position,
    nflTeam: 'KC',
    age: 25,
    value,
    trend30Day: 0,
    overallRank: null,
    isUntouchable: false,
    isRookie: false,
    injuryStatus: null,
    depthChartOrder: null,
    college: null,
    projectedPoints: null,
    hasProjection: false,
    isLineupIneligible: false,
    ...overrides,
  }
}

describe('optimizeLineup value method', () => {
  it('fills all 9 slots with highest-value players and bench sorted desc', () => {
    const players: LineupPlayer[] = [
      p('qb1', 'QB', 8000),
      p('qb2', 'QB', 3000),
      p('rb1', 'RB', 7500),
      p('rb2', 'RB', 6000),
      p('rb3', 'RB', 4500),
      p('wr1', 'WR', 7000),
      p('wr2', 'WR', 6500),
      p('wr3', 'WR', 5000),
      p('wr4', 'WR', 4800),
      p('te1', 'TE', 5500),
      p('te2', 'TE', 2000),
      p('k1', 'K', 500),
    ]
    const result = optimizeLineup(players, 'value')

    expect(result.starters).toHaveLength(9)
    expect(result.starters.map((s) => s.slot)).toEqual([
      'QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX1', 'FLEX2',
    ])

    expect(result.starters.find((s) => s.slot === 'QB')?.player?.sleeperId).toBe('qb1')
    expect(result.starters.find((s) => s.slot === 'TE')?.player?.sleeperId).toBe('te1')

    // FLEX: wr4 (4800) and rb3 (4500) — best remaining flex-eligible
    const flexIds = result.starters
      .filter((s) => s.slot === 'FLEX1' || s.slot === 'FLEX2')
      .map((s) => s.player?.sleeperId)
    expect(flexIds).toContain('wr4')
    expect(flexIds).toContain('rb3')

    const benchIds = result.bench.map((bp) => bp.sleeperId)
    expect(benchIds).toContain('qb2')
    expect(benchIds).toContain('te2')
    expect(benchIds).toContain('k1')

    // Bench sorted descending by value
    for (let i = 0; i < result.bench.length - 1; i++) {
      expect(result.bench[i].value).toBeGreaterThanOrEqual(result.bench[i + 1].value)
    }

    expect(result.totalProjectedPoints).toBeNull()
  })
})

describe('optimizeLineup thin roster', () => {
  it('leaves RB2 null and fills FLEX from leftover WR and TE', () => {
    // 4 WRs and 2 TEs: after WR1/WR2/WR3 and TE are filled, wr4 and te2 are left for FLEX
    const players: LineupPlayer[] = [
      p('qb1', 'QB', 8000),
      p('rb1', 'RB', 7000),  // only RB -- fills RB1, RB2 stays null
      p('wr1', 'WR', 6000),
      p('wr2', 'WR', 5500),
      p('wr3', 'WR', 4000),
      p('wr4', 'WR', 3000),  // competes for FLEX after WR1/2/3 are taken
      p('te1', 'TE', 4500),
      p('te2', 'TE', 3200),  // competes for FLEX after TE is taken
    ]
    const result = optimizeLineup(players, 'value')

    expect(result.starters).toHaveLength(9)
    expect(result.starters.find((s) => s.slot === 'RB2')?.player).toBeNull()

    // FLEX: te2 (3200) and wr4 (3000)
    const flexIds = result.starters
      .filter((s) => s.slot === 'FLEX1' || s.slot === 'FLEX2')
      .map((s) => s.player?.sleeperId)
    expect(flexIds).toContain('te2')
    expect(flexIds).toContain('wr4')

    expect(result.starters.find((s) => s.slot === 'RB1')?.player?.sleeperId).toBe('rb1')
    expect(result.bench.map((bp) => bp.sleeperId)).not.toContain('rb1')
  })
})

describe('optimizeLineup projection method fallback', () => {
  it('prefers projected players over high-value no-proj players for FLEX', () => {
    // After dedicated slots are filled: rb3 (no proj) and te2/wr4 (projected) compete for FLEX
    // te2 (7.0) and wr4 (8.0) should win FLEX over rb3 (-Infinity projection)
    const players: LineupPlayer[] = [
      p('qb1', 'QB', 8000, { projectedPoints: 22.0, hasProjection: true }),
      p('rb1', 'RB', 7000, { projectedPoints: 18.0, hasProjection: true }),
      p('rb2', 'RB', 6000, { projectedPoints: 12.0, hasProjection: true }),
      p('wr1', 'WR', 7500, { projectedPoints: 15.0, hasProjection: true }),
      p('wr2', 'WR', 6500, { projectedPoints: 11.0, hasProjection: true }),
      p('wr3', 'WR', 5000, { projectedPoints: 9.0, hasProjection: true }),
      p('te1', 'TE', 5500, { projectedPoints: 10.0, hasProjection: true }),
      // Extra projected players for FLEX — should beat rb3 (no proj)
      p('wr4', 'WR', 2000, { projectedPoints: 8.0, hasProjection: true }),
      p('te2', 'TE', 1000, { projectedPoints: 7.0, hasProjection: true }),
      // High value but no projection — should lose FLEX to wr4 and te2
      p('rb3', 'RB', 9000, { projectedPoints: null, hasProjection: false }),
    ]
    const result = optimizeLineup(players, 'projection')

    const flexIds = result.starters
      .filter((s) => s.slot === 'FLEX1' || s.slot === 'FLEX2')
      .map((s) => s.player?.sleeperId)
    expect(flexIds).toContain('wr4')
    expect(flexIds).toContain('te2')
    expect(flexIds).not.toContain('rb3')

    expect(result.bench.map((bp) => bp.sleeperId)).toContain('rb3')
    expect(result.totalProjectedPoints).not.toBeNull()
  })
})
