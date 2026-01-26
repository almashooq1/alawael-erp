/**
 * Minimal Integration Routes (Test Version)
 * Used for testing route loading and basic health checks
 */

const express = require('express');
const router = express.Router();

// Root endpoint for integrations hub
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Integrations hub is reachable',
    endpoints: [
      '/api/integrations/health',
      '/api/integrations/metrics',
      '/api/integrations/reset-metrics',
    ],
  });
});

// Simple health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    health: {
      government: { status: 'ok' },
      insurance: { status: 'ok' },
      lab: { status: 'ok' },
    },
  });
});

// Simple metrics
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    metrics: {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
    },
  });
});

// Reset metrics
router.post('/reset-metrics', (req, res) => {
  res.json({
    success: true,
    message: 'Metrics reset successfully',
  });
});

module.exports = router;
