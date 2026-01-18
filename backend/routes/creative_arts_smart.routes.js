const express = require('express');
const router = express.Router();
const SmartCreativeArtsService = require('../services/smartCreativeArts.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/arts-smart/analyze
 * @desc Analyze a drawing for emotional content
 */
router.post('/analyze', authorizeRole(['THERAPIST', 'PSYCHOLOGIST']), async (req, res) => {
  try {
    const result = await SmartCreativeArtsService.analyzeArtwork(req.body.patientId, req.body.imagePath);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/arts-smart/playlist
 * @desc Get therapeutic playlist
 */
router.get('/playlist', async (req, res) => {
  try {
    const result = await SmartCreativeArtsService.generatePlaylist(req.query.patientId, req.query.targetState);
    res.json({ success: true, playlist: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
