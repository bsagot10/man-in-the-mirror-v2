/**
 * Health Check API Route
 *
 * GET /api/health
 *
 * Returns health status for deployment monitoring.
 */

import { NextResponse } from 'next/server';
import { marketDataClient } from '@/lib/market-data/client';

export async function GET() {
  try {
    const metrics = marketDataClient.getMetrics();
    const totalCalls = metrics.stooqSuccess + metrics.stooqFailed +
                       metrics.yahooSuccess + metrics.yahooFailed;
    const successRate = totalCalls > 0
      ? ((metrics.stooqSuccess + metrics.yahooSuccess) / totalCalls) * 100
      : 100; // Assume healthy if no calls yet

    const status = successRate >= 50 ? 'healthy' :
                   successRate >= 20 ? 'degraded' : 'unhealthy';

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dataSourceHealth: {
          stooq: metrics.stooqSuccess > 0 ? 'up' : metrics.stooqFailed > 0 ? 'down' : 'unknown',
          yahooFinance: metrics.yahooSuccess > 0 ? 'up' : metrics.yahooFailed > 0 ? 'down' : 'unknown',
          cache: metrics.cacheHits > 0 ? 'warm' : 'cold',
        },
        metrics: {
          successRate: Math.round(successRate),
          cacheHitRate: Math.round(metrics.cacheHitRate),
        },
      },
      { status: status === 'unhealthy' ? 503 : 200 }
    );
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// Never cache health check
export const revalidate = 0;
