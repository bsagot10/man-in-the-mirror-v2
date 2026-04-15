/**
 * Market Data API Route
 *
 * GET /api/market-data
 *
 * Returns current market data for VIX, QQQ, TQQQ, SQQQ.
 * Ported from: Flask /api/market-data endpoint
 */

import { NextResponse } from 'next/server';
import { marketDataClient, structuredLog, LogLevel } from '@/lib/market-data/client';

export async function GET() {
  try {
    // Fetch current market data
    const marketData = await marketDataClient.fetchCurrentData();

    // Check if market is open
    const marketOpen = marketDataClient.isMarketOpen();

    // Build response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      marketData,
      marketOpen,
    };

    return NextResponse.json(response);
  } catch (error) {
    structuredLog(LogLevel.ERROR, 'Error fetching market data', {
      component: 'MarketDataRoute',
      action: 'GET',
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
    });

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
