import * as express from 'express';
import { ForecastingModel, createForecastingModel } from '../models/process.forecasting';

/**
 * Forecasting Routes
 * Time series prediction for process planning
 */

const router = express.Router();
let forecastingModel: ForecastingModel;

/**
 * Initialize Forecasting Model
 * POST /api/ai/forecasting/init
 */
router.post('/init', (req: express.Request, res: express.Response) => {
  try {
    const { p = 2, d = 1, q = 1, seasonalPeriod = 12, forecastSteps = 12 } = req.body;

    forecastingModel = createForecastingModel({
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
  } catch (error: any) {
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
router.post('/fit', (req: express.Request, res: express.Response) => {
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
  } catch (error: any) {
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
router.post('/predict', (req: express.Request, res: express.Response) => {
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
  } catch (error: any) {
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
router.post('/seasonal', (req: express.Request, res: express.Response) => {
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
  } catch (error: any) {
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
router.post('/multi-step', (req: express.Request, res: express.Response) => {
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
  } catch (error: any) {
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
router.get('/summary', (req: express.Request, res: express.Response) => {
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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
