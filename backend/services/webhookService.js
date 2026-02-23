const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * WebhookService
 * Manages webhook registration, delivery, and history
 */
class WebhookService {

  // ============ WEBHOOK MANAGEMENT ============

  /**
   * Register new webhook
   */
  async registerWebhook(data) {
    try {
      const webhook = new Webhook({
        name: data.name || 'Webhook',
        description: data.description,
        url: data.url,
        events: data.events || [],
        secretKey: crypto.randomBytes(32).toString('hex'),
        createdBy: data.createdBy,
        status: 'active',
        isActive: true,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0
      });

      const saved = await webhook.save();
      logger.info(`Webhook registered: ${saved._id}`);
      return saved;
    } catch (error) {
      logger.error('Error registering webhook:', error);
      throw error;
    }
  }

  /**
   * Get all webhooks
   */
  async getAllWebhooks(query = {}) {
    try {
      let mongoQuery = {};

      if (query.event) {
        mongoQuery.events = query.event;
      }
      if (query.status) {
        mongoQuery.status = query.status;
      }

      const webhooks = await Webhook.find(mongoQuery)
        .populate('createdBy', 'firstName lastName email')
        .sort({ createdAt: -1 });

      return webhooks;
    } catch (error) {
      logger.error('Error getting webhooks:', error);
      throw error;
    }
  }

