/**
 * TDD Tests for removeFlatSegments
 *
 * CRITICAL: This function is essential for smooth spline chart rendering.
 * Consecutive duplicate values create flat segments that break spline interpolation.
 *
 * Ported from: backend/utils.py:5-32
 */

import { describe, it, expect } from 'vitest';
import { removeFlatSegments, processChartData } from '@/lib/data-processing/removeFlatSegments';

describe('removeFlatSegments', () => {
  describe('basic functionality', () => {
    it('removes consecutive duplicates', () => {
      expect(removeFlatSegments([1, 2, 2, 2, 3, 3, 4])).toEqual([1, 2, 3, 4]);
    });

    it('preserves non-consecutive duplicates', () => {
      expect(removeFlatSegments([1, 2, 1, 2])).toEqual([1, 2, 1, 2]);
    });

    it('handles empty array', () => {
      expect(removeFlatSegments([])).toEqual([]);
    });

    it('handles single element array', () => {
      expect(removeFlatSegments([42])).toEqual([42]);
    });

    it('handles array with all same values', () => {
      expect(removeFlatSegments([5, 5, 5, 5, 5])).toEqual([5]);
    });

    it('preserves array with no duplicates', () => {
      expect(removeFlatSegments([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('financial data scenarios', () => {
    it('handles VIX-like data with repeated values', () => {
      // Simulating VIX stuck at same value for multiple days
      const vixData = [20.5, 20.5, 20.5, 21.0, 21.0, 22.5, 22.5, 22.5, 23.0];
      const expected = [20.5, 21.0, 22.5, 23.0];
      expect(removeFlatSegments(vixData)).toEqual(expected);
    });

    it('handles price data with decimal precision', () => {
      const prices = [65.50, 65.50, 65.51, 65.51, 65.52];
      const expected = [65.50, 65.51, 65.52];
      expect(removeFlatSegments(prices)).toEqual(expected);
    });

    it('preserves volatile price movements', () => {
      // No consecutive duplicates - should be unchanged
      const volatileData = [20.1, 22.3, 19.8, 24.5, 18.2];
      expect(removeFlatSegments(volatileData)).toEqual(volatileData);
    });
  });

  describe('edge cases', () => {
    it('handles two identical elements', () => {
      expect(removeFlatSegments([10, 10])).toEqual([10]);
    });

    it('handles alternating pattern', () => {
      expect(removeFlatSegments([1, 2, 1, 2, 1, 2])).toEqual([1, 2, 1, 2, 1, 2]);
    });

    it('handles negative numbers', () => {
      expect(removeFlatSegments([-5, -5, -3, -3, -1])).toEqual([-5, -3, -1]);
    });

    it('handles zero values', () => {
      expect(removeFlatSegments([0, 0, 1, 0, 0])).toEqual([0, 1, 0]);
    });

    it('handles mixed positive and negative', () => {
      expect(removeFlatSegments([-2, -2, 0, 0, 2, 2])).toEqual([-2, 0, 2]);
    });
  });

  describe('type safety', () => {
    it('works with string arrays', () => {
      expect(removeFlatSegments(['a', 'a', 'b', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });
});

describe('processChartData', () => {
  it('processes data and preserves most points when few duplicates', () => {
    // With <20% duplicates, should return cleaned data as-is
    const data = [1, 2, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = processChartData(data);
    // Original has 11 points, cleaned has 10 (removed one 2)
    // 10 >= 11 * 0.8 (8.8), so no interpolation needed
    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('interpolates when too many points are removed', () => {
    // If >20% points removed, should interpolate back to original density
    const heavyDuplicates = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]; // 10 points -> 2 unique
    const result = processChartData(heavyDuplicates);
    // Should interpolate back to ~10 points
    expect(result.length).toBeGreaterThanOrEqual(heavyDuplicates.length * 0.8);
  });

  it('handles empty data', () => {
    expect(processChartData([])).toEqual([]);
  });

  it('handles single point', () => {
    expect(processChartData([42])).toEqual([42]);
  });
});
