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
exports.ForecastingModel = void 0;
exports.createForecastingModel = createForecastingModel;
const math = __importStar(require("mathjs"));
class ForecastingModel {
    constructor(config = {}) {
        this.mean = 0;
        this.std = 0;
        this.arCoefficients = [];
        this.maCoefficients = [];
        this.config = {
            p: 2,
            d: 1,
            q: 1,
            seasonalPeriod: 12,
            forecastSteps: 12,
            ...config,
        };
    }
    /**
     * Difference Time Series
     */
    difference(data, order = 1) {
        let result = [...data];
        for (let d = 0; d < order; d++) {
            const diff = [];
            for (let i = 1; i < result.length; i++) {
                diff.push(result[i] - result[i - 1]);
            }
            result = diff;
        }
        return result;
    }
    /**
     * Inverse Difference
     */
    inverseDifference(original, differenced, order = 1) {
        let result = [...original.slice(-order), ...differenced];
        for (let d = 0; d < order; d++) {
            const inverted = [];
            for (let i = 1; i < result.length; i++) {
                inverted.push(result[i] + result[i - 1]);
            }
            result = [result[0], ...inverted];
        }
        return result.slice(order);
    }
    /**
     * Calculate Autocorrelation
     */
    calculateAutocorrelation(data, lag) {
        const mean = math.mean(data);
        const c0 = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / data.length;
        const c_lag = data
            .slice(lag)
            .reduce((sum, x, i) => sum + (x - mean) * (data[i] - mean), 0) / data.length;
        return c_lag / c0;
    }
    /**
     * Fit AR Coefficients
     */
    fitAR(data, order) {
        if (order === 0)
            return [];
        const acf = Array.from({ length: order }, (_, i) => this.calculateAutocorrelation(data, i + 1));
        // Yule-Walker equations (simplified)
        return acf.slice(0, order);
    }
    /**
     * Fit Model
     */
    fit(data) {
        if (data.length < Math.max(this.config.p, this.config.seasonalPeriod) + 1) {
            throw new Error('Insufficient data for fitting');
        }
        const meanVal = math.mean(data);
        this.mean = typeof meanVal === 'number' ? meanVal : Number(meanVal);
        const stdVal = math.std(data);
        this.std = typeof stdVal === 'number' ? stdVal : Number(stdVal);
        // Difference data
        let diffData = this.difference(data, this.config.d);
        // Fit AR coefficients
        this.arCoefficients = this.fitAR(diffData, this.config.p);
        // Fit MA coefficients (simplified)
        this.maCoefficients = Array(this.config.q).fill(0.1);
        console.log('✓ Forecasting model fitted');
        console.log(`  AR(${this.config.p}) coefficients:`, this.arCoefficients);
    }
    /**
     * Predict using AR Model
     */
    predictAR(data, steps) {
        const forecast = [];
        let history = [...data];
        for (let step = 0; step < steps; step++) {
            let prediction = 0;
            // AR component
            for (let i = 0; i < this.config.p; i++) {
                const idx = history.length - i - 1;
                if (idx >= 0) {
                    prediction += this.arCoefficients[i] * history[idx];
                }
            }
            // Add noise/random component
            prediction += Math.random() * 0.1;
            forecast.push(prediction);
            history.push(prediction);
        }
        return forecast;
    }
    /**
     * Forecast Time Series
     */
    forecast(data) {
        if (this.mean === 0) {
            throw new Error('Model not fitted');
        }
        // Difference data
        const diffData = this.difference(data, this.config.d);
        // Predict on differenced data
        const diffForecast = this.predictAR(diffData, this.config.forecastSteps);
        // Inverse difference
        const forecast = this.inverseDifference(data, diffForecast, this.config.d);
        // Calculate confidence intervals
        const residuals = this.calculateResiduals(data);
        const residualStd = math.std(residuals);
        const confidence = [];
        const lowerBound = [];
        const upperBound = [];
        for (let i = 0; i < forecast.length; i++) {
            const std = Number(residualStd) * Math.sqrt(i + 1);
            confidence.push(1 - std / Math.max(this.std, 1));
            lowerBound.push(forecast[i] - 1.96 * std);
            upperBound.push(forecast[i] + 1.96 * std);
        }
        // Calculate accuracy metrics
        const mape = this.calculateMAPE(data.slice(-this.config.forecastSteps), forecast);
        const rmse = this.calculateRMSE(data.slice(-this.config.forecastSteps), forecast);
        // Determine trend
        const trend = this.determineTrend(forecast);
        return {
            forecast,
            confidence,
            lowerBound,
            upperBound,
            mape,
            rmse,
            trend,
        };
    }
    /**
     * Calculate Residuals
     */
    calculateResiduals(data) {
        const residuals = [];
        for (let i = this.config.p; i < data.length; i++) {
            let predicted = 0;
            // AR prediction
            for (let j = 0; j < this.config.p; j++) {
                predicted += this.arCoefficients[j] * data[i - j - 1];
            }
            residuals.push(data[i] - predicted);
        }
        return residuals;
    }
    /**
     * Calculate MAPE (Mean Absolute Percentage Error)
     */
    calculateMAPE(actual, predicted) {
        let sum = 0;
        for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
            if (actual[i] !== 0) {
                sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
            }
        }
        return (sum / Math.min(actual.length, predicted.length)) * 100;
    }
    /**
     * Calculate RMSE (Root Mean Squared Error)
     */
    calculateRMSE(actual, predicted) {
        let sum = 0;
        for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
            sum += Math.pow(actual[i] - predicted[i], 2);
        }
        return Math.sqrt(sum / Math.min(actual.length, predicted.length));
    }
    /**
     * Determine Trend
     */
    determineTrend(forecast) {
        if (forecast.length < 2)
            return 'stable';
        const firstHalf = math.mean(forecast.slice(0, Math.floor(forecast.length / 2)));
        const secondHalf = math.mean(forecast.slice(Math.floor(forecast.length / 2)));
        const change = (secondHalf - firstHalf) / Math.max(Math.abs(firstHalf), 1);
        if (change > 0.1)
            return 'increasing';
        if (change < -0.1)
            return 'decreasing';
        return 'stable';
    }
    /**
     * Seasonal Forecast
     */
    seasonalForecast(data) {
        // Calculate seasonal indices
        const seasonalIndices = Array(this.config.seasonalPeriod).fill(0);
        for (let i = 0; i < this.config.seasonalPeriod; i++) {
            const seasonalValues = [];
            for (let j = i; j < data.length; j += this.config.seasonalPeriod) {
                seasonalValues.push(data[j]);
            }
            seasonalIndices[i] = seasonalValues.length > 0 ? math.mean(seasonalValues) : 1;
        }
        // Generate seasonal forecast
        const forecast = [];
        const trendForecast = this.forecast(data);
        for (let i = 0; i < this.config.forecastSteps; i++) {
            const seasonalIndex = seasonalIndices[i % this.config.seasonalPeriod];
            forecast.push(trendForecast.forecast[i] * (seasonalIndex / math.mean(data)));
        }
        return {
            ...trendForecast,
            forecast,
        };
    }
    /**
     * Multi-Step Ahead Forecast
     */
    multiStepForecast(data, steps) {
        const originalSteps = this.config.forecastSteps;
        this.config.forecastSteps = steps;
        const result = this.forecast(data);
        this.config.forecastSteps = originalSteps;
        return result;
    }
    /**
     * Get Model Summary
     */
    getModelSummary() {
        return {
            arima: `ARIMA(${this.config.p},${this.config.d},${this.config.q})`,
            seasonalPeriod: this.config.seasonalPeriod,
            mean: this.mean,
            std: this.std,
            arCoefficients: this.arCoefficients,
            maCoefficients: this.maCoefficients,
        };
    }
}
exports.ForecastingModel = ForecastingModel;
// Export factory function
function createForecastingModel(config) {
    return new ForecastingModel(config);
}
