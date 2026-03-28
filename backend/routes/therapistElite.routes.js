/**
 * Therapist Portal Elite Routes – Batch 5
 */
const express = require('express');
const { safeError } = require('../utils/safeError');
const router = express.Router();

let authenticateToken;
try {
  authenticateToken = require('../middleware/auth');
  if (typeof authenticateToken !== 'function') {
    authenticateToken =
      authenticateToken.authenticateToken || authenticateToken.default || authenticateToken.auth;
  }
} catch {
  authenticateToken = (req, _res, next) => next();
}

const svc = require('../services/therapistPortalElite.service');

function wrap(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(err.status || 400).json({ success: false, message: safeError(err) });
    }
  };
}

router.use(authenticateToken);

/* ─── 1. Telehealth ─── */
router.get(
  '/telehealth',
  wrap(req => svc.getTelehealthSessions(req.query))
);
router.post(
  '/telehealth',
  wrap(req => svc.createTelehealthSession(req.body))
);
router.put(
  '/telehealth/:id',
  wrap(req => svc.updateTelehealthSession(req.params.id, req.body))
);
router.patch(
  '/telehealth/:id/status',
  wrap(req => svc.updateTelehealthStatus(req.params.id, req.body.status))
);
router.delete(
  '/telehealth/:id',
  wrap(req => svc.deleteTelehealthSession(req.params.id))
);

/* ─── 2. Field Training ─── */
router.get(
  '/field-training',
  wrap(req => svc.getFieldTraining(req.query))
);
router.post(
  '/field-training',
  wrap(req => svc.createFieldTraining(req.body))
);
router.put(
  '/field-training/:id',
  wrap(req => svc.updateFieldTraining(req.params.id, req.body))
);
router.post(
  '/field-training/:id/evaluations',
  wrap(req => svc.addTrainingEvaluation(req.params.id, req.body))
);
router.patch(
  '/field-training/:id/hours',
  wrap(req => svc.logTrainingHours(req.params.id, req.body.hours))
);
router.delete(
  '/field-training/:id',
  wrap(req => svc.deleteFieldTraining(req.params.id))
);

/* ─── 3. Consent Management ─── */
router.get(
  '/consents',
  wrap(req => svc.getConsents(req.query))
);
router.post(
  '/consents',
  wrap(req => svc.createConsent(req.body))
);
router.put(
  '/consents/:id',
  wrap(req => svc.updateConsent(req.params.id, req.body))
);
router.patch(
  '/consents/:id/sign',
  wrap(req => svc.signConsent(req.params.id, req.body))
);
router.patch(
  '/consents/:id/revoke',
  wrap(_req => svc.revokeConsent(_req.params.id))
);
router.delete(
  '/consents/:id',
  wrap(req => svc.deleteConsent(req.params.id))
);

/* ─── 4. Quality Reports ─── */
router.get(
  '/quality-reports',
  wrap(req => svc.getQualityReports(req.query))
);
router.post(
  '/quality-reports',
  wrap(req => svc.createQualityReport(req.body))
);
router.put(
  '/quality-reports/:id',
  wrap(req => svc.updateQualityReport(req.params.id, req.body))
);
router.post(
  '/quality-reports/:id/findings',
  wrap(req => svc.addFinding(req.params.id, req.body.finding))
);
router.delete(
  '/quality-reports/:id',
  wrap(req => svc.deleteQualityReport(req.params.id))
);

/* ─── 5. Waiting List ─── */
router.get(
  '/waiting-list',
  wrap(req => svc.getWaitingList(req.query))
);
router.post(
  '/waiting-list',
  wrap(req => svc.addToWaitingList(req.body))
);
router.put(
  '/waiting-list/:id',
  wrap(req => svc.updateWaitingListItem(req.params.id, req.body))
);
router.patch(
  '/waiting-list/:id/status',
  wrap(req => svc.updateWaitingStatus(req.params.id, req.body.status))
);
router.delete(
  '/waiting-list/:id',
  wrap(req => svc.removeFromWaitingList(req.params.id))
);

/* ─── 6. Achievements ─── */
router.get(
  '/achievements',
  wrap(req => svc.getAchievements(req.query))
);
router.post(
  '/achievements',
  wrap(req => svc.createAchievement(req.body))
);
router.put(
  '/achievements/:id',
  wrap(req => svc.updateAchievement(req.params.id, req.body))
);
router.delete(
  '/achievements/:id',
  wrap(req => svc.deleteAchievement(req.params.id))
);

module.exports = router;
