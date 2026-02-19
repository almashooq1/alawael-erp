/**
 * CashFlow Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getCashFlowSummary,
  getCashFlow,
  createCashFlow,
  getForecasts,
  generateForecast,
  getReserves,
  updateReserve,
  recordReserveTransaction,
  analyzeCashFlow
} = require('../controllers/cashFlowController');

// Cash flow endpoints
router.get('/summary', protect, getCashFlowSummary);
router.get('/:id', protect, getCashFlow);
router.post('/create', protect, authorize('manager', 'director'), createCashFlow);

// Forecast endpoints
router.get('/forecasts/all', protect, getForecasts);
router.post('/forecasts/generate', protect, authorize('manager', 'director'), generateForecast);

// Reserve endpoints
router.get('/reserves/all', protect, getReserves);
router.put('/reserves/:id', protect, authorize('manager', 'director'), updateReserve);
router.post('/reserves/:id/transaction', protect, authorize('manager', 'director'), recordReserveTransaction);

// Analysis endpoints
router.post('/analyze', protect, analyzeCashFlow);

module.exports = router;
