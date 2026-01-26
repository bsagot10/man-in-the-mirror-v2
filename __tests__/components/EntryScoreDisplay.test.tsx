/**
 * TDD Tests for EntryScoreDisplay Component
 *
 * Tests the entry score calculation display showing:
 * - Volatility Score (0-50)
 * - Trend Score (0-30)
 * - Decay Potential Score (0-30)
 * - Total Score with visual bars
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { EntryScoreDisplay } from '@/components/dashboard/EntryScoreDisplay';

describe('EntryScoreDisplay Component', () => {
  describe('Rendering', () => {
    it('renders the component', () => {
      render(<EntryScoreDisplay />);
      expect(screen.getByTestId('entry-score-display')).toBeInTheDocument();
    });

    it('renders the section header', () => {
      render(<EntryScoreDisplay />);
      expect(screen.getByText(/ENTRY SCORE CALCULATION/i)).toBeInTheDocument();
    });

    it('renders all three score items', () => {
      render(<EntryScoreDisplay volatilityScore={25} trendScore={15} decayScore={10} />);
      expect(screen.getByText(/VOLATILITY/i)).toBeInTheDocument();
      expect(screen.getByText(/MARKET TREND/i)).toBeInTheDocument();
      expect(screen.getByText(/DECAY POTENTIAL/i)).toBeInTheDocument();
    });
  });

  describe('Volatility Score', () => {
    it('displays volatility score value', () => {
      render(<EntryScoreDisplay volatilityScore={35} />);
      expect(screen.getByTestId('volatility-score')).toHaveTextContent('35');
    });

    it('shows 0 when no volatility score provided', () => {
      render(<EntryScoreDisplay />);
      expect(screen.getByTestId('volatility-score')).toHaveTextContent('0');
    });

    it('renders volatility bar with correct width', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const bar = screen.getByTestId('volatility-bar');
      // Uses UNIFIED_VISUAL_MAX=100 for visual comparison: 25/100 = 25%
      expect(bar).toHaveStyle({ width: '25%' });
    });

    it('caps volatility bar at 100% for max score', () => {
      // With UNIFIED_VISUAL_MAX=100, max volatility score (50) shows as 50%
      render(<EntryScoreDisplay volatilityScore={50} />);
      const bar = screen.getByTestId('volatility-bar');
      expect(bar).toHaveStyle({ width: '50%' });
    });

    it('shows 0% width for zero score', () => {
      render(<EntryScoreDisplay volatilityScore={0} />);
      const bar = screen.getByTestId('volatility-bar');
      expect(bar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Trend Score', () => {
    it('displays trend score value', () => {
      render(<EntryScoreDisplay trendScore={20} />);
      expect(screen.getByTestId('trend-score')).toHaveTextContent('20');
    });

    it('shows 0 when no trend score provided', () => {
      render(<EntryScoreDisplay />);
      expect(screen.getByTestId('trend-score')).toHaveTextContent('0');
    });

    it('renders trend bar with correct width', () => {
      render(<EntryScoreDisplay trendScore={15} />);
      const bar = screen.getByTestId('trend-bar');
      // Uses UNIFIED_VISUAL_MAX=100 for visual comparison: 15/100 = 15%
      expect(bar).toHaveStyle({ width: '15%' });
    });

    it('caps trend bar at 100% for max score', () => {
      // With UNIFIED_VISUAL_MAX=100, max trend score (30) shows as 30%
      render(<EntryScoreDisplay trendScore={30} />);
      const bar = screen.getByTestId('trend-bar');
      expect(bar).toHaveStyle({ width: '30%' });
    });
  });

  describe('Decay Score', () => {
    it('displays decay score value', () => {
      render(<EntryScoreDisplay decayScore={18} />);
      expect(screen.getByTestId('decay-score')).toHaveTextContent('18');
    });

    it('shows 0 when no decay score provided', () => {
      render(<EntryScoreDisplay />);
      expect(screen.getByTestId('decay-score')).toHaveTextContent('0');
    });

    it('renders decay bar with correct width', () => {
      render(<EntryScoreDisplay decayScore={15} />);
      const bar = screen.getByTestId('decay-bar');
      // Uses UNIFIED_VISUAL_MAX=100 for visual comparison: 15/100 = 15%
      expect(bar).toHaveStyle({ width: '15%' });
    });

    it('caps decay bar at 100% for max score', () => {
      // With UNIFIED_VISUAL_MAX=100, max decay score (30) shows as 30%
      render(<EntryScoreDisplay decayScore={30} />);
      const bar = screen.getByTestId('decay-bar');
      expect(bar).toHaveStyle({ width: '30%' });
    });
  });

  describe('Total Score', () => {
    it('displays total score', () => {
      render(
        <EntryScoreDisplay
          volatilityScore={35}
          trendScore={20}
          decayScore={15}
          totalScore={70}
        />
      );
      expect(screen.getByTestId('total-score')).toHaveTextContent('70');
    });

    it('calculates total from individual scores if not provided', () => {
      render(
        <EntryScoreDisplay
          volatilityScore={35}
          trendScore={20}
          decayScore={15}
        />
      );
      expect(screen.getByTestId('total-score')).toHaveTextContent('70');
    });

    it('shows 0 when no scores provided', () => {
      render(<EntryScoreDisplay />);
      expect(screen.getByTestId('total-score')).toHaveTextContent('0');
    });

    it('applies green color for high total (>= 70)', () => {
      render(<EntryScoreDisplay totalScore={75} />);
      const totalElement = screen.getByTestId('total-score');
      expect(totalElement).toHaveClass('text-green-500');
    });

    it('applies yellow color for medium total (50-69)', () => {
      render(<EntryScoreDisplay totalScore={60} />);
      const totalElement = screen.getByTestId('total-score');
      expect(totalElement).toHaveClass('text-yellow-500');
    });

    it('applies red color for low total (< 50)', () => {
      render(<EntryScoreDisplay totalScore={40} />);
      const totalElement = screen.getByTestId('total-score');
      expect(totalElement).toHaveClass('text-red-500');
    });
  });

  describe('Score Bars Visual Style', () => {
    it('applies gradient fill to score bars', () => {
      render(
        <EntryScoreDisplay
          volatilityScore={25}
          trendScore={15}
          decayScore={10}
        />
      );
      const volatilityBar = screen.getByTestId('volatility-bar');
      expect(volatilityBar).toHaveClass('bg-gradient-to-r');
    });

    it('applies warm brown track color to score bars', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const track = screen.getByTestId('volatility-track');
      expect(track).toHaveClass('bg-warm-200');
    });

    it('applies rounded corners to score bars', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const bar = screen.getByTestId('volatility-bar');
      expect(bar).toHaveClass('rounded-full');
    });

    it('applies transition for smooth animations', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const bar = screen.getByTestId('volatility-bar');
      expect(bar).toHaveClass('transition-all');
    });
  });

  describe('Loading State', () => {
    it('shows loading animation when loading', () => {
      render(<EntryScoreDisplay loading={true} />);
      const container = screen.getByTestId('entry-score-display');
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('shows placeholder bars when loading', () => {
      render(<EntryScoreDisplay loading={true} />);
      const volatilityBar = screen.getByTestId('volatility-bar');
      expect(volatilityBar).toHaveClass('animate-pulse');
    });
  });

  describe('Error State', () => {
    it('shows error message when error provided', () => {
      render(<EntryScoreDisplay error="Failed to calculate score" />);
      expect(screen.getByText(/Failed to calculate score/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies ghibli-card class', () => {
      render(<EntryScoreDisplay />);
      const container = screen.getByTestId('entry-score-display');
      expect(container).toHaveClass('ghibli-card');
    });

    it('renders score labels with proper styling', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const label = screen.getByText(/VOLATILITY/i);
      // Component uses custom CSS class 'score-label' defined in globals.css
      expect(label).toHaveClass('score-label');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for progress bars', () => {
      render(
        <EntryScoreDisplay
          volatilityScore={25}
          trendScore={15}
          decayScore={10}
        />
      );
      const bars = screen.getAllByRole('progressbar');
      expect(bars).toHaveLength(3);
    });

    it('includes aria-valuenow for score bars', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const bar = screen.getByTestId('volatility-bar');
      expect(bar).toHaveAttribute('aria-valuenow', '25');
    });

    it('includes aria-valuemin and aria-valuemax', () => {
      render(<EntryScoreDisplay volatilityScore={25} />);
      const bar = screen.getByTestId('volatility-bar');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '50');
    });

    it('includes accessible labels for each score', () => {
      render(
        <EntryScoreDisplay
          volatilityScore={25}
          trendScore={15}
          decayScore={10}
        />
      );
      expect(screen.getByLabelText(/volatility score/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trend score/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/decay potential score/i)).toBeInTheDocument();
    });

    it('includes aria-valuetext for screen reader announcements', () => {
      render(<EntryScoreDisplay volatilityScore={25} trendScore={15} decayScore={10} />);
      const volatilityBar = screen.getByTestId('volatility-bar');
      const trendBar = screen.getByTestId('trend-bar');
      const decayBar = screen.getByTestId('decay-bar');
      expect(volatilityBar).toHaveAttribute('aria-valuetext', '25 out of 50');
      expect(trendBar).toHaveAttribute('aria-valuetext', '15 out of 30');
      expect(decayBar).toHaveAttribute('aria-valuetext', '10 out of 30');
    });
  });

  describe('Full Score Example', () => {
    it('renders complete score display', () => {
      render(
        <EntryScoreDisplay
          volatilityScore={40}
          trendScore={25}
          decayScore={20}
          totalScore={85}
        />
      );

      expect(screen.getByTestId('volatility-score')).toHaveTextContent('40');
      expect(screen.getByTestId('trend-score')).toHaveTextContent('25');
      expect(screen.getByTestId('decay-score')).toHaveTextContent('20');
      expect(screen.getByTestId('total-score')).toHaveTextContent('85');

      // Check bar widths - uses UNIFIED_VISUAL_MAX=100 for visual comparison
      expect(screen.getByTestId('volatility-bar')).toHaveStyle({ width: '40%' }); // 40/100
      expect(screen.getByTestId('trend-bar')).toHaveStyle({ width: '25%' }); // 25/100
      expect(screen.getByTestId('decay-bar')).toHaveStyle({ width: '20%' }); // 20/100
    });
  });
});
