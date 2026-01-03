/**
 * Metrics API Route
 *
 * GET /api/metrics
 *
 * Returns cache and data source metrics for monitoring.
 */

import { NextResponse } from 'next/server';
import { marketDataClient } from '@/lib/market-data/client';

export async function GET() {
  try {
    const metrics = marketDataClient.getMetrics();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Don't cache metrics - always return current state
export const revalidate = 0;
