# Man in the Mirror Dashboard - UI Improvement Plan v2

## Overview

Complete UI improvement implementation for the Man in the Mirror trading dashboard.
Based on Lyra analysis (12 prompts) plus issues discovered during code review.

**Project Path**: `/Volumes/T7 K/Documents/Graph1/man-in-the-mirror-next/`

**Version**: 2.1 (Complete - Context7 Verified)
**Date**: 2025-12-27

---

## Phase 1: Critical Bug Fix (FIRST)

### 1.1 Fix Auto-Refresh Toggle

**File**: `src/app/page.tsx`

**Problem**: Toggle button (line 219) updates state but no useEffect implements the refresh cycle.

**Implementation** (Context7 verified - uses useCallback pattern from React docs):

```typescript
// Line 12: UPDATE IMPORT (currently only imports useState)
import { useState, useEffect } from 'react';

// Add after line 136, before derived values
useEffect(() => {
  if (!autoRefresh || !marketOpen) return;

  let timeoutId: NodeJS.Timeout;
  let cancelled = false;

  const runRefresh = async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Auto-refresh failed:', error);
      // Continue the cycle even on error - don't break user expectation
    }

    if (!cancelled) {
      // Schedule next refresh only after current one completes
      timeoutId = setTimeout(runRefresh, 60000);
    }
  };

  // Start first refresh after 60 seconds (or immediately with runRefresh())
  timeoutId = setTimeout(runRefresh, 60000);

  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
}, [autoRefresh, marketOpen, refresh]);
```

**Why this pattern (Context7 verified)**:
- `refresh` is already wrapped in `useCallback` in useMarketData.ts (line 83) with empty deps - stable reference
- setTimeout over setInterval prevents overlapping API calls
- `cancelled` flag prevents state updates after unmount
- try/catch ensures cycle continues even on network errors

---

## Phase 2: Remove Dead Code (Simplifies Later Work)

### 2.1 Remove Duplicate/Non-functional Buttons

**File**: `src/app/page.tsx`

| Lines | Element | Reason |
|-------|---------|--------|
| 248-256 | API Refresh button | Duplicates "Refresh Data" button |
| 259-265 | Debug Charts button | No-op (just console.log) |
| 553-556 | Analyze Position FAB | No-op (just console.log) |

### 2.2 Remove Unused Icon Components

**File**: `src/app/page.tsx`

After removing the buttons above, delete:
- `ApiIcon` component (lines 82-97)
- `DebugIcon` component (lines 100-116)

---

## Phase 3: Fix Metadata & Fonts

### 3.1 Update Layout Metadata

**File**: `src/app/layout.tsx` (lines 16-19)

```typescript
export const metadata: Metadata = {
  title: "Man in the Mirror Strategy | Leveraged ETF Decay Dashboard",
  description: "Real-time monitoring dashboard for leveraged ETF decay trading strategy. Track VIX, TQQQ, SQQQ, and optimize entry timing.",
};
```

### 3.2 Remove Unused Font Imports AND Update Body

**File**: `src/app/layout.tsx`

**Note**: Noto Sans is imported via Google Fonts in `globals.css` line 1 - that remains the primary font.

**Step 1**: Remove lines 5-14 (Geist font definitions)

**Step 2**: Update body className (lines 28-30):
```typescript
// BEFORE
<body
  className={`${geistSans.variable} ${geistMono.variable} antialiased`}
>

// AFTER
<body className="antialiased">
```

**CRITICAL**: Both steps must be done together or the build will fail.

---

## Phase 4: Accessibility Improvements

### 4.0 Skip-to-Content Link (WCAG 2.4.1 Required)

**File**: `src/app/layout.tsx` (after opening `<body>` tag)

```tsx
<body className="antialiased">
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded focus:shadow-lg"
  >
    Skip to main content
  </a>
  {children}
</body>
```

**File**: `src/app/page.tsx` (on main container, around line 180)

```tsx
<main id="main-content" className="main-content">
```

### 4.1 Add SR-Only Utility Class

**File**: `src/app/globals.css`

Add at end of `@layer components`:
```css
/* Screen reader only utility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only.focus\:not-sr-only:focus {
  position: absolute;
  width: auto;
  height: auto;
  padding: 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### 4.2 Live Region for Data Updates

**File**: `src/app/page.tsx` (inside Dashboard component, before main return)

```tsx
// Add aria-live region for screen reader announcements
const getStatusMessage = () => {
  if (loading) return 'Updating market data...';
  if (error) return `Error: ${error}`;
  if (lastUpdated) return `Market data updated at ${formatTimestamp(lastUpdated)}`;
  return '';
};

