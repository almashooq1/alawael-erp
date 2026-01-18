const express = require('express');
const router = express.Router();
const dmsService = require('../services/dmsService');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Upload new version
router.post('/:id/version', async (req, res) => {
  try {
    // Mock file data from body for prototype
    const fileData = { path: req.body.path || 'mock/path/v2.pdf', size: 1024 };
    const doc = await dmsService.createNewVersion(req.params.id, fileData, req.user._id);
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Sign Document
router.post('/:id/sign', async (req, res) => {
  try {
    const { pin } = req.body;
    const doc = await dmsService.signDocument(req.params.id, req.user._id, pin);
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share Document
router.post('/:id/share', async (req, res) => {
  try {
    const { targetUserId, permission } = req.body;
    const doc = await dmsService.grantAccess(req.params.id, targetUserId, permission);
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Document with details
router.get('/:id', async (req, res) => {
  try {
    const doc = await dmsService.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
