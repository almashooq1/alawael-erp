const express = require('express');
const router = express.Router();
const GlobalSearchService = require('../services/globalSearch.service');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/search
 * @desc Global Search across the entire ERP
 * @query q: Search term
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const filteredQ = q.trim();
    // Security: Limit length
    if (filteredQ.length > 50) return res.status(400).json({ message: 'Query too long' });

    const results = await GlobalSearchService.search(filteredQ);

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