// In the return JSX, add before main content:
<div
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
  role="status"
>
  {getStatusMessage()}
</div>
```

### 4.3 SVG Icon Accessibility

**File**: `src/app/page.tsx` (lines 45-80)

Add to all icon components (`RefreshIcon`, `AutoRefreshIcon`):
```tsx
<svg
  aria-hidden="true"
  focusable="false"
  className="icon-svg"
  ...
>
```

### 4.4 Button Accessibility (Context7 verified ARIA patterns)

**File**: `src/app/page.tsx`

| Line | Button | Add |
|------|--------|-----|
| ~219 | Auto-refresh | `role="switch" aria-checked={autoRefresh} aria-label="Toggle auto-refresh"` |
| ~238 | Refresh Data | Change `aria-label="refresh"` to `aria-label="Refresh market data"` |
| ~301 | Update | `aria-label="Save account balance"` |
| ~424 | ACTIVE toggle | `role="switch" aria-checked={positionActive} aria-label="Toggle position active status"` |

**Note**: Line numbers are approximate - search for element content if not found at exact line.

### 4.5 Form Input Accessibility

**File**: `src/app/page.tsx` (lines 294-299)

```tsx
<label htmlFor="account-size" className="sr-only">Account Balance</label>
<input
  id="account-size"
  type="number"
  className="input-field"
  value={accountSize}
  onChange={(e) => setAccountSize(Number(e.target.value))}
  aria-label="Account balance in dollars"
  placeholder="$"
/>
```

### 4.6 Table Accessibility

**File**: `src/app/page.tsx` (line ~443)

```tsx
<table className="position-table" aria-label="Current positions">
  <thead>
    <tr>
      <th scope="col">Symbol</th>
      <th scope="col">Shares</th>
      <th scope="col">Entry</th>
      <th scope="col">Current</th>
      <th scope="col">P&L</th>
    </tr>
  </thead>
  ...
```

**Note**: Removed redundant `role="table"` - tables have implicit table role per ARIA spec.

### 4.7 Chart Container Accessibility

**File**: `src/components/charts/VixChart.tsx` (line ~213)
```tsx
<div
  className={className}
  style={{ width: '100%', height: height }}
  data-testid="vix-chart"
  aria-label="VIX Index historical chart showing 30-day trend"
  role="img"
  tabIndex={0}
>
```

**File**: `src/components/charts/TqqqSqqqChart.tsx` (line ~222)
```tsx
<div
  className={className}
  style={{ width: '100%', height: height }}
  data-testid="tqqq-sqqq-chart"
  aria-label="TQQQ and SQQQ price comparison chart showing 30-day trend"
  role="img"
  tabIndex={0}
>
```

**Note**: Added `tabIndex={0}` so screen reader users can focus on chart containers.

### 4.8 Focus States

**File**: `src/app/globals.css`

Add after `.btn-control:disabled`:
```css
.btn-control:focus-visible {
  outline: 2px solid var(--primary-green);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(74, 124, 89, 0.2);
}

.btn-active:focus-visible,
.btn-update:focus-visible {
  outline: 2px solid var(--primary-green);
  outline-offset: 2px;
}

/* Ensure skip link is visible when focused */
a:focus-visible {
  outline: 2px solid var(--primary-green);
  outline-offset: 2px;
}
```

### 4.9 Reduced Motion Preference

**File**: `src/app/globals.css`

Add before responsive media queries:
```css
/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  .ghibli-card,
  .ghibli-chart,
  .btn-control,
  .btn-active,
  .fab {
    transition: none !important;
  }

  .ghibli-card:hover,
  .ghibli-chart:hover {
    transform: none !important;
  }

  .animate-spin {
    animation: none !important;
  }
}
```

---

## Phase 5: Connect Account Size Input (SSR-Safe)

### 5.1 Add localStorage Persistence (Hydration-Safe Pattern)

**File**: `src/app/page.tsx`

**Context7 verified**: This pattern prevents hydration mismatch by using useEffect for client-only localStorage access, matching Next.js official docs pattern.

```typescript
// Line 135: State with hydration flag
const [accountSize, setAccountSize] = useState<number>(3000);
const [isHydrated, setIsHydrated] = useState(false);

