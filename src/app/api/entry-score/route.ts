/**
 * Entry Score API Route
 *
 * GET /api/entry-score
 *
 * Calculates and returns the entry score based on current market conditions.
 * Ported from: Flask /api/market-data endpoint (entry score portion)
 */

import { NextResponse } from 'next/server';
import { marketDataClient, structuredLog, LogLevel } from '@/lib/market-data/client';
import { calculateEntryScore } from '@/lib/market-analysis/entryScore';

export async function GET() {
  try {
    // Fetch current market data
    const marketData = await marketDataClient.fetchCurrentData();

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
    structuredLog(LogLevel.ERROR, 'Error calculating entry score', {
      component: 'EntryScoreRoute',
      action: 'GET',
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Configure caching
export const revalidate = 30; // Cache for 30 seconds
