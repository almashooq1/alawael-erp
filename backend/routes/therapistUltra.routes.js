/**
 * Therapist Portal Ultra Routes — مسارات بوابة المعالج الفائقة (الدفعة الرابعة)
 *
 * ─── /referrals        — سجل الإحالات
 * ─── /groups           — العلاج الجماعي
 * ─── /equipment        — إدارة المعدات
 * ─── /kpis             — مؤشرات الأداء
 * ─── /safety           — بروتوكولات السلامة
 * ─── /research         — البحث السريري
 *
 * All routes protected via authenticateToken.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const svc = require('../services/therapistPortal.service');

router.use(authenticateToken);

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ═══════════════════════════════════════════════════════════════════════════
//  سجل الإحالات — Referral Management
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/referrals',
  wrap(async (req, res) => {
    const data = await svc.getReferrals(req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/referrals',
  wrap(async (req, res) => {
    const data = await svc.createReferral(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/referrals/:id',
  wrap(async (req, res) => {
    const data = await svc.updateReferral(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.patch(
  '/referrals/:id/status',
  wrap(async (req, res) => {
    const data = await svc.updateReferralStatus(req.params.id, req.body.status);
    res.json({ success: true, data });
  })
);

router.delete(
  '/referrals/:id',
  wrap(async (req, res) => {
    const data = await svc.deleteReferral(req.params.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  العلاج الجماعي — Group Therapy
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/groups',
  wrap(async (req, res) => {
    const data = await svc.getGroups(req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/groups',
  wrap(async (req, res) => {
    const data = await svc.createGroup(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/groups/:id',
  wrap(async (req, res) => {
    const data = await svc.updateGroup(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.post(
  '/groups/:id/participants',
  wrap(async (req, res) => {
    const data = await svc.addParticipant(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.delete(
  '/groups/:id/participants/:participantId',
  wrap(async (req, res) => {
    const data = await svc.removeParticipant(req.params.id, req.params.participantId);
    res.json({ success: true, data });
  })
);

router.delete(
  '/groups/:id',
  wrap(async (req, res) => {
    const data = await svc.deleteGroup(req.params.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  إدارة المعدات — Equipment Management
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/equipment',
  wrap(async (req, res) => {
    const data = await svc.getEquipment(req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/equipment',
  wrap(async (req, res) => {
    const data = await svc.createEquipment(req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/equipment/:id',
  wrap(async (req, res) => {
    const data = await svc.updateEquipment(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.patch(
  '/equipment/:id/book',
  wrap(async (req, res) => {
    const data = await svc.bookEquipment(req.params.id, req.body.therapistName, req.body.until);
    res.json({ success: true, data });
  })
);

router.patch(
  '/equipment/:id/return',
  wrap(async (req, res) => {
    const data = await svc.returnEquipment(req.params.id);
    res.json({ success: true, data });
  })
);

router.delete(
  '/equipment/:id',
  wrap(async (req, res) => {
    const data = await svc.deleteEquipment(req.params.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  مؤشرات الأداء — Performance KPIs
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/kpis',
  wrap(async (req, res) => {
    const data = await svc.getKPIs(req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/kpis',
  wrap(async (req, res) => {
    const data = await svc.createCustomKPI(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/kpis/:id',
  wrap(async (req, res) => {
    const data = await svc.updateKPI(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.delete(
  '/kpis/:id',
  wrap(async (req, res) => {
    const data = await svc.deleteKPI(req.params.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  بروتوكولات السلامة — Safety Protocols
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/safety',
  wrap(async (req, res) => {
    const data = await svc.getSafetyProtocols(req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/safety',
  wrap(async (req, res) => {
    const data = await svc.createSafetyProtocol(req.body);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/safety/:id',
  wrap(async (req, res) => {
    const data = await svc.updateSafetyProtocol(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.post(
  '/safety/:id/incidents',
  wrap(async (req, res) => {
    const data = await svc.reportIncident(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  })
);

router.patch(
  '/safety/:protocolId/incidents/:incidentId/resolve',
  wrap(async (req, res) => {
    const data = await svc.resolveIncident(req.params.protocolId, req.params.incidentId);
    res.json({ success: true, data });
  })
);

router.delete(
  '/safety/:id',
  wrap(async (req, res) => {
    const data = await svc.deleteSafetyProtocol(req.params.id);
    res.json({ success: true, data });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
//  البحث السريري — Clinical Research
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/research',
  wrap(async (req, res) => {
    const data = await svc.getResearch(req.user.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/research',
  wrap(async (req, res) => {
    const data = await svc.createResearch(req.body, req.user.id);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/research/:id',
  wrap(async (req, res) => {
    const data = await svc.updateResearch(req.params.id, req.body);
    res.json({ success: true, data });
  })
);

router.post(
  '/research/:id/publications',
  wrap(async (req, res) => {
    const data = await svc.addPublication(req.params.id, req.body.publication);
    res.json({ success: true, data });
  })
);

router.delete(
  '/research/:id',
  wrap(async (req, res) => {
    const data = await svc.deleteResearch(req.params.id);
    res.json({ success: true, data });
  })
);

module.exports = router;
