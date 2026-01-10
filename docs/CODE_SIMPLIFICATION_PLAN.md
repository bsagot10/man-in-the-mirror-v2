# Code Simplification Plan: Man-in-the-Mirror V2

**Version:** 2.0 (Corrected)
**Last Updated:** 2026-01-10
**Status:** Ready for Execution

---

## Executive Summary

**Goal:** Simplify code for clarity while preserving 100% functionality using BMAD agent orchestration with Context7, Chrome DevTools, and tmux sessions.

**Target:** `/Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2`

| Metric | Value |
|--------|-------|
| Total Source Files | 20 TypeScript/TSX files |
| Total Lines (src/) | ~4,660 lines |
| Test Cases | ~492 (excellent safety net) |
| Files >200 lines | 7 files (primary targets) |

---

## Is This a Good Idea?

**Verdict: YES, with phased approach**

**Strengths:**
- 492 test cases provide excellent safety net
- Well-documented CLAUDE.md with coding standards
- Enterprise-grade architecture already in place
- TDD workflow enforced

**Risks to Mitigate:**
- `client.ts` (1,102 lines) - core data engine, HIGH risk
- `page.tsx` (888 lines) - main dashboard, MEDIUM risk
- Production-ready code - don't break what works
- Financial data accuracy is critical

---

## Phase 0: Baseline Metrics (REQUIRED FIRST)

Before any changes, collect baseline metrics:

```bash
cd "/Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2"

# Line counts by file
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} \; | sort -n

# Run full test suite
bun run test

# Verify build works
bun run build
```

### Current File Sizes (Verified)

| Priority | File | Lines | Risk | Batch |
|----------|------|-------|------|-------|
| HIGH | src/lib/market-data/client.ts | 1,102 | HIGH | 6 |
| HIGH | src/app/page.tsx | 888 | MEDIUM | 5 |
| MEDIUM | src/components/charts/StrategyPerformanceChart.tsx | 362 | LOW | 2 |
| MEDIUM | src/components/charts/DecayOpportunityChart.tsx | 309 | LOW | 2 |
| MEDIUM | src/components/charts/TqqqSqqqChart.tsx | 262 | LOW | 2 |
| MEDIUM | src/components/charts/VixChart.tsx | 252 | LOW | 2 |
| MEDIUM | src/lib/chart-config/index.ts | 237 | LOW | 1 |
| MEDIUM | src/components/dashboard/MarketMetrics.tsx | 225 | LOW | 2 |
| MEDIUM | src/lib/market-analysis/entryScore.ts | 193 | LOW | 3 |
| MEDIUM | src/components/dashboard/EntryScoreDisplay.tsx | 184 | LOW | 2 |
| LOW | src/hooks/useMarketData.ts | 149 | LOW | 3 |
| LOW | src/types/chart-types.ts | 106 | LOW | 1 |
| LOW | src/lib/data-processing/removeFlatSegments.ts | 92 | LOW | 1 |
| LOW | API routes (5 files) | 35-64 each | LOW | 4 |

---

## Phase 1: Setup & Environment

### Step 1.1: Create Safety Branch

```bash
cd "/Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2"
git checkout -b simplification/phase-1
```

### Step 1.2: Start Tmux Development Sessions

```bash
# Terminal 1: Dev server (also shows TypeScript errors)
tmux new-session -d -s frontend 'cd "/Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2" && bun run dev:turbo'

# Terminal 2: Test watcher
tmux new-session -d -s tests 'cd "/Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2" && bun run test:watch'

# Monitor logs
tmux capture-pane -t tests -p | tail -50
tmux capture-pane -t frontend -p | tail -50
```

### Step 1.3: Verify Baseline

```bash
bun run test        # All ~492 tests should pass
bun run typecheck   # No TypeScript errors
bun run build       # Production build succeeds
```

---

## Phase 2: BMAD Agent Orchestration

### Simplified Agent Workflow

```
[Explore Agent] → Audit codebase complexity
       ↓
[code-simplifier Agent] → Apply simplifications (file-by-file)
       ↓
[qa-test-engineer Agent] → Verify tests pass
       ↓
[component-standards-reviewer Agent] → Check CLAUDE.md compliance
```

### Agent Dispatch Template

For each batch:

```markdown
## Subagent Task: Simplify [Category]

**Context:**
- Project: man-in-the-mirror-v2 (Next.js 14 + TypeScript)
- CLAUDE.md: /Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2/CLAUDE.md
- Patterns: /Volumes/T7 K/Documents/Graph1/man-in-the-mirror-v2/docs/PATTERNS.md

**Your Task:**
1. Read the file(s) specified
2. Apply code-simplifier patterns:
   - Replace nested ternaries with if/else or switch
   - Extract magic numbers to named constants
   - Improve variable naming for clarity
   - Remove redundant comments
   - Reduce unnecessary nesting
3. Run tests after each change
4. Commit atomically

**Files:** [specific file paths]

**Constraints:**
- PRESERVE all functionality
- MAINTAIN all exports
- FOLLOW CLAUDE.md standards exactly
- NO behavior changes

**Report:** Summary of changes made, tests passed, any concerns
```

