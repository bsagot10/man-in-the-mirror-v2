/**
 * TDD Tests for MarketMetrics Component
 *
 * Tests the market conditions display component showing:
 * - Entry Score
 * - VIX Index value
 * - Market Trend indicator
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MarketMetrics } from '@/components/dashboard/MarketMetrics';

describe('MarketMetrics Component', () => {
  describe('Rendering', () => {
    it('renders the component', () => {
      render(<MarketMetrics />);
      expect(screen.getByTestId('market-metrics')).toBeInTheDocument();
    });

    it('renders the section header', () => {
      render(<MarketMetrics />);
      expect(screen.getByText(/MARKET CONDITIONS/i)).toBeInTheDocument();
    });
  });

  describe('Entry Score Display', () => {
    it('shows entry score value when provided', () => {
      render(<MarketMetrics entryScore={75} />);
      expect(screen.getByTestId('entry-score-value')).toHaveTextContent('75/110');
    });

    it('shows placeholder when no entry score', () => {
      render(<MarketMetrics />);
      expect(screen.getByTestId('entry-score-value')).toHaveTextContent('-');
    });

    it('shows ENTER signal for score >= 70', () => {
      render(<MarketMetrics entryScore={75} signal="ENTER" />);
      expect(screen.getByText('ENTER')).toBeInTheDocument();
    });

    it('shows WATCH signal for score 50-69', () => {
      render(<MarketMetrics entryScore={60} signal="WATCH" />);
      expect(screen.getByText('WATCH')).toBeInTheDocument();
    });

    it('shows WAIT signal for score < 50', () => {
      render(<MarketMetrics entryScore={40} signal="WAIT" />);
      expect(screen.getByText('WAIT')).toBeInTheDocument();
    });

    it('applies correct color for ENTER signal', () => {
      render(<MarketMetrics entryScore={75} signal="ENTER" />);
      const signalElement = screen.getByTestId('entry-signal');
      expect(signalElement).toHaveClass('text-green-500');
    });

    it('applies correct color for WATCH signal', () => {
      render(<MarketMetrics entryScore={60} signal="WATCH" />);
      const signalElement = screen.getByTestId('entry-signal');
      expect(signalElement).toHaveClass('text-yellow-500');
    });

    it('applies correct color for WAIT signal', () => {
      render(<MarketMetrics entryScore={40} signal="WAIT" />);
      const signalElement = screen.getByTestId('entry-signal');
      expect(signalElement).toHaveClass('text-red-500');
    });
  });

  describe('VIX Display', () => {
    it('shows VIX value when provided', () => {
      render(<MarketMetrics vixValue={20.5} />);
      expect(screen.getByText('20.50')).toBeInTheDocument();
    });

    it('shows placeholder when no VIX value', () => {
      render(<MarketMetrics />);
      expect(screen.getByTestId('vix-value')).toHaveTextContent('-');
    });

    it('shows Low regime for VIX < 15', () => {
      render(<MarketMetrics vixValue={12} vixRegime="Low" />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('shows Moderate regime for VIX 15-20', () => {
      render(<MarketMetrics vixValue={17} vixRegime="Moderate" />);
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('shows High regime for VIX > 20', () => {
      render(<MarketMetrics vixValue={25} vixRegime="High" />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('shows Extreme regime for VIX > 30', () => {
      render(<MarketMetrics vixValue={35} vixRegime="Extreme" />);
      expect(screen.getByText('Extreme')).toBeInTheDocument();
    });

    it('applies correct color for Low regime', () => {
      render(<MarketMetrics vixValue={12} vixRegime="Low" />);
      const regimeElement = screen.getByTestId('vix-regime');
      expect(regimeElement).toHaveClass('text-green-500');
    });

    it('applies correct color for High regime', () => {
      render(<MarketMetrics vixValue={25} vixRegime="High" />);
      const regimeElement = screen.getByTestId('vix-regime');
      expect(regimeElement).toHaveClass('text-orange-500');
    });

    it('applies correct color for Extreme regime', () => {
      render(<MarketMetrics vixValue={35} vixRegime="Extreme" />);
      const regimeElement = screen.getByTestId('vix-regime');
      expect(regimeElement).toHaveClass('text-red-500');
    });
  });

  describe('Market Trend Display', () => {
    it('shows bullish trend with up arrow', () => {
      render(<MarketMetrics marketTrend="bullish" />);
      expect(screen.getByTestId('trend-arrow')).toHaveTextContent('↑');
      expect(screen.getByText('Bullish')).toBeInTheDocument();
    });

    it('shows bearish trend with down arrow', () => {
      render(<MarketMetrics marketTrend="bearish" />);
      expect(screen.getByTestId('trend-arrow')).toHaveTextContent('↓');
      expect(screen.getByText('Bearish')).toBeInTheDocument();
    });

    it('shows neutral trend with dash', () => {
      render(<MarketMetrics marketTrend="neutral" />);
      expect(screen.getByTestId('trend-arrow')).toHaveTextContent('→');
      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });

    it('shows loading state when no trend', () => {
      render(<MarketMetrics />);
      expect(screen.getByTestId('market-trend')).toHaveTextContent('Loading...');
    });

    it('applies green color for bullish trend', () => {
      render(<MarketMetrics marketTrend="bullish" />);
      const trendElement = screen.getByTestId('trend-arrow');
      expect(trendElement).toHaveClass('text-green-500');
    });

    it('applies red color for bearish trend', () => {
      render(<MarketMetrics marketTrend="bearish" />);
      const trendElement = screen.getByTestId('trend-arrow');
      expect(trendElement).toHaveClass('text-red-500');
    });
  });

  describe('Loading State', () => {
    it('shows loading state for all metrics when loading', () => {
      render(<MarketMetrics loading={true} />);
      expect(screen.getByTestId('entry-score-value')).toHaveTextContent('...');
      expect(screen.getByTestId('vix-value')).toHaveTextContent('...');
      expect(screen.getByTestId('market-trend')).toHaveTextContent('Loading...');
    });

    it('applies pulse animation when loading', () => {
      render(<MarketMetrics loading={true} />);
      const container = screen.getByTestId('market-metrics');
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error provided', () => {
      render(<MarketMetrics error="Failed to load data" />);
      expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
    });

    it('applies error styling', () => {
      render(<MarketMetrics error="Failed to load data" />);
      const errorElement = screen.getByTestId('market-metrics-error');
      expect(errorElement).toHaveClass('text-red-500');
    });
  });

  describe('Styling', () => {
    it('applies ghibli-card class', () => {
      render(<MarketMetrics />);
      const container = screen.getByTestId('market-metrics');
      expect(container).toHaveClass('ghibli-card');
    });

    it('renders metric boxes for each metric', () => {
      render(
        <MarketMetrics
          entryScore={75}
          signal="ENTER"
          vixValue={20.5}
          vixRegime="High"
          marketTrend="bullish"
        />
      );
      expect(screen.getAllByTestId(/metric-box/).length).toBe(3);
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels', () => {
      render(
        <MarketMetrics
          entryScore={75}
          signal="ENTER"
          vixValue={20.5}
          vixRegime="High"
          marketTrend="bullish"
        />
      );
      expect(screen.getByLabelText(/entry score/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/vix index/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/market trend/i)).toBeInTheDocument();
    });
  });

  describe('Stale Data Indicator', () => {
    it('shows stale data warning when isStale is true', () => {
      render(
        <MarketMetrics
          entryScore={75}
          signal="ENTER"
          vixValue={20.5}
          isStale={true}
          cacheAge={6 * 60 * 1000} // 6 minutes
        />
      );
      expect(screen.getByTestId('stale-data-indicator')).toBeInTheDocument();
    });

    it('does not show stale warning when isStale is false', () => {
      render(
        <MarketMetrics
          entryScore={75}
          signal="ENTER"
          vixValue={20.5}
          isStale={false}
          cacheAge={2 * 60 * 1000} // 2 minutes
        />
      );
      expect(screen.queryByTestId('stale-data-indicator')).not.toBeInTheDocument();
    });

    it('does not show stale warning when isStale is undefined', () => {
      render(
        <MarketMetrics
          entryScore={75}
          signal="ENTER"
          vixValue={20.5}
        />
      );
      expect(screen.queryByTestId('stale-data-indicator')).not.toBeInTheDocument();
    });

    it('displays cache age in minutes', () => {
      render(
        <MarketMetrics
          entryScore={75}
          isStale={true}
          cacheAge={7 * 60 * 1000} // 7 minutes
        />
      );
      expect(screen.getByTestId('stale-data-indicator')).toHaveTextContent('7m');
    });

    it('applies warning color to stale indicator', () => {
      render(
        <MarketMetrics
          entryScore={75}
          isStale={true}
          cacheAge={6 * 60 * 1000}
        />
      );
      const indicator = screen.getByTestId('stale-data-indicator');
      expect(indicator).toHaveClass('text-yellow-500');
    });
  });
});
