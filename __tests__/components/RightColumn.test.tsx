/**
 * TDD Tests for RightColumn Component
 *
 * Focused on the Fidelity Implementation Guide market assessment text:
 * the signal is computed on the UNROUNDED total (strict > 60 / > 40), while
 * the displayed total is rounded. The wording must never assert an arithmetic
 * relation ("is above 60") that the rounded number can contradict.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { RightColumn } from '@/components/dashboard/RightColumn';
import type { PositionSizing } from '@/lib/market-analysis/positionSizing';

const baseSizing: PositionSizing = {
  allocationPercent: 30,
  allocationAmount: 900,
  tqqqShares: 5,
  sqqqShares: 5,
  totalInvestment: 900,
  marginRequired: 450,
  vixRegimeLabel: 'Low',
};

const baseProps = {
  positions: [],
  positionActive: false,
  setPositionActive: vi.fn(),
  positionEntryDate: '2026-06-01',
  setPositionEntryDate: vi.fn(),
  fetchHistoricalPrices: vi.fn().mockResolvedValue(undefined),
  setStoredEntryPrices: vi.fn(),
  fetchingHistoricalPrices: false,
  historicalActualDate: null,
  historicalPricesError: null,
  entryScore: null,
  loading: false,
  positionSizing: baseSizing,
  committedSizing: null,
  vixValue: 18,
  tqqqPrice: 80,
  sqqqPrice: 35,
};

function makeEntryScore(total: number, signal: string) {
  return { total, signal, volatilityScore: 30, trendScore: 30, decayScore: 0.41 };
}

describe('RightColumn Market Assessment Text', () => {
  it('ENTER text does not contradict a rounded boundary total (60 displayed, signal ENTER)', () => {
    // Unrounded total 60.41 signals ENTER but displays as 60 — the text must
    // not claim "is above threshold of 60"
    render(<RightColumn {...baseProps} entryScore={makeEntryScore(60, 'ENTER')} />);
    expect(screen.getByText(/Entry score \(60\/90\) — entry conditions met \(threshold 60\)/)).toBeInTheDocument();
    expect(screen.queryByText(/is above threshold/)).not.toBeInTheDocument();
  });

  it('WATCH text references the entry threshold without an arithmetic claim', () => {
    render(<RightColumn {...baseProps} entryScore={makeEntryScore(41, 'WATCH')} />);
    expect(screen.getByText(/Entry score \(41\/90\) — approaching entry threshold \(60\)/)).toBeInTheDocument();
  });

  it('WAIT text references the entry threshold without an arithmetic claim', () => {
    render(<RightColumn {...baseProps} entryScore={makeEntryScore(22, 'WAIT')} />);
    expect(screen.getByText(/Entry score \(22\/90\) — below entry threshold \(60\)/)).toBeInTheDocument();
  });

  it('WAIT text shows 0 when entry score is unavailable', () => {
    render(<RightColumn {...baseProps} entryScore={null} />);
    expect(screen.getByText(/Entry score \(0\/90\) — below entry threshold \(60\)/)).toBeInTheDocument();
  });
});

describe('RightColumn entry date picker max', () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = 'America/New_York';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-24T01:08:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  });

  it('caps the date input at the local day, not the UTC day', () => {
    const { container } = render(<RightColumn {...baseProps} />);
    const input = container.querySelector('input[type="date"]');
    expect(input).toHaveAttribute('max', '2026-11-23');
  });
});

describe('RightColumn position toggle button', () => {
  const getToggle = () => screen.getByRole('switch', { name: /toggle position active status/i });

  it('renders an INACTIVE, non-green state when positionActive is false', () => {
    render(<RightColumn {...baseProps} positionActive={false} />);
    const toggle = getToggle();
    expect(toggle).toHaveTextContent('INACTIVE');
    expect(toggle.textContent).not.toContain('⚡');
    expect(toggle).toHaveClass('btn-active');
    expect(toggle).toHaveClass('inactive');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle.getAttribute('title')).toMatch(/new position at current prices/i);
  });

  it('renders the green ACTIVE state when positionActive is true', () => {
    render(<RightColumn {...baseProps} positionActive={true} />);
    const toggle = getToggle();
    expect(toggle).toHaveTextContent('⚡ ACTIVE');
    expect(toggle).not.toHaveClass('inactive');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls setPositionActive(true) when clicked while inactive', () => {
    const setPositionActive = vi.fn();
    render(<RightColumn {...baseProps} positionActive={false} setPositionActive={setPositionActive} />);
    fireEvent.click(getToggle());
    expect(setPositionActive).toHaveBeenCalledWith(true);
  });
});

describe('RightColumn toggle when entry is blocked', () => {
  const getToggle = () => screen.getByRole('switch', { name: /toggle position active status/i });
  const reason = 'TQQQ and SQQQ prices are from different dates — refresh before entering.';

  it('disables the inactive toggle and shows the reason as title', () => {
    render(<RightColumn {...baseProps} positionActive={false} entryBlockReason={reason} />);
    expect(getToggle()).toBeDisabled();
    expect(getToggle()).toHaveAttribute('title', reason);
  });

  it('keeps the active toggle enabled so turning off is allowed', () => {
    render(<RightColumn {...baseProps} positionActive={true} entryBlockReason={reason} />);
    expect(getToggle()).not.toBeDisabled();
  });
});
