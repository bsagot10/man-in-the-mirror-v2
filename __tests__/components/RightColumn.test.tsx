/**
 * TDD Tests for RightColumn Component
 *
 * Focused on the Fidelity Implementation Guide market assessment text:
 * the signal is computed on the UNROUNDED total (strict > 60 / > 40), while
 * the displayed total is rounded. The wording must never assert an arithmetic
 * relation ("is above 60") that the rounded number can contradict.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
