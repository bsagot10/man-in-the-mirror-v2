/**
 * Data Processing Utilities
 *
 * CRITICAL: These functions are essential for smooth spline chart rendering.
 * Consecutive duplicate values create flat segments that break spline interpolation.
 *
 * Ported from: backend/utils.py:5-32
 */

/**
 * Remove excessive consecutive duplicate values from a list.
 *
 * This is critical for chart smoothing - consecutive duplicates create
 * flat segments that prevent spline interpolation from working properly.
 *
 * @param values - Array of values (numbers, strings, etc.)
 * @returns Array with consecutive duplicates removed
 *
 * @example
 * removeFlatSegments([1, 2, 2, 2, 3, 3, 4])
 * // Returns: [1, 2, 3, 4]
 */
export function removeFlatSegments<T>(values: T[]): T[] {
  if (values.length <= 1) {
    return values;
  }

  const cleaned: T[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    // Only add if different from previous value
    if (values[i] !== values[i - 1]) {
      cleaned.push(values[i]);
    }
  }

  return cleaned;
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate an array to a target length
 */
function interpolateArray(cleaned: number[], targetLength: number): number[] {
  if (cleaned.length < 2 || targetLength < 2) {
    return cleaned;
  }

  const result: number[] = [];

  for (let i = 0; i < targetLength; i++) {
    const t = i / (targetLength - 1);
    const sourceIndex = t * (cleaned.length - 1);
    const lowerIndex = Math.floor(sourceIndex);
    const upperIndex = Math.min(lowerIndex + 1, cleaned.length - 1);
    const localT = sourceIndex - lowerIndex;

    result.push(lerp(cleaned[lowerIndex], cleaned[upperIndex], localT));
  }

  return result;
}

/**
 * Process chart data by removing flat segments and optionally interpolating.
 *
 * If more than 20% of points are removed, interpolates back to maintain
 * the original data density for proper chart rendering.
 *
 * @param rawData - Raw numeric data for charts
 * @returns Processed data ready for chart display
 */
export function processChartData(rawData: number[]): number[] {
  if (rawData.length <= 1) {
    return rawData;
  }

  const cleaned = removeFlatSegments(rawData);

  // If too many points were removed (>20%), interpolate back to original density
  if (cleaned.length < rawData.length * 0.8) {
    return interpolateArray(cleaned, rawData.length);
  }

  return cleaned;
}
