/**
 * Health Check API Route
 *
 * GET /api/health
 *
 * Returns health status for deployment monitoring.
 */

import { NextResponse } from 'next/server';
import { marketDataClient } from '@/lib/market-data/client';

// Health status thresholds (percentage)
const HEALTHY_THRESHOLD = 50;
const DEGRADED_THRESHOLD = 20;

function getHealthStatus(successRate: number): 'healthy' | 'degraded' | 'unhealthy' {
  if (successRate >= HEALTHY_THRESHOLD) return 'healthy';
  if (successRate >= DEGRADED_THRESHOLD) return 'degraded';
  return 'unhealthy';
}

export async function GET() {
  try {
    const metrics = marketDataClient.getMetrics();
    const totalCalls = metrics.polygonSuccess + metrics.polygonFailed +
                       metrics.yahooSuccess + metrics.yahooFailed;
    const successRate = totalCalls > 0
      ? ((metrics.polygonSuccess + metrics.yahooSuccess) / totalCalls) * 100
      : 100; // Assume healthy if no calls yet

    const status = getHealthStatus(successRate);

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dataSourceHealth: {
          polygon: metrics.polygonSuccess > 0 ? 'up' : metrics.polygonFailed > 0 ? 'down' : 'unknown',
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
