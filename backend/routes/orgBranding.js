'use strict';
/**
 * Org Branding Routes — هوية المؤسسة والعلامة التجارية
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// Get current branding settings
router.get('/', async (req, res) => {
  try {
    const OrgBranding = require('../models/OrgBranding/OrgBranding');
    const branding = await OrgBranding.findOne({}).lean();
    res.json({ success: true, data: branding || {} });
  } catch (err) {
    return safeError(res, err, 'orgBranding');
  }
});

// Update branding
router.put('/', authorize('admin'), async (req, res) => {
  try {
    const OrgBranding = require('../models/OrgBranding/OrgBranding');
    const branding = await OrgBranding.findOneAndUpdate(
      {},
      { ...req.body, updatedBy: req.user._id, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, data: branding });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Logo upload endpoint (stub — requires multer for actual file handling)
router.post('/logo', authorize('admin'), async (req, res) => {
  try {
    const { logoUrl, logoType = 'primary' } = req.body;
    if (!logoUrl) return res.status(400).json({ success: false, message: 'logoUrl required' });
    const OrgBranding = require('../models/OrgBranding/OrgBranding');
    const branding = await OrgBranding.findOneAndUpdate(
      {},
      { $set: { [`logos.${logoType}`]: logoUrl }, updatedBy: req.user._id, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, data: branding });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Color palette
router.patch('/colors', authorize('admin'), async (req, res) => {
  try {
    const OrgBranding = require('../models/OrgBranding/OrgBranding');
    const { primary, secondary, accent, background, text } = req.body;
    const branding = await OrgBranding.findOneAndUpdate(
      {},
      {
        $set: {
          'colors.primary': primary,
          'colors.secondary': secondary,
          'colors.accent': accent,
          'colors.background': background,
          'colors.text': text,
        },
        updatedBy: req.user._id,
      },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, data: branding });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Branch-specific branding override
router.get('/branch/:branchId', async (req, res) => {
  try {
    const BranchBranding = require('../models/OrgBranding/BranchBranding');
    const branding = await BranchBranding.findOne({ branchId: req.params.branchId }).lean();
    res.json({ success: true, data: branding || {} });
  } catch (err) {
    return safeError(res, err, 'orgBranding');
  }
});

router.put('/branch/:branchId', authorize('admin', 'branch_manager'), async (req, res) => {
  try {
    const BranchBranding = require('../models/OrgBranding/BranchBranding');
    const branding = await BranchBranding.findOneAndUpdate(
      { branchId: req.params.branchId },
      { ...req.body, branchId: req.params.branchId, updatedBy: req.user._id },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, data: branding });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
