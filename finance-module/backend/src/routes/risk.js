/**
 * Finance Module - Risk Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getRiskMatrix,
  getRiskItems,
  getRiskItem,
  createRiskItem,
  updateRiskItem,
  createRiskMatrix,
  getHeatmapData,
  getRiskTrends,
  addMitigationStrategy
} = require('../controllers/riskController');

// Risk matrix endpoints
router.get('/matrix', protect, getRiskMatrix);
router.get('/heatmap', protect, getHeatmapData);
router.post('/matrix/create', protect, authorize('manager', 'director'), createRiskMatrix);

// Risk item endpoints
router.get('/items', protect, getRiskItems);
router.get('/:id', protect, getRiskItem);
router.post('/create', protect, authorize('manager', 'auditor'), createRiskItem);
router.put('/:id', protect, authorize('manager', 'auditor'), updateRiskItem);

// Mitigation endpoints
router.post('/:id/mitigation', protect, authorize('manager'), addMitigationStrategy);

// Trend endpoints
router.get('/trends/all', protect, getRiskTrends);

module.exports = router;