// Add after the auto-refresh useEffect
useEffect(() => {
  // Only run on client after hydration
  try {
    const stored = localStorage.getItem('accountSize');
    if (stored) {
      const parsed = Number(stored);
      if (!isNaN(parsed) && parsed > 0) {
        setAccountSize(parsed);
      }
    }
  } catch (error) {
    // localStorage may throw in incognito mode or if quota exceeded
    console.warn('Could not access localStorage:', error);
  }
  setIsHydrated(true);
}, []);

// Add handler function before the return statement
const handleUpdateAccountSize = () => {
  try {
    localStorage.setItem('accountSize', String(accountSize));
  } catch (error) {
    console.warn('Could not save to localStorage:', error);
  }
};
```

**Why this pattern**:
- Server renders default `3000`, client also starts with `3000` = no hydration mismatch
- useEffect runs only on client after hydration
- try/catch handles incognito mode and QuotaExceededError
- `isHydrated` flag available if you need conditional rendering

### 5.2 Connect Update Button

**File**: `src/app/page.tsx` (line ~301)

```tsx
<button
  className="btn-update"
  onClick={handleUpdateAccountSize}
  aria-label="Save account balance"
>
  Update
</button>
```

---

## Phase 6: Implement Placeholder Charts

### 6.1 Create Shared Types File

**Create**: `src/types/chart-types.ts`

```typescript
export interface PriceDataPoint {
  date: string;
  close: number;
}

export interface DecayDataPoint {
  date: string;
  decay: number;
  tqqqPrice: number;
  sqqqPrice: number;
}

export interface PerformanceDataPoint {
  date: string;
  cumulativePnL: number;
  dailyReturn: number;
}
```

### 6.2 Create DecayOpportunityChart

**Create**: `src/components/charts/DecayOpportunityChart.tsx`

**CRITICAL** (Context7 verified): Must include `'use client'` directive and use dynamic import for Plotly.

```typescript
'use client';

import dynamic from 'next/dynamic';
import type { PriceDataPoint } from '@/types/chart-types';
import { createTraceConfig, createLayoutConfig } from '@/lib/chart-config';

// Dynamic import with SSR disabled (Context7 verified pattern)
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="chart-loading">Loading chart...</div>
});

interface DecayOpportunityChartProps {
  tqqqData: PriceDataPoint[];
  sqqqData: PriceDataPoint[];
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
}

export function DecayOpportunityChart({
  tqqqData,
  sqqqData,
  height = 300,
  className = 'ghibli-chart',
  loading = false,
  error,
}: DecayOpportunityChartProps) {
  if (loading) {
    return (
      <div className={className} style={{ height }}>
        <div className="chart-loading">Loading decay data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ height }}>
        <div className="chart-error">{error}</div>
      </div>
    );
  }

  if (!tqqqData.length || !sqqqData.length) {
    return (
      <div className={className} style={{ height }}>
        <div className="chart-empty">No decay data available</div>
      </div>
    );
  }

  // Calculate decay: (tqqqPrice * sqqqPrice) / initialProduct - 1
  const initialProduct = tqqqData[0].close * sqqqData[0].close;
  const decayData = tqqqData.map((tqqq, i) => {
    const sqqq = sqqqData[i];
    if (!sqqq) return { date: tqqq.date, decay: 0 };
    const currentProduct = tqqq.close * sqqq.close;
    const decay = (currentProduct / initialProduct - 1) * 100;
    return { date: tqqq.date, decay };
  });

  const trace = createTraceConfig({
    x: decayData.map(d => d.date),
    y: decayData.map(d => d.decay),
    name: 'Cumulative Decay %',
    type: 'scatter',
    mode: 'lines',
    fill: 'tozeroy',
  });

  const layout = createLayoutConfig({
    title: 'Decay Opportunity',
    height,
    yaxis: { title: 'Decay %' },
  });

  return (
    <div
      className={className}
      style={{ width: '100%', height }}
      role="img"
      aria-label="Decay opportunity chart showing cumulative leveraged ETF decay"
      tabIndex={0}
    >
      <Plot
        data={[trace]}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
```

### 6.3 Create StrategyPerformanceChart

**Create**: `src/components/charts/StrategyPerformanceChart.tsx`

```typescript
'use client';

import dynamic from 'next/dynamic';
import type { PriceDataPoint } from '@/types/chart-types';
import { createTraceConfig, createLayoutConfig } from '@/lib/chart-config';

const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div className="chart-loading">Loading chart...</div>
});

interface StrategyPerformanceChartProps {
  tqqqData: PriceDataPoint[];
  sqqqData: PriceDataPoint[];
  height?: number;
  className?: string;
  loading?: boolean;
  error?: string;
}

