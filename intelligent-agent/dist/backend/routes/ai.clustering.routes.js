"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express = __importStar(require("express"));
const process_clustering_1 = require("../models/process.clustering");
/**
 * Clustering Routes
 * K-Means clustering for process segmentation
 */
const router = express.Router();
let clusteringModel;
/**
 * Initialize Clustering Model
 * POST /api/ai/clustering/init
 */
router.post('/init', (req, res) => {
    try {
        const { k = 3, maxIterations = 100, tolerance = 0.0001 } = req.body;
        clusteringModel = (0, process_clustering_1.createClusteringModel)({
            k,
            maxIterations,
            tolerance,
        });
        res.json({
            success: true,
            message: '✓ Clustering model initialized',
            config: { k, maxIterations, tolerance },
        });
    }
    catch (error) {
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
router.post('/fit', (req, res) => {
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
    }
    catch (error) {
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
router.post('/predict', (req, res) => {
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
    }
    catch (error) {
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
router.post('/elbow', (req, res) => {
    try {
        const { data, maxK = 10 } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid data',
            });
        }
        const result = process_clustering_1.ClusteringModel.elbow(data, maxK);
        res.json({
            success: true,
            optimalK: result.optimalK,
            inertias: result.inertias,
            recommendation: `Recommended number of clusters: ${result.optimalK}`,
        });
    }
    catch (error) {
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
router.get('/summary', (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
