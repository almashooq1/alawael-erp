const express = require('express');
const router = express.Router();
const SmartLibraryService = require('../services/smartLibrary.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/library-smart/checkout
 * @desc Borrow a resource
 */
router.post('/checkout', async (req, res) => {
  try {
    const result = await SmartLibraryService.checkOutItem(req.body.itemId, req.user.id);
    res.json({ success: true, loan: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/library-smart/return
 * @desc Return an item and flag for sanitization
 */
router.post('/return', authorizeRole(['ADMIN', 'LIBRARIAN']), async (req, res) => {
  try {
    const result = await SmartLibraryService.markReturned(req.body.itemId);
    res.json({ success: true, process: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/library-smart/recommend
 * @desc AI Toy Recommendations
 */
router.get('/recommend', async (req, res) => {
  try {
    // In real app, fetch profile from DB using req.user.id
    const result = await SmartLibraryService.recommendToy({});
    res.json({ success: true, recommendations: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