export function StrategyPerformanceChart({
  tqqqData,
  sqqqData,
  height = 300,
  className = 'ghibli-chart',
  loading = false,
  error,
}: StrategyPerformanceChartProps) {
  if (loading) {
    return (
      <div className={className} style={{ height }}>
        <div className="chart-loading">Loading performance data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ height }}>
        <div className="chart-error">{error}</div>
      </div>
    );
  }

  if (!tqqqData.length || !sqqqData.length) {
    return (
      <div className={className} style={{ height }}>
        <div className="chart-empty">No performance data available</div>
      </div>
    );
  }

  // Calculate cumulative P&L from decay strategy
  // Simple model: equal weight TQQQ + SQQQ, rebalanced daily
  let cumulativePnL = 0;
  const performanceData = tqqqData.map((tqqq, i) => {
    if (i === 0) return { date: tqqq.date, pnl: 0 };

    const prevTqqq = tqqqData[i - 1];
    const prevSqqq = sqqqData[i - 1];
    const sqqq = sqqqData[i];

    if (!prevSqqq || !sqqq) return { date: tqqq.date, pnl: cumulativePnL };

    const tqqqReturn = (tqqq.close - prevTqqq.close) / prevTqqq.close;
    const sqqqReturn = (sqqq.close - prevSqqq.close) / prevSqqq.close;

    // Equal weight strategy return
    const dailyReturn = (tqqqReturn + sqqqReturn) / 2;
    cumulativePnL += dailyReturn * 100;

    return { date: tqqq.date, pnl: cumulativePnL };
  });

  const trace = createTraceConfig({
    x: performanceData.map(d => d.date),
    y: performanceData.map(d => d.pnl),
    name: 'Cumulative P&L %',
    type: 'scatter',
    mode: 'lines',
    fill: 'tozeroy',
  });

  const layout = createLayoutConfig({
    title: 'Strategy Performance',
    height,
    yaxis: { title: 'Cumulative P&L %' },
  });

  return (
    <div
      className={className}
      style={{ width: '100%', height }}
      role="img"
      aria-label="Strategy performance chart showing cumulative profit and loss"
      tabIndex={0}
    >
      <Plot
        data={[trace]}
        layout={layout}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
```

### 6.4 Replace Placeholders in page.tsx

**File**: `src/app/page.tsx` (lines 391-416)

```tsx
// Import new components at top
import { DecayOpportunityChart } from '@/components/charts/DecayOpportunityChart';
import { StrategyPerformanceChart } from '@/components/charts/StrategyPerformanceChart';

// Replace placeholder divs
<DecayOpportunityChart
  tqqqData={tqqqChartData}
  sqqqData={sqqqChartData}
  loading={loading && !historicalData}
  error={error ?? undefined}
/>

<StrategyPerformanceChart
  tqqqData={tqqqChartData}
  sqqqData={sqqqChartData}
  loading={loading && !historicalData}
  error={error ?? undefined}
/>
```

---

## Phase 7: Typography Hierarchy

### 7.1 Update All Label Styles to Sentence Case

**File**: `src/app/globals.css`

Update ALL these selectors (currently have `text-transform: uppercase`):

```css
/* Line ~228 */
.info-item label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: none; /* Changed from uppercase */
  letter-spacing: 0.3px; /* Reduced from 0.5px */
}

/* Line ~306 */
.risk-item label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: 0.3px;
}

/* Line ~340 */
.performance-item label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: 0.3px;
}

/* Line ~395 */
.position-table th {
  text-align: left;
  padding: 8px 6px;
  font-size: 0.75rem; /* Slightly larger */
  color: var(--text-secondary);
  text-transform: none;
  letter-spacing: 0.3px;
  border-bottom: 1px solid var(--divider);
}

/* Line ~503 */
.metric-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  margin-bottom: 8px;
  color: var(--text-secondary);
}
```

### 7.2 Add Value Hierarchy Classes

**File**: `src/app/globals.css`

```css
/* Primary values - largest, most prominent */
.value-primary {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary-green);
}

/* Secondary values */
.value-secondary {
  font-size: 1.5rem;
  font-weight: 600;
}

/* Entry Score highlight container */
.entry-score-highlight {
  background: rgba(74, 124, 89, 0.1);
  border-radius: 8px;
  padding: 8px 16px;
}
```

---

## Phase 8: Standardize Card Heights & Spacing

### 8.1 Card Consistency

**File**: `src/app/globals.css`

```css
/* Line ~110 - Update gap */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 1.25rem; /* Changed from 1.5rem for tighter layout */
  padding: 0 1.5rem 2rem;
  max-width: 1800px;
  margin: 0 auto;
  align-items: start; /* Cards align to top, stretch to content */
}

