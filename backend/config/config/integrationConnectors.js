/**
 * integrationConnectors.js
 * AlAwael ERP - Pre-configured Integration Connectors
 * Ready-to-use connectors for popular platforms
 * February 22, 2026
 */

// ===========================
// PAYFORT PAYMENT INTEGRATION
// ===========================
const PAYFORT_CONNECTOR = {
  id: 'payfort_connector',
  name: 'PayFort Payment Gateway',
  type: 'api',
  provider: 'Amazon PayFort',
  description: 'Payment processing for Middle East',
  config: {
    baseURL: 'https://payfortapi.payfort.com',
    timeout: 30000,
    auth: {
      type: 'api_key',
      keyPath: 'PAYFORT_API_KEY'
    }
  },
  endpoints: [
    {
      name: 'authorize',
      method: 'POST',
      path: '/api/v1/orders/authorize',
      description: 'Authorize payment'
    },
    {
      name: 'capture',
      method: 'POST',
      path: '/api/v1/orders/:orderId/capture',
      description: 'Capture authorized payment'
    },
    {
      name: 'refund',
      method: 'POST',
      path: '/api/v1/orders/:orderId/refund',
      description: 'Process refund'
    },
    {
      name: 'inquire',
      method: 'GET',
      path: '/api/v1/orders/:orderId/status',
      description: 'Check payment status'
    }
  ],
  webhooks: [
    'payment.authorized',
    'payment.captured',
    'payment.failed',
    'payment.refunded',
    'payment.chargebacked'
  ],
  dataMapping: {
    'orderId': 'order_id',
    'amount': 'amount_cents', // Convert to cents
    'currency': 'currency',
    'customerEmail': 'customer_email',
    'customerPhone': 'customer_phone'
  }
};

// ===========================
// MADAPPLEMAN SMS INTEGRATION
// ===========================
const MADAPPLEMAN_CONNECTOR = {
  id: 'madappleman_connector',
  name: 'Madappleman SMS',
  type: 'api',
  provider: 'Madappleman',
  description: 'SMS delivery for Saudi Arabia',
  config: {
    baseURL: 'https://sms.madappleman.com/v1',
    timeout: 10000,
    auth: {
      type: 'bearer',
      tokenPath: 'MADAPPLEMAN_TOKEN'
    }
  },
  endpoints: [
    {
      name: 'send',
      method: 'POST',
      path: '/messages/send',
      description: 'Send SMS message'
    },
    {
      name: 'sendBatch',
      method: 'POST',
      path: '/messages/send-batch',
      description: 'Send bulk SMS'
    },
    {
      name: 'getStatus',
      method: 'GET',
      path: '/messages/:messageId/status',
      description: 'Check message delivery status'
    }
  ],
  webhooks: [
    'sms.sent',
    'sms.delivered',
    'sms.failed',
    'sms.replied'
  ],
  dataMapping: {
    'phone': 'phone_number',
    'message': 'content',
    'senderName': 'sender_id'
  }
};

// ===========================
// SHOPIFY INTEGRATION
// ===========================
const SHOPIFY_CONNECTOR = {
  id: 'shopify_connector',
  name: 'Shopify Store',
  type: 'api',
  provider: 'Shopify',
  description: 'E-commerce platform synchronization',
  config: {
    auth: {
      type: 'shopify_webhook',
      scope: ['write_orders', 'read_orders', 'write_products', 'read_products']
    }
  },
  endpoints: [
    {
      name: 'listOrders',
      method: 'GET',
      path: '/admin/api/2024-01/orders.json',
      description: 'List all orders'
    },
    {
      name: 'createOrder',
      method: 'POST',
      path: '/admin/api/2024-01/orders.json',
      description: 'Create new order'
    },
    {
      name: 'updateOrder',
      method: 'PUT',
      path: '/admin/api/2024-01/orders/:orderId.json',
      description: 'Update order'
    },
    {
      name: 'listProducts',
      method: 'GET',
      path: '/admin/api/2024-01/products.json',
      description: 'List all products'
    },
    {
      name: 'createProduct',
      method: 'POST',
      path: '/admin/api/2024-01/products.json',
      description: 'Create product'
    }
  ],
  webhooks: [
    'orders/create',
    'orders/updated',
    'orders/paid',
    'orders/cancelled',
    'products/create',
    'products/update',
    'products/delete'
  ],
  dataMapping: {
    'shopifyOrderId': 'id',
    'customerEmail': 'email',
    'totalPrice': 'total_price',
    'orderStatus': 'financial_status',
    'fulfillmentStatus': 'fulfillment_status'
  }
};

// ===========================
// SLACK INTEGRATION
// ===========================
const SLACK_CONNECTOR = {
  id: 'slack_connector',
  name: 'Slack Notifications',
  type: 'webhook',
  provider: 'Slack',
  description: 'Team notifications and alerts',
  config: {
    auth: {
      type: 'webhook_url',
      urlPath: 'SLACK_WEBHOOK_URL'
    }
  },
  webhookEndpoints: [
    {
      name: 'sendMessage',
      description: 'Send message to channel',
      acceptedEvents: ['order.created', 'order.confirmed', 'alert.critical']
    },
    {
      name: 'sendNotification',
      description: 'Send notification with attachments',
      acceptedEvents: ['report.generated', 'sync.completed']
    }
  ],
  dataMapping: {
    'message': 'text',
    'channel': 'channel',
    'user': 'username',
    'icon': 'icon_emoji'
  }
};

