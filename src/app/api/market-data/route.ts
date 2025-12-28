/**
 * Market Data API Route
 *
 * GET /api/market-data
 *
 * Returns current market data for VIX, QQQ, TQQQ, SQQQ.
 * Ported from: Flask /api/market-data endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { MarketDataClient } from '@/lib/market-data/client';

// Create client instance
const client = new MarketDataClient();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Fetch current market data
    const marketData = await client.fetchCurrentData();

    // Check if market is open
    const marketOpen = client.isMarketOpen();

    // Build response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      marketData,
      marketOpen,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching market data:', error);

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
