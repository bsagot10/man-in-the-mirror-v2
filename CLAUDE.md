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
- Yahoo Finance API (yahoo-finance2)
- Plotly.js for charts
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: build-commands -->
## Build Commands

```bash
# Development
npm run dev           # Start dev server (Next.js)

# Testing
npm run test          # Run tests (Vitest)
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Build & Deploy
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint
```
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: architecture -->
## Architecture

```
man-in-the-mirror-next/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── entry-score/      # Entry score calculation endpoint
│   │   │   ├── market-data/      # Current market data endpoint
│   │   │   └── historical-data/  # Historical price data endpoint
│   │   ├── layout.tsx            # Root layout with metadata
│   │   ├── page.tsx              # Dashboard page (main entry)
│   │   └── globals.css           # Global styles (Ghibli theme)
│   ├── components/
│   │   ├── charts/               # VixChart, TqqqSqqqChart, DecayOpportunityChart, StrategyPerformanceChart
│   │   └── dashboard/            # MarketMetrics, EntryScoreDisplay
│   ├── hooks/                    # useMarketData (SWR)
│   ├── types/
│   │   ├── chart-types.ts        # Shared chart data types
│   │   └── react-plotly.d.ts     # Plotly type definitions
│   └── lib/
│       ├── chart-config/         # Plotly chart styling (colors, splines, layouts)
│       ├── data-processing/      # Chart data utilities (removeFlatSegments)
│       └── market-data/
│           └── client.ts         # Yahoo Finance wrapper
├── __tests__/
│   ├── components/               # Component tests
│   ├── pages/                    # Page integration tests
│   ├── hooks/                    # Hook tests
│   ├── api/                      # API route tests
│   └── unit/                     # Unit tests (client, utils)
└── prisma/                       # Database schema (future)
```

**Component Hierarchy:**
- `page.tsx` (Dashboard) orchestrates layout and data fetching
- `MarketMetrics` displays entry score, VIX, and market trend
- `EntryScoreDisplay` shows score breakdown (volatility, trend, decay)
- Charts use dynamic Plotly imports for client-side rendering
- API routes provide backend endpoints for market data and calculations
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: conventions -->
## Conventions

**Naming:**
- Components: PascalCase with descriptive names (`MarketMetrics`, `EntryScoreDisplay`)
- Test files: `ComponentName.test.tsx` in mirrored `__tests__/` structure
- Types: Exported from component files, suffix with `Props` for props interfaces
- Shared types: Defined in `src/types/` directory for cross-component usage

**Imports:**
- Use path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`
- Group imports: React → Next.js → Internal → Types
- Charts: Import from `@/lib/chart-config` (colors, spline, layout, axis, legend, plot configs)
- Data processing: Import `processChartData` from `@/lib/data-processing/removeFlatSegments`
- Chart types: Import shared types from `@/types/chart-types` (PriceDataPoint, DecayDataPoint, PerformanceDataPoint)

**Testing:**
- TDD approach: write tests before implementation
- Test structure: Rendering → Display logic → States (loading/error) → Styling
- Use `data-testid` for test selectors (e.g., `data-testid="market-metrics"`)
- Mock external dependencies (fetch, next/dynamic)

**Styling:**
- Custom classes: `ghibli-card`, `card-header`, `card-content`, `metric-box`
- Tailwind utilities for layout and responsive design
- Color system: green (bullish/positive), red (bearish/negative), yellow (warning)
- Theme: Studio Ghibli-inspired warm palette (Noto Sans font, warm cream/beige/amber colors)
- Accessibility: Include `aria-label` on metric boxes, skip-to-content link in layout

**Error Handling:**
- Components accept `loading` and `error` props
- Show loading states with placeholders or `animate-pulse`
- Display error messages in red with retry actions
- Fallback to cached data when API calls fail
<!-- END AUTO-MANAGED -->

<!-- AUTO-MANAGED: patterns -->
## Patterns

**Component Structure:**
```typescript
// 1. Types (exported)
export interface ComponentProps { ... }