// ===========================
// GOOGLE SHEETS INTEGRATION
// ===========================
const GOOGLE_SHEETS_CONNECTOR = {
  id: 'google_sheets_connector',
  name: 'Google Sheets',
  type: 'api',
  provider: 'Google',
  description: 'Data export to Google Sheets',
  config: {
    auth: {
      type: 'oauth2',
      clientIdPath: 'GOOGLE_CLIENT_ID',
      clientSecretPath: 'GOOGLE_CLIENT_SECRET'
    }
  },
  endpoints: [
    {
      name: 'appendData',
      method: 'PUT',
      path: '/v4/spreadsheets/:spreadsheetId/values/:range:append',
      description: 'Append data to sheet'
    },
    {
      name: 'getData',
      method: 'GET',
      path: '/v4/spreadsheets/:spreadsheetId/values/:range',
      description: 'Get data from sheet'
    }
  ],
  webhooks: [
    'sheet.updated',
    'data.appended'
  ],
  dataMapping: {
    'timestamp': 'date',
    'orderId': 'order_id',
    'customerName': 'customer',
    'amount': 'amount'
  }
};

// ===========================
// AZURE BLOB STORAGE INTEGRATION
// ===========================
const AZURE_STORAGE_CONNECTOR = {
  id: 'azure_storage_connector',
  name: 'Azure Blob Storage',
  type: 'cloud',
  provider: 'Microsoft Azure',
  description: 'Cloud file storage and backup',
  config: {
    auth: {
      type: 'connection_string',
      connectionStringPath: 'AZURE_STORAGE_CONNECTION_STRING'
    }
  },
  features: [
    'Upload files',
    'Download files',
    'Backup data',
    'Archive reports',
    'Disaster recovery'
  ],
  dataMapping: {
    'fileName': 'blob_name',
    'fileContent': 'content',
    'contentType': 'content_type'
  }
};

// ===========================
// WEBHOOK INTEGRATION PATTERNS
// ===========================
const WEBHOOK_PATTERNS = {
  'order.created': {
    description: 'New order received',
    dataFields: ['orderId', 'customerId', 'amount', 'products', 'timestamp'],
    integrations: ['shopify', 'slack', 'google_sheets', 'azure_storage']
  },
  'order.updated': {
    description: 'Order status changed',
    dataFields: ['orderId', 'status', 'updatedAt', 'notes'],
    integrations: ['shopify', 'slack']
  },
  'payment.completed': {
    description: 'Payment processed',
    dataFields: ['transactionId', 'amount', 'currency', 'timestamp'],
    integrations: ['payfort', 'slack', 'google_sheets']
  },
  'product.inventory.low': {
    description: 'Low inventory alert',
    dataFields: ['productId', 'currentStock', 'threshold', 'timestamp'],
    integrations: ['slack', 'google_sheets']
  },
  'report.generated': {
    description: 'Report generation completed',
    dataFields: ['reportId', 'reportType', 'fileUrl', 'timestamp'],
    integrations: ['google_sheets', 'azure_storage', 'slack']
  },
  'sync.completed': {
    description: 'System synchronization finished',
    dataFields: ['syncType', 'recordsProcessed', 'status', 'timestamp'],
    integrations: ['slack', 'google_sheets']
  }
};

// ===========================
// TEMPLATE INITIALIZATION
// ===========================
function initializeConnectors(integrationService) {
  try {
    const connectors = [
      PAYFORT_CONNECTOR,
      MADAPPLEMAN_CONNECTOR,
      SHOPIFY_CONNECTOR,
      SLACK_CONNECTOR,
      GOOGLE_SHEETS_CONNECTOR,
      AZURE_STORAGE_CONNECTOR
    ];

    const connectorMap = {};

    for (const connectorConfig of connectors) {
      const connector = integrationService.createConnector(
        connectorConfig.name,
        connectorConfig.type,
        connectorConfig.config
      );

      // Add field mappings
      for (const [source, target] of Object.entries(connectorConfig.dataMapping || {})) {
        connector.addFieldMapping(source, target);
      }

      connectorMap[connectorConfig.id] = connector;
    }

    console.log('✅ Integration connectors initialized successfully');
    return connectorMap;
  } catch (error) {
    console.error('❌ Error initializing connectors:', error);
    throw error;
  }
}

module.exports = {
  PAYFORT_CONNECTOR,
  MADAPPLEMAN_CONNECTOR,
  SHOPIFY_CONNECTOR,
  SLACK_CONNECTOR,
  GOOGLE_SHEETS_CONNECTOR,
  AZURE_STORAGE_CONNECTOR,
  WEBHOOK_PATTERNS,
  initializeConnectors
};
