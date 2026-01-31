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
const process_forecasting_1 = require("../models/process.forecasting");
/**
 * Forecasting Routes
 * Time series prediction for process planning
 */
const router = express.Router();
let forecastingModel;
/**
 * Initialize Forecasting Model
 * POST /api/ai/forecasting/init
 */
router.post('/init', (req, res) => {
    try {
        const { p = 2, d = 1, q = 1, seasonalPeriod = 12, forecastSteps = 12 } = req.body;
        forecastingModel = (0, process_forecasting_1.createForecastingModel)({
            p,
            d,
            q,
            seasonalPeriod,
            forecastSteps,
        });
        res.json({
            success: true,
            message: '✓ Forecasting model initialized',
            config: { p, d, q, seasonalPeriod, forecastSteps },
            arima: `ARIMA(${p},${d},${q})`,
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
 * Fit Model on Historical Data
 * POST /api/ai/forecasting/fit
 */
router.post('/fit', (req, res) => {
    try {
        if (!forecastingModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not initialized. Call /init first',
            });
        }
        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid time series data',
            });
        }
        forecastingModel.fit(data);
        res.json({
            success: true,
            message: '✓ Model fitted on historical data',
            summary: forecastingModel.getModelSummary(),
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
 * Generate Forecast
 * POST /api/ai/forecasting/predict
 */
router.post('/predict', (req, res) => {
    try {
        if (!forecastingModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not fitted',
            });
        }
        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid time series data',
            });
        }
        const result = forecastingModel.forecast(data);
        res.json({
            success: true,
            forecast: result.forecast,
            confidence: result.confidence,
            lowerBound: result.lowerBound,
            upperBound: result.upperBound,
            accuracy: {
                mape: result.mape,
                rmse: result.rmse,
            },
            trend: result.trend,
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
 * Seasonal Forecast
 * POST /api/ai/forecasting/seasonal
 */
router.post('/seasonal', (req, res) => {
    try {
        if (!forecastingModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not fitted',
            });
        }
        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid time series data',
            });
        }
        const result = forecastingModel.seasonalForecast(data);
        res.json({
            success: true,
            forecast: result.forecast,
            confidence: result.confidence,
            trend: result.trend,
            accuracy: {
                mape: result.mape,
                rmse: result.rmse,
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
 * Multi-Step Ahead Forecast
 * POST /api/ai/forecasting/multi-step
 */
router.post('/multi-step', (req, res) => {
    try {
        if (!forecastingModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not fitted',
            });
        }
        const { data, steps = 24 } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid time series data',
            });
        }
        const result = forecastingModel.multiStepForecast(data, steps);
        res.json({
            success: true,
            forecast: result.forecast,
            steps,
            confidence: result.confidence,
            lowerBound: result.lowerBound,
            upperBound: result.upperBound,
            trend: result.trend,
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
 * GET /api/ai/forecasting/summary
 */
router.get('/summary', (req, res) => {
    try {
        if (!forecastingModel) {
            return res.status(400).json({
                success: false,
                error: 'Model not initialized',
            });
        }
        const summary = forecastingModel.getModelSummary();
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
