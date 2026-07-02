# Implementation Plan: Remaining Tasks (post-C1/C2/W9)

Branch: `simplification/phase-1`. Preflight (typecheck + lint + 624 tests) is green right now. C1, C2, W9 fixes are uncommitted in working tree and are NOT in scope here.

> **Revision 2 (2026-05-12):** Plan amended after live UI testing (S1-A) and double-check (S2-A, S2-B) surfaced findings missing from v1: a structural Stooq failure (P0 below), a broken `/api/price-on-date` lookup, and three smaller bugs. Added P0 section + Task 5.5 + Task 6.5; deferred two dev-only artifacts.

## P0 — Stooq data source is captcha-gated (UPSTREAM of C4)

**Discovered during double-check.** `curl https://stooq.com/q/d/l/?s=SQQQ.US&i=d` now returns a CAPTCHA prompt page instead of CSV. Stooq has gated their bulk historical endpoint behind anti-bot. Per `CLAUDE.md` it is the documented PRIMARY data source — currently **fully non-functional for historical**. The codebase silently degrades to Yahoo for everything historical; Yahoo then 429s under load; the 429 cascades to `generateDemoHistoricalData()`, surfacing fake prices to the user.

This is upstream of C4. Without fixing it, C4 reappears after every cache expiry even if all symptom-fixes ship.

**Options (pick one before Task 3):**
- (a) Acquire a Stooq API key — *if Stooq offers a paid tier*. Web searches don't surface a documented Stooq paid API; this needs to be verified by contacting Stooq or checking stooq.com/db/ directly. If a tier exists, add `&t=<key>` to the historical URL. ~3 LOC if so.
- (b) Replace Stooq primary with a different free source (e.g., Alpaca historical, Polygon free tier, Tiingo). 1–2 days of integration. **Realistic default.**
- (c) Accept Yahoo as the only source and harden against 429 (rotate user-agents, longer backoff). Yahoo's free unlimited rate is unreliable. NOT recommended.

**Recommend: investigate (a) first** — if confirmed available, lowest touch. If Stooq has no paid tier (the most likely outcome based on current public info), fall back to **(b)** and pick one of Alpaca / Polygon / Tiingo based on rate limits and API ergonomics.

**Verification:**
- If a Stooq paid tier exists: `curl 'https://stooq.com/q/d/l/?s=SQQQ.US&i=d&t=<your-key>'` returns CSV with valid OHLCV rows.
- If you go with (b): same CSV/JSON validation against the new source's endpoint.

## Current state verification

- **C3** confirmed at `src/hooks/useMarketData.ts:89-93` — three endpoints in `Promise.all`, one 5xx fails all three.
- **C4** confirmed: `DEMO_FALLBACK_QUOTES` at `src/lib/market-data/client.ts:266-299`; demo historical generator at `src/lib/market-data/client.ts:315-371` (used at lines 1114-1117 and 1182-1185); UI literals at `src/hooks/useDashboard.ts:194-196` (`17.2 / 53.37 / 69.97`).
- **C5** confirmed at `src/lib/market-data/client.ts:439-451`. The code comment explicitly admits "Stooq doesn't provide previous close, estimate from open". This means `change`/`changePercent` are intraday OHLC numbers, not day-over-day deltas.
- **C6** confirmed across all 6 route files in `src/app/api/*/route.ts` — every route returns `error: error.message` to the client.
- **W1** confirmed: `@prisma/client`, `prisma`, `plotly.js` (runtime), `FINNHUB_API_KEY` env stub all present. No `@prisma/client` or `PrismaClient` imports anywhere in `src/`; no `FINNHUB` usage anywhere; `plotly.js` is used only for `import type` (so it could move to devDeps via `@types/plotly.js` — verify the types package suffices).
- **W2** confirmed: `logs/` is git-tracked, `.gitignore` does NOT exclude `logs/`. Three log files committed.
- **W3** confirmed at `src/lib/market-data/client.ts:1249-1272` — weekday + hour check only; no holiday list.
- **W4** confirmed at `src/components/charts/BaseChart.tsx:88, 101, 113` — `h-[${height}px]` won't generate non-default Tailwind classes.
- **W5** confirmed at `src/hooks/useMarketData.ts:83-130` — no cancellation on unmount. Note: React docs actually recommend an `ignore` flag (simpler) over `AbortController` for the race condition / stale-response problem. This is the cheaper fix.
- **W6** confirmed: `src/lib/market-data/client.ts` = 1286 lines, mixing Stooq, FRED, Yahoo, retry, logging, error classification, market-hours, demo data, caching.
- **W7** confirmed: `useDashboard` returns 38 keys (not 23 — review undercount); `LeftColumnProps` = 17 fields, `RightColumnProps` = 17 fields.
- **W8** confirmed: `SymbolData` (×2 — `useMarketData.ts:19` and `entryScore.ts:21`), `MarketData` (×2 — same files), `HistoricalDataPoint` (×2 — `useMarketData.ts:35` and `client.ts:230`), `EntryScore` (×2 — `useMarketData.ts:50` and `entryScore.ts:43`). Review said "3+ files" but it's actually 2 per type. Still worth deduping.
- **W10** confirmed: `backend/utils.py` is the only file in `backend/` (besides `__pycache__`). Orphan.
- **W11** confirmed: `VERIFICATION_REPORT.md`, `VERIFICATION_SUMMARY.md`, `VERIFICATION_EXECUTIVE_SUMMARY.txt`, `QA_DOCUMENTS_INDEX.md`, `QA_VERIFICATION_COMPLETE.md`, `README_QA_VERIFICATION.md`, `STOOQ_INTEGRATION_GUIDE.md` all at root.

