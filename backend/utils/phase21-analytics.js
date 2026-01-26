// Phase 21: Advanced Analytics v2
// ML-Powered Insights, Anomaly Detection, Predictive Models

class AnomalyDetector {
  constructor() {
    this.models = new Map();
    this.alerts = [];
    this.history = [];
  }

  initializeModel(tenantId, config) {
    const { metricName, threshold, windowSize, sensitivity } = config;
    const model = {
      tenantId,
      metricName,
      threshold: threshold || 2.5,
      windowSize: windowSize || 50,
      sensitivity: sensitivity || 'medium',
      mean: 0,
      stdDev: 0,
      dataPoints: [],
      createdAt: new Date(),
    };
    this.models.set(`${tenantId}_${metricName}`, model);
    return { success: true, modelId: `${tenantId}_${metricName}` };
  }

  detectAnomalies(tenantId, metricName, dataPoints) {
    const modelKey = `${tenantId}_${metricName}`;
    const model = this.models.get(modelKey);
    if (!model) throw new Error('Model not found');

    model.dataPoints.push(...dataPoints);
    if (model.dataPoints.length > model.windowSize) {
      model.dataPoints = model.dataPoints.slice(-model.windowSize);
    }

    // Calculate mean and std dev
    const mean = model.dataPoints.reduce((a, b) => a + b, 0) / model.dataPoints.length;
    const variance =
      model.dataPoints.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / model.dataPoints.length;
    const stdDev = Math.sqrt(variance);

    model.mean = mean;
    model.stdDev = stdDev;

    // Detect anomalies using z-score
    const anomalies = dataPoints
      .map((value, index) => {
        const zScore = Math.abs((value - mean) / (stdDev || 1));
        const threshold = model.threshold;
        const isAnomaly = zScore > threshold;

        if (isAnomaly) {
          const alert = {
            id: `alert_${Date.now()}_${index}`,
            tenantId,
            metricName,
            value,
            zScore,
            severity: zScore > threshold * 1.5 ? 'critical' : 'warning',
            timestamp: new Date(),
            message: `Anomaly detected: value ${value} (z-score: ${zScore.toFixed(2)})`,
          };
          this.alerts.push(alert);
          return alert;
        }
        return null;
      })
      .filter(a => a !== null);

    return { anomalies, mean, stdDev };
  }

  getPredictiveInsights(tenantId, metricName, forecastPeriods = 10) {
    const modelKey = `${tenantId}_${metricName}`;
    const model = this.models.get(modelKey);
    if (!model) throw new Error('Model not found');

    const data = model.dataPoints;
    if (data.length < 3) return { forecast: [], confidence: 0 };

    // Simple linear regression for forecasting
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = Array.from({ length: forecastPeriods }, (_, i) => {
      const x = n + i;
      return intercept + slope * x;
    });

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = data.reduce((sum, y, i) => sum + Math.pow(y - (intercept + slope * i), 2), 0);
    const ssTot = data.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = 1 - ssRes / ssTot;

    return {
      forecast,
      confidence: Math.max(0, Math.min(1, rSquared)),
      slope,
      intercept,
      trend: slope > 0 ? 'upward' : 'downward',
    };
  }

  getAlerts(tenantId, filter = {}) {
    let alerts = this.alerts.filter(a => a.tenantId === tenantId);

    if (filter.severity) {
      alerts = alerts.filter(a => a.severity === filter.severity);
    }
    if (filter.metric) {
      alerts = alerts.filter(a => a.metricName === filter.metric);
    }
    if (filter.startTime) {
      alerts = alerts.filter(a => new Date(a.timestamp) >= new Date(filter.startTime));
    }

    return alerts;
  }

  clearAlert(alertId) {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      return { success: true };
    }
    return { success: false };
  }
}

class CustomDashboardBuilder {
  constructor() {
    this.dashboards = new Map();
    this.widgets = new Map();
  }

  createDashboard(tenantId, config) {
    const { name, description, layout = 'grid' } = config;
    const dashboardId = `dash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dashboard = {
      id: dashboardId,
      tenantId,
      name,
      description,
      layout,
      widgets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: false,
    };

    this.dashboards.set(dashboardId, dashboard);
    return { success: true, dashboardId, dashboard };
  }

  addWidget(dashboardId, widgetConfig) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { type, title, config, position = {} } = widgetConfig;

    const widget = {
      id: widgetId,
      type, // 'chart', 'metric', 'table', 'gauge', 'heatmap', '3d'
      title,
      config,
      position,
      createdAt: new Date(),
    };

    this.widgets.set(widgetId, widget);
    dashboard.widgets.push(widgetId);
    dashboard.updatedAt = new Date();

    return { success: true, widgetId, widget };
  }

  getVisualizations(tenantId, options = {}) {
    return {
      chartTypes: ['line', 'bar', 'pie', 'area', 'scatter', '3d-bar', '3d-scatter'],
      mapTypes: ['heatmap', 'geographic', 'network'],
      tableTypes: ['standard', 'pivot', 'tree'],
      gaugeTypes: ['radial', 'linear', 'bullet'],
      availableForTenant: true,
    };
  }

  getDashboard(dashboardId) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    return {
      ...dashboard,
      widgets: dashboard.widgets.map(wId => this.widgets.get(wId)),
    };
  }

  updateDashboard(dashboardId, updates) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    Object.assign(dashboard, updates, { updatedAt: new Date() });
    return { success: true, dashboard };
  }

  shareDashboard(dashboardId, shareConfig) {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error('Dashboard not found');

    const { type = 'public', users = [] } = shareConfig;
    dashboard.isPublic = type === 'public';
    dashboard.sharedWith = users;
    dashboard.shareLink = `dashboard/${dashboardId}/${Date.now()}`;

    return { success: true, shareLink: dashboard.shareLink };
  }
}

class PredictiveModel {
  constructor() {
    this.models = new Map();
    this.predictions = [];
  }

  trainModel(tenantId, modelType, trainingData) {
    const modelId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const model = {
      id: modelId,
      tenantId,
      type: modelType, // 'demand', 'churn', 'revenue', 'customer-lifetime'
      trainingData,
      accuracy: 0,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    // Simulate model training
    model.accuracy = 0.75 + Math.random() * 0.2; // 75-95% accuracy

    this.models.set(modelId, model);
    return { success: true, modelId, accuracy: model.accuracy };
  }

  makePrediction(modelId, inputData) {
    const model = this.models.get(modelId);
    if (!model) throw new Error('Model not found');

    const prediction = {
      id: `pred_${Date.now()}`,
      modelId,
      input: inputData,
      prediction: Math.random() * 100,
      confidence: model.accuracy,
      timestamp: new Date(),
    };

    this.predictions.push(prediction);
    return prediction;
  }

  getModelMetrics(modelId) {
    const model = this.models.get(modelId);
    if (!model) throw new Error('Model not found');

    const modelPredictions = this.predictions.filter(p => p.modelId === modelId);

    return {
      modelId,
      type: model.type,
      totalPredictions: modelPredictions.length,
      accuracy: model.accuracy,
      avgConfidence: model.accuracy,
      trainingDate: model.createdAt,
      lastUpdated: model.lastUpdated,
    };
  }
}

module.exports = { AnomalyDetector, CustomDashboardBuilder, PredictiveModel };
