import * as express from 'express';
import { ClusteringModel, createClusteringModel } from '../models/process.clustering';

/**
 * Clustering Routes
 * K-Means clustering for process segmentation
 */

const router = express.Router();
let clusteringModel: ClusteringModel;

/**
 * Initialize Clustering Model
 * POST /api/ai/clustering/init
 */
router.post('/init', (req: express.Request, res: express.Response) => {
  try {
    const { k = 3, maxIterations = 100, tolerance = 0.0001 } = req.body;

    clusteringModel = createClusteringModel({
      k,
      maxIterations,
      tolerance,
    });

    res.json({
      success: true,
      message: '✓ Clustering model initialized',
      config: { k, maxIterations, tolerance },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Fit Clustering Model
 * POST /api/ai/clustering/fit
 */
router.post('/fit', (req: express.Request, res: express.Response) => {
  try {
    if (!clusteringModel) {
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

    const result = clusteringModel.fit(data);

    res.json({
      success: true,
      message: '✓ Clustering completed',
      clusters: result.clusters.length,
      iterations: result.iterations,
      inertia: result.inertia,
      silhouetteScore: result.silhouetteScore,
      clusterSizes: result.clusters.map(c => c.length),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Predict Cluster Assignment
 * POST /api/ai/clustering/predict
 */
router.post('/predict', (req: express.Request, res: express.Response) => {
  try {
    if (!clusteringModel) {
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

    const labels = clusteringModel.predict(data);

    res.json({
      success: true,
      labels,
      count: labels.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Find Optimal K using Elbow Method
 * POST /api/ai/clustering/elbow
 */
router.post('/elbow', (req: express.Request, res: express.Response) => {
  try {
    const { data, maxK = 10 } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid data',
      });
    }

    const result = ClusteringModel.elbow(data, maxK);

    res.json({
      success: true,
      optimalK: result.optimalK,
      inertias: result.inertias,
      recommendation: `Recommended number of clusters: ${result.optimalK}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Cluster Summary
 * GET /api/ai/clustering/summary
 */
router.get('/summary', (req: express.Request, res: express.Response) => {
  try {
    if (!clusteringModel) {
      return res.status(400).json({
        success: false,
        error: 'Model not fitted',
      });
    }

    const summary = clusteringModel.getClusterSummary();

    res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
