/**
 * CCTV parent portal — view-only access for parents to their child's room.
 *
 * Heavily guarded:
 *   • require role 'parent'
 *   • require an active CctvAccessGrant of kind 'parent_portal' that
 *     covers the requested camera and current local time
 *   • only live (no playback, no download)
 *   • watermark always on, audit always on
 *
 *   GET    /my-cameras                — list cameras the parent can view now
 *   POST   /live/:cameraId            — start a live session
 *   POST   /:sessionId/heartbeat
 *   POST   /:sessionId/stop
 */
'use strict';

const express = require('express');
const { CctvCamera, CctvAccessGrant, CctvViewAudit } = require('../../models/cctv');
const streamService = require('../../services/cctv/streamService');
const { authenticateToken, requireRole } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole(['parent']));

async function _activeParentGrants(userId, now = new Date()) {
  const grants = await CctvAccessGrant.find({
    grantedTo: userId,
    grantType: 'parent_portal',
    status: 'active',
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  });
  return grants.filter(g => g.isCurrentlyValid(now));
}

router.get('/my-cameras', async (req, res) => {
  const grants = await _activeParentGrants(req.user?.id);
  if (grants.length === 0) return res.json({ success: true, data: [] });
  const cameraIds = grants.flatMap(g => g.scope?.cameraIds || []);
  if (cameraIds.length === 0) return res.json({ success: true, data: [] });
  const cams = await CctvCamera.find({ _id: { $in: cameraIds }, isDeleted: { $ne: true } })
    .select('code branchCode name_ar location status capabilities pdpl')
    .lean();
  res.json({ success: true, data: cams, meta: { grants: grants.map(g => g._id) } });
});

router.post('/live/:cameraId', async (req, res) => {
  const grants = await _activeParentGrants(req.user?.id);
  const matching = grants.find(g =>
    (g.scope?.cameraIds || []).map(String).includes(String(req.params.cameraId))
  );
  if (!matching) {
    await CctvViewAudit.create({
      userId: req.user?.id,
      branchCode: req.user?.branchCode || '',
      cameraId: req.params.cameraId,
      action: 'access_denied',
      success: false,
      failureReason: 'no_active_parent_grant_or_out_of_window',
      sourceIp: req.ip,
    });
    return res.status(403).json({ success: false, message: 'NO_ACTIVE_PARENT_GRANT' });
  }
  const r = await streamService.startLive({
    userId: req.user?.id,
    cameraId: req.params.cameraId,
    watermarkText: `${req.user?.email || 'parent'} — ${new Date().toISOString()}`,
    ipMeta: { ip: req.ip, userAgent: req.headers['user-agent'] },
  });
  res.status(r.ok ? 200 : 403).json({ success: r.ok, ...r });
});

router.post('/:sessionId/heartbeat', async (req, res) => {
  const s = await streamService.heartbeat(req.params.sessionId);
  if (!s) return res.status(404).json({ success: false, message: 'SESSION_NOT_FOUND' });
  res.json({ success: true, data: { lastHeartbeatAt: s.lastHeartbeatAt } });
});

router.post('/:sessionId/stop', async (req, res) => {
  res.json({ success: true, data: await streamService.stop(req.params.sessionId) });
});

module.exports = router;
