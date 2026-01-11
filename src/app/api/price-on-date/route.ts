// filepath: src/app/api/price-on-date/route.ts
// Purpose: API endpoint for fetching historical closing prices on a specific date
// Key exports: GET handler for /api/price-on-date?date=YYYY-MM-DD

/**
 * Price on Date API Route
 *
 * GET /api/price-on-date?date=YYYY-MM-DD
 *
 * Returns historical closing prices for TQQQ and SQQQ on a specific date.
 * Used for setting entry prices based on actual historical data.
 *
 * Query Parameters:
 * - date: Required. ISO date string (YYYY-MM-DD)
 *
 * Returns:
 * - success: boolean
 * - date: string - requested date
 * - actualDate: string - actual trading date (may differ if requested date was weekend/holiday)
 * - prices: { tqqq: number, sqqq: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { marketDataClient } from '@/lib/market-data/client';

/**
 * Validates a date string is in YYYY-MM-DD format and is a valid date
 */
function isValidDateFormat(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr + 'T00:00:00Z');
  return !isNaN(date.getTime());
}

/**
 * Checks if a date is in the future
 */
function isFutureDate(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(dateStr + 'T00:00:00Z');
  return inputDate > today;
}

export async function GET(request: NextRequest) {
  try {
    // Get date parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    // Validate date parameter exists
    if (!dateParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: date (format: YYYY-MM-DD)',
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (!isValidDateFormat(dateParam)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Expected YYYY-MM-DD',
        },
        { status: 400 }
      );
    }

    // Check for future date
    if (isFutureDate(dateParam)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot fetch prices for future dates',
        },
        { status: 400 }
      );
    }

    // Fetch prices using the public method
    const result = await marketDataClient.fetchPricesOnDate(dateParam);

    // Check if we found data
    if (result.tqqq === null || result.sqqq === null) {
      return NextResponse.json(
        {
          success: false,
          error: `No data available for date ${dateParam} or nearby trading days`,
        },
        { status: 404 }
      );
    }

    // Build response
    const response = {
      success: true,
      date: dateParam,
      actualDate: result.actualDate,
      prices: {
        tqqq: result.tqqq,
        sqqq: result.sqqq,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching price on date:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Configure caching - historical prices don't change
export const revalidate = 3600; // Cache for 1 hour
