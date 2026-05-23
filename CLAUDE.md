# Dynastat

Personal dynasty fantasy football dashboard. Single user, forever — no auth, no onboarding, no multi-user anything.

Two equal jobs: (1) make roster/trade decisions in-app fast, (2) export clean markdown I paste into a Claude chat for deeper analysis.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Native fetch with `next: { revalidate }` — no database, no cron for v1
- Deploy target: Vercel

## League constants

- League ID: `1314357948058718208`
- Format: 12-team, half-PPR, 1QB dynasty, Sleeper
- My roster ID: `3` (owner: shaundedekind, team "Shaun's Forever Team")
- Starting lineup: QB, RB, RB, WR, WR, WR, TE, FLEX, FLEX
- My untouchables: Brock Bowers, C.J. Stroud, DJ Moore, Jalen Milroe
- My archetype: young rebuild, 2-year contention window (2027). Bias young over old.

## Data sources

1. **Sleeper** (free, no auth)
   - League: `https://api.sleeper.app/v1/league/1314357948058718208`
   - Rosters: `https://api.sleeper.app/v1/league/1314357948058718208/rosters`
   - Users: `https://api.sleeper.app/v1/league/1314357948058718208/users`
   - Players: `https://api.sleeper.app/v1/players/nfl` (~5MB — cache 24h)

2. **FantasyCalc** (free, no auth)
   - `https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=0.5`
   - Join key: `fcPlayer.player.sleeperId` → Sleeper player ID string
   - Direct join, no fuzzy matching, no name comparison

## Cache strategy

- Sleeper `/players/nfl`: `revalidate: 86400` (24h — player metadata barely changes)
- Everything else: `revalidate: 21600` (6h)
- Goal: stale-while-revalidate, never block a render

## Design principles (non-negotiable)

### DENSITY is the feature
Dense tables > cards > hero sections. Hero sections don't exist.
- Tabular numerals, right-aligned values
- Deltas: green/red/gray, always paired with sign (+/-) or arrow — never color as sole signal

### MOBILE is a peer surface, not a subset
- One-handed thumb-usable on every view
- NO horizontal scroll, ever
- 44px minimum tap targets
- Export button in a persistent, consistent position on every screen
- Bus test: usable one-handed, on a moving bus, in 20s, then paste into Claude

### BORING tech
- HTML tables are tables — not `<div>` grids
- No virtualized lists for 12 teams
- No skeleton loaders for fast fetches
- No animation except ~100ms fade on data refresh

### STATE is visible
- Show data freshness in header ("values: 6h ago")
- Never hide staleness behind a spinner

### OPINIONS baked in
- Flag untouchables on their row (lock icon or marker)
- Flag timeline-violating trades (players too old for 2027 contention window)

## Screens (priority order)

1. **Power rankings** — all 12 teams by total roster value, per-position breakdown, avg age, my team highlighted
2. **My team** — roster grouped by position, value + age + 30-day trend, markdown export
3. **Trade evaluator** — two sides, searchable add, live value sum + diff + verdict. Picks are manual value entries. Flag rebuild-violating trades.
4. **Trending** — players sorted by `|trend30Day|`, biggest movers up/down

## Export contract

Every meaningful view has an export button → copies paste-ready markdown to clipboard. One tap, no share sheet. Button shows "Copied (N chars)" confirmation for 2s.

## DB seam

`lib/join.ts → buildTeamRosters()` is the insertion point for season-long persistence.
FantasyCalc only provides 30-day trends — a DB here enables full-season value history.
See the comment block in that function for the exact swap.

## Nav

- Desktop: fixed top bar (h-12)
- Mobile: fixed bottom bar (h-16), thumb zone
- Content area: `md:pt-12 pb-16 md:pb-0`

## Strategy layer
Strategy is STRUCTURED, EDITABLE data — not hardcoded constants. Persisted
client-side (localStorage for v1; the DB seam covers it later). Replaces the
flat "untouchables" line above with tiered player roles.

### Schema (types/strategy.ts)
- timeline: { stance: 'rebuild'|'consolidate'|'contend', contendYear: number }
- playerRoles: Record<sleeperId, 'never_trade'|'conditional'|'hold'|'surplus'>
    - never_trade: never appears in an outgoing suggestion; hard-flag if added
    - conditional: tradeable only for a defined return (see conditionalReturn)
    - hold: keep by default, but not sacred — soft-flag, don't block
    - surplus: actively shopping; highlight in evaluator as "movable"
- conditionalReturn: Record<sleeperId, string>  // free-text return requirement,
    shown to me in evaluator. NOT machine-enforced — I judge it.
- targets: ordered [{ sleeperId? , position?, maxAge, note }]
- constraints: { maxAcquireAge?: number, flagAddsOlderThanContendWindow: bool }

### How the evaluator uses it
- Adding a never_trade player to the outgoing side → hard red flag.
- Adding a conditional player → show its conditionalReturn requirement inline.
- Acquiring a player older than contendYear window → timeline flag (existing behavior).
- A surplus player on either side → subtle "movable" marker.
The evaluator still only shows values, diffs, flags. It does NOT recommend or
rank trades. Judgment stays in the Claude chat. No trade auto-finder in v1.

### Current strategy values (seed defaults)
- timeline: rebuild, 2027
- never_trade: C.J. Stroud, Quinshon Judkins, Jalen Milroe
- conditional: Brock Bowers → "young RB1 (≤24) or elite WR1 + meaningful pick"
- hold: DJ Moore (29 — last productive year, sell-eligible if offer is strong)
- surplus: Wan'Dale Robinson, Jakobi Meyers, Andrei Iosivas, Luke McCaffrey,
    Tez Johnson, Jalen Royals, Brenton Strange
