const express = require('express');
const BarcodeService = require('../services/BarcodeService');
const { barcodeAuth, barcodeRateLimit } = require('../middleware/barcodeAuth');
const logger = require('../config/logger');

const router = express.Router();

/**
 * GET /api/barcode/health
 * Health check endpoint - PUBLIC, no auth required
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'barcode-api',
  });
});

// Apply authentication and rate limiting to all routes EXCEPT health
router.use(barcodeAuth);
router.use(barcodeRateLimit);

/**
 * POST /api/barcode/qr-code
 * Generate QR Code
 */
router.post('/qr-code', async (req, res) => {
  try {
    const { data, errorCorrectionLevel = 'M' } = req.body;

    if (!data) {
      return res.status(400).json({
        message: 'Data field is required',
        code: 'MISSING_DATA',
      });
    }

    const qrCode = await BarcodeService.generateQRCode(data, errorCorrectionLevel);

    res.json({
      success: true,
      type: 'QR',
      data: data,
      errorCorrection: errorCorrectionLevel,
      code: qrCode,
      generatedAt: new Date(),
      userId: req.user.id,
    });
  } catch (error) {
    logger.error(`QR Code generation error: ${error.message}`);
    res.status(500).json({
      message: error.message,
      code: 'GENERATION_ERROR',
      type: 'QR',
    });
  }
});

/**
 * POST /api/barcode/barcode
 * Generate Barcode
 */
router.post('/barcode', async (req, res) => {
  try {
    const { data, format = 'CODE128' } = req.body;

    if (!data) {
      return res.status(400).json({
        message: 'Data field is required',
        code: 'MISSING_DATA',
      });
    }

    const barcode = await BarcodeService.generateBarcode(data, format);

    res.json({
      success: true,
      type: 'BARCODE',
      data: data,
      format: format,
      code: barcode,
      generatedAt: new Date(),
      userId: req.user.id,
    });
  } catch (error) {
    logger.error(`Barcode generation error: ${error.message}`);
    res.status(500).json({
      message: error.message,
      code: 'GENERATION_ERROR',
      type: 'BARCODE',
    });
  }
});

/**
 * POST /api/barcode/batch
 * Generate batch of codes
 */
router.post('/batch', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Items must be a non-empty array',
        code: 'INVALID_ITEMS',
      });
    }

    const results = await BarcodeService.generateBatchCodes(items);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.json({
      success: true,
      type: 'BATCH',
      totalItems: items.length,
      successCount,
      errorCount,
      results,
      generatedAt: new Date(),
      userId: req.user.id,
    });
  } catch (error) {
    logger.error(`Batch generation error: ${error.message}`);
    res.status(500).json({
      message: error.message,
      code: 'BATCH_ERROR',
    });
  }
});

/**
 * GET /api/barcode/statistics
 * Get generation statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await BarcodeService.getStatistics();

    res.json({
      success: true,
      statistics: stats,
      retrievedAt: new Date(),
    });
  } catch (error) {
    logger.error(`Statistics retrieval error: ${error.message}`);
    res.status(500).json({
      message: error.message,
      code: 'STATS_ERROR',
    });
  }
});

module.exports = router;
