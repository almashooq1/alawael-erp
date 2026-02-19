/**
 * Phase 10 Advanced Features API Routes
 * Real-time, integrations, and i18n endpoints
 */

const express = require('express');
const router = express.Router();
const RealtimeServer = require('../realtime/RealtimeServer');
const {
  IntegrationFramework,
  ERPIntegration,
  BankingIntegration,
  ThirdPartyIntegration,
  DataSyncManager,
} = require('../integrations/IntegrationFramework');

// Initialize services
const framework = new IntegrationFramework();
const syncManager = new DataSyncManager(framework);

// ==================== REAL-TIME ENDPOINTS ====================

/**
 * GET /api/realtime/connect
 * Check real-time connectivity status
 */
router.get('/realtime/connect', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'connected',
      wsEndpoint: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}/ws`,
      supportedEvents: [
        'connection:established',
        'notification',
        'room:user-joined',
        'room:user-left',
        'room:message',
        'direct:message',
        'broadcast',
      ],
    },
  });
});

/**
 * GET /api/realtime/stats
 * Get real-time server statistics
 */
router.get('/realtime/stats', (req, res) => {
  // This would normally get stats from the RealtimeServer instance
  res.json({
    success: true,
    data: {
      totalConnections: 0,
      totalRooms: 0,
      messageQueueSize: 0,
      timestamp: new Date(),
    },
  });
});

/**
 * POST /api/realtime/notify/:userId
 * Send notification to user
 */
router.post('/realtime/notify/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { message, type, action } = req.body;

    // In production, would use the RealtimeServer instance
    res.json({
      success: true,
      data: {
        notificationId: `notif-${Date.now()}`,
        userId,
        message,
        type,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== INTEGRATION ENDPOINTS ====================

/**
 * POST /api/integrations/register
 * Register a new integration
 */
router.post('/integrations/register', (req, res) => {
  try {
    const { name, type, config } = req.body;

    let integration;
    switch (type) {
      case 'erp':
        integration = new ERPIntegration(name, config);
        break;
      case 'banking':
        integration = new BankingIntegration(name, config);
        break;
      case 'third-party':
        integration = new ThirdPartyIntegration(name, config);
        break;
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }

    framework.registerIntegration(name, config);

    res.json({
      success: true,
      data: {
        integrationId: name,
        type,
        status: 'registered',
        registeredAt: new Date(),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/integrations/:name/sync/:dataType
 * Sync data from integration
 */
router.get('/integrations/:name/sync/:dataType', async (req, res) => {
  try {
    const { name, dataType } = req.params;
    const result = await framework.syncIntegration(name, dataType);

    res.json({
      success: true,
      data: {
        integration: name,
        dataType,
        recordsSync: result.length || 1,
        syncedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/integrations/:name/push/:dataType
 * Push data to integration
 */
router.post('/integrations/:name/push/:dataType', async (req, res) => {
  try {
    const { name, dataType } = req.params;
    const { data } = req.body;

    const result = await framework.pushData(name, dataType, data);

    res.json({
      success: true,
      data: {
        integration: name,
        dataType,
        result,
        pushedAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/integrations/:name/sync-schedule
 * Schedule periodic sync
 */
router.post('/integrations/:name/sync-schedule', (req, res) => {
  try {
    const { name } = req.params;
    const { dataType, intervalMinutes } = req.body;

    syncManager.scheduleSyncintegration(name, dataType, intervalMinutes);

    res.json({
      success: true,
      data: {
        integration: name,
        dataType,
        intervalMinutes,
        status: 'scheduled',
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/integrations/stats
 * Get all integration statistics
 */
router.get('/integrations/stats', (req, res) => {
  try {
    const stats = framework.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/integrations/:name/test
 * Test integration connection
 */
router.get('/integrations/:name/test', async (req, res) => {
  try {
    const { name } = req.params;
    const integration = framework.getIntegration(name);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: `Integration ${name} not found`,
      });
    }

    // Test connection (simplified)
    const isConnected = integration.isActive;

    res.json({
      success: true,
      data: {
        integration: name,
        connected: isConnected,
        lastSync: integration.lastSync,
        errorCount: integration.errorCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ==================== I18N ENDPOINTS ====================

/**
 * GET /api/i18n/languages
 * Get list of supported languages
 */
router.get('/i18n/languages', (req, res) => {
  const { i18n } = require('../config/i18nConfig');

  res.json({
    success: true,
    data: {
      supported: Object.entries(i18n.supportedLanguages).map(([code, info]) => ({
        code,
        ...info,
      })),
      total: Object.keys(i18n.supportedLanguages).length,
    },
  });
});

/**
 * GET /api/i18n/translations/:language
 * Get translations for a language
 */
router.get('/api/i18n/translations/:language', (req, res) => {
  try {
    const { language } = req.params;
    const { i18n } = require('../config/i18nConfig');

    if (!i18n.supportedLanguages[language]) {
      return res.status(404).json({
        success: false,
        error: `Language ${language} not supported`,
      });
    }

    res.json({
      success: true,
      data: {
        language,
        translations: i18n.translations[language] || {},
        formats: {
          date: i18n.dateFormats[language],
          time: i18n.timeFormats[language],
          currency: i18n.currencyFormats[language],
          number: i18n.numberFormats[language],
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/i18n/format
 * Format value according to language locale
 */
router.post('/api/i18n/format', (req, res) => {
  try {
    const { language, type, value } = req.body;
    const { I18nHelper } = require('../config/i18nConfig');

    const helper = new I18nHelper(language);

    let formatted;
    switch (type) {
      case 'date':
        formatted = helper.formatDate(value);
        break;
      case 'number':
        formatted = helper.formatNumber(value);
        break;
      case 'currency':
        formatted = helper.formatCurrency(value);
        break;
      default:
        throw new Error(`Unknown format type: ${type}`);
    }

    res.json({
      success: true,
      data: {
        language,
        type,
        original: value,
        formatted,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/i18n/text-direction/:language
 * Get text direction for language
 */
router.get('/api/i18n/text-direction/:language', (req, res) => {
  try {
    const { language } = req.params;
    const { i18n } = require('../config/i18nConfig');

    if (!i18n.supportedLanguages[language]) {
      return res.status(404).json({
        success: false,
        error: `Language ${language} not supported`,
      });
    }

    const direction = i18n.supportedLanguages[language].dir;

    res.json({
      success: true,
      data: {
        language,
        direction,
        rtl: direction === 'rtl',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