---

## Phase 3: Execution Batches

### Batch 1: Low-Risk Utilities (Safe Start)

**Files:**
- `src/lib/data-processing/removeFlatSegments.ts` (92 lines)
- `src/lib/chart-config/index.ts` (237 lines)
- `src/types/chart-types.ts` (106 lines)

**Agent:** code-simplifier

**Verification:**
```bash
bun run test
bun run typecheck
```

**Expected Changes:**
- Extract magic numbers to named constants
- Improve variable naming
- Simplify complex expressions

---

### Batch 2: React Components (ALL Charts + Dashboard)

**Files:**
- `src/components/dashboard/MarketMetrics.tsx` (225 lines)
- `src/components/dashboard/EntryScoreDisplay.tsx` (184 lines)
- `src/components/charts/VixChart.tsx` (252 lines)
- `src/components/charts/TqqqSqqqChart.tsx` (262 lines)
- `src/components/charts/DecayOpportunityChart.tsx` (309 lines)
- `src/components/charts/StrategyPerformanceChart.tsx` (362 lines)

**Agent:** code-simplifier + component-standards-reviewer

**Verification:**
```bash
bun run test
bun run typecheck

# Visual verification with Chrome DevTools
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })
mcp__chrome-devtools__take_screenshot({ fullPage: true })
```

**Expected Changes:**
- Consolidate duplicate chart configuration
- Extract shared helper functions
- Improve component prop interfaces
- Simplify conditional rendering

---

### Batch 3: Hooks & Data Layer

**Files:**
- `src/hooks/useMarketData.ts` (149 lines)
- `src/lib/market-analysis/entryScore.ts` (193 lines)

**Agent:** code-simplifier

**Verification:**
```bash
bun run test
INTEGRATION_TESTS=true bun run test -- realApiResponses.test.ts
```

**Expected Changes:**
- Simplify complex data transformations
- Improve type definitions
- Extract reusable utilities

---

### Batch 4: API Routes

**Files:**
- `src/app/api/market-data/route.ts` (45 lines)
- `src/app/api/historical-data/route.ts` (52 lines)
- `src/app/api/entry-score/route.ts` (64 lines)
- `src/app/api/health/route.ts` (56 lines)
- `src/app/api/metrics/route.ts` (35 lines)

**Agent:** code-simplifier + backend-engineer (review)

**Verification:**
```bash
bun run test
curl http://localhost:3000/api/health
curl http://localhost:3000/api/market-data
```

**Expected Changes:**
- Standardize error handling patterns
- Extract common response utilities
- Improve type safety

---

### Batch 5: Dashboard Page (HIGH IMPACT)

**Files:**
- `src/app/page.tsx` (888 lines) - **SECOND LARGEST FILE**

**Agent:** code-simplifier (with extra review)

**Extractions to Create:**

1. **`src/lib/market-analysis/positionSizing.ts`** (NEW)
   - Move `PositionSizing` interface
   - Move `calculatePositionSizing` function

2. **`src/hooks/usePersistedState.ts`** (NEW)
   - Extract localStorage hydration logic
   - Reusable hook for persisted state

3. **`src/hooks/useAutoRefresh.ts`** (NEW)
   - Extract 60-second auto-refresh logic
   - Configurable refresh interval

4. **`src/lib/market-analysis/vixRegime.ts`** (NEW or add to existing)
   - Move `determineVixRegime` function
   - Move `determineMarketTrend` function

**Verification:**
```bash
bun run test
bun run typecheck
bun run build

# Visual verification
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })
mcp__chrome-devtools__take_screenshot({ fullPage: true })
```

**Risk:** MEDIUM (Dashboard.test.tsx has 416 lines of tests)

**Expected Reduction:** 888 lines → ~400-500 lines (45-55% reduction)

---

### Batch 6: Core Engine (CAREFUL!)

**Files:**
- `src/lib/market-data/client.ts` (1,102 lines)

**Agent:** code-simplifier (with thorough review)

**Approach:**
- DO NOT change API contracts
- Focus on internal simplification only
- Preserve all caching logic
- Keep fallback chain intact

**Verification:**
```bash
bun run test  # All 492 tests must pass
bun run typecheck
bun run build
INTEGRATION_TESTS=true bun run test -- realApiResponses.test.ts

# Visual verification of data accuracy
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })
mcp__chrome-devtools__take_screenshot({ fullPage: true })

# Performance verification
mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })
```