/* Line ~177 - Update min-height */
.ghibli-chart {
  /* ... existing styles ... */
  min-height: 480px; /* Changed from 400px */
}
```

---

## Phase 9: Table Improvements

### 9.1 Add Zebra Striping & Hover

**File**: `src/app/globals.css`

Add after `.position-table td.negative`:
```css
.position-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.3);
}

.position-table tbody tr:hover {
  background: rgba(74, 124, 89, 0.05);
  transition: background 0.15s ease;
}
```

### 9.2 Add Neutral P&L Class

**File**: `src/app/globals.css`

Add after `.position-table td.negative`:
```css
.position-table td.neutral {
  color: var(--text-secondary);
  font-weight: 500;
}
```

### 9.3 Add Empty State Styling

**File**: `src/app/globals.css`

```css
.position-table .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}
```

### 9.4 Dynamic P&L Calculation with Empty State

**File**: `src/app/page.tsx`

Add before the table (around line 440):
```typescript
// Position data (replace with actual state management)
const positions = [
  { symbol: 'TQQQ', shares: 5, entryPrice: tqqqPrice, currentPrice: tqqqPrice },
  { symbol: 'SQQQ', shares: 5, entryPrice: sqqqPrice, currentPrice: sqqqPrice },
];

const getPnlClass = (pnl: number) => {
  if (pnl > 0.01) return 'positive';
  if (pnl < -0.01) return 'negative';
  return 'neutral';
};

const formatPnl = (pnl: number) => {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}$${pnl.toFixed(2)}`;
};
```

Update table body:
```tsx
<tbody>
  {positions.length === 0 ? (
    <tr>
      <td colSpan={5} className="empty-state">
        No active positions
      </td>
    </tr>
  ) : (
    positions.map((pos) => {
      const pnl = (pos.currentPrice - pos.entryPrice) * pos.shares;
      return (
        <tr key={pos.symbol}>
          <td>{pos.symbol}</td>
          <td>{pos.shares}</td>
          <td>${pos.entryPrice.toFixed(2)}</td>
          <td>${pos.currentPrice.toFixed(2)}</td>
          <td className={getPnlClass(pnl)}>{formatPnl(pnl)}</td>
        </tr>
      );
    })
  )}
</tbody>
```

---

## Phase 10: Button Style Consolidation

### 10.1 Remove Inline Styles

**File**: `src/app/page.tsx`

Search for any `style={{...}}` props on buttons and remove them. All styling should come from CSS classes.

---

## Phase 11: Color Documentation (Optional)

### 11.1 Document Color Sources

Colors exist in 3 places - for future consolidation:

| Source | Purpose | Priority |
|--------|---------|----------|
| `globals.css` CSS variables | Primary source | HIGH |
| `tailwind.config.ts` | Theme extensions | MEDIUM |
| `lib/chart-config/index.ts` | Chart colors | DO NOT MODIFY |

**Note**: Chart colors must stay separate due to Plotly requirements.

### 11.2 Color Contrast Verification

**IMPORTANT**: Verify these color combinations meet WCAG AA (4.5:1 contrast ratio):

