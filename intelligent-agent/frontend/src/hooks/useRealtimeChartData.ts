import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Real-time data point
 */
export interface DataPoint {
  timestamp: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuration for real-time chart stream
 */
export interface RealtimeChartConfig {
  maxDataPoints?: number;
  updateInterval?: number;
  aggregateInterval?: number;
  aggregationType?: 'sum' | 'avg' | 'max' | 'min' | 'last';
}

/**
 * Hook for managing real-time chart data
 * Handles WebSocket-like streaming, aggregation, and data retention
 */
export const useRealtimeChartData = (config: RealtimeChartConfig = {}) => {
  const {
    maxDataPoints = 100,
    updateInterval = 1000,
    aggregateInterval = 60000,
    aggregationType = 'avg',
  } = config;

  const [data, setData] = useState<DataPoint[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bufferRef = useRef<DataPoint[]>([]);
  const lastAggregateRef = useRef<number>(Date.now());

  /**
   * Add new data point
   */
  const addDataPoint = useCallback((value: number, label?: string) => {
    const point: DataPoint = {
      timestamp: Date.now(),
      value,
      label,
    };

    bufferRef.current.push(point);

    // Check if we need to aggregate
    const now = Date.now();
    if (now - lastAggregateRef.current >= aggregateInterval) {
      aggregateBuffer();
      lastAggregateRef.current = now;
    }
  }, [aggregateInterval]);

  /**
   * Aggregate buffered data points
   */
  const aggregateBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    const buffer = bufferRef.current;
    const values = buffer.map((p) => p.value);

    let aggregatedValue: number;
    switch (aggregationType) {
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'last':
        aggregatedValue = values[values.length - 1];
        break;
      default:
        aggregatedValue = values[values.length - 1];
    }

    const aggregatedPoint: DataPoint = {
      timestamp: buffer[0].timestamp,
      value: aggregatedValue,
      metadata: {
        count: buffer.length,
        aggregationType,
        originalTimestamps: buffer.map((p) => p.timestamp),
      },
    };

    setData((prevData) => {
      const newData = [...prevData, aggregatedPoint];
      // Keep only maxDataPoints
      return newData.slice(-maxDataPoints);
    });

    bufferRef.current = [];
  }, [aggregationType, maxDataPoints]);

  /**
   * Start streaming mode (simulates continuous data)
   */
  const startStream = useCallback((generator?: () => number) => {
    setIsStreaming(true);

    const interval = setInterval(() => {
      if (generator) {
        const value = generator();
        addDataPoint(value);
      }
    }, updateInterval);

    return () => {
      clearInterval(interval);
      setIsStreaming(false);
    };
  }, [addDataPoint, updateInterval]);

  /**
   * Stop streaming
   */
  const stopStream = useCallback(() => {
    setIsStreaming(false);
  }, []);

  /**
   * Clear all data
   */
  const clearData = useCallback(() => {
    setData([]);
    bufferRef.current = [];
  }, []);

  /**
   * Add multiple data points at once
   */
  const addBatch = useCallback((points: Array<{ value: number; label?: string }>) => {
    points.forEach((p) => addDataPoint(p.value, p.label));
  }, [addDataPoint]);

  /**
   * Get statistics from current data
   */
  const getStats = useCallback(() => {
    if (data.length === 0) {
      return null;
    }

    const values = data.map((p) => p.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const latest = values[values.length - 1];

    // Calculate standard deviation
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      count: data.length,
      sum,
      avg,
      max,
      min,
      latest,
      stdDev,
    };
  }, [data]);

  return {
    data,
    isStreaming,
    addDataPoint,
    addBatch,
    startStream,
    stopStream,
    clearData,
    aggregateBuffer,
    getStats,
  };
};

/**
 * Hook for multiple real-time series
 */
export const useMultipleRealtimeSeries = (seriesNames: string[], config?: RealtimeChartConfig) => {
  const series = useRef<Map<string, ReturnType<typeof useRealtimeChartData>>>(new Map());

  // Initialize series
  useEffect(() => {
    seriesNames.forEach((name) => {
      if (!series.current.has(name)) {
        // Note: This is a workaround since we can't call hooks conditionally
        // In production, you'd want to handle this differently
        series.current.set(name, useRealtimeChartData(config));
      }
    });
  }, [seriesNames, config]);

  /**
   * Add data to a specific series
   */
  const addToSeries = useCallback((seriesName: string, value: number, label?: string) => {
    const s = series.current.get(seriesName);
    if (s) {
      s.addDataPoint(value, label);
    }
  }, []);

  /**
   * Get all series data combined
   */
  const getAllSeriesData = useCallback(() => {
    const allData: Record<string, DataPoint[]> = {};
    series.current.forEach((s, name) => {
      allData[name] = s.data;
    });
    return allData;
  }, []);

  return {
    addToSeries,
    getAllSeriesData,
    series: series.current,
  };
};

export default {
  useRealtimeChartData,
  useMultipleRealtimeSeries,
};
