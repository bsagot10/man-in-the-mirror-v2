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
  - Manages position state with `storedShares` and `storedEntryPrices` for persistence
  - Uses `committedSizing` state for deferred UI updates (only updates on button click)
  - localStorage persistence for `committedSizing` to preserve position sizing across sessions
  - Syncs position shares with account size calculator via `handleUpdateAccountSize()`
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
- Data processing: Import `processChartData` from `@/lib/data-processing/removeFlatSegments` for smoothing (skip for precise rendering)
- Chart types: Import shared types from `@/types/chart-types` (PriceDataPoint, DecayDataPoint, PerformanceDataPoint)

**Testing:**
- TDD approach: write tests before implementation
- Test structure: Rendering → Display logic → States (loading/error) → Styling
- Use `data-testid` for test selectors (e.g., `data-testid="market-metrics"`)
- Mock external dependencies (fetch, next/dynamic)

**Styling:**
- Custom classes: `ghibli-card`, `card-header`, `card-content`, `metric-box`, `right-column`, `left-column`, `center-column`, `cached-indicator`, `header`, `main-title`, `subtitle`, `header-controls`, `last-update`, `main-content`, `info-row`, `score-fill`, `score-details`, `score-item`, `score-label`, `position-table`
- CSS variables in `:root` define theme colors (primary-green, soft-green, warm-cream, warm-beige, warm-amber, earth-brown, forest-shadow, positive, negative, warning, info, card-bg, card-border, text-primary/secondary/tertiary, divider)
- Tailwind utilities for layout and responsive design
- Google Fonts import: Noto Sans (weights: 400, 500, 600, 700) with display=swap
- Color system: green (bullish/positive), red (bearish/negative), yellow (warning)
- Theme: Studio Ghibli-inspired warm palette (Noto Sans font, warm cream/beige/amber colors)
- Body gradient: `linear-gradient(135deg, #fef6e4 0%, #f7e8d0 100%)`
- Header background: `rgba(254, 246, 228, 0.85)` with backdrop-filter blur for glassmorphism
- Card styling: 12px border-radius, glassmorphism effect with `backdrop-filter: blur(16px) saturate(180%)`, hover transform
- Right-column card overflow: Use `overflow: hidden` with `position: relative` and `z-index: 1` to clip content to rounded corners
- Right-column card shadows: Reduced blur (`0 4px 12px rgba(139, 111, 71, 0.08)`) with inset highlight to prevent gap bleed
- Right-column card stacking: Incremental z-index (`z-index: 2` for subsequent cards) ensures shadows don't overlap
- Right-column card headers: Explicit `border-radius: 12px 12px 0 0` to match parent card corners and prevent dark corners
- Card headers: 12px/16px padding, 0.8rem font size, gradient background, flex layout with justify-between
- Score details: 12px padding (reduced from 16px), transparent background (was rgba(255,255,255,0.3)), 10px gap between items, font-family: inherit
- Score items: Grid layout with 110px label, flexible bar, 24px value (optimized for longer bars), font-family: inherit on label/value
- Position table: 8px/6px padding, 0.7rem header font size, specific column widths with min-widths (Symbol: 17%/48px, Shares: 14%/42px, Entry: 22%/58px, Current: 22%/58px, P&L: 25%/62px), center-aligned columns (Sym, Shr, Entry, P&L), left-aligned Current column
- Responsive: Reduce padding/font sizes on narrow viewports, use `flex-wrap` on headers with gap for wrapping
- Table headers: Abbreviated for mobile UX (Sym, Shr, Entry, Curr, P&L)
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
const UNIFIED_VISUAL_MAX = 100;  // For proportional bar comparisons

// 3. Helper functions
function calculateValue(...) { ... }
function calculateBarWidth(score: number, visualMax: number = UNIFIED_VISUAL_MAX): string {
  const percentage = Math.min((score / visualMax) * 100, 100);
  return `${percentage}%`;
}

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

**Visual Comparison Pattern:**
```typescript
// For score bars with different max values, use unified scale for visual comparison
// while maintaining accurate aria attributes for accessibility

const MAX_VOLATILITY_SCORE = 50;
const MAX_TREND_SCORE = 30;
const MAX_DECAY_SCORE = 30;
const UNIFIED_VISUAL_MAX = 100;  // All bars scaled to 100 for comparison

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  return (
    <div
      className="score-fill"
      style={{ width: calculateBarWidth(score, UNIFIED_VISUAL_MAX) }}  // Visual: unified scale
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={maxScore}  // Accessibility: actual max
    />
  );
}
```

**Data Fetching:**
- Market data client with 1-minute cache
- Error handling with fallback to cached data
- Type-safe responses with Zod-like validation
- Helper functions for calculations (percent change, formatting)