// 2. Constants
const MAX_VALUE = 100;

// 3. Helper functions
function calculateValue(...) { ... }

// 4. Sub-components (if needed)
function SubComponent(...) { ... }

// 5. Main component
export function Component({ ...props }: ComponentProps) {
  // Error state
  if (error) return <ErrorDisplay />

  // Main render
  return <div data-testid="component">...</div>
}
```

**Data Fetching:**
- Market data client with 1-minute cache
- Error handling with fallback to cached data
- Type-safe responses with Zod-like validation
- Helper functions for calculations (percent change, formatting)

**Type Patterns:**
```typescript
// Union types for states
type Signal = 'ENTER' | 'WATCH' | 'WAIT';
type VixRegime = 'Low' | 'Moderate' | 'High' | 'Extreme';
type MarketTrend = 'bullish' | 'bearish' | 'neutral';

// Data structures
interface SymbolQuote {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// Shared chart types (from @/types/chart-types)
interface PriceDataPoint {
  date: string;
  close: number;
}

interface DecayDataPoint {
  date: string;
  decay: number;
  tqqqPrice: number;
  sqqqPrice: number;
}

interface PerformanceDataPoint {
  date: string;
  cumulativePnL: number;
  dailyReturn: number;
}
```

**Chart Patterns:**
```typescript
// CRITICAL: Use 'scatter' type - NEVER 'scattergl' (no spline support)
const traces: Data[] = [{
  type: 'scatter' as const,
  mode: 'lines' as const,
  x: dates,
  y: values,
  name: 'Series Name',
  line: {
    color: CHART_COLORS.vix,
    shape: SPLINE_CONFIG.shape,      // 'spline'
    smoothing: SPLINE_CONFIG.smoothing,  // 1.3 (maximum)
    width: SPLINE_CONFIG.width,      // 3
  },
  connectgaps: true,
}];

// Data processing: Remove flat segments for smooth splines
const { dates, values } = useMemo(() => {
  const validData = data.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));
  const rawDates = validData.map(d => d.date);
  const rawValues = validData.map(d => d.close);
  const processedValues = processChartData(rawValues);  // From @/lib/data-processing
  return { dates: rawDates, values: processedValues };
}, [data]);

// Layout configuration from chart-config
const layout: Partial<Layout> = {
  title: { text: title, font: { size: 14, color: LAYOUT_CONFIG.font.color } },
  plot_bgcolor: LAYOUT_CONFIG.plot_bgcolor,
  paper_bgcolor: LAYOUT_CONFIG.paper_bgcolor,
  hovermode: 'x unified' as const,
  xaxis: { ...AXIS_CONFIG, tickformat: '%b %d' },
  yaxis: { ...AXIS_CONFIG, autorange: true },
};
```

**API Route Patterns:**
```typescript
// GET route with error handling
export async function GET(_request: NextRequest) {
  try {
    // Fetch data
    const data = await client.fetchData();

    // Build response
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Configure caching
export const revalidate = 30; // Cache for 30 seconds
```

**Test Patterns:**
```typescript
// Test structure
describe('Component', () => {
  describe('Rendering', () => { /* Basic render tests */ });
  describe('Display Logic', () => { /* Value display tests */ });
  describe('Loading State', () => { /* Loading UI tests */ });
  describe('Error State', () => { /* Error handling tests */ });
  describe('Styling', () => { /* CSS class tests */ });
});

// Mock setup patterns
vi.mock('module-name', () => ({ /* mock implementation */ }));

// For API mocking
const mockFetch = vi.fn();
global.fetch = mockFetch;

function setupMockFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/endpoint') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMockFetch();
});
```
<!-- END AUTO-MANAGED -->

<!-- MANUAL -->
## Development Notes

- Market data updates every 1 minute during trading hours (9:30 AM - 4:00 PM ET)
- VIX data from Yahoo Finance may have slight delays
- Dashboard uses Studio Ghibli-inspired warm color palette
- Future: Add position tracking with Prisma database
<!-- END MANUAL -->
