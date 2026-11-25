# Man in the Mirror — Leveraged ETF Decay Dashboard

Next.js app for monitoring leveraged ETF decay trading opportunities. Tracks VIX, QQQ, TQQQ, SQQQ with real-time data and entry score calculations.

**Stack**: Next.js 14 (App Router), React 18 + TypeScript, Tailwind CSS (Ghibli theme), Vitest + Testing Library, Plotly.js

## Karpathy Coding Principles

**Source:** Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) on common LLM coding mistakes.

### 1. Think Before Coding
- State assumptions explicitly — don't guess
- Present multiple interpretations when ambiguous
- Push back if a simpler approach exists
- Stop and ask when confused

### 2. Simplicity First
- No features beyond what was asked
- No abstractions for single-use code
- No "flexibility" that wasn't requested
- If 200 lines could be 50, rewrite it

### 3. Surgical Changes
- Don't "improve" adjacent code or formatting
- Don't refactor things that aren't broken
- Match existing style
- Remove only imports/vars YOUR changes made unused

### 4. Goal-Driven Execution
- Define success criteria (tests, verification steps)
- Transform "fix X" → "write test that reproduces X, then make it pass"
- State a brief plan for multi-step tasks

---

## Build Commands

```bash
bun run dev           # Start dev server
bun run dev:turbo     # Turbopack (faster)
bun run test          # Run tests (Vitest)
bun run test:watch    # Watch mode (PREFERRED during development)
bun run build         # Production build
bun run typecheck     # TypeScript validation
bun run lint          # ESLint
bun run preflight     # Pre-PR: typecheck + lint + test
INTEGRATION_TESTS=true bun run test -- realApiResponses.test.ts  # Integration tests
```

## Claude Requirements

When making code changes, Claude MUST:
1. Use `bun run test:watch` during active development
2. Run `bun run typecheck` before any commit
3. Run `bun run preflight` before marking task complete

## Data Architecture

- **Quote sources (ETFs: QQQ/TQQQ/SQQQ)**: Polygon snapshot (skipped once a 403 flags the free tier) → TQQQ/SQQQ: last two bars of the shared 30-day history (Polygon daily aggs → Yahoo history) → Polygon daily aggs (10 days) → Yahoo quote (`validateResult: false`)
- **Quote sources (VIX)**: Yahoo quote → only if Yahoo fails: newer (by `asOf`) of FRED VIXCLS last two closes vs. latest real bar of VIX history (`pickNewerQuote`, `vixHistoryQuote`)
- **Free tier = no intraday**: "current" is the latest daily close; every bar-derived quote carries `asOf` (trading date, YYYY-MM-DD). Yahoo quotes derive `asOf` from `regularMarketTime` (NY date)
- **Cache TTL**: 5 min (current quotes, `CACHE_TTL`), 15 min (historical, `HISTORICAL_CACHE_TTL`); route `revalidate`: 30s (entry-score, market-data), 300s (historical-data), 3600s (price-on-date), 0 (metrics, health)
- **Stale fallback**: when a refresh fails, cached data is returned with `isStale: true` + `cacheAge`; refused (throws) once older than 60 min (`MAX_STALE_AGE`)
- **Retry**: Exponential backoff (1s base, 5s cap, up to 500ms jitter, max 3 attempts) on Yahoo calls; fail-fast when the error message contains 429/400/404
- **VIX forward-fill (charts only)**: `alignVixToEndDate()` extends VIX history with the last value to the TQQQ/SQQQ end date (skips weekends/NYSE holidays); quotes use the unfilled `vixRawHistory`, never synthetic bars
- **Entry gating** (`provenance.ts`): `getEntryBlockReason` blocks on `isStale` or TQQQ/SQQQ `asOf` mismatch; `getEntryPriceNotice` is a non-blocking previous-close notice while the market is open
- **Node**: yahoo-finance2 declares `engines.node >=20.0.0`

## Conventions

- **Components**: PascalCase. Props interfaces suffixed `Props`.
- **Imports**: `@/components`, `@/lib`, `@/hooks`, `@/types`. Order: React → Next → Internal → Types.
- **Testing**: TDD. Structure: Rendering → Display Logic → States → Styling. Use `data-testid`.
- **Charts**: Use `scatter` type (never `scattergl`), spline smoothing, `processChartData()`.
- **Styling**: Ghibli theme — `ghibli-card`, `card-header`, `card-content`, `metric-box`. Green=bullish, red=bearish, yellow=warning.

## Patterns

See `docs/PATTERNS.md` for detailed code examples.

Key patterns: Component Structure (Types → Constants → Helpers → Sub-components → Main), structured logging (`structuredLog`), error classification (`DataSourceError` enum), VIX regime-based position sizing (30-50%).

## Gotchas

- `npm run test` won't work — use `bun run test` (bun is the package manager)
- Polygon (`api.polygon.io`) free-tier keys get 403 on the snapshot endpoint and are limited to 5 calls/min — the client stops calling snapshot after the first 403 and uses daily aggregates
- FRED VIXCLS lags 1-2 trading days — VIX quotes prefer the newer real history bar; check `asOf` on quotes
- Yahoo Finance 429s are common (tests/dev runs hitting live APIs can trigger them) — VIX falls back to FRED/history only after Yahoo fails; 429 is not retried
