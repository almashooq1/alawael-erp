const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const User = require('../models/User');
const Session = require('../models/Session');

router.use(authenticate);
router.use(requireBranchAccess);
// GET /security
router.get('/security', async (req, res) => {
  try {
    const user = await User.findById(req.user?.id)
      .select('twoFactorEnabled lastPasswordChange email')
      .lean();
    const MFA = require('../models/mfa.models');
const safeError = require('../utils/safeError');
    let mfaSettings = null;
    try {
      mfaSettings = await MFA.MFASettings.findOne({ userId: req.user?.id }).lean();
    } catch {
      /* MFA not configured */
    }
    res.json({
      success: true,
      data: {
        twoFactorEnabled: user?.twoFactorEnabled || mfaSettings?.enabled || false,
        lastPasswordChange: user?.lastPasswordChange,
        email: user?.email,
      },
    });
  } catch (err) {
    safeError(res, err, 'Account security GET error');
  }
});

// PUT /security
router.put('/security', async (req, res) => {
  try {
    const updates = {};
    if (req.body.twoFactorEnabled !== undefined)
      updates.twoFactorEnabled = req.body.twoFactorEnabled;
    const user = await User.findByIdAndUpdate(req.user?.id, updates, { new: true })
      .select('-password')
      .lean();
    res.json({ success: true, data: user, message: 'تم تحديث إعدادات الأمان' });
  } catch (err) {
    safeError(res, err, 'Account security PUT error');
  }
});

// GET /sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user?.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: sessions });
  } catch (err) {
    safeError(res, err, 'Account sessions error');
  }
});

// DELETE /sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    await Session.findOneAndDelete({ _id: req.params.id, userId: req.user?.id });
    res.json({ success: true, message: 'تم إنهاء الجلسة' });
  } catch (err) {
    safeError(res, err, 'Account delete session error');
  }
});

// POST /sessions/logout-all
router.post('/sessions/logout-all', async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.user?.id });
    res.json({ success: true, message: 'تم تسجيل الخروج من جميع الجلسات' });
  } catch (err) {
    safeError(res, err, 'Account logout-all error');
  }
});

module.exports = router;
