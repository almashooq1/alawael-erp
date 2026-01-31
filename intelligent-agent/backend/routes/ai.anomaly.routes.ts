import * as express from 'express';
import { AnomalyDetectionModel, createAnomalyDetectionModel } from '../models/process.anomaly';

/**
 * Anomaly Detection Routes
 * Statistical outlier detection for process monitoring
 */

const router = express.Router();
let anomalyModel: AnomalyDetectionModel;

/**
 * Initialize Anomaly Detection Model
 * POST /api/ai/anomaly/init
 */
router.post('/init', (req: express.Request, res: express.Response) => {
  try {
    const { method = 'zscore', threshold = 2.5, windowSize = 10 } = req.body;

    anomalyModel = createAnomalyDetectionModel({
      method,
      threshold,
      windowSize,
    });

    res.json({
      success: true,
      message: '✓ Anomaly detection model initialized',
      config: { method, threshold, windowSize },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Fit Model on Training Data
 * POST /api/ai/anomaly/fit
 */
router.post('/fit', (req: express.Request, res: express.Response) => {
  try {
    if (!anomalyModel) {
      return res.status(400).json({
        success: false,
        error: 'Model not initialized. Call /init first',
      });
    }

    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid training data',
      });
    }

    anomalyModel.fit(data);

    res.json({
      success: true,
      message: '✓ Model fitted on training data',
      stats: anomalyModel.getStats(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Detect Anomalies
 * POST /api/ai/anomaly/detect
 */
router.post('/detect', (req: express.Request, res: express.Response) => {
  try {
    if (!anomalyModel) {
      return res.status(400).json({
        success: false,
        error: 'Model not fitted',
      });
    }

    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
      });
    }

    const result = anomalyModel.detect(data);

    res.json({
      success: true,
      anomalies: result.anomalies,
      anomalyCount: result.anomalies.length,
      detectionRate: result.detectionRate,
      severity: result.severity,
      method: result.method,
      scores: result.scores,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Real-Time Anomaly Detection
 * POST /api/ai/anomaly/detect-realtime
 */
router.post('/detect-realtime', (req: express.Request, res: express.Response) => {
  try {
    if (!anomalyModel) {
      return res.status(400).json({
        success: false,
        error: 'Model not fitted',
      });
    }

    const { dataPoint } = req.body;

    if (!dataPoint || !Array.isArray(dataPoint)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data point',
      });
    }

    const result = anomalyModel.detectRealtimeAnomaly(dataPoint);

    res.json({
      success: true,
      isAnomaly: result.isAnomaly,
      score: result.score,
      severity: result.severity,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Seasonal Decomposition
 * POST /api/ai/anomaly/seasonal
 */
router.post('/seasonal', (req: express.Request, res: express.Response) => {
  try {
    if (!anomalyModel) {
      return res.status(400).json({
        success: false,
        error: 'Model not initialized',
      });
    }

    const { data, seasonLength = 12 } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time series data',
      });
    }

    const result = anomalyModel.seasonalDecomposition(data, seasonLength);

    res.json({
      success: true,
      decomposition: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Model Statistics
 * GET /api/ai/anomaly/stats
 */
router.get('/stats', (req: express.Request, res: express.Response) => {
  try {
    if (!anomalyModel) {
      return res.status(400).json({
        success: false,
        error: 'Model not initialized',
      });
    }

    const stats = anomalyModel.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
