const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { AssetManagementService } = require('../services/assetManagementService');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Initialize service
const assetService = new AssetManagementService();

// Middleware to verify service is ready
router.use((_req, res, next) => {
  if (!assetService) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Asset management service not initialized',
    });
  }
  next();
});

/**
 * @route   GET /api/v1/assets
 * @desc    Get all assets
 * @access  Private
 */
router.get(
  '/',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const assets = await assetService.getAllAssets(req.query);
      res.status(200).json({
        success: true,
        count: assets.length,
        data: assets,
      });
    } catch (error) {
      safeError(res, error, 'fetching assets');
    }
  }
);

/**
 * @route   POST /api/v1/assets
 * @desc    Create new asset
 * @access  Private/Manager
 */
router.post(
  '/',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['manager', 'admin']),
  async (req, res) => {
    try {
      const { name, category, description, value, location, status } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          success: false,
          error: 'Asset name and category are required',
        });
      }

      const asset = await assetService.createAsset({
        name,
        category,
        description,
        value: value || 0,
        location,
        status: status || 'active',
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: asset,
      });
    } catch (error) {
      safeError(res, error, 'creating asset');
    }
  }
);

/**
 * @route   GET /api/v1/assets/category/:category
 * @desc    Get assets by category
 * @access  Private
 */
router.get(
  '/category/:category',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const assets = await assetService.getAssetsByCategory(req.params.category);

      res.status(200).json({
        success: true,
        count: assets.length,
        data: assets,
      });
    } catch (error) {
      safeError(res, error, 'fetching assets by category');
    }
  }
);

/**
 * @route   GET /api/v1/assets/depreciation/report
 * @desc    Get asset depreciation report
 * @access  Private
 */
router.get(
  '/depreciation/report',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const report = await assetService.getDepreciationReport();

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeError(res, error, 'generating depreciation report');
    }
  }
);

/**
 * @route   GET /api/v1/assets/:assetId
 * @desc    Get specific asset
 * @access  Private
 */
router.get(
  '/:assetId',
  authenticate, requireBranchAccess, requireBranchAccess,
  async (req, res) => {
    try {
      const asset = await assetService.getAssetById(req.params.assetId);

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found',
        });
      }

      res.status(200).json({
        success: true,
        data: asset,
      });
    } catch (error) {
      safeError(res, error, 'fetching asset');
    }
  }
);

/**
 * @route   PUT /api/v1/assets/:assetId
 * @desc    Update asset
 * @access  Private/Manager
 */
router.put(
  '/:assetId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['manager', 'admin']),
  async (req, res) => {
    try {
      const asset = await assetService.updateAsset(req.params.assetId, req.body);

      if (!asset) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found',
        });
      }

      res.status(200).json({
        success: true,
        data: asset,
      });
    } catch (error) {
      safeError(res, error, 'updating asset');
    }
  }
);

/**
 * @route   DELETE /api/v1/assets/:assetId
 * @desc    Delete asset
 * @access  Private/Admin
 */
router.delete(
  '/:assetId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin']),
  async (req, res) => {
    try {
      const result = await assetService.deleteAsset(req.params.assetId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Asset not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Asset deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'deleting asset');
    }
  }
);

// Error handling middleware
router.use((err, _req, res, _next) => {
  safeError(res, error, 'Router error');

module.exports = router;