| Foreground | Background | Usage |
|------------|------------|-------|
| `--positive` (#52c41a) | `--card-bg` | P&L positive values |
| `--negative` (#ff4d4f) | `--card-bg` | P&L negative values |
| `--text-primary` (#3d3d3f) | `--card-bg` | Body text |
| `--text-secondary` (#666) | `--card-bg` | Labels |

Use https://webaim.org/resources/contrastchecker/ to verify.

---

## Critical Files Summary

| File | Changes |
|------|---------|
| `src/app/page.tsx` | useEffect import, auto-refresh w/error handling, dead code removal, accessibility (skip link target, aria-live, ARIA attrs), account persistence, P&L calc, empty state |
| `src/app/globals.css` | sr-only, focus states, reduced motion, typography, tables, empty state |
| `src/app/layout.tsx` | Metadata, remove fonts + update body, skip-to-content link |
| `src/components/charts/VixChart.tsx` | data-testid, aria-label, role, tabIndex |
| `src/components/charts/TqqqSqqqChart.tsx` | data-testid, aria-label, role, tabIndex |
| `src/types/chart-types.ts` | CREATE - shared types |
| `src/components/charts/DecayOpportunityChart.tsx` | CREATE - with 'use client' and dynamic import |
| `src/components/charts/StrategyPerformanceChart.tsx` | CREATE - with 'use client' and dynamic import |

---

## Testing Requirements

### After Each Phase:
1. `npm run build` - Verify no build errors
2. `npm test` - Verify existing tests pass
3. Manual browser verification
4. Accessibility audit with browser DevTools (Lighthouse)

### Specific Tests to Add:
- [ ] Auto-refresh interval behavior (with error recovery)
- [ ] Auto-refresh continues after API failure
- [ ] localStorage persistence across page reloads
- [ ] localStorage error handling in incognito mode
- [ ] DecayOpportunityChart renders with data
- [ ] DecayOpportunityChart shows empty state without data
- [ ] StrategyPerformanceChart renders with data
- [ ] StrategyPerformanceChart shows empty state without data
- [ ] Keyboard navigation works for all interactive elements
- [ ] Tab order follows visual layout
- [ ] Skip-to-content link works
- [ ] Screen reader announces data updates via aria-live
- [ ] Focus indicators visible on all interactive elements
- [ ] No hydration mismatch warnings in console
- [ ] Color contrast passes WCAG AA (4.5:1)
- [ ] Reduced motion preference respected

### Accessibility Testing Tools:
- Lighthouse (Chrome DevTools)
- axe DevTools browser extension
- WAVE browser extension
- Manual keyboard-only navigation test
- VoiceOver (macOS) or NVDA (Windows) screen reader test

---

## Execution Order (Dependency-Aware)

1. **Phase 1** - Fix auto-refresh (includes useEffect import fix + error handling)
2. **Phase 2** - Remove dead code (simplifies file)
3. **Phase 3** - Fix metadata & fonts (must be done together)
4. **Phase 4** - Accessibility (sr-only class needed for inputs, skip link, aria-live)
5. **Phase 5** - Account size persistence (needs useEffect from Phase 1, hydration-safe)
6. **Phase 6** - Implement placeholder charts (needs 'use client' + dynamic import)
7. **Phase 7** - Typography hierarchy
8. **Phase 8** - Card heights & spacing
9. **Phase 9** - Table improvements (includes empty state)
10. **Phase 10** - Button consolidation
11. **Phase 11** - Color documentation (optional)

---

## Removed from Original Plan

| Item | Reason |
|------|--------|
| Card Hover Effects | Already exists in globals.css lines 139-145 |
| `role="table"` on table | Redundant - implicit role per ARIA spec |

---

## Changes from v1 → v2.1

### v2.0 Changes:
1. Added `useEffect` import requirement
2. Fixed SSR hydration issue in localStorage approach
3. Added body className update when removing fonts
4. Removed duplicate Phase 11 (card hover)
5. Added setTimeout pattern instead of setInterval
6. Added complete list of uppercase label selectors
7. Added P&L calculation logic
8. Added shared types file requirement
9. Added focus states for accessibility
10. Added reduced motion media query
11. Added role="switch" for toggle buttons
12. Corrected execution order based on dependencies

### v2.1 Changes (Context7 Verified):
13. Added error handling with try/catch in auto-refresh (prevents cycle stopping)
14. Added `cancelled` flag pattern for cleanup
15. Added Phase 4.0: Skip-to-content link (WCAG 2.4.1 required)
16. Added Phase 4.2: aria-live region for data update announcements
17. Added `tabIndex={0}` to chart containers for keyboard access
18. Removed redundant `role="table"` from table element
19. Added `isHydrated` flag for optional conditional rendering
20. Added localStorage try/catch for incognito mode handling
21. Added `'use client'` directive requirement for new chart components
22. Added dynamic import with `ssr: false` for Plotly (Context7 verified)
23. Added loading/error/empty states for new chart components
24. Added Phase 9.3: Empty state styling for tables
25. Added Phase 9.4: Empty state handling in table JSX
26. Added color contrast verification checklist
27. Expanded testing requirements with accessibility tools
28. Added note that Noto Sans is the actual font (globals.css line 1)
29. Noted line numbers are approximate - search by content

---

## Context7 Documentation Sources Used

- Next.js: Client components, useEffect patterns, hydration-safe localStorage
- Next.js: Dynamic imports with `ssr: false` for client-only components
- React: useCallback patterns for stable function references
- React: ARIA attributes usage in JSX
- React-Plotly.js: Dynamic import pattern for SSR compatibility
