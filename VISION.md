# Dynastat — Product Vision & UX Roadmap

## The one-sentence version

A personal dynasty command centre: fast enough to use on a bus, dense enough to replace a spreadsheet, smart enough to paste into Claude for the actual thinking.

---

## The two jobs

**Job 1 — In-app decisions (seconds):** Open the app, get a read on a trade or waiver, decide. The data is always there, always fresh enough, always in a format I can scan in 10 seconds. No login, no loading screen, no onboarding.

**Job 2 — Claude handoff (one tap):** Every meaningful view has an Export MD button. One tap copies paste-ready markdown. I paste it into a Claude chat, type my question, and get the analysis. The app is the data layer; Claude is the reasoning layer. This division of labour is permanent — Dynastat will never try to recommend, rank, or advise. It will only show, flag, and export.

---

## What's built (as of May 2026)

All six screens are functional. The core loop works end to end.

| Screen | Status | Notes |
|--------|--------|-------|
| Power Rankings | ✅ Done | Clickable team drill-down, per-position values, injury count |
| My Team | ✅ Done | 7-day delta (Vercel KV), 30-day trend, badges |
| Lineup | ✅ Done | Value + projection toggle, off-season degradation, unit-tested |
| Trade | ✅ Done | Intelligence panel (sell/buy/targets), strategy flags |
| Strategy | ✅ Done | Editable doctrine, localStorage persist, trade evaluator wired |
| Trending | ✅ Done | Biggest 30-day movers up and down |

The data layer is solid: Sleeper + FantasyCalc joined cleanly, cached correctly, badges and enrichment in place, week-over-week snapshots via Vercel KV.

---

## Known UX debt

### Navigation is too crowded on mobile
Six tabs in the bottom bar is one too many. At 375px that's ~62px per tab — workable but tight, especially with "Strategy" (8 chars) and "Trending" (8 chars). 

**Options (pick one when we touch the nav):**
1. **Collapse Trending into My Team** — "My Team" tab gets a sub-toggle: Roster / Trending. Trending is really just a different sort of my players anyway.
2. **Move Strategy to a settings-style entry point** — a gear icon or footer link, since it's set-once-and-forget rather than daily-use. This would drop back to 5 tabs: Rankings / My Team / Lineup / Trade / Trending.
3. **Tab groups on desktop, icon-only on mobile** — text labels on desktop top bar, icon-only on mobile bottom bar (requires icon design work).

### Player autocomplete is roster-scoped, not league-wide
The trade evaluator and targets search only covers ~300 players (12 rosters). Great for most use cases, but if I want to add a free agent target or a player from outside the league, they won't appear.

**Fix:** Pass the full FantasyCalc value list (~1,500 scored players) as the search pool on the trade and strategy pages. Already cached at 6h.

### No visual hierarchy between "starred" and "background" info
Every row shows the same weight of information. A starting RB1 and a bye-week handcuff look identical in the table.

**Fix:** The `StarterDot` badge is already there (green ● for depth_chart_order === 1). Could also bold the top-3 valued players per position in the rankings view.

### Freshness UX is technically correct but hard to notice
"values: 6h ago" is in the nav header — correct but small. If data is very stale (e.g. cached from yesterday after a long ISR outage), there's no escalation.

**Fix:** If freshness > 12h, change the color to amber. If > 24h, red. Already have the `useFreshness` hook; just need a color switch.

### Export button placement is inconsistent
My Team, Lineup, and Strategy each have their own export button wired correctly. Trade evaluator has an inline "Export MD" button. The export button style is standardised (`ExportButton` component) but position varies page to page.

**Fix:** Codify position: always top-right of the page header, always `shrink-0`. Already mostly true — just needs a final pass.

### Mobile: Lineup two-column layout collapses too aggressively
On mobile, starters and bench stack. The starters table is fine; the bench table is very long (15+ players). No pagination, no collapse.

**Fix:** Add a "Show bench" toggle that defaults to collapsed on mobile. Bench is less important than starters — hiding it reduces scroll length significantly.

### Strategy screen: no confirmation or undo
Deleting a target or changing a role is immediate and permanent (only localStorage). Accidental changes are easy to make, hard to notice.

**Fix:** Either a 2-second undo toast ("Role changed — undo"), or add a "Reset to defaults" button that re-seeds from CLAUDE.md values.

---

## What's next (rough priority order)

### Tier 1 — UX polish (the app is functional; make it feel good)
- [ ] Fix the mobile nav — collapse to 5 tabs (move Strategy to secondary)
- [ ] Lineup bench collapse on mobile
- [ ] Freshness color escalation
- [ ] Full FC player list for trade/strategy search scope
- [ ] Strategy undo / reset-to-defaults

### Tier 2 — Data depth (the app is good; make it smarter)
- [ ] **Season-long value history** — the DB seam in `lib/join.ts` is built; just needs a Postgres/Supabase table. Unlocks real charting: value trajectory per player since draft.
- [ ] **Trade history log** — record trades you evaluated, with verdict and outcome. Paste into Claude at season end: "here are 12 trades I faced — how did my decision-making hold up?"
- [ ] **Waiver wire view** — show all unrostered FantasyCalc-valued players. Same table density as Trending.
- [ ] **Draft board mode** — rookie/devy draft season tool. Sort all incoming players by value, tag as targeted/avoided.

### Tier 3 — Intelligence (the app is smart; sharpen the edges)
- [ ] **Cross-strategy validation** — when you change a player's role in Strategy, highlight any open trades in the evaluator that conflict with the new role.
- [ ] **Target hit tracker** — if a player in your Targets list is available on the waiver wire or offered in a trade, surface that automatically.
- [ ] **Age-out alerts** — for Hold players, show a projected "last useful season" based on the contend year and their current age.

### Non-goals (permanent)
- Trade recommendations or ranking ("you should take this trade")
- Auto-draft suggestions
- Multi-user / league-wide analysis
- Notifications or push alerts
- Any feature that can't be explained in one sentence

---

## Design principles (condensed)

The full set lives in `CLAUDE.md`. The ones that matter most in practice:

**Density over space.** If a table cell can hold two pieces of information (name + position subtext), it should. No cards. No hero sections. No whitespace for its own sake.

**Mobile is equal, not secondary.** Every feature works one-handed at arm's length. Tap targets ≥ 44px. No horizontal scroll. If something is hard to do on mobile, that's a design bug, not a mobile limitation.

**Export is the product.** The markdown exports are what make this app uniquely useful. Every screen should ask: "if I paste this into Claude, is it exactly what I need?" If yes, the screen is done. If not, the screen needs more work.

**Claude does the thinking.** Dynastat surfaces data and flags. It does not recommend trades, rank players beyond what FantasyCalc provides, or make decisions. The judgment layer is the Claude chat. Preserve this boundary.