## Suggested order

P0 first (otherwise critical fixes paper over a fundamentally broken data pipeline), then cleanup, then critical fixes, then small correctness fixes, then optional refactors. Specifically:

0. **P0 — Stooq data source** (above). Unblocks everything downstream.
1. **Cleanup batch** (W1, W2, W10, W11) — pure deletions / config edits; touches no runtime logic. One commit. Reduces noise for the rest.
2. **Critical correctness fixes** (C5, C4, C6, C3) — order matters: C5 (wrong math) → C4 (lying fallback) → C6 (info leak) → C3 (resilience). Each is its own commit. After this batch you've shipped real user-facing improvements. W5 (`ignore` flag) folds naturally into the C3 commit (same file).
3. **Task 5.5** — price-on-date 404 + stale positions + actualDate desync. Lands after C3 because it touches the same hook/error-state surface.
4. **W3** — small correctness fix. Standalone.
5. **W4** — small isolated fix. Standalone.
6. **Task 7.5** — ●ACTIVE badge state propagation. Standalone cosmetic.
7. **W8 / W7 / W6 refactors** — defer. Do W8 (cheap, mechanical) if you want a quick win; defer W6 + W7 to a separate "post-simplification refactor" branch. They are LARGE changes that risk re-opening the review surface.

## Tasks

### Task 1: Cleanup batch — type: cleanup

- **Items addressed:** W1, W2, W10, W11
- **Files:**
  - `package.json:20-22, 42` — remove `@prisma/client`, `prisma`, runtime `plotly.js` (keep `@types/plotly.js` in devDeps)
  - `.env.local.example` — delete file (FINNHUB never used) OR replace contents with a comment if you want to keep the file
  - `.gitignore` — add `logs/` and `*.log`
  - `logs/auto-track.log`, `logs/mirrorstrategy.log`, `logs/mirrorstrategy_error.log` — `git rm --cached` then delete on disk
  - `backend/utils.py`, `backend/__pycache__/` — delete; the entire `backend/` dir becomes empty
  - Root markdowns to delete: `VERIFICATION_REPORT.md`, `VERIFICATION_SUMMARY.md`, `VERIFICATION_EXECUTIVE_SUMMARY.txt`, `QA_DOCUMENTS_INDEX.md`, `QA_VERIFICATION_COMPLETE.md`, `README_QA_VERIFICATION.md`, `STOOQ_INTEGRATION_GUIDE.md`