**Risk:** HIGH - This is the data engine. Triple-check everything.

---

## Phase 4: Context7 Integration

Before simplifying each file, query Context7 for best practices:

```javascript
// Next.js 14 App Router patterns
mcp__context7__resolve-library-id({ libraryName: "next.js", query: "App Router best practices" })
mcp__context7__query-docs({ libraryId: "/vercel/next.js", query: "API routes in App Router" })

// React 18 hooks patterns
mcp__context7__resolve-library-id({ libraryName: "react", query: "custom hooks best practices" })
mcp__context7__query-docs({ libraryId: "/facebook/react", query: "useEffect cleanup patterns" })

// SWR caching patterns
mcp__context7__resolve-library-id({ libraryName: "swr", query: "caching strategies" })
mcp__context7__query-docs({ libraryId: "/vercel/swr", query: "revalidation patterns" })

// Plotly.js React integration
mcp__context7__resolve-library-id({ libraryName: "plotly.js", query: "React integration" })

// TypeScript strict patterns
mcp__context7__resolve-library-id({ libraryName: "typescript", query: "strict type patterns" })
```

---

## Phase 5: Chrome DevTools Visual Verification

### Before/After Screenshot Workflow

```javascript
// 1. BEFORE: Take baseline screenshot
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })
mcp__chrome-devtools__take_screenshot({ fullPage: true, filePath: "before-batch-X.png" })

// 2. APPLY: Make simplification changes

// 3. AFTER: Take comparison screenshot
mcp__chrome-devtools__take_screenshot({ fullPage: true, filePath: "after-batch-X.png" })

// 4. VERIFY:
// - No visual regressions
// - Charts render correctly
// - Data displays accurately
// - Responsive behavior intact
```

### Performance Verification

```javascript
mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })
// Wait for page load
mcp__chrome-devtools__performance_stop_trace()
// Analyze Core Web Vitals - ensure no degradation
```

---

## Verification Checklist

### After Each Batch:
- [ ] `bun run test` - All tests pass
- [ ] `bun run typecheck` - No TypeScript errors
- [ ] `bun run lint` - No ESLint warnings
- [ ] `bun run build` - Production build succeeds
- [ ] Visual inspection - No UI regressions
- [ ] Performance - No degradation in load times

### Final Verification:
- [ ] `just preflight` - Full preflight check
- [ ] Git commit with descriptive message
- [ ] Documentation updated if patterns changed

---

## Metrics to Track

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Total Lines (src/) | ~4,660 | TBD | -15-25% |
| page.tsx | 888 | TBD | <500 |
| client.ts | 1,102 | TBD | <900 |
| Avg Function Length | TBD | TBD | <20 lines |
| Test Count | ~492 | ~492 | Maintain |
| Build Time | TBD | TBD | No increase |

---

## Risk Mitigation

1. **Git Safety:** Create branch before starting
   ```bash
   git checkout -b simplification/phase-1
   ```

2. **Rollback Plan:** If any batch fails tests, revert immediately
   ```bash
   git checkout -- .
   ```

3. **Incremental Commits:** One commit per logical change
   ```bash
   git commit -m "refactor(page): extract positionSizing to lib/"
   git commit -m "refactor(page): extract useAutoRefresh hook"
   ```

4. **No Scope Creep:** Only simplification, no new features

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `bun run test` | Run all tests |
| `bun run test:watch` | Watch mode for tests |
| `bun run typecheck` | TypeScript validation |
| `bun run lint` | ESLint check |
| `bun run build` | Production build |
| `bun run preflight` | typecheck + lint + test |
| `just preflight` | Full validation (REQUIRED before completion) |

---

## New Files to Create

During Batch 5 (page.tsx simplification):

```
src/
├── hooks/
│   ├── usePersistedState.ts    # NEW: localStorage persistence
│   └── useAutoRefresh.ts       # NEW: Auto-refresh logic
└── lib/
    └── market-analysis/
        ├── positionSizing.ts   # NEW: Position sizing logic
        └── vixRegime.ts        # NEW: VIX regime helpers
```

---

## User Preferences

- **Starting Point:** Batch 1 - Low-Risk Utilities (safe start)
- **Intensity:** Conservative (only obvious improvements, preserve abstractions)
- **Autonomy:** Checkpoint after each batch (review before proceeding)

---

## Ready to Execute

This plan provides a safe, systematic approach to simplifying your codebase using:
- BMAD agent orchestration
- code-simplifier agent
- Context7 for documentation lookups
- Chrome DevTools for visual verification
- tmux for development session management

All changes preserve functionality and follow your CLAUDE.md standards.

**Start with:** `just preflight` to verify baseline, then proceed to Batch 1.
