/**
 * EntryScoreDisplay Component
 *
 * Displays the entry score calculation breakdown (canonical MCP weights):
 * - Volatility Score (0-40)
 * - Trend Score (0-30)
 * - Decay Potential Score (0-20)
 * - Total Score with visual bars (0-90)
 *
 * Ported from: Flask app's Entry Score Calculation section
 */

'use client';

// ============================================================================
// Types
// ============================================================================

export interface EntryScoreDisplayProps {
  volatilityScore?: number;
  trendScore?: number;
  decayScore?: number;
  totalScore?: number;
  loading?: boolean;
  error?: string;
  elevated?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_VOLATILITY_SCORE = 40;
const MAX_TREND_SCORE = 30;
const MAX_DECAY_SCORE = 20;

// Unified max for visual comparison - all bars use same scale
const UNIFIED_VISUAL_MAX = 100;

// Score thresholds for color coding (strict >, matching signal thresholds)
const SCORE_GOOD_THRESHOLD = 60;
const SCORE_MODERATE_THRESHOLD = 40;

// ============================================================================
// Helper Functions
// ============================================================================

function getTotalColor(total: number): string {
  if (total > SCORE_GOOD_THRESHOLD) return 'text-green-500';
  if (total > SCORE_MODERATE_THRESHOLD) return 'text-yellow-500';
  return 'text-red-500';
}

function calculateBarWidth(score: number, visualMax: number = UNIFIED_VISUAL_MAX): string {
  // Use unified max for visual comparison across all bars
  const percentage = Math.min((score / visualMax) * 100, 100);
  return `${percentage}%`;
}

// ============================================================================
// ScoreBar Sub-Component
// ============================================================================

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore: number;
  testId: string;
  ariaLabel: string;
  loading?: boolean;
}

function ScoreBar({ label, score, maxScore, testId, ariaLabel, loading }: ScoreBarProps) {
  // Use unified max (100) for visual width so all bars are comparable
  // Keep actual maxScore for aria attributes for accessibility
  return (
    <div className="score-item">
      <span className="score-label">
        {label}
      </span>
      <div
        data-testid={`${testId}-track`}
        className="score-bar-track bg-warm-200 rounded-full h-3 overflow-hidden"
        style={{ flex: 1 }}
      >
        <div
          data-testid={`${testId}-bar`}
          className={`score-fill bg-gradient-to-r from-primary-soft to-primary-green h-full rounded-full transition-all duration-300 ${loading ? 'animate-pulse' : ''}`}
          style={{ width: calculateBarWidth(score, UNIFIED_VISUAL_MAX) }}
          role="progressbar"
          aria-label={ariaLabel}
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={maxScore}
          aria-valuetext={`${score} out of ${maxScore}`}
        />
      </div>
      <span
        data-testid={`${testId}-score`}
        className="score-value text-sm font-semibold text-warm-800 block text-right"
      >
        {score}
      </span>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function EntryScoreDisplay({
  volatilityScore = 0,
  trendScore = 0,
  decayScore = 0,
  totalScore,
  loading = false,
  error,
  elevated = false,
}: EntryScoreDisplayProps) {
  // Calculate total if not provided (rounded — decayScore carries 2 decimals)
  const calculatedTotal = totalScore ?? Math.round(volatilityScore + trendScore + decayScore);

  if (error) {
    return (
      <div data-testid="entry-score-display" className={`ghibli-card ${elevated ? 'shadow-depth-3 bg-[var(--glass-float)]' : ''}`.trim()}>
        <div className="card-header">
          <h2 className="text-lg font-semibold text-warm-800">📊 ENTRY SCORE CALCULATION</h2>
        </div>
        <div className="card-content">
          <div className="text-red-500 text-center py-4">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="entry-score-display" className={`ghibli-card ${elevated ? 'shadow-depth-3 bg-[var(--glass-float)]' : ''}`.trim()}>
      <div className="card-header">
        <h2 className="text-lg font-semibold text-warm-800">📊 ENTRY SCORE CALCULATION</h2>
      </div>
      <div className={`card-content ${loading ? 'animate-pulse' : ''}`}>
        <div className="score-details space-y-4">
          {/* Volatility Score */}
          <ScoreBar
            label="VOLATILITY"
            score={volatilityScore}
            maxScore={MAX_VOLATILITY_SCORE}
            testId="volatility"
            ariaLabel="volatility score"
            loading={loading}
          />

          {/* Trend Score */}
          <ScoreBar
            label="MARKET TREND"
            score={trendScore}
            maxScore={MAX_TREND_SCORE}
            testId="trend"
            ariaLabel="trend score"
            loading={loading}
          />

          {/* Decay Score */}
          <ScoreBar
            label="DECAY POTENTIAL"
            score={decayScore}
            maxScore={MAX_DECAY_SCORE}
            testId="decay"
            ariaLabel="decay potential score"
            loading={loading}
          />

          {/* Total Score */}
          <div className="score-total border-t border-warm-200 pt-4 mt-4 flex justify-between items-center">
            <span className="text-sm font-medium text-warm-600 uppercase tracking-wide">
              TOTAL SCORE
            </span>
            <span
              data-testid="total-score"
              className={`text-3xl font-bold ${getTotalColor(calculatedTotal)}`}
            >
              {calculatedTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntryScoreDisplay;
