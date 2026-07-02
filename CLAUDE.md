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

- **Fetching**: Stooq (primary, CSV, no API key) → Yahoo Finance (fallback, `validateResult: false`) → FRED VIX (rate limit fallback)
- **Cache TTL**: 5 min (current quotes), 15 min (historical data), API routes 30s (entry-score, market-data)
- **Retry**: Exponential backoff (1s-5s, jitter, max 3), fail-fast on 429/4xx
- **VIX forward-fill**: `alignVixToEndDate()` extends VIX with last known value to match ETF end dates (handles FRED 1-day lag)
- **Node**: Requires >= 22.0.0 (yahoo-finance2 dependency)

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
- Stooq CSV can return stale data — check timestamps
- Yahoo Finance 429s are common — always fallback to FRED for VIX
- Test Stooq: `curl 'https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv'`
