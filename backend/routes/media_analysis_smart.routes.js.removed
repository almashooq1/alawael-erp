const express = require('express');
const router = express.Router();
const SmartMediaAnalysisService = require('../services/smartMediaAnalysis.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/media-analysis-smart/video-behavior
 * @desc Analyze video for autism behaviors
 */
router.post('/video-behavior', async (req, res) => {
  try {
    const result = await SmartMediaAnalysisService.analyzeSessionVideo(req.body.videoId);
    res.json({ success: true, analysis: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route POST /api/media-analysis-smart/audio-speech
 * @desc Auto-Score pronunciation
 */
router.post('/audio-speech', async (req, res) => {
  try {
    const result = await SmartMediaAnalysisService.scorePronunciation(req.body.audioUrl, req.body.targetWord);
    res.json({ success: true, scoring: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

