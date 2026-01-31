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
const process_deeplearning_1 = require("../models/process.deeplearning");
/**
 * Deep Learning Routes
 * Advanced neural network-based process analysis
 */
const router = express.Router();
let deepLearningModel;
/**
 * Initialize Deep Learning Model
 * POST /api/ai/deeplearning/init
 */
router.post('/init', async (req, res) => {
    try {
        const { inputSize = 10, hiddenLayers = [64, 32, 16], learningRate = 0.001 } = req.body;
        deepLearningModel = (0, process_deeplearning_1.createDeepLearningModel)({
            inputSize,
            hiddenLayers,
            outputSize: 1,
            learningRate,
            epochs: 50,
            batchSize: 32,
        });
        res.json({
            success: true,
            message: '✓ Deep Learning model initialized',
            config: {
                inputSize,
                hiddenLayers,
                learningRate,
            },
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
 * Train Neural Network
 * POST /api/ai/deeplearning/train
 */
router.post('/train', async (req, res) => {
    try {
        if (!deepLearningModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not initialized. Call /init first',
            });
        }
        const { inputs, outputs } = req.body;
        if (!inputs || !outputs) {
            return res.status(400).json({
                success: false,
                error: 'Missing training data',
            });
        }
        const history = await deepLearningModel.trainNeuralNetwork({
            inputs,
            outputs,
        });
        res.json({
            success: true,
            message: '✓ Model training completed',
            history: {
                epochs: history.epochs,
                finalLoss: history.history.loss[history.history.loss.length - 1],
            },
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
 * Predict with Deep Learning Model
 * POST /api/ai/deeplearning/predict
 */
router.post('/predict', async (req, res) => {
    try {
        if (!deepLearningModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not trained',
            });
        }
        const { input } = req.body;
        if (!input || !Array.isArray(input)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid input data',
            });
        }
        const result = await deepLearningModel.predictWithDL(input);
        res.json({
            success: true,
            prediction: result.predictions[0],
            confidence: result.confidence,
            patterns: result.patterns,
            recommendations: result.recommendations,
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
 * Analyze Patterns in Process Data
 * POST /api/ai/deeplearning/analyze-patterns
 */
router.post('/analyze-patterns', async (req, res) => {
    try {
        if (!deepLearningModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not initialized',
            });
        }
        const { processes } = req.body;
        if (!processes || !Array.isArray(processes)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid process data',
            });
        }
        const patterns = await deepLearningModel.analyzePatterns(processes);
        res.json({
            success: true,
            patterns,
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
 * Optimize Model
 * POST /api/ai/deeplearning/optimize
 */
router.post('/optimize', async (req, res) => {
    try {
        if (!deepLearningModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not trained',
            });
        }
        const { inputs, outputs } = req.body;
        const optimization = await deepLearningModel.optimizeNetwork({
            inputs,
            outputs,
        });
        res.json({
            success: true,
            message: '✓ Model optimized',
            metrics: optimization,
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
 * Get Model Summary
 * GET /api/ai/deeplearning/summary
 */
router.get('/summary', (req, res) => {
    try {
        if (!deepLearningModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not initialized',
            });
        }
        const summary = deepLearningModel.getModelSummary();
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
/**
 * Batch Predict
 * POST /api/ai/deeplearning/batch-predict
 */
router.post('/batch-predict', async (req, res) => {
    try {
        if (!deepLearningModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not trained',
            });
        }
        const { inputs } = req.body;
        if (!inputs || !Array.isArray(inputs)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid batch input',
            });
        }
        const predictions = [];
        for (const input of inputs) {
            const result = await deepLearningModel.predictWithDL(input);
            predictions.push(result);
        }
        res.json({
            success: true,
            count: predictions.length,
            predictions,
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