- **Approach:**
  - Verify nothing imports `@prisma/client`, `prisma`, `plotly.js` (runtime), or reads `FINNHUB_API_KEY` (grep confirmed clean).
  - Move `plotly.js` from `dependencies` to `devDependencies` (TS type-only imports do not need it at runtime; `plotly.js-basic-dist` ships the runtime). If typecheck fails after removal, restore as devDep.
  - `bun install` after package.json edit.
  - Re-run `bun run preflight` after the batch.
- **Test impact:** None. No tests reference any of these.
- **Dependencies:** None.
- **Estimated touch size:** ~10 files deleted, 2 files edited, net **−5,000 to −15,000 LOC** depending on size of verification markdowns.
- **Risk:** low
- **Verification:** `bun run preflight` passes; `bun run build` succeeds; `ls backend/` is empty or directory gone.

---

### Task 2: Fix Stooq quote math (C5) — type: critical-fix

- **Items addressed:** C5
- **Files:** `src/lib/market-data/client.ts:439-451` (`formatStooqQuote`), and add an integration test in `__tests__/unit/marketDataClient.test.ts`
- **Approach:**
  - Decide product behavior: when Stooq doesn't provide previous close, either (a) fetch yesterday's bar via the historical endpoint and use its close as `previousClose`, or (b) set `previousClose = currentPrice` and `change = changePercent = 0` and let UI show "—".
  - Option (b) is the YAGNI choice — it doesn't lie. Option (a) is a real fix but adds an HTTP call per quote.
  - Recommend: **option (b)** first (1-line change), then revisit if users complain that change% is always 0. The Yahoo Finance fallback path already provides real `regularMarketPreviousClose`, so most of the time the math is correct anyway.
  - Update or add tests asserting that when Stooq returns no separate previous close, change is 0 (or NaN-safe behavior).
- **Test impact:** New test in `marketDataClient.test.ts`. No existing test asserts the wrong behavior (grep confirms).
- **Dependencies:** Task 1 (optional — cleaner diff).
- **Estimated touch size:** ~15 LOC across 2 files.
- **Risk:** low
- **Verification:** Hit `/api/market-data` with Stooq path active; confirm `changePercent` is `0` (not a bogus intraday %). Unit test green.

---

### Task 3: Remove demo fallback data (C4) — type: critical-fix

- **Items addressed:** C4
- **Files:**
  - `src/lib/market-data/client.ts:266-299` — delete `DEMO_FALLBACK_QUOTES`
  - `src/lib/market-data/client.ts:315-371` — delete `generateDemoHistoricalData`
  - `src/lib/market-data/client.ts:842-877` (in `fetchCurrentData` catch) — remove demo fallback branches; return cached-stale or throw
  - `src/lib/market-data/client.ts:1114-1117, 1182-1185` (in `fetchSymbolHistory`) — remove TQQQ/SQQQ demo branches; return `[]`
  - `src/hooks/useDashboard.ts:194-196` — change `marketData?.vix.currentPrice || 17.2` etc. to a clear loading/error state (e.g. show `—` or hide cards)
- **Approach:**
  - Demo data masquerades as real prices when ALL sources fail. The correct user signal is "data unavailable, retry shortly", not invented numbers.
  - Replace the `|| 17.2` literals in `useDashboard` with `null` / conditional rendering; consumers already pass through optional types.
  - `fetchCurrentData` should: return stale cache if any, otherwise throw / return a structure with `isStale: true` and `currentPrice: null` (or change the type). Pick the minimum-typing-impact approach.
- **Test impact:** Likely some tests that mock all-failure paths will need a small update. No existing test asserts the demo numbers, so no fake assertions to delete. Run `bun run test` and adjust.
- **Dependencies:** Task 2 (touches same file).
- **Estimated touch size:** ~80 LOC removed, ~10 LOC added across 2 files.
- **Risk:** medium — affects the unhappy path on every page; needs a deliberate empty/error UI state.
- **Verification:** Simulate all-source failure (mock fetches reject); UI shows a clear "data unavailable" state, not fake prices. Tests green.

---

### Task 4: Stop leaking error.message to clients (C6) — type: critical-fix

