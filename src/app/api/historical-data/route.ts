/**
 * Historical Data API Route
 *
 * GET /api/historical-data
 *
 * Returns historical price data for VIX, TQQQ, SQQQ charts.
 * Ported from: Flask /api/historical-data endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { marketDataClient } from '@/lib/market-data/client';

export async function GET(request: NextRequest) {
  try {
    // Get days parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get('days');

    // Parse and validate days
    let days = 30; // Default to 30 days
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 365) {
        days = parsed;
      }
    }

    // Fetch historical data
    const historicalData = await marketDataClient.fetchHistoricalData(days);

    // Build response
    const response = {
      success: true,
      data: historicalData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching historical data:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Configure caching - historical data doesn't change as frequently
export const revalidate = 300; // Cache for 5 minutes