**Position Sizing (VIX Regime-Based):**
```typescript
// VIX-based allocation - Higher VIX = more decay opportunity
function calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice) {
  let allocationPercent: number;

  if (vixValue >= 30) {
    allocationPercent = 0.50;      // Extreme volatility: 50%
  } else if (vixValue >= 20) {
    allocationPercent = 0.40;      // High volatility: 40%
  } else if (vixValue >= 15) {
    allocationPercent = 0.35;      // Moderate volatility: 35%
  } else {
    allocationPercent = 0.30;      // Low volatility: 30%
  }

  const allocationAmount = accountSize * allocationPercent;

  // Target 1.25:1 SQQQ:TQQQ share ratio (asymmetric hedge)
  // Math: If sqqqShares = 1.25 × tqqqShares, then:
  // tqqqShares × tqqqPrice + 1.25 × tqqqShares × sqqqPrice = allocationAmount
  // tqqqShares = allocationAmount / (tqqqPrice + 1.25 × sqqqPrice)
  const TARGET_RATIO = 1.25;
  const tqqqShares = Math.floor(allocationAmount / (tqqqPrice + TARGET_RATIO * sqqqPrice));
  const sqqqShares = Math.floor(TARGET_RATIO * tqqqShares);

  return { tqqqShares, sqqqShares, allocationPercent, ... };
}
```

**Position State Management:**
```typescript
// Dashboard maintains position state with persistence
const [storedShares, setStoredShares] = useState<{ tqqq: number; sqqq: number } | null>(null);
const [storedEntryPrices, setStoredEntryPrices] = useState<{ tqqq: number; sqqq: number } | null>(null);
const [committedSizing, setCommittedSizing] = useState<PositionSizing | null>(null);
const [positions, setPositions] = useState<Position[]>([]);

// Update positions when account size changes
function handleUpdateAccountSize() {
  const sizing = calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice);
  setStoredShares({ tqqq: sizing.tqqqShares, sqqq: sizing.sqqqShares });
  setCommittedSizing(sizing);  // Commit sizing for UI display

  // Sync positions array with calculated shares
  setPositions([
    { symbol: 'TQQQ', shares: sizing.tqqqShares, entryPrice, currentPrice, entryDate },
    { symbol: 'SQQQ', shares: sizing.sqqqShares, entryPrice, currentPrice, entryDate },
  ]);
}

// Persist committedSizing to localStorage
useEffect(() => {
  if (committedSizing) {
    localStorage.setItem('committedSizing', JSON.stringify(committedSizing));
  }
}, [committedSizing]);

// Display actual ratio dynamically calculated from share counts
// (Position sizing uses TARGET_RATIO = 1.25 for allocation, but display reflects actual shares)
<div className="info-row">
  <label>Ratio (SQQQ:TQQQ):</label>
  <span>{(committedSizing ?? positionSizing).tqqqShares > 0
    ? `${((committedSizing ?? positionSizing).sqqqShares / (committedSizing ?? positionSizing).tqqqShares).toFixed(2)}:1`
    : '—'}</span>
</div>
```

**Deferred State Updates:**
```typescript
// UX pattern: Calculate live in background, but only update UI on user action
// Prevents jarring UI updates while user types in input fields

// Live calculation state (updates on every input change)
const positionSizing = useMemo(() =>
  calculatePositionSizing(accountSize, vixValue, tqqqPrice, sqqqPrice),
  [accountSize, vixValue, tqqqPrice, sqqqPrice]
);

// Committed state (only updates when user clicks "Update")
const [committedSizing, setCommittedSizing] = useState<PositionSizing | null>(null);

// Initialize on first load
useEffect(() => {
  if (!committedSizing && positionSizing) {
    setCommittedSizing(positionSizing);
  }
}, [committedSizing, positionSizing]);

// UI displays committed state, falls back to live calculation
<div>
  Shares: {(committedSizing ?? positionSizing).tqqqShares}
</div>

// User action commits the live calculation to UI state
function handleUpdate() {
  setCommittedSizing(positionSizing);
}
```

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
    dash: 'solid',  // Optional: Explicitly set to ensure legend marker is solid bar
  },
  connectgaps: true,
  // Optional: Area fill under line
  fill: 'tozeroy' as const,
  fillcolor: 'rgba(255, 140, 66, 0.15)',  // Semi-transparent fill
}];

// Data processing: Remove flat segments for smooth splines
const { dates, values } = useMemo(() => {
  const validData = data.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));
  const rawDates = validData.map(d => d.date);
  const rawValues = validData.map(d => d.close);
  const processedValues = processChartData(rawValues);  // From @/lib/data-processing
  return { dates: rawDates, values: processedValues };
}, [data]);

