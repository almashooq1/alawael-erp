// Integrations Service
import apiClient from './apiClient';

const integrationsService = {
  // Get all integrations
  getIntegrations: async () => {
    return await apiClient.get('/integrations');
  },

  // Get integration by ID
  getIntegrationById: async integrationId => {
    return await apiClient.get(`/integrations/${integrationId}`);
  },

  // Connect integration
  connectIntegration: async integrationData => {
    return await apiClient.post('/integrations/connect', integrationData);
  },

  // Disconnect integration
  disconnectIntegration: async integrationId => {
    return await apiClient.post(`/integrations/${integrationId}/disconnect`);
  },

  // Test integration
  testIntegration: async integrationId => {
    return await apiClient.post(`/integrations/${integrationId}/test`);
  },

  // Sync data
  syncData: async integrationId => {
    return await apiClient.post(`/integrations/${integrationId}/sync`);
  },

  // Get sync history
  getSyncHistory: async integrationId => {
    return await apiClient.get(`/integrations/${integrationId}/history`);
  },

  // Configure webhook
  configureWebhook: async webhookConfig => {
    return await apiClient.post('/integrations/webhooks', webhookConfig);
  },

  // Get rate limit info
  getRateLimit: async apiKey => {
    return await apiClient.get(`/integrations/rate-limit/${apiKey}`);
  },
};

export default integrationsService;
