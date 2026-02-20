// Predictions Service
import apiClient from './apiClient';

const predictionsService = {
  // Get sales predictions
  getSalesPrediction: async historicalData => {
    return await apiClient.post('/predictions/sales', { historicalData });
  },

  // Get demand forecast
  getDemandForecast: async (productId, period = '30d') => {
    return await apiClient.post('/predictions/demand', { productId, period });
  },

  // Get trend analysis
  getTrendAnalysis: async (dataType, timeRange) => {
    return await apiClient.get('/predictions/trends', {
      params: { dataType, timeRange },
    });
  },

  // Get prediction accuracy
  getPredictionAccuracy: async () => {
    return await apiClient.get('/predictions/accuracy');
  },

  // Train model
  trainModel: async (modelType, trainingData) => {
    return await apiClient.post('/predictions/train', {
      modelType,
      trainingData,
    });
  },

  // Get model performance
  getModelPerformance: async modelId => {
    return await apiClient.get(`/predictions/models/${modelId}/performance`);
  },
};

export default predictionsService;
