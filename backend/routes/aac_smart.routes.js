const express = require('express');
const router = express.Router();
const SmartAACService = require('../services/smartAAC.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/aac-smart/predict
 * @desc Get next-word suggestions for AAC device
 */
router.post('/predict', async (req, res) => {
  try {
    const result = await SmartAACService.predictNextSymbol(req.user.id, req.body.sentence, req.body.context);
    res.json({ success: true, suggestions: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/aac-smart/board
 * @desc Generate custom board for activity
 */
router.get('/board', authorizeRole(['THERAPIST', 'PARENT']), async (req, res) => {
  try {
    const result = await SmartAACService.generateDynamicBoard(req.query.activity);
    res.json({ success: true, board: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

