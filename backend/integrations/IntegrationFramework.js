/**
 * Integration Framework - Phase 10
 * Pluggable framework for ERP, banking, and third-party system integrations
 */

class IntegrationFramework {
  constructor() {
    this.integrations = new Map();
    this.webhooks = new Map();
    this.syncQueue = [];
    this.eventLog = [];
  }

  /**
   * Register a new integration
   */
  registerIntegration(name, config) {
    if (this.integrations.has(name)) {
      throw new Error(`Integration ${name} already registered`);
    }

    const integration = new IntegrationAdapter(name, config);
    this.integrations.set(name, integration);
    return integration;
  }

  /**
   * Get integration by name
   */
  getIntegration(name) {
    return this.integrations.get(name);
  }

  /**
   * Execute integration sync
   */
  async syncIntegration(name, dataType) {
    const integration = this.getIntegration(name);
    if (!integration) throw new Error(`Integration ${name} not found`);

    try {
      const result = await integration.pull(dataType);
      this.logEvent('sync:success', name, dataType, result);
      return result;
    } catch (error) {
      this.logEvent('sync:error', name, dataType, error);
      throw error;
    }
  }

  /**
   * Push data to integration
   */
  async pushData(name, dataType, data) {
    const integration = this.getIntegration(name);
    if (!integration) throw new Error(`Integration ${name} not found`);

    try {
      const result = await integration.push(dataType, data);
      this.logEvent('push:success', name, dataType, result);
      return result;
    } catch (error) {
      this.logEvent('push:error', name, dataType, error);
      throw error;
    }
  }

  /**
   * Register webhook for integration events
   */
  registerWebhook(event, callback) {
    if (!this.webhooks.has(event)) {
      this.webhooks.set(event, []);
    }
    this.webhooks.get(event).push(callback);
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(event, data) {
    const callbacks = this.webhooks.get(event) || [];
    for (const callback of callbacks) {
      try {
        await callback(data);
      } catch (error) {
        console.error(`Webhook error for ${event}:`, error);
      }
    }
  }

  /**
   * Log integration event
   */
  logEvent(type, integration, dataType, details) {
    this.eventLog.push({
      type,
      integration,
      dataType,
      details,
      timestamp: new Date(),
    });

    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }
  }

  /**
   * Get integration stats
   */
  getStats() {
    return {
      totalIntegrations: this.integrations.size,
      activeIntegrations: Array.from(this.integrations.values()).filter(i => i.isActive).length,
      totalEvents: this.eventLog.length,
      recentEvents: this.eventLog.slice(-10),
      integrationsList: Array.from(this.integrations.entries()).map(([name, integration]) => ({
        name,
        status: integration.isActive ? 'active' : 'inactive',
        lastSync: integration.lastSync,
        errorCount: integration.errorCount,
      })),
    };
  }
}

/**
 * Base Integration Adapter
 */
class IntegrationAdapter {
  constructor(name, config) {
    this.name = name;
    this.config = config;
    this.isActive = config.enabled !== false;
    this.lastSync = null;
    this.errorCount = 0;
    this.dataMappers = new Map();
  }

  /**
   * Pull data from external system
   */
  async pull(dataType) {
    throw new Error('pull() must be implemented by subclass');
  }

  /**
   * Push data to external system
   */
  async push(dataType, data) {
    throw new Error('push() must be implemented by subclass');
  }

  /**
   * Map external data format to internal format
   */
  mapFromExternal(dataType, externalData) {
    const mapper = this.dataMappers.get(`${dataType}:from`);
    if (!mapper) return externalData;
    return mapper(externalData);
  }

  /**
   * Map internal data format to external format
   */
  mapToExternal(dataType, internalData) {
    const mapper = this.dataMappers.get(`${dataType}:to`);
    if (!mapper) return internalData;
    return mapper(internalData);
  }

  registerDataMapper(direction, dataType, mapper) {
    this.dataMappers.set(`${dataType}:${direction}`, mapper);
  }
}

/**
 * ERP Integration Adapter
 */