- **Items addressed:** C6
- **Files:** all six route handlers in `src/app/api/*/route.ts` (entry-score, health, historical-data, market-data, metrics, price-on-date)
- **Approach:**
  - Server-side `structuredLog(LogLevel.ERROR, ...)` is already in place — keep that.
  - In the JSON response, return a stable user-safe message: `error: 'Internal server error'` (or a per-route message like `'Failed to fetch market data'`). Optionally include a `requestId` if you want correlation.
  - One mechanical edit per route: replace `error: error instanceof Error ? error.message : 'Unknown error'` with `error: 'Internal server error'`.
  - Consider extracting a tiny helper `function jsonError(message, status)` if the pattern repeats >4 times — but skip if it'd just shave 5 LOC.
- **Test impact:** Any route-handler test that asserts on the exact error string will need to change. Grep shows none assert on `error.message` content, so likely no test changes. Verify by running `bun run test`.
- **Dependencies:** None.
- **Estimated touch size:** ~12 LOC changed across 6 files.
- **Risk:** low
- **Verification:** Force an error in each route; response body never contains stack trace, file path, or library-specific text.

---

### Task 5: Partial-success fetching + fetch cancellation (C3 + W5) — type: critical-fix

- **Items addressed:** C3, W5
- **Files:** `src/hooks/useMarketData.ts:83-135`
- **Approach:**
  - Replace `Promise.all` with `Promise.allSettled`. For each settled-fulfilled response, validate `.ok` and parse JSON. For rejected (or non-OK), set a per-section error.
  - Expand the hook's return type to per-section errors: `marketDataError`, `historicalDataError`, `entryScoreError`. Or keep a single `error` and accept that one missing section sets it. Pick the simpler one (single `error` + per-section nulls in state is fine — partial UI degrades gracefully).
  - For W5: use the React docs' **`ignore` flag** pattern (simpler than AbortController) — declare `let ignore = false` at the top of the effect callback, guard every `setState` with `if (!ignore)`, return cleanup that sets `ignore = true`. Context7 confirms this is the canonical React 18 pattern for stale-fetch protection.
  - Skip AbortController unless you have a specific need to abort the in-flight request server-side. The `ignore` flag is sufficient here.
- **Test impact:** Existing hook tests likely mock all three fetches succeeding. Add a test where one fails: hook returns the two successful sections + an error. Add a test for unmount-during-fetch: no state update after unmount.
- **Dependencies:** Task 4 (Task 5 expects the new error JSON shape; if Task 4 not done, still works but error strings are different).
- **Estimated touch size:** ~50 LOC changed in 1 file + ~30 LOC in tests.
- **Risk:** low-medium
- **Verification:** Mock historical endpoint to 500; market-data + entry-score still render. Unmount test passes.

---

### Task 5.5: Fix price-on-date 404 + stale positions + actualDate desync — type: critical-fix

- **Items addressed:** Newly discovered during live UI testing (A, B, C from double-check):
  - **A.** `/api/price-on-date?date=YYYY-MM-DD` returns 404 for in-range dates that DO exist in `/api/historical-data`. Verified via curl: 2026-05-09 ✓, 2026-04-30 ✗, 2026-04-15 ✗. Date-picker is effectively broken across ~75% of the visible 30-day window.
  - **B.** When that 404 hits, `RightColumn.tsx:93` clears `storedEntryPrices` synchronously, so positions silently fall back to `marketData.currentPrice` as entry price — producing $0 P&L that looks like "no profit yet" instead of "data fetch failed."
  - **C.** `setPricesManually` (`useEntryPrices.ts:124-133`) skips `setActualDate`, so the "Actual Trading Date" label shows the prior date after Enter Position.
