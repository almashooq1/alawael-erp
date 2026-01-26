const express = require('express');
const router = express.Router();
const SmartVoiceAssistantService = require('../services/smartVoiceAssistant.service');

// Process voice command
router.post('/command', async (req, res) => {
  try {
    const { userId, text, audioFingerprint } = req.body;

    // Optional Auth Step
    if (audioFingerprint) {
      const auth = await SmartVoiceAssistantService.authenticateUser(audioFingerprint);
      if (!auth.authenticated) {
        return res.status(401).json({ success: false, message: 'Voice authentication failed' });
      }
    }

    const result = await SmartVoiceAssistantService.processCommand(userId, text);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get supported intents
router.get('/intents', (req, res) => {
  res.json({
    success: true,
    intents: SmartVoiceAssistantService.commandRegistry,
  });
});

module.exports = router;

