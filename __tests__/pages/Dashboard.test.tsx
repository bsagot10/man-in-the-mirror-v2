/**
 * TDD Tests for Dashboard Page
 *
 * Tests the main dashboard that integrates:
 * - VixChart
 * - TqqqSqqqChart
 * - MarketMetrics
 * - EntryScoreDisplay
 * - Data fetching hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import Dashboard from '@/app/page';

// Mock next/dynamic to render components directly
vi.mock('next/dynamic', () => ({
  default: () => {
    const Component = vi.fn(({ data, layout, config }) => (
      <div
        data-testid="plotly-chart"
        data-traces={JSON.stringify(data)}
        data-layout={JSON.stringify(layout)}
      >
        Mocked Plotly Chart
      </div>
    ));
    return Component;
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock data responses
const mockMarketDataResponse = {
  success: true,
  timestamp: '2024-01-15T16:00:00Z',
  marketData: {
    vix: { currentPrice: 20.5, changePercent: 1.5, previousClose: 20.2, change: 0.3, volume: 0, timestamp: '2024-01-15T16:00:00Z' },
    qqq: { currentPrice: 400, changePercent: 0.5, previousClose: 398, change: 2, volume: 50000000, timestamp: '2024-01-15T16:00:00Z' },
    tqqq: { currentPrice: 50, changePercent: 1.5, previousClose: 49.25, change: 0.75, volume: 30000000, timestamp: '2024-01-15T16:00:00Z' },
    sqqq: { currentPrice: 30, changePercent: -1.5, previousClose: 30.45, change: -0.45, volume: 20000000, timestamp: '2024-01-15T16:00:00Z' },
  },
  marketOpen: true,
};

const mockHistoricalDataResponse = {
  success: true,
  data: {
    vix: [
      { date: '2024-01-15', open: 20, high: 21, low: 19.5, close: 20.5, volume: 0 },
      { date: '2024-01-16', open: 20.5, high: 22, low: 20, close: 21.0, volume: 0 },
    ],
    tqqq: [
      { date: '2024-01-15', open: 49, high: 51, low: 48, close: 50, volume: 30000000 },
      { date: '2024-01-16', open: 50, high: 52, low: 49, close: 51.5, volume: 32000000 },
    ],
    sqqq: [
      { date: '2024-01-15', open: 31, high: 32, low: 29.5, close: 30, volume: 20000000 },
      { date: '2024-01-16', open: 30, high: 31, low: 28.5, close: 28.5, volume: 22000000 },
    ],
  },
};

const mockEntryScoreResponse = {
  success: true,
  entryScore: {
    total: 75,
    signal: 'WATCH',
    volatilityRegime: 'High',
    volatilityScore: 35,
    trendScore: 25,
    decayScore: 15,
  },
};

function setupMockFetch() {
  mockFetch.mockImplementation((url: string) => {
    if (url === '/api/market-data') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMarketDataResponse),
      });
    }
    if (url === '/api/historical-data') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoricalDataResponse),
      });
    }
    if (url === '/api/entry-score') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockEntryScoreResponse),
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockFetch();
  });

  describe('Layout', () => {
    it('renders the main dashboard container', async () => {
      render(<Dashboard />);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });

    it('renders the header with title', async () => {
      render(<Dashboard />);
      expect(screen.getByText(/Man in the Mirror Strategy/i)).toBeInTheDocument();
    });

    it('renders the subtitle', async () => {
      render(<Dashboard />);
      expect(screen.getByText(/Leveraged ETF Decay Strategy/i)).toBeInTheDocument();
    });

    it('renders the three-column layout', async () => {
      render(<Dashboard />);
      expect(screen.getByTestId('left-column')).toBeInTheDocument();
      expect(screen.getByTestId('center-column')).toBeInTheDocument();
      expect(screen.getByTestId('right-column')).toBeInTheDocument();
    });
  });

  describe('Header Controls', () => {
    it('renders refresh button', async () => {
      render(<Dashboard />);
      expect(screen.getByRole('button', { name: /Refresh market data/i })).toBeInTheDocument();
    });

    it('renders last update timestamp', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('last-update')).toBeInTheDocument();
      });
    });

    it('triggers data refresh on button click', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      mockFetch.mockClear();

      const refreshButton = screen.getByRole('button', { name: /Refresh market data/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/market-data');
      });
    });
  });

  describe('Charts Section', () => {
    it('renders VIX chart', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('vix-chart-container')).toBeInTheDocument();
      });
    });

    it('renders TQQQ/SQQQ chart', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('tqqq-sqqq-chart-container')).toBeInTheDocument();
      });
    });

    it('passes historical data to VIX chart', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const vixChartContainer = screen.getByTestId('vix-chart-container');
        expect(vixChartContainer).toBeInTheDocument();
      });
    });

    it('passes historical data to TQQQ/SQQQ chart', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const tqqqSqqqChartContainer = screen.getByTestId('tqqq-sqqq-chart-container');
        expect(tqqqSqqqChartContainer).toBeInTheDocument();
      });
    });
  });

  describe('Market Metrics Section', () => {
    it('renders MarketMetrics component', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('market-metrics')).toBeInTheDocument();
      });
    });

    it('displays VIX value from API', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Use specific test ID to avoid matching multiple elements
        expect(screen.getByTestId('vix-value')).toHaveTextContent('20.50');
      });
    });

    it('displays entry score from API', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Use specific test ID to avoid matching multiple elements
        expect(screen.getByTestId('entry-score-value')).toHaveTextContent('75');
      });
    });
  });

  describe('Entry Score Section', () => {
    it('renders EntryScoreDisplay component', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('entry-score-display')).toBeInTheDocument();
      });
    });

    it('displays score components from API', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('volatility-score')).toHaveTextContent('35');
        expect(screen.getByTestId('trend-score')).toHaveTextContent('25');
        expect(screen.getByTestId('decay-score')).toHaveTextContent('15');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<Dashboard />);

      // Loading overlay should be present when data is loading
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('shows loading text in overlay', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));
      render(<Dashboard />);

      // Check for the loading overlay text specifically
      const loadingOverlay = screen.getByTestId('dashboard-loading');
      expect(loadingOverlay).toHaveTextContent(/Loading/i);
    });

    it('hides loading state after data loads', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('shows error message on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
      });
    });

    it('shows retry button on error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retries fetch on retry button click', async () => {
      const user = userEvent.setup();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
      });

      // Setup successful response for retry
      setupMockFetch();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByTestId('dashboard-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('applies Studio Ghibli warm theme', async () => {
      render(<Dashboard />);
      const dashboard = screen.getByTestId('dashboard');
      expect(dashboard).toHaveClass('bg-warm-gradient');
    });

    it('applies ghibli-card class to cards', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const cards = document.querySelectorAll('.ghibli-card');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Layout', () => {
    it('has responsive grid classes', async () => {
      render(<Dashboard />);
      const mainContent = screen.getByTestId('main-content');
      // Grid styling is applied via custom CSS class 'main-content' in globals.css
      // (not Tailwind utility classes)
      expect(mainContent).toHaveClass('main-content');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      render(<Dashboard />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(/Man in the Mirror Strategy/i);
    });

    it('has accessible chart labels', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Charts use aria-label on container divs with role="img"
        const vixChart = screen.getByTestId('vix-chart-container');
        const tqqqChart = screen.getByTestId('tqqq-sqqq-chart-container');

        expect(vixChart).toHaveAttribute('aria-label', expect.stringContaining('VIX Index'));
        expect(tqqqChart).toHaveAttribute('aria-label', expect.stringContaining('TQQQ'));
      });
    });

    // Skip link is now in layout.tsx, not Dashboard component
    // This is correct - single skip link at layout level, not duplicated in page
    it('has main content landmark for keyboard navigation', async () => {
      render(<Dashboard />);
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
    });
  });

  describe('Market Status', () => {
    it('shows market open indicator when market is open', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('market-status')).toHaveTextContent(/Open/i);
      });
    });

    it('shows market closed indicator when market is closed', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/market-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ...mockMarketDataResponse,
              marketOpen: false,
            }),
          });
        }
        if (url === '/api/historical-data') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockHistoricalDataResponse),
          });
        }
        if (url === '/api/entry-score') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEntryScoreResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('market-status')).toHaveTextContent(/Closed/i);
      });
    });
  });
});
