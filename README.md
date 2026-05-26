# Dynastat

Personal dynasty fantasy football dashboard. Single-user, single-league, built to make roster and trade decisions fast and export clean markdown for deeper analysis in Claude.

---

## What it does

Six screens, all dense tables, all exportable to markdown. Zero auth, zero database, zero onboarding.

| Screen | Path | Purpose |
|--------|------|---------|
| Power Rankings | `/power-rankings` | All 12 teams ranked by total dynasty value. Per-position breakdown, avg age, injury count. Click any team to drill into their full roster. |
| My Team | `/my-team` | My roster grouped by position. Value, age, 30-day trend, 7-day delta (via Vercel KV snapshots). |
| Lineup | `/lineup` | Optimal starting lineup (QB/RB×2/WR×3/TE/FLEX×2) by dynasty value or weekly projection. Toggles between methods. Off-season degrades gracefully. |
| Trade | `/trade` | Two-sided trade evaluator with live value diff and verdict. Intelligence panel: Trade Targets / Sell High / Buy Low. Strategy flags wired in. |
| Strategy | `/strategy` | Editable doctrine — timeline stance, player roles (Never Trade / Conditional / Hold / Surplus), acquisition targets, constraints. Persists to localStorage. |
| Trending | `/trending` | All rostered players ranked by absolute 30-day value movement. |

---

## Architecture

**Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v3, Vercel.

**Data fetching:** Native `fetch` with `next: { revalidate }` — no database, no cron. ISR serves stale-while-revalidating.

```
Sleeper API  ──►  lib/sleeper.ts      (rosters, users, players, NFL state, projections)
FantasyCalc  ──►  lib/fantasycalc.ts  (dynasty values, 30-day trends, overallRank)
                  lib/join.ts          buildTeamRosters() — the single join point
                  lib/analysis.ts      trade intelligence (sell/buy/partner scoring)
                  lib/lineup.ts        pure optimizeLineup() — no React deps
                  lib/projections.ts   NFL state + weekly projection fetches
                  lib/snapshot.ts      Vercel KV snapshots for 7-day delta
                  lib/strategy.ts      pure domain helpers — role lookup, flag eval
```

**Page pattern:** every route is a server component that fetches, transforms, and passes serialized props to a single client component.

```
app/[screen]/page.tsx              server — fetch, transform, notFound guard
  └─ components/[screen]-view.tsx  client — state, interaction, export
```

**Cache TTLs:**

| Endpoint | TTL | Reason |
|----------|-----|--------|
| Sleeper `/players/nfl` | 24h | ~5MB, metadata barely changes |
| Rosters, FC values, users | 6h | Core dynasty values |
| NFL state + projections | 1h | Weekly relevance |

---

## Data sources

Both free, no auth required.

- **Sleeper** — rosters, player metadata (age, injury, depth chart, college, years_exp), NFL state, weekly projections
- **FantasyCalc** — dynasty values, 30-day trends, overall dynasty rank. Joined to Sleeper on `sleeperId` — direct key join, no fuzzy name matching

**League:** `1314357948058718208` — 12-team, half-PPR, 1QB dynasty. My roster ID: `3`.

---

## Key files

| File | Role |
|------|------|
| `lib/join.ts` | `buildTeamRosters()` — canonical Sleeper + FantasyCalc join. DB seam is here. |
| `lib/constants.ts` | League ID, my roster ID, scored positions, untouchable name normalisation |
| `types/strategy.ts` | Zod-validated schema for the full strategy object |
| `lib/strategy.ts` | Pure domain helpers — `getPlayerRole`, `flagGivingSide`, `buildSeedStrategy` |
| `lib/lineup.ts` | Pure `optimizeLineup(players, method)` — greedy slot-fill |
| `lib/projections.ts` | `fetchNFLState()` + `fetchProjections()` + half-PPR scoring formula |
| `lib/snapshot.ts` | Vercel KV write/read for week-over-week value delta |
| `lib/analysis.ts` | `getSellCandidates`, `getBuyCandidates`, `getTradeTargets` |
| `components/roster-view.tsx` | Shared roster table (My Team + team drill-down) |
| `components/player-badges.tsx` | `InjuryBadge`, `RookieBadge`, `StarterDot` — shared everywhere |
| `components/trade-evaluator.tsx` | Full trade UI, reads strategy from localStorage on mount |
| `components/strategy-view.tsx` | Full strategy editor, persists to localStorage |
| `components/nav.tsx` | `TABS` array — add one entry to add a nav tab |

---

## Strategy layer

Persisted in `localStorage` under key `dynastat:strategy`. Seeds from defaults in `CLAUDE.md` on first load.

```typescript
{
  timeline: { stance: 'rebuild' | 'consolidate' | 'contend', contendYear: number }
  playerRoles: Record<sleeperId, 'never_trade' | 'conditional' | 'hold' | 'surplus'>
  conditionalReturn: Record<sleeperId, string>   // shown inline in trade evaluator
  targets: Array<{ id, sleeperId?, position?, maxAge?, note }>
  constraints: { maxAcquireAge?, flagAddsOlderThanContendWindow }
}
```

The trade evaluator reads strategy on mount:
- 🚫 **Never Trade** — hard red flag on giving side
- ⚡ **Conditional** — amber inline note with your return requirement
- **MOVABLE** — gray badge on surplus players on either side

---

## Tests

```bash
npm test    # vitest — lineup + strategy domain layer (35 tests, zero network)
```

---

## Running locally

```bash
npm install
npm run dev    # → http://localhost:3000
```

Vercel KV is optional — the 7-day delta column shows `—` if `KV_REST_API_URL` is unset. Everything else works without it.

---

## DB seam

`lib/join.ts → buildTeamRosters()` is the right insertion point for a persistent store. FantasyCalc only gives 30-day trends — a DB here unlocks full-season value history. The `types/strategy.ts` schema is already DB-ready: same shape works as a single-row user record.
