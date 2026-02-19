/**
 * ===================================================================
 * FIXED ASSETS ROUTES - مسارات الأصول الثابتة
 * ===================================================================
 */

const express = require('express');
const router = express.Router();
const fixedAssetsController = require('../controllers/fixedAssets.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

// ===================================================================
// FIXED ASSETS CRUD
// ===================================================================

/**
 * @route   GET /api/accounting/fixed-assets
 * @desc    Get all fixed assets with filters
 * @access  Private
 */
router.get('/', authenticateToken, fixedAssetsController.getAllAssets);

/**
 * @route   GET /api/accounting/fixed-assets/:id
 * @desc    Get single fixed asset
 * @access  Private
 */
router.get('/:id', authenticateToken, fixedAssetsController.getAssetById);

/**
 * @route   POST /api/accounting/fixed-assets
 * @desc    Create new fixed asset
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  fixedAssetsController.createAsset
);

/**
 * @route   PUT /api/accounting/fixed-assets/:id
 * @desc    Update fixed asset
 * @access  Private (Admin, Accountant)
 */
router.put(
  '/:id',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  fixedAssetsController.updateAsset
);

/**
 * @route   DELETE /api/accounting/fixed-assets/:id
 * @desc    Delete fixed asset
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), fixedAssetsController.deleteAsset);

// ===================================================================
// DEPRECIATION OPERATIONS
// ===================================================================

/**
 * @route   POST /api/accounting/fixed-assets/:id/depreciation
 * @desc    Record depreciation for asset
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/depreciation',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  fixedAssetsController.recordDepreciation
);

/**
 * @route   GET /api/accounting/fixed-assets/depreciation/report
 * @desc    Get depreciation report
 * @access  Private
 */
router.get('/depreciation/report', authenticateToken, fixedAssetsController.getDepreciationReport);

/**
 * @route   POST /api/accounting/fixed-assets/depreciation/bulk
 * @desc    Record depreciation for multiple assets
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/depreciation/bulk',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  fixedAssetsController.bulkDepreciation
);

// ===================================================================
// MAINTENANCE OPERATIONS
// ===================================================================

/**
 * @route   POST /api/accounting/fixed-assets/:id/maintenance
 * @desc    Record maintenance for asset
 * @access  Private
 */
router.post('/:id/maintenance', authenticateToken, fixedAssetsController.recordMaintenance);

/**
 * @route   GET /api/accounting/fixed-assets/maintenance/due
 * @desc    Get assets due for maintenance
 * @access  Private
 */
router.get('/maintenance/due', authenticateToken, fixedAssetsController.getDueForMaintenance);

/**
 * @route   GET /api/accounting/fixed-assets/:id/maintenance-history
 * @desc    Get maintenance history for asset
 * @access  Private
 */
router.get(
  '/:id/maintenance-history',
  authenticateToken,
  fixedAssetsController.getMaintenanceHistory
);

// ===================================================================
// DISPOSAL OPERATIONS
// ===================================================================

/**
 * @route   POST /api/accounting/fixed-assets/:id/dispose
 * @desc    Dispose of fixed asset
 * @access  Private (Admin, Accountant)
 */
router.post(
  '/:id/dispose',
  authenticateToken,
  requireRole(['admin', 'accountant']),
  fixedAssetsController.disposeAsset
);

// ===================================================================
// REPORTS & ANALYTICS
// ===================================================================

/**
 * @route   GET /api/accounting/fixed-assets/stats
 * @desc    Get fixed assets statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, fixedAssetsController.getStats);

/**
 * @route   GET /api/accounting/fixed-assets/by-category
 * @desc    Get assets grouped by category
 * @access  Private
 */
router.get('/by-category', authenticateToken, fixedAssetsController.getByCategory);

/**
 * @route   GET /api/accounting/fixed-assets/warranty/expired
 * @desc    Get assets with expired warranty
 * @access  Private
 */
router.get('/warranty/expired', authenticateToken, fixedAssetsController.getExpiredWarranties);

module.exports = router;