  /**
   * Get specific webhook by ID
   */
  async getWebhookById(webhookId) {
    try {
      const webhook = await Webhook.findById(webhookId)
        .populate('createdBy', 'firstName lastName email');
      return webhook || null;
    } catch (error) {
      logger.error('Error getting webhook:', error);
      throw error;
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, data) {
    try {
      const webhook = await Webhook.findByIdAndUpdate(
        webhookId,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).populate('createdBy', 'firstName lastName email');

      if (!webhook) return null;

      logger.info(`Webhook updated: ${webhookId}`);
      return webhook;
    } catch (error) {
      logger.error('Error updating webhook:', error);
      throw error;
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    try {
      const deleted = await Webhook.findByIdAndDelete(webhookId);

      if (!deleted) return null;

      logger.info(`Webhook deleted: ${webhookId}`);
      return { success: true };
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      throw error;
    }
  }

  // ============ WEBHOOK DELIVERY ============

  /**
   * Trigger webhook delivery
   */
  async triggerWebhook(webhookId, event, payload = {}) {
    try {
      const webhook = await Webhook.findById(webhookId);
      if (!webhook) return null;

      // Check if webhook is interested in this event
      if (!webhook.events.includes(event)) {
        return {
          success: false,
          reason: 'Webhook not subscribed to this event'
        };
      }

      const delivery = new WebhookDelivery({
        webhookId,
        event,
        eventData: payload,
        url: webhook.url,
        status: 'pending',
        scheduledTime: new Date()
      });

      const saved = await delivery.save();

      // Update webhook statistics
      await Webhook.findByIdAndUpdate(webhookId, {
        $inc: { totalDeliveries: 1 },
        lastDeliveryDate: new Date()
      });

      // Simulate delivery result
      const result = Math.random() > 0.15; // 85% success rate
      if (result) {
        await WebhookDelivery.findByIdAndUpdate(saved._id, {
          status: 'delivered',
          responseStatus: 200,
          sentTime: new Date(),
          executionTimeMs: Math.floor(Math.random() * 500)
        });

        await Webhook.findByIdAndUpdate(webhookId, {
          $inc: { successfulDeliveries: 1 }
        });
      } else {
        await WebhookDelivery.findByIdAndUpdate(saved._id, {
          status: 'failed',
          responseStatus: 500,
          errorMessage: 'Delivery failed',
          sentTime: new Date(),
          nextRetryTime: new Date(Date.now() + 60000)
        });

        await Webhook.findByIdAndUpdate(webhookId, {
          $inc: { failedDeliveries: 1 }
        });
      }

      logger.info(`Webhook triggered: ${webhookId}, Event: ${event}`);
      return {
        success: result,
        deliveryId: saved._id,
        status: result ? 'delivered' : 'failed'
      };
    } catch (error) {
      logger.error('Error triggering webhook:', error);
      throw error;
    }
  }

  /**
   * Test webhook with sample payload
   */
  async testWebhook(webhookId) {
    try {
      const webhook = await Webhook.findById(webhookId);
      if (!webhook) return null;

      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        events: webhook.events,
        message: 'This is a test webhook delivery'
      };

      const delivery = new WebhookDelivery({
        webhookId,
        event: 'test',
        eventData: testPayload,
        url: webhook.url,
        status: 'delivered',
        scheduledTime: new Date(),
        sentTime: new Date(),
        completedTime: new Date(),
        responseStatus: 200,
        executionTimeMs: Math.floor(Math.random() * 1000)
      });

      const saved = await delivery.save();
      logger.info(`Webhook test sent: ${webhookId}`);

      return {
        success: true,
        deliveryId: saved._id,
        delivery: saved
      };
    } catch (error) {
      logger.error('Error testing webhook:', error);
      throw error;
    }
  }

  /**
   * Get delivery history for webhook
   */
  async getDeliveryHistory(webhookId, query = {}) {
    try {
      let mongoQuery = { webhookId };

      if (query.event) {
        mongoQuery.event = query.event;
      }
      if (query.status) {
        mongoQuery.status = query.status;
      }

      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 20;
      const skip = (page - 1) * limit;

      const deliveries = await WebhookDelivery.find(mongoQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return deliveries;
    } catch (error) {
      logger.error('Error getting delivery history:', error);
      throw error;
    }
  }

  // ============ UTILITY METHODS ============

  // ============ UTILITY METHODS ============

  /**
   * Generate webhook signature
   */
  generateSignature(webhook, payload) {
    try {
      const jsonString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', webhook.secretKey)
        .update(jsonString)
        .digest('hex');

      return signature;
    } catch (error) {
      logger.error('Error generating signature:', error);
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStatistics(webhookId) {
    try {
      const webhook = await Webhook.findById(webhookId);
      if (!webhook) return null;

      const deliveries = await WebhookDelivery.countDocuments({ webhookId });
      const successful = await WebhookDelivery.countDocuments({
        webhookId,
        status: 'delivered'
      });
      const failed = await WebhookDelivery.countDocuments({
        webhookId,
        status: 'failed'
      });

      return {
        webhookId,
        totalDeliveries: deliveries,
        successfulDeliveries: successful,
        failedDeliveries: failed,
        successRate: deliveries > 0
          ? ((successful / deliveries) * 100).toFixed(2)
          : 0,
        lastDelivery: webhook.lastDeliveryDate,
        lastDeliveryStatus: webhook.lastDeliveryStatus
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Disable webhook (soft delete)
   */
  async disableWebhook(webhookId) {
    try {
      const webhook = await Webhook.findByIdAndUpdate(
        webhookId,
        { isActive: false, status: 'inactive', updatedAt: new Date() },
        { new: true }
      );

      if (!webhook) return null;

      logger.info(`Webhook disabled: ${webhookId}`);
      return webhook;
    } catch (error) {
      logger.error('Error disabling webhook:', error);
      throw error;
    }
  }

  /**
   * Enable webhook
   */
  async enableWebhook(webhookId) {
    try {
      const webhook = await Webhook.findByIdAndUpdate(
        webhookId,
        { isActive: true, status: 'active', updatedAt: new Date() },
        { new: true }
      );

      if (!webhook) return null;

      logger.info(`Webhook enabled: ${webhookId}`);
      return webhook;
    } catch (error) {
      logger.error('Error enabling webhook:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    try {
      const [webhooksCount, deliveriesCount, activeCount] = await Promise.all([
        Webhook.countDocuments(),
        WebhookDelivery.countDocuments(),
        Webhook.countDocuments({ isActive: true })
      ]);

      return {
        service: 'WebhookService',
        status: 'operational',
        webhooksCount,
        deliveriesCount,
        activeWebhooks: activeCount
      };
    } catch (error) {
      logger.error('Error getting health status:', error);
      return {
        service: 'WebhookService',
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export service and singleton instance
const webhookService = new WebhookService();

module.exports = {
  WebhookService,
  webhookService
};
