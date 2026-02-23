const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { authenticate, authorize } = require('../middleware/auth');
const { AssetManagementService } = require('../services/assetManagementService');
const logger = require('../utils/logger');

// Initialize service
const assetService = new AssetManagementService();

// Middleware to verify service is ready
router.use((req, res, next) => {
  if (!assetService) {
    return res.status(503).json({ 
      error: 'Service unavailable',
      message: 'Asset management service not initialized'
    });
  }
  next();
});

/**
 * @route   GET /api/v1/assets
 * @desc    Get all assets
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const assets = await assetService.getAllAssets(req.query);
      res.status(200).json({
        success: true,
        count: assets.length,
        data: assets
      });
    } catch (error) {
      logger.error('Error fetching assets:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch assets'
      });
    }
  })
);

/**
 * @route   POST /api/v1/assets
 * @desc    Create new asset
 * @access  Private/Manager
 */
router.post('/',
  authenticate,
  authorize(['manager', 'admin']),
  asyncHandler(async (req, res) => {
    try {
      const { name, category, description, value, location, status } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          success: false,
          error: 'Asset name and category are required'
        });
      }

      const asset = await assetService.createAsset({
        name,
        category,
        description,
        value: value || 0,
        location,
        status: status || 'active',
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        data: asset
      });
    } catch (error) {
      logger.error('Error creating asset:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create asset'
      });
    }
  })
);

/**
 * @route   GET /api/v1/assets/:assetId
 * @desc    Get specific asset
 * @access  Private
 */
router.get('/:assetId',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const asset = await assetService.getAssetById(req.params.assetId);
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.status(200).json({
        success: true,
        data: asset
      });
    } catch (error) {
      logger.error('Error fetching asset:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch asset'
      });
    }
  })
);

/**
 * @route   PUT /api/v1/assets/:assetId
 * @desc    Update asset
 * @access  Private/Manager
 */
router.put('/:assetId',
  authenticate,
  authorize(['manager', 'admin']),
  asyncHandler(async (req, res) => {
    try {
      const asset = await assetService.updateAsset(
        req.params.assetId,
        req.body
      );

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.status(200).json({
        success: true,
        data: asset
      });
    } catch (error) {
      logger.error('Error updating asset:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update asset'
      });
    }
  })
);

/**
 * @route   DELETE /api/v1/assets/:assetId
 * @desc    Delete asset
 * @access  Private/Admin
 */
router.delete('/:assetId',
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const result = await assetService.deleteAsset(req.params.assetId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Asset deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting asset:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete asset'
      });
    }
  })
);

/**
 * @route   GET /api/v1/assets/category/:category
 * @desc    Get assets by category
 * @access  Private
 */
router.get('/category/:category',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const assets = await assetService.getAssetsByCategory(req.params.category);
      
      res.status(200).json({
        success: true,
        count: assets.length,
        data: assets
      });
    } catch (error) {
      logger.error('Error fetching assets by category:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch assets'
      });
    }
  })
);

/**
 * @route   GET /api/v1/assets/depreciation/report
 * @desc    Get asset depreciation report
 * @access  Private
 */
router.get('/depreciation/report',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      const report = await assetService.getDepreciationReport();
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error generating depreciation report:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate report'
      });
    }
  })
);

// Error handling middleware
router.use((err, req, res, next) => {
  logger.error('Router error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred',
    message: err.message
  });
});

module.exports = router;
