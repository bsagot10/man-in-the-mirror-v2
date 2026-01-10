"""
Backend utility functions for data processing.
"""

def remove_flat_segments(data):
    """
    Remove flat/stale segments from time series data where values don't change.
    This helps create cleaner charts by removing periods of no market activity.

    Args:
        data: List of dicts with 'timestamp' and 'value' keys, or list of [timestamp, value] pairs

    Returns:
        Cleaned data with flat segments removed
    """
    if not data or len(data) < 2:
        return data

    # Handle different data formats
    if isinstance(data[0], dict):
        # Format: [{'timestamp': ..., 'value': ...}, ...]
        cleaned = [data[0]]
        for i in range(1, len(data)):
            current_val = data[i].get('value') or data[i].get('close') or data[i].get('price')
            prev_val = data[i-1].get('value') or data[i-1].get('close') or data[i-1].get('price')

            # Keep if value changed or it's a significant time gap
            if current_val != prev_val:
                cleaned.append(data[i])
            elif i == len(data) - 1:
                # Always keep the last point
                cleaned.append(data[i])
        return cleaned

    elif isinstance(data[0], (list, tuple)):
        # Format: [[timestamp, value], ...]
        cleaned = [data[0]]
        for i in range(1, len(data)):
            if data[i][1] != data[i-1][1]:
                cleaned.append(data[i])
            elif i == len(data) - 1:
                cleaned.append(data[i])
        return cleaned

    else:
        # Unknown format, return as-is
        return data
