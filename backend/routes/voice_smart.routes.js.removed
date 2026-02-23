const express = require('express');
const router = express.Router();
const SmartVoiceService = require('../services/smartVoice.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/voice/' });

router.use(authenticateToken);

/**
 * @route POST /api/voice-smart/transcribe
 * @desc Upload audio note (wav/mp3) and get clinical text analysis
 */
router.post('/transcribe', authorizeRole(['THERAPIST', 'ADMIN']), upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded' });
    }

    // 1. Transcription
    const transcription = await SmartVoiceService.transcribeAudio(req.file);

    // 2. Intelligence Layer
    const analysis = await SmartVoiceService.analyzeNote(transcription.text);

    res.json({
      success: true,
      transcription: transcription,
      analysis: analysis,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