// Strict date alignment for multi-series charts (e.g., TQQQ + SQQQ)
// Two approaches exist in codebase:

// Approach 1: Map-based lookup (O(1), preferred for large datasets)
// Used in: StrategyPerformanceChart
const { dates, pnlValues } = useMemo(() => {
  const validTqqq = tqqqData.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));
  const validSqqq = sqqqData.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));

  // Create Map for O(1) date lookups
  const sqqqMap = new Map<string, number>(
    validSqqq.map((d) => [d.date, d.close])
  );

  const resultDates: string[] = [];
  const rawPnlValues: number[] = [];

  // Iterate through primary series, lookup matching dates in Map
  for (const tqqq of validTqqq) {
    const sqqqClose = sqqqMap.get(tqqq.date);

    // Only add if both series have data for this date
    if (sqqqClose !== undefined) {
      resultDates.push(tqqq.date);
      rawPnlValues.push(calculatePnL(tqqq, sqqqClose));
    }
  }

  return { dates: resultDates, pnlValues: processChartData(rawPnlValues) };
}, [tqqqData, sqqqData]);

// Approach 2: Index-based iteration (simpler for aligned datasets)
// Used in: DecayOpportunityChart
const { dates, decayValues } = useMemo(() => {
  const validTqqq = tqqqData.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));
  const validSqqq = sqqqData.filter(d => d && d.date && typeof d.close === 'number' && !isNaN(d.close));

  const resultDates: string[] = [];
  const rawDecayValues: number[] = [];
  const minLength = Math.min(validTqqq.length, validSqqq.length);

  // Index-based iteration with date validation
  for (let i = 0; i < minLength; i++) {
    const tqqq = validTqqq[i];
    const sqqq = validSqqq[i];

    // Only include if dates match (aligned data)
    if (tqqq.date === sqqq.date) {
      resultDates.push(tqqq.date);
      rawDecayValues.push((tqqq.close * sqqq.close / initialProduct - 1) * 100);
    }
  }

  return { dates: resultDates, decayValues: processChartData(rawDecayValues) };
}, [tqqqData, sqqqData]);

// Threshold lines with shapes (e.g., profit targets, stop losses)
const shapes: Partial<Shape>[] = useMemo(() => {
  if (dates.length === 0) return [];
  return [
    {
      type: 'line' as const,
      x0: dates[0],
      x1: dates[dates.length - 1],
      y0: THRESHOLD_VALUE,
      y1: THRESHOLD_VALUE,
      line: { color: CHART_COLORS.decay, width: 2, dash: 'dash' },
    },
  ];
}, [dates]);

// Annotations for threshold labels
const annotations = useMemo(() => {
  if (dates.length === 0) return [];
  return [
    {
      x: dates[dates.length - 1],
      y: THRESHOLD_VALUE,
      xanchor: 'left' as const,
      yanchor: 'middle' as const,
      text: `Target: ${THRESHOLD_VALUE}%`,
      showarrow: false,
      font: { size: 10, color: CHART_COLORS.decay },
      xshift: 5,
    },
  ];
}, [dates]);

// Layout configuration from chart-config
const layout: Partial<Layout> = {
  title: { text: title, font: { size: 14, color: LAYOUT_CONFIG.font.color } },
  plot_bgcolor: LAYOUT_CONFIG.plot_bgcolor,
  paper_bgcolor: LAYOUT_CONFIG.paper_bgcolor,
  hovermode: 'x unified' as const,
  xaxis: { ...AXIS_CONFIG, tickformat: '%b %d' },
  yaxis: { ...AXIS_CONFIG, autorange: true },
  shapes,        // Add threshold lines
  annotations,   // Add labels
  legend: {
    ...LEGEND_CONFIG,
    // Optional: Fix legend text overlap (used in DecayOpportunityChart)
    itemwidth: 40,
    indentation: 10,
    valign: 'middle' as const,
  },
};

// X-axis range control: Prevent Plotly padding
// For charts requiring data to extend to edge (e.g., P&L charts with threshold lines):
const layout = useMemo(() => ({
  // ... other layout config
  xaxis: {
    ...AXIS_CONFIG,
    range: dates.length > 0 ? [dates[0], dates[dates.length - 1]] : undefined,  // Explicit range
    autorange: dates.length === 0,  // Only autorange when no data
  },
}), [dates]);  // CRITICAL: Include dates in dependency array

// Use raw values (skip processChartData) when precision matters:
const { dates, pnlValues } = useMemo(() => {
  // ... validation and Map-based date matching
  return { dates: resultDates, pnlValues: rawPnlValues };  // No processChartData
}, [tqqqData, sqqqData]);
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
