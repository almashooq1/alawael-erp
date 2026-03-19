/**
 * 🔐 Security Routes — واجهة أمان API الشاملة
 * Mount: /api/security
 */
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { securityService } = require('../services/securityService');

/* wrap async handlers */
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

/* ── All routes require authentication ── */
router.use(authenticate);

/* ══════════════════ Security Profile ══════════════════ */
router.get(
  '/profile',
  wrap(async (req, res) => {
    const profile = await securityService.getUserSecurityProfile(req.user._id || req.user.id);
    res.json({ success: true, data: profile });
  })
);

/* ══════════════════ MFA ══════════════════ */
router.get(
  '/mfa/status',
  wrap(async (req, res) => {
    const status = await securityService.getMfaStatus(req.user._id || req.user.id);
    res.json({ success: true, data: status });
  })
);

router.post(
  '/mfa/setup',
  wrap(async (req, res) => {
    const data = await securityService.setupMfa(req.user._id || req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/mfa/enable',
  wrap(async (req, res) => {
    const { token, secret } = req.body;
    const data = await securityService.enableMfa(req.user._id || req.user.id, token, secret);
    res.json({ success: true, data });
  })
);

router.post(
  '/mfa/disable',
  wrap(async (req, res) => {
    const { password } = req.body;
    const data = await securityService.disableMfa(req.user._id || req.user.id, password);
    res.json({ success: true, data });
  })
);

router.post(
  '/mfa/backup-codes',
  wrap(async (req, res) => {
    const data = await securityService.regenerateBackupCodes(req.user._id || req.user.id);
    res.json({ success: true, data });
  })
);

/* ══════════════════ Sessions ══════════════════ */
router.get(
  '/sessions',
  wrap(async (req, res) => {
    const sessions = await securityService.getActiveSessions(req.user._id || req.user.id);
    res.json({ success: true, data: sessions });
  })
);

router.delete(
  '/sessions/:id',
  wrap(async (req, res) => {
    const result = await securityService.terminateSession(
      req.params.id,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: result });
  })
);

router.post(
  '/sessions/logout-all',
  wrap(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = await securityService.terminateAllOtherSessions(
      req.user._id || req.user.id,
      token
    );
    res.json({ success: true, data: result });
  })
);

/* ══════════════════ Password ══════════════════ */
router.post(
  '/password/change',
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }
    const result = await securityService.changePassword(
      req.user._id || req.user.id,
      currentPassword,
      newPassword
    );
    res.json({ success: true, data: result });
  })
);

/* ══════════════════ Security Logs ══════════════════ */
router.get(
  '/logs/me',
  wrap(async (req, res) => {
    const result = await securityService.getUserLogs(req.user._id || req.user.id, req.query);
    res.json({ success: true, data: result });
  })
);

router.get(
  '/logs',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const result = await securityService.getAllLogs(req.query);
    res.json({ success: true, data: result });
  })
);

/* ══════════════════ Login Attempts ══════════════════ */
router.get(
  '/login-attempts',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const result = await securityService.getLoginAttempts(req.query);
    res.json({ success: true, data: result });
  })
);

/* ══════════════════ Security Policy ══════════════════ */
router.get(
  '/policy',
  wrap(async (req, res) => {
    const policy = await securityService.getSecurityPolicy();
    res.json({ success: true, data: policy });
  })
);

router.put(
  '/policy',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const policy = await securityService.updateSecurityPolicy(
      req.body,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: policy });
  })
);

/* ══════════════════ IP Management ══════════════════ */
router.post(
  '/ip/whitelist',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const list = await securityService.addIpToWhitelist(req.body.ip, req.user._id || req.user.id);
    res.json({ success: true, data: list });
  })
);

router.delete(
  '/ip/whitelist',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const list = await securityService.removeIpFromWhitelist(
      req.body.ip,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: list });
  })
);

router.post(
  '/ip/blacklist',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const list = await securityService.addIpToBlacklist(req.body.ip, req.user._id || req.user.id);
    res.json({ success: true, data: list });
  })
);

router.delete(
  '/ip/blacklist',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const list = await securityService.removeIpFromBlacklist(
      req.body.ip,
      req.user._id || req.user.id
    );
    res.json({ success: true, data: list });
  })
);

/* ══════════════════ Security Analytics ══════════════════ */
router.get(
  '/overview',
  authorize('admin', 'super_admin'),
  wrap(async (req, res) => {
    const data = await securityService.getSecurityOverview();
    res.json({ success: true, data });
  })
);

router.get(
  '/stats',
  wrap(async (req, res) => {
    const data = await securityService.getSecurityStats();
    res.json({ success: true, data });
  })
);

module.exports = router;