- **Files:**
  - `src/lib/market-data/client.ts:1002-1056` — `fetchPricesOnDate`
  - `src/app/api/price-on-date/route.ts`
  - `src/hooks/useEntryPrices.ts:113-118, 124-133` — `fetchPrices` error path + `setPricesManually`
  - `src/components/dashboard/RightColumn.tsx:89-100` — date onChange handler (don't pre-clear `storedEntryPrices` on a request that may fail)
- **Approach:**
  - **Root cause for A:** `fetchPricesOnDate` calls `fetchSymbolHistory` with a fresh 7-day window per request. This ignores the 30-day cache populated by `/api/historical-data`. With Stooq captcha-gated and Yahoo 429-throttled on the second hop, both symbols return `null` → 404.
  - **Fix A:** Consult `this.cache.historicalData` first. If the requested date is within the cached window, look it up there and return immediately. Only fall through to a fresh fetch if the date is outside the cached window. Net effect: every date the chart shows will resolve from cache.
  - **Fix B:** Either (i) keep `storedEntryPrices` until the fetch resolves and only clear on success, or (ii) on `historicalPricesError`, surface a banner in the positions table ("Entry prices unavailable for {date}") and SHOW NO POSITIONS rather than fall back to market price. Recommend (ii) — fail loudly.
  - **Fix C:** `setPricesManually(prices, actualDate?)` — accept an optional actualDate; if provided, call `setActualDate(actualDate)` and persist it. Caller in `useDashboard.handleUpdateAccountSize` passes today's date.
- **Test impact:** Add tests for: (1) price-on-date hits cache when date is in-window; (2) date-change error path doesn't replace positions with market-price; (3) setPricesManually with actualDate updates the label.
- **Dependencies:** Should land AFTER P0 (Stooq fix) — otherwise Yahoo will still 429 sometimes and tests will be flaky. After P0, the cache lookup may make this less urgent, but it's still a correctness fix.
- **Estimated touch size:** ~40 LOC in `client.ts`, ~10 LOC in `useEntryPrices.ts`, ~5 LOC in `RightColumn.tsx`, ~50 LOC in tests.
- **Risk:** medium — touches the error-state UX; needs deliberate empty-state design.
- **Verification:**
  - `curl 'http://localhost:3000/api/price-on-date?date=<any-date-from-historical-chart>'` returns 200 with valid OHLCV.
  - Picking any in-range date in the UI populates the positions table from that date's actual close.
  - Picking an out-of-window date shows a clear error banner; the positions table does NOT show fake "current-price-as-entry" entries.
  - After clicking Enter Position, "Actual Trading Date" reflects today, not the old historical date.

---

### Task 6: Market holiday calendar in `isMarketOpen` (W3) — type: correctness-fix

- **Items addressed:** W3
- **Files:** `src/lib/market-data/client.ts:1249-1272`
- **Approach:**
  - Add a small list of US market holidays (NYSE) for the current year — there are ~9-10 per year. Hardcode 2026 and 2027; revisit annually.
  - Add an early-return `if (isMarketHoliday(estTime)) return false;` after the weekend check.
  - Don't pull in a date library (e.g. `@nivo/holidays`) — YAGNI.
  - Existing weekend/hours tests still pass; add 2-3 holiday tests (e.g. Jan 1, July 4, Christmas).
- **Test impact:** Small — add a few cases to the existing `isMarketOpen` describe block at `__tests__/unit/marketDataClient.test.ts:389`.
- **Dependencies:** None.
- **Estimated touch size:** ~20 LOC + 10 LOC tests.
- **Risk:** low
- **Verification:** `isMarketOpen()` on July 4, 2026 (Saturday — already false), Jan 1, 2026 (Thursday — should be false). Pick a real weekday holiday for the test.

---

### Task 7: BaseChart dynamic height (W4) — type: bug-fix

- **Items addressed:** W4
- **Files:** `src/components/charts/BaseChart.tsx:85-119`
- **Approach:**
  - Tailwind's JIT cannot generate classes from runtime template strings.
  - Replace `className={\`h-[${height}px] ...\`}` with `style={{ height }}` plus a static class without the height (e.g. `className="flex items-center justify-center"`).
  - Apply to all three branches (loading, error, empty). Chart-render branch already uses `style={{ height }}`.
- **Test impact:** Any visual-regression / snapshot test on loading/error/empty states may need refresh. Grep shows tests use `data-testid` and role queries, not class assertions — likely zero impact.
- **Dependencies:** None.
- **Estimated touch size:** ~6 LOC in 1 file.
- **Risk:** low
- **Verification:** Render a chart at non-default heights (e.g. 320, 600) in loading state; element actually has the correct pixel height in devtools.

---

### Task 7.5: ACTIVE-badge state propagation (cosmetic D) — type: bug-fix

- **Items addressed:** D from double-check — Account Information card hardcodes `● Active` regardless of `positionActive` state.
- **Files:** `src/components/dashboard/LeftColumn.tsx:21-39` (props), `src/components/dashboard/LeftColumn.tsx:67` (the badge JSX), `src/app/page.tsx:154-172` (passes positionActive into LeftColumn).
- **Approach:**
  - Add `positionActive: boolean` to `LeftColumnProps`.
  - Destructure it, render badge text/class based on it: `{positionActive ? '● Active' : '○ Inactive'}` with conditional `status-badge` class.
  - Pass through from `page.tsx`.
- **Test impact:** None — no existing test asserts on the badge text.
- **Dependencies:** None.
- **Estimated touch size:** ~6 LOC across 3 files.
- **Risk:** low
- **Verification:** Toggle the Position Details "● ACTIVE" switch — the Account Information badge mirrors it.

---

### Task 8: Deduplicate types (W8) — type: refactor

- **Items addressed:** W8
- **Files:**
  - Source of truth candidates: `src/types/` (create or use existing) or keep in `src/lib/market-data/client.ts` and `src/lib/market-analysis/entryScore.ts`.
  - Remove duplicates from `src/hooks/useMarketData.ts:19-57`.
- **Approach:**
  - Move/keep `SymbolData`, `MarketData`, `HistoricalDataPoint`, `EntryScore` in one place — recommend `src/types/market-data.ts` (new file) and re-export from both `client.ts` and `entryScore.ts`.
  - Update `useMarketData.ts` to `import type` from `@/types/market-data`.
  - Tighten where types differ (e.g. `SymbolData` vs `SymbolQuote` — verify they're structurally identical).
- **Test impact:** None functional. TypeScript will surface any drift.
- **Dependencies:** Tasks 2-5 (avoid merge conflict on `client.ts`).
- **Estimated touch size:** 1 new file, 3 files edited, ~80 LOC moved.
- **Risk:** low
- **Verification:** `bun run typecheck` clean; no behavior change.

---

### Task 9 (DEFER): Split `client.ts` and slim `useDashboard` (W6, W7) — type: refactor

- **Items addressed:** W6, W7
- **Recommendation:** **Defer to a separate branch.** Both are large, touch many files, and have no functional payoff — they're maintainability investments. The preflight-green simplification branch is the wrong place to land 1000+ LOC of moves.
- If you do them later:
  - W6 split candidates: `client.ts` → `stooq.ts` (Stooq fetch + formatting), `fred.ts` (FRED VIX), `retry.ts`, `logger.ts` (structuredLog + LogLevel), `errors.ts` (DataSourceError + classifyError), `marketHours.ts` (isMarketOpen + holidays), `demo.ts` (deleted after Task 3 — may not exist), `client.ts` (just the class + cache).
  - W7: group the 38-key return into nested objects (`marketState`, `positionState`, `uiState`, `handlers`) and pass each as a single prop, OR adopt a small Zustand/Jotai store and stop drilling props.

---

## Non-bugs (verified-and-dismissed)

- **Item E (initial-load double-fire of `/api/*`):** React 18 `reactStrictMode` is enabled by default in App Router (`next.config.mjs` is `{}`); strict-mode double-invokes effects in dev only, and `next build`/`next start` strips it. Verified via curl + Next.js source. **No code change needed. No task created.**

## Quick reference: tasks by commit boundary

| Commit | Tasks | Items |
|---|---|---|
| 0 | P0 | Stooq data source (acquire API key / swap primary) |
| 1 | Task 1 | W1, W2, W10, W11 |
| 2 | Task 2 | C5 |
| 3 | Task 3 | C4 |
| 4 | Task 4 | C6 |
| 5 | Task 5 | C3, W5 |
| 5.5 | Task 5.5 | A (price-on-date 404), B (stale positions), C (actualDate desync) |
| 6 | Task 6 | W3 |
| 7 | Task 7 | W4 |
| 7.5 | Task 7.5 | D (●ACTIVE badge) |
| 8 | Task 8 | W8 |
| — | (defer) | W6, W7 |
| — | (no-op) | E (dev-only StrictMode artifact) |

After each commit: `bun run preflight`.
