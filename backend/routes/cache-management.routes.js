/**
 * Cache Management Routes
 * Minimal router for cache operations
 */

const express = require('express');
const router = express.Router();

// Minimal cache management routes
router.get('/cache/stats', (req, res) => {
  res.json({ status: 'ok', cached: 0 });
});

router.post('/cache/clear', (req, res) => {
  res.json({ status: 'cleared' });
});

module.exports = router;