class ERPIntegration extends IntegrationAdapter {
  async pull(dataType) {
    try {
      const result = await this.fetchFromERP(dataType);
      this.lastSync = new Date();
      return this.mapFromExternal(dataType, result);
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  async push(dataType, data) {
    try {
      const externalFormat = this.mapToExternal(dataType, data);
      const result = await this.sendToERP(dataType, externalFormat);
      return result;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  /**
   * Fetch data from ERP system
   */
  async fetchFromERP(dataType) {
    // Implementation specific to ERP (e.g., SAP, Oracle EBS)
    const { apiEndpoint, apiKey } = this.config;

    // Example: fetch employee data
    if (dataType === 'employees') {
      const response = await fetch(`${apiEndpoint}/employees`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.json();
    }

    // Example: fetch departments
    if (dataType === 'departments') {
      const response = await fetch(`${apiEndpoint}/departments`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.json();
    }

    throw new Error(`Unsupported dataType: ${dataType}`);
  }

  /**
   * Send data to ERP system
   */
  async sendToERP(dataType, data) {
    const { apiEndpoint, apiKey } = this.config;

    const response = await fetch(`${apiEndpoint}/${dataType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`ERP API error: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Banking Integration Adapter
 */
class BankingIntegration extends IntegrationAdapter {
  async pull(dataType) {
    try {
      const result = await this.fetchFromBank(dataType);
      this.lastSync = new Date();
      return this.mapFromExternal(dataType, result);
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  async push(dataType, data) {
    try {
      const externalFormat = this.mapToExternal(dataType, data);
      const result = await this.sendToBank(dataType, externalFormat);
      return result;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  /**
   * Fetch banking data (transactions, accounts, etc.)
   */
  async fetchFromBank(dataType) {
    const { bankCode, accountId, apiKey, baseUrl } = this.config;

    // Example: fetch transactions
    if (dataType === 'transactions') {
      const response = await fetch(`${baseUrl}/accounts/${accountId}/transactions`, {
        headers: {
          'X-Bank-Code': bankCode,
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });
      return response.json();
    }

    // Example: fetch account balance
    if (dataType === 'balance') {
      const response = await fetch(`${baseUrl}/accounts/${accountId}/balance`, {
        headers: {
          'X-Bank-Code': bankCode,
          'X-API-Key': apiKey,
        },
      });
      return response.json();
    }

    throw new Error(`Unsupported dataType: ${dataType}`);
  }

  /**
   * Send payment/transaction to bank
   */
  async sendToBank(dataType, data) {
    const { bankCode, apiKey, baseUrl } = this.config;

    if (dataType === 'payment') {
      const response = await fetch(`${baseUrl}/payments/initiate`, {
        method: 'POST',
        headers: {
          'X-Bank-Code': bankCode,
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Banking API error: ${response.statusText}`);
      }

      return response.json();
    }

    throw new Error(`Unsupported push type: ${dataType}`);
  }
}

/**
 * Third-Party API Integration Adapter
 */
class ThirdPartyIntegration extends IntegrationAdapter {
  async pull(dataType) {
    try {
      const result = await this.fetchFromAPI(dataType);
      this.lastSync = new Date();
      return this.mapFromExternal(dataType, result);
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  async push(dataType, data) {
    try {
      const externalFormat = this.mapToExternal(dataType, data);
      const result = await this.sendToAPI(dataType, externalFormat);
      return result;
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  /**
   * Generic API fetch
   */
  async fetchFromAPI(dataType) {
    const { baseUrl, apiKey, endpoints } = this.config;
    const endpoint = endpoints[dataType];

    if (!endpoint) {
      throw new Error(`No endpoint configured for ${dataType}`);
    }

    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generic API push
   */
  async sendToAPI(dataType, data) {
    const { baseUrl, apiKey, endpoints } = this.config;
    const endpoint = endpoints[dataType];

    if (!endpoint) {
      throw new Error(`No endpoint configured for ${dataType}`);
    }

    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Data synchronization manager
 */
class DataSyncManager {
  constructor(framework) {
    this.framework = framework;
    this.syncSchedules = new Map();
  }

  /**
   * Schedule periodic sync for an integration
   */
  scheduleSyncintegration(name, dataType, intervalMinutes) {
    const intervalMs = intervalMinutes * 60 * 1000;

    const schedule = setInterval(async () => {
      try {
        await this.framework.syncIntegration(name, dataType);
      } catch (error) {
        console.error(`Sync error for ${name}/${dataType}:`, error);
      }
    }, intervalMs);

    const key = `${name}:${dataType}`;
    this.syncSchedules.set(key, schedule);
  }

  /**
   * Cancel sync schedule
   */
  cancelSync(name, dataType) {
    const key = `${name}:${dataType}`;
    const schedule = this.syncSchedules.get(key);
    if (schedule) {
      clearInterval(schedule);
      this.syncSchedules.delete(key);
    }
  }

  /**
   * Get all active schedules
   */
  getActiveSchedules() {
    return Array.from(this.syncSchedules.keys());
  }
}

module.exports = {
  IntegrationFramework,
  IntegrationAdapter,
  ERPIntegration,
  BankingIntegration,
  ThirdPartyIntegration,
  DataSyncManager,
};
