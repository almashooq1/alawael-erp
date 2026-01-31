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
const process_anomaly_1 = require("../models/process.anomaly");
/**
 * Anomaly Detection Routes
 * Statistical outlier detection for process monitoring
 */
const router = express.Router();
let anomalyModel;
/**
 * Initialize Anomaly Detection Model
 * POST /api/ai/anomaly/init
 */
router.post('/init', (req, res) => {
    try {
        const { method = 'zscore', threshold = 2.5, windowSize = 10 } = req.body;
        anomalyModel = (0, process_anomaly_1.createAnomalyDetectionModel)({
            method,
            threshold,
            windowSize,
        });
        res.json({
            success: true,
            message: '✓ Anomaly detection model initialized',
            config: { method, threshold, windowSize },
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
 * Fit Model on Training Data
 * POST /api/ai/anomaly/fit
 */
router.post('/fit', (req, res) => {
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
    }
    catch (error) {
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
router.post('/detect', (req, res) => {
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
    }
    catch (error) {
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
router.post('/detect-realtime', (req, res) => {
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
    }
    catch (error) {
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
router.post('/seasonal', (req, res) => {
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
    }
    catch (error) {
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
router.get('/stats', (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
