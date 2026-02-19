/**
 * Finance Module Main Router
 * Integrates all finance endpoints
 */

const express = require('express');
const router = express.Router();

// Import route modules
const validationRoutes = require('./validation');
const cashFlowRoutes = require('./cashFlow');
const riskRoutes = require('./risk');

// Mount sub-routes
router.use('/validation', validationRoutes);
router.use('/cashflow', cashFlowRoutes);
router.use('/risk', riskRoutes);

// Catch-all for missing routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Finance API endpoint not found'
  });
});

module.exports = router;
