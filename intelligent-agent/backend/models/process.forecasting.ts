import * as math from 'mathjs';

/**
 * Time Series Forecasting Model
 * ARIMA-inspired forecasting with seasonal decomposition
 */

interface ForecastingConfig {
  p: number; // AR order
  d: number; // Difference order
  q: number; // MA order
  seasonalPeriod: number;
  forecastSteps: number;
}

interface ForecastResult {
  forecast: number[];
  confidence: number[];
  lowerBound: number[];
  upperBound: number[];
  mape: number;
  rmse: number;
  trend: string;
}

export class ForecastingModel {
  private config: ForecastingConfig;
  private mean: number = 0;
  private std: number = 0;
  private arCoefficients: number[] = [];
  private maCoefficients: number[] = [];

  constructor(config: Partial<ForecastingConfig> = {}) {
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
  private difference(data: number[], order: number = 1): number[] {
    let result = [...data];
    for (let d = 0; d < order; d++) {
      const diff: number[] = [];
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
  private inverseDifference(original: number[], differenced: number[], order: number = 1): number[] {
    let result = [...original.slice(-order), ...differenced];

    for (let d = 0; d < order; d++) {
      const inverted: number[] = [];
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
  private calculateAutocorrelation(data: number[], lag: number): number {
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
  private fitAR(data: number[], order: number): number[] {
    if (order === 0) return [];

    const acf = Array.from({ length: order }, (_, i) => this.calculateAutocorrelation(data, i + 1));

    // Yule-Walker equations (simplified)
    return acf.slice(0, order);
  }

  /**
   * Fit Model
   */
  fit(data: number[]): void {
    if (data.length < Math.max(this.config.p, this.config.seasonalPeriod) + 1) {
      throw new Error('Insufficient data for fitting');
    }

    const meanVal = math.mean(data);
    this.mean = typeof meanVal === 'number' ? meanVal : Number(meanVal);
    const stdVal = math.std(data as number[]);
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
  private predictAR(data: number[], steps: number): number[] {
    const forecast: number[] = [];
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
  forecast(data: number[]): ForecastResult {
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

    const confidence: number[] = [];
    const lowerBound: number[] = [];
    const upperBound: number[] = [];

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
  private calculateResiduals(data: number[]): number[] {
    const residuals: number[] = [];

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
  private calculateMAPE(actual: number[], predicted: number[]): number {
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
  private calculateRMSE(actual: number[], predicted: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(actual.length, predicted.length); i++) {
      sum += Math.pow(actual[i] - predicted[i], 2);
    }
    return Math.sqrt(sum / Math.min(actual.length, predicted.length));
  }

  /**
   * Determine Trend
   */
  private determineTrend(forecast: number[]): string {
    if (forecast.length < 2) return 'stable';

    const firstHalf = math.mean(forecast.slice(0, Math.floor(forecast.length / 2)));
    const secondHalf = math.mean(forecast.slice(Math.floor(forecast.length / 2)));

    const change = (secondHalf - firstHalf) / Math.max(Math.abs(firstHalf), 1);

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Seasonal Forecast
   */
  seasonalForecast(data: number[]): ForecastResult {
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
    const forecast: number[] = [];
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
  multiStepForecast(data: number[], steps: number): ForecastResult {
    const originalSteps = this.config.forecastSteps;
    this.config.forecastSteps = steps;

    const result = this.forecast(data);

    this.config.forecastSteps = originalSteps;

    return result;
  }

  /**
   * Get Model Summary
   */
  getModelSummary(): object {
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

// Export factory function
export function createForecastingModel(config?: Partial<ForecastingConfig>) {
  return new ForecastingModel(config);
}
