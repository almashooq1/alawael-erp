const express = require('express');
const router = express.Router();
const OrgBranding = require('../models/OrgBranding');
const { requireAdmin } = require('../middleware/auth');

// Get branding for org
router.get('/:orgId', async (req, res) => {
  try {
    const branding = await OrgBranding.findOne({ orgId: req.params.orgId });
    res.json(branding || {});
  } catch (err) {
    res.status(500).json({ error: 'Error fetching branding' });
  }
});

// Update branding (admin only)
router.post('/:orgId', requireAdmin, async (req, res) => {
  try {
    const { name, color, logo } = req.body;
    const updated = await OrgBranding.findOneAndUpdate(
      { orgId: req.params.orgId },
      { name, color, logo, updatedBy: req.user._id, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error updating branding' });
  }
});

module.exports = router;
