const Integration = require('../models/Integration');
const crypto = require('crypto');

class IntegrationService {
  /**
   * Configure a new integration or update existing
   */
  async configureIntegration(name, type, config) {
    let integration = await Integration.findOne({ name });

    if (integration) {
      integration.type = type;
      integration.config = { ...integration.config, ...config };
      integration.status = 'ACTIVE';
    } else {
      integration = new Integration({
        name,
        type,
        config,
        status: 'ACTIVE',
      });
    }

    await integration.save();
    return integration;
  }

  /**
   * Simulate sending a webhook payload
   */
  async triggerWebhook(integrationName, payload) {
    const integration = await Integration.findOne({ name: integrationName });
    if (!integration || integration.status !== 'ACTIVE') {
      throw new Error('Integration not found or inactive');
    }

    try {
      // Simulation of an external HTTP request
      console.log(`[IntegrationService] Sending webhook to ${integration.config.webhookUrl}`, payload);

      const logEntry = {
        action: 'WEBHOOK_DISPATCH',
        status: 'SUCCESS',
        message: 'Payload sent successfully',
      };

      integration.logs.push(logEntry);
      integration.lastSync = new Date();
      await integration.save();

      return { success: true, timestamp: new Date() };
    } catch (error) {
      integration.logs.push({
        action: 'WEBHOOK_DISPATCH',
        status: 'FAILED',
        message: error.message,
      });
      await integration.save();
      throw error;
    }
  }

  /**
   * List all integrations
   */
  async listIntegrations() {
    return await Integration.find({}, 'name type status lastSync');
  }
}

module.exports = IntegrationService;
module.exports.instance = new IntegrationService();
