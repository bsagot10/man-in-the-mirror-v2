/**
 * Entry Score API Route
 *
 * GET /api/entry-score
 *
 * Calculates and returns the entry score based on current market conditions.
 * Ported from: Flask /api/market-data endpoint (entry score portion)
 */

import { NextRequest, NextResponse } from 'next/server';
import { MarketDataClient } from '@/lib/market-data/client';
import { calculateEntryScore } from '@/lib/market-analysis/entryScore';

// Create client instance
const client = new MarketDataClient();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Fetch current market data
    const marketData = await client.fetchCurrentData();

    // Transform to entry score format
    const entryScoreInput = {
      vix: {
        currentPrice: marketData.vix.currentPrice,
        changePercent: marketData.vix.changePercent,
      },
      qqq: {
        currentPrice: marketData.qqq.currentPrice,
        changePercent: marketData.qqq.changePercent,
      },
      tqqq: {
        currentPrice: marketData.tqqq.currentPrice,
        changePercent: marketData.tqqq.changePercent,
      },
      sqqq: {
        currentPrice: marketData.sqqq.currentPrice,
        changePercent: marketData.sqqq.changePercent,
      },
    };

    // Calculate entry score
    const entryScore = calculateEntryScore(entryScoreInput);

    // Build response
    const response = {
      success: true,
      entryScore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating entry score:', error);

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
