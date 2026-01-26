# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

<!-- AUTO-MANAGED: project-description -->
## Project Overview

**Man in the Mirror Strategy Dashboard** - Next.js application for monitoring leveraged ETF decay trading opportunities. Tracks VIX, QQQ, TQQQ, and SQQQ with real-time market data and entry score calculations.

**Tech Stack:**
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS (custom Ghibli-inspired theme)
- Vitest + Testing Library (TDD)
- Stooq API (primary) with Yahoo Finance fallback (yahoo-finance2)
- Plotly.js for charts
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->
## Build Commands

```bash
bun run dev           # Start dev server
bun run dev:turbo     # Turbopack dev server (experimental, faster)
bun run test          # Run tests (Vitest)
bun run test:watch    # Watch mode
bun run build         # Production build
bun run lint          # ESLint
bun run lint:fix      # Auto-fix linting issues
bun run lint:files    # Lint specific files
bun run typecheck     # TypeScript validation
bun run preflight     # Pre-PR: typecheck + lint + test
INTEGRATION_TESTS=true bun run test -- realApiResponses.test.ts  # Integration tests
```
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: development-workflow -->
## Development Workflow

**Package Manager:** Use `bun` instead of `npm` for faster execution.

### During Development
```bash
bun run dev:turbo          # Turbopack dev server (faster)
bun run test:watch         # Auto-runs tests on save (PREFERRED)
```

### Before Committing
```bash
bun run typecheck              # Type validation
bun run test -- -t "name"      # Run specific test by name
bun run test -- "**/*.test.ts" # Run tests matching glob
bun run lint                   # Lint all files
bun run lint:files -- file.ts  # Lint specific file
```

### Before Creating PR
```bash
bun run preflight          # typecheck + lint + test (single command)
```

### Claude Requirements
When making code changes, Claude MUST:
1. Use `bun run test:watch` during active development
2. Run `bun run typecheck` before any commit
3. Run `bun run preflight` before marking task complete
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->
## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── entry-score/      # Entry score calculation
│   │   ├── market-data/      # Current market data
│   │   ├── historical-data/  # Historical price data
│   │   ├── health/           # Health check
│   │   └── metrics/          # Cache/data source metrics
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Dashboard (main entry)
│   └── globals.css           # Ghibli theme styles
├── components/
│   ├── charts/               # VixChart, TqqqSqqqChart, DecayOpportunityChart, StrategyPerformanceChart
│   └── dashboard/            # MarketMetrics, EntryScoreDisplay
├── hooks/                    # useMarketData (SWR)
├── types/                    # chart-types.ts, react-plotly.d.ts
└── lib/
    ├── chart-config/         # Plotly styling (colors, splines, layouts)
    ├── data-processing/      # removeFlatSegments
    └── market-data/client.ts # Stooq (primary) → Yahoo Finance → FRED (fallback chain)
docs/                         # PATTERNS.md (comprehensive code patterns)
__tests__/
├── unit/                     # Unit tests (marketDataClient.test.ts, fredVix.test.ts)
└── (mirrored structure)
```

**Data Flow:**
- `client.ts` uses Stooq (primary) → Yahoo Finance (fallback) → FRED VIX (rate limit fallback)
- Cache: 5 min (current), 15 min (historical)
- Retry: Exponential backoff (max 3, 1s-5s delay, jitter), fail-fast on 429 rate limits
- VIX historical: Yahoo Finance primary, FRED fallback (to avoid 429 errors)
- VIX forward-fill: Extends VIX data to match TQQQ/SQQQ end dates (handles FRED 1-day lag)
- Error handling: Structured logging (LogLevel), error classification (DataSourceError)
- Metrics tracking: success/failure per source, cache hit rate
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->
## Conventions

**Naming:**
- Components: PascalCase (`MarketMetrics`, `EntryScoreDisplay`)
- Test files: `ComponentName.test.tsx` in mirrored `__tests__/` structure
- Props interfaces: suffix with `Props`

**Imports:**
- Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`
- Order: React → Next.js → Internal → Types
- Charts: Import from `@/lib/chart-config`
- Chart types: Import from `@/types/chart-types`

**Testing:**
- TDD: write tests before implementation
- Structure: Rendering → Display Logic → States → Styling
- Use `data-testid` for selectors
- Integration tests: `INTEGRATION_TESTS=true npm run test`

**Styling:**
- Custom classes: `ghibli-card`, `card-header`, `card-content`, `metric-box`
- CSS variables define theme colors (primary-green, warm-cream, warm-amber, etc.)
- Theme: Studio Ghibli-inspired warm palette (Noto Sans font)
- Cards: 12px border-radius, glassmorphism with backdrop-filter
- Colors: green (bullish), red (bearish), yellow (warning)

**Error Handling:**
- Components accept `loading` and `error` props
- Show loading states with `animate-pulse`
- Fallback to cached data when APIs fail
- Stale data indicator: `isStale` and `cacheAge` props
- Structured logging: `LogLevel` (DEBUG, INFO, WARN, ERROR) with `LogContext` metadata
- Error classification: `DataSourceError` enum for user-friendly error messages
- Retry strategy: Exponential backoff with jitter, fail-fast on 429/4xx errors
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
## Patterns

**See `docs/PATTERNS.md` for detailed code examples.**

**Key Patterns:**
- **Component Structure**: Types → Constants → Helpers → Sub-components → Main
- **Data Fetching**: Stooq (primary, CSV) → Yahoo Finance → FRED VIX (fallback chain), aggressive caching
- **Rate Limit Handling**: Fail-fast on 429 errors, no retry, fallback to alternate source (FRED for VIX)
- **Retry Logic**: Exponential backoff (1s-5s) with random jitter, max 3 attempts, skip on 4xx errors
- **Structured Logging**: `structuredLog(level, message, context)` with JSON output in production
- **Error Classification**: Map exceptions to `DataSourceError` enum with `retryAfter` metadata
- **VIX Forward-Fill**: `alignVixToEndDate()` extends VIX with last known value to match ETF end dates
- **Position Sizing**: VIX regime-based allocation (30-50% based on VIX level)
- **Deferred Updates**: Live calculation in background, commit on user action
- **Charts**: Use 'scatter' type (never 'scattergl'), spline smoothing, processChartData()
- **API Routes**: NextResponse.json with try/catch, revalidate for caching

**Type Definitions:**
```typescript
type Signal = 'ENTER' | 'WATCH' | 'WAIT';
type VixRegime = 'Low' | 'Moderate' | 'High' | 'Extreme';
type MarketTrend = 'bullish' | 'bearish' | 'neutral';

interface SymbolQuote {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

interface PriceDataPoint { date: string; close: number; }

// Error handling types (from client.ts)
enum LogLevel { DEBUG, INFO, WARN, ERROR }
interface LogContext {
  component: string;
  action: string;
  symbol?: string;
  duration?: number;
  source?: 'stooq' | 'yahoo' | 'cache';
  errorType?: string;
  [key: string]: unknown;
}
enum DataSourceError {
  NETWORK = 'Network connection failed',
  RATE_LIMIT = 'Rate limit exceeded - please wait',
  SERVER_ERROR = 'Data provider unavailable',
  INVALID_SYMBOL = 'Invalid trading symbol',
  TIMEOUT = 'Request timed out',
  UNKNOWN = 'Unknown error occurred'
}
```

**Test Structure:**
```typescript
describe('Component', () => {
  describe('Rendering', () => { });
  describe('Display Logic', () => { });
  describe('Loading State', () => { });
  describe('Error State', () => { });
  describe('Styling', () => { });
});
```
<!-- END AUTO-MANAGED -->

<!-- MANUAL -->
## Development Notes

- **Node Version**: Requires Node.js >= 22.0.0 (yahoo-finance2 dependency)
- Cache: 5 min (current), 15 min (historical) to reduce API calls
- Primary: Stooq (no API key, CSV format)
- Fallback: Yahoo Finance with `validateResult: false`
- API routes cache: 30s (entry-score, market-data), 5 min (historical-data)
- Future: Position tracking with Prisma database

## QA Status

**Status:** PRODUCTION READY (Verified: January 2, 2026)
**Test Coverage:** 623 passing tests
**Critical Issues:** ZERO

See QA documentation files for details:
- `VERIFICATION_EXECUTIVE_SUMMARY.txt` - 5-minute overview
- `README_QA_VERIFICATION.md` - Comprehensive overview
- `STOOQ_INTEGRATION_GUIDE.md` - Technical deep dive
- `DEPLOYMENT_CHECKLIST.md` - Deployment steps

```bash
npm run test              # Run all tests
npm run build             # Production build
curl 'https://stooq.com/q/l/?s=QQQ.US&f=sd2t2ohlcv&h&e=csv'  # Test Stooq
```
<!-- END MANUAL -->
