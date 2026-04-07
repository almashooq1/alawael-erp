/**
 * Enterprise Ultra Routes — مسارات المؤسسة الفائقة
 *
 * Session 5: 6 modules, ~100+ endpoints
 *   1. Legal & CLM         /legal/*
 *   2. Corporate Governance /governance/*
 *   3. Business Continuity  /bcp/*
 *   4. Customer Experience   /cx/*
 *   5. Sustainability / ESG  /sustainability/*
 *   6. Digital Transformation /dt/*
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  LegalCase,
  CourtHearing,
  PowerOfAttorney,
  LegalOpinion,
  RegulatoryFiling,
  BoardMeeting,
  BoardCommittee,
  BoardResolution,
  GovernancePolicy,
  GovernanceReport,
  BCPPlan,
  BusinessImpactAnalysis,
  CrisisIncident,
  BCDrill,
  DisasterRecoveryPlan,
  CXSurvey,
  CXFeedback,
  CXComplaint,
  CustomerJourney,
  ServiceBenchmark,
  EnergyReading,
  CarbonFootprint,
  WasteRecord,
  ESGReport,
  SustainabilityGoal,
  MaturityAssessment,
  InnovationIdea,
  InnovationProject,
  TechRadarEntry,
  TransformationKPI,
} = require('../models/EnterpriseUltra');

// ── Helper ────────────────────────────────────────────────────────────────
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Sanitize body: strip prototype-pollution & privilege-escalation fields ──
const STRIP_FIELDS = [
  '__proto__',
  'constructor',
  'prototype',
  'organization',
  'createdBy',
  'updatedBy',
  'createdAt',
  'updatedAt',
  '__v',
  'role',
  'isAdmin',
  'permissions',
];
const sanitize = obj => {
  const clean = { ...obj };
  for (const f of STRIP_FIELDS) delete clean[f];
  return clean;
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. LEGAL & CONTRACT LIFECYCLE MANAGEMENT — الشؤون القانونية
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Legal Cases ───────────────────────────────────────────────────────────
router.get(
  '/legal/cases',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await LegalCase.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/legal/cases',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalCase.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/legal/cases/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalCase.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/legal/cases/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalCase.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/legal/cases/:id/status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalCase.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

router.get(
  '/legal/cases/dashboard/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const [total, open, won, lost] = await Promise.all([
      LegalCase.countDocuments({ organization: org }),
      LegalCase.countDocuments({
        organization: org,
        status: { $in: ['open', 'in_progress', 'hearing_scheduled'] },
      }),
      LegalCase.countDocuments({ organization: org, status: 'won' }),
      LegalCase.countDocuments({ organization: org, status: 'lost' }),
    ]);
    res.json({
      success: true,
      data: { total, open, won, lost, activeRate: total ? Math.round((open / total) * 100) : 0 },
    });
  })
);

// ── Court Hearings ────────────────────────────────────────────────────────
router.get(
  '/legal/hearings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CourtHearing.find({ organization: req.user.organization })
      .populate('case', 'caseNumber title')
      .sort({ hearingDate: 1 })
      .lean();
    res.json({ success: true, data: items });
  })
);

router.post(
  '/legal/hearings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CourtHearing.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/legal/hearings/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CourtHearing.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Power of Attorney ─────────────────────────────────────────────────────
router.get(
  '/legal/poa',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await PowerOfAttorney.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/legal/poa',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await PowerOfAttorney.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/legal/poa/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await PowerOfAttorney.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/legal/poa/:id/revoke',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await PowerOfAttorney.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked' },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Legal Opinions ────────────────────────────────────────────────────────
router.get(
  '/legal/opinions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await LegalOpinion.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/legal/opinions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalOpinion.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/legal/opinions/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalOpinion.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/legal/opinions/:id/deliver',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await LegalOpinion.findByIdAndUpdate(
      req.params.id,
      { status: 'delivered', deliveryDate: new Date() },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Regulatory Filings ───────────────────────────────────────────────────
router.get(
  '/legal/filings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await RegulatoryFiling.find({ organization: req.user.organization }).sort({
      dueDate: 1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/legal/filings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await RegulatoryFiling.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/legal/filings/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await RegulatoryFiling.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.get(
  '/legal/filings/overdue',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await RegulatoryFiling.find({
      organization: req.user.organization,
      dueDate: { $lt: new Date() },
      status: { $nin: ['submitted', 'approved'] },
    });
    res.json({ success: true, data: items });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════
   2. CORPORATE GOVERNANCE — الحوكمة المؤسسية
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Board Meetings ────────────────────────────────────────────────────────
router.get(
  '/governance/meetings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await BoardMeeting.find({ organization: req.user.organization }).sort({
      date: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/governance/meetings',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardMeeting.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/governance/meetings/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardMeeting.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/governance/meetings/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardMeeting.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/governance/meetings/:id/complete',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardMeeting.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', ...sanitize(req.body) },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Committees ────────────────────────────────────────────────────────────
router.get(
  '/governance/committees',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await BoardCommittee.find({ organization: req.user.organization }).sort({
      name: 1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/governance/committees',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardCommittee.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/governance/committees/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardCommittee.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Resolutions ───────────────────────────────────────────────────────────
router.get(
  '/governance/resolutions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await BoardResolution.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/governance/resolutions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardResolution.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/governance/resolutions/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardResolution.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/governance/resolutions/:id/vote',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { vote } = req.body; // 'for', 'against', 'abstain'
    const update = { $inc: { [`votes.${vote}`]: 1 } };
    const item = await BoardResolution.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/governance/resolutions/:id/implement',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BoardResolution.findByIdAndUpdate(
      req.params.id,
      { implementationStatus: req.body.status || 'in_progress' },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Governance Policies ───────────────────────────────────────────────────
router.get(
  '/governance/policies',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await GovernancePolicy.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/governance/policies',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await GovernancePolicy.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/governance/policies/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await GovernancePolicy.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.post(
  '/governance/policies/:id/acknowledge',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await GovernancePolicy.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          acknowledgments: {
            $each: [{ user: req.user._id, date: new Date(), acknowledged: true }],
            $slice: -500,
          },
        },
      },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Governance Reports ────────────────────────────────────────────────────
router.get(
  '/governance/reports',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await GovernanceReport.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/governance/reports',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await GovernanceReport.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/governance/dashboard/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const [meetings, committees, resolutions, policies] = await Promise.all([
      BoardMeeting.countDocuments({ organization: org }),
      BoardCommittee.countDocuments({ organization: org, status: 'active' }),
      BoardResolution.countDocuments({ organization: org }),
      GovernancePolicy.countDocuments({ organization: org, status: 'active' }),
    ]);
    const implemented = await BoardResolution.countDocuments({
      organization: org,
      implementationStatus: 'completed',
    });
    res.json({
      success: true,
      data: {
        meetings,
        committees,
        resolutions,
        policies,
        implementationRate: resolutions ? Math.round((implemented / resolutions) * 100) : 0,
      },
    });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════
   3. BUSINESS CONTINUITY & CRISIS MANAGEMENT — استمرارية الأعمال
   ═══════════════════════════════════════════════════════════════════════════ */

// ── BCP Plans ─────────────────────────────────────────────────────────────
router.get(
  '/bcp/plans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await BCPPlan.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/bcp/plans',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCPPlan.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/bcp/plans/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCPPlan.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/bcp/plans/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCPPlan.findByIdAndUpdate(req.params.id, sanitize(req.body), { new: true });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/bcp/plans/:id/activate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCPPlan.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Business Impact Analysis ──────────────────────────────────────────────
router.get(
  '/bcp/bia',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await BusinessImpactAnalysis.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/bcp/bia',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BusinessImpactAnalysis.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/bcp/bia/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BusinessImpactAnalysis.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Crisis Incidents ──────────────────────────────────────────────────────
router.get(
  '/bcp/crises',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CrisisIncident.find({ organization: req.user.organization }).sort({
      detectedAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/bcp/crises',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CrisisIncident.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/bcp/crises/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CrisisIncident.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/bcp/crises/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CrisisIncident.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/bcp/crises/:id/escalate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CrisisIncident.findByIdAndUpdate(
      req.params.id,
      { $push: { escalationPath: { $each: [req.body], $slice: -100 } } },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/bcp/crises/:id/resolve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CrisisIncident.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedAt: new Date(), ...sanitize(req.body) },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── BC Drills ─────────────────────────────────────────────────────────────
router.get(
  '/bcp/drills',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await BCDrill.find({ organization: req.user.organization }).sort({
      scheduledDate: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/bcp/drills',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCDrill.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/bcp/drills/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCDrill.findByIdAndUpdate(req.params.id, sanitize(req.body), { new: true });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/bcp/drills/:id/score',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await BCDrill.findByIdAndUpdate(
      req.params.id,
      { overallScore: req.body.score, status: 'completed' },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Disaster Recovery Plans ───────────────────────────────────────────────
router.get(
  '/bcp/drp',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await DisasterRecoveryPlan.find({ organization: req.user.organization }).sort({
      tier: 1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/bcp/drp',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await DisasterRecoveryPlan.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/bcp/drp/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await DisasterRecoveryPlan.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.get(
  '/bcp/dashboard/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const [plans, biaCount, activeCrises, drills, drpCount] = await Promise.all([
      BCPPlan.countDocuments({ organization: org }),
      BusinessImpactAnalysis.countDocuments({ organization: org }),
      CrisisIncident.countDocuments({
        organization: org,
        status: { $in: ['detected', 'assessed', 'activated', 'responding', 'recovering'] },
      }),
      BCDrill.countDocuments({ organization: org }),
      DisasterRecoveryPlan.countDocuments({ organization: org }),
    ]);
    const testedDrills = await BCDrill.countDocuments({ organization: org, status: 'completed' });
    res.json({
      success: true,
      data: {
        plans,
        biaCount,
        activeCrises,
        drills,
        drpCount,
        drillSuccessRate: drills ? Math.round((testedDrills / drills) * 100) : 0,
      },
    });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════
   4. CUSTOMER EXPERIENCE — تجربة العملاء
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Surveys ───────────────────────────────────────────────────────────────
router.get(
  '/cx/surveys',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CXSurvey.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/cx/surveys',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXSurvey.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/cx/surveys/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXSurvey.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/cx/surveys/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXSurvey.findByIdAndUpdate(req.params.id, sanitize(req.body), { new: true });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/cx/surveys/:id/activate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXSurvey.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Feedback ──────────────────────────────────────────────────────────────
router.get(
  '/cx/feedback',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CXFeedback.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/cx/feedback',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXFeedback.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/cx/feedback/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXFeedback.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.get(
  '/cx/feedback/analytics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const feedbacks = await CXFeedback.find({ organization: org }).lean();
    const total = feedbacks.length;
    const sentimentCounts = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0,
    };
    let totalScore = 0;
    let scored = 0;
    feedbacks.forEach(f => {
      if (f.sentiment) sentimentCounts[f.sentiment] = (sentimentCounts[f.sentiment] || 0) + 1;
      if (f.score != null) {
        totalScore += f.score;
        scored++;
      }
    });
    res.json({
      success: true,
      data: { total, averageScore: scored ? (totalScore / scored).toFixed(1) : 0, sentimentCounts },
    });
  })
);

// ── Complaints ────────────────────────────────────────────────────────────
router.get(
  '/cx/complaints',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CXComplaint.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/cx/complaints',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXComplaint.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/cx/complaints/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXComplaint.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/cx/complaints/:id/escalate',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXComplaint.findByIdAndUpdate(
      req.params.id,
      {
        $inc: { escalationLevel: 1 },
        status: 'escalated',
        $push: {
          escalationHistory: { $each: [{ ...sanitize(req.body), date: new Date() }], $slice: -200 },
        },
      },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/cx/complaints/:id/resolve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CXComplaint.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolution: req.body.resolution, 'sla.resolvedAt': new Date() },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Customer Journeys ─────────────────────────────────────────────────────
router.get(
  '/cx/journeys',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CustomerJourney.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/cx/journeys',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CustomerJourney.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/cx/journeys/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CustomerJourney.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Service Benchmarks ────────────────────────────────────────────────────
router.get(
  '/cx/benchmarks',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await ServiceBenchmark.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/cx/benchmarks',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await ServiceBenchmark.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/cx/benchmarks/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await ServiceBenchmark.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.get(
  '/cx/dashboard/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const [surveys, feedbackCount, complaints, openComplaints, journeys] = await Promise.all([
      CXSurvey.countDocuments({ organization: org }),
      CXFeedback.countDocuments({ organization: org }),
      CXComplaint.countDocuments({ organization: org }),
      CXComplaint.countDocuments({
        organization: org,
        status: { $in: ['open', 'acknowledged', 'investigating', 'escalated'] },
      }),
      CustomerJourney.countDocuments({ organization: org }),
    ]);
    res.json({
      success: true,
      data: {
        surveys,
        feedbackCount,
        complaints,
        openComplaints,
        journeys,
        resolutionRate: complaints
          ? Math.round(((complaints - openComplaints) / complaints) * 100)
          : 100,
      },
    });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════
   5. SUSTAINABILITY / ESG — الاستدامة والطاقة
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Energy Readings ───────────────────────────────────────────────────────
router.get(
  '/sustainability/energy',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await EnergyReading.find({ organization: req.user.organization }).sort({
      readingDate: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/sustainability/energy',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await EnergyReading.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/sustainability/energy/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await EnergyReading.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.get(
  '/sustainability/energy/summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const readings = await EnergyReading.find({ organization: req.user.organization }).lean();
    const byType = {};
    let totalCost = 0;
    readings.forEach(r => {
      if (!byType[r.energyType]) byType[r.energyType] = { consumption: 0, cost: 0, readings: 0 };
      byType[r.energyType].consumption += r.consumption || 0;
      byType[r.energyType].cost += (r.cost && r.cost.amount) || 0;
      byType[r.energyType].readings += 1;
      totalCost += (r.cost && r.cost.amount) || 0;
    });
    res.json({ success: true, data: { totalReadings: readings.length, totalCost, byType } });
  })
);

// ── Carbon Footprint ──────────────────────────────────────────────────────
router.get(
  '/sustainability/carbon',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await CarbonFootprint.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/sustainability/carbon',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CarbonFootprint.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/sustainability/carbon/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await CarbonFootprint.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Waste Records ─────────────────────────────────────────────────────────
router.get(
  '/sustainability/waste',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await WasteRecord.find({ organization: req.user.organization }).sort({
      date: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/sustainability/waste',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await WasteRecord.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/sustainability/waste/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await WasteRecord.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.get(
  '/sustainability/waste/summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const records = await WasteRecord.find({ organization: req.user.organization }).lean();
    let totalQuantity = 0;
    let recycledQuantity = 0;
    const byType = {};
    records.forEach(r => {
      totalQuantity += r.quantity || 0;
      if (r.disposalMethod === 'recycling') recycledQuantity += r.quantity || 0;
      if (!byType[r.wasteType]) byType[r.wasteType] = 0;
      byType[r.wasteType] += r.quantity || 0;
    });
    res.json({
      success: true,
      data: {
        totalRecords: records.length,
        totalQuantity,
        recycledQuantity,
        recyclingRate: totalQuantity ? Math.round((recycledQuantity / totalQuantity) * 100) : 0,
        byType,
      },
    });
  })
);

// ── ESG Reports ───────────────────────────────────────────────────────────
router.get(
  '/sustainability/esg',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await ESGReport.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/sustainability/esg',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await ESGReport.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/sustainability/esg/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await ESGReport.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Sustainability Goals ──────────────────────────────────────────────────
router.get(
  '/sustainability/goals',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await SustainabilityGoal.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/sustainability/goals',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await SustainabilityGoal.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/sustainability/goals/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await SustainabilityGoal.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/sustainability/goals/:id/progress',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await SustainabilityGoal.findByIdAndUpdate(
      req.params.id,
      {
        'current.value': req.body.value,
        'current.date': new Date(),
        progressPercentage: req.body.progress,
      },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

router.get(
  '/sustainability/dashboard/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const [energyCount, carbonCount, wasteCount, esgCount, goalCount] = await Promise.all([
      EnergyReading.countDocuments({ organization: org }),
      CarbonFootprint.countDocuments({ organization: org }),
      WasteRecord.countDocuments({ organization: org }),
      ESGReport.countDocuments({ organization: org }),
      SustainabilityGoal.countDocuments({ organization: org }),
    ]);
    const achievedGoals = await SustainabilityGoal.countDocuments({
      organization: org,
      status: 'achieved',
    });
    res.json({
      success: true,
      data: { energyCount, carbonCount, wasteCount, esgCount, goalCount, achievedGoals },
    });
  })
);

/* ═══════════════════════════════════════════════════════════════════════════
   6. DIGITAL TRANSFORMATION & INNOVATION — التحول الرقمي
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Maturity Assessments ──────────────────────────────────────────────────
router.get(
  '/dt/assessments',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await MaturityAssessment.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/dt/assessments',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await MaturityAssessment.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/dt/assessments/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await MaturityAssessment.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/dt/assessments/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await MaturityAssessment.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

// ── Innovation Ideas ──────────────────────────────────────────────────────
router.get(
  '/dt/ideas',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await InnovationIdea.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/dt/ideas',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationIdea.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/dt/ideas/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationIdea.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.post(
  '/dt/ideas/:id/vote',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { direction } = req.body; // 'up' or 'down'
    const update = {
      $inc: { [`votes.${direction}`]: 1 },
      $addToSet: { 'votes.voters': req.user._id },
    };
    const item = await InnovationIdea.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/dt/ideas/:id/status',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationIdea.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Innovation Projects ───────────────────────────────────────────────────
router.get(
  '/dt/projects',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await InnovationProject.find({ organization: req.user.organization }).sort({
      createdAt: -1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/dt/projects',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationProject.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.get(
  '/dt/projects/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationProject.findById(req.params.id).lean();
    res.json({ success: true, data: item });
  })
);

router.put(
  '/dt/projects/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationProject.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/dt/projects/:id/stage',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await InnovationProject.findByIdAndUpdate(
      req.params.id,
      { stage: req.body.stage, status: req.body.status || 'in_progress' },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Tech Radar ────────────────────────────────────────────────────────────
router.get(
  '/dt/radar',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await TechRadarEntry.find({ organization: req.user.organization }).sort({
      quadrant: 1,
      ring: 1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/dt/radar',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await TechRadarEntry.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/dt/radar/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await TechRadarEntry.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/dt/radar/:id/move',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const entry = await TechRadarEntry.findById(req.params.id).lean();
    const item = await TechRadarEntry.findByIdAndUpdate(
      req.params.id,
      {
        previousQuadrant: entry.quadrant,
        quadrant: req.body.quadrant,
        status: 'moved',
        movedDate: new Date(),
      },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

// ── Transformation KPIs ───────────────────────────────────────────────────
router.get(
  '/dt/kpis',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const items = await TransformationKPI.find({ organization: req.user.organization }).sort({
      category: 1,
    });
    res.json({ success: true, data: items });
  })
);

router.post(
  '/dt/kpis',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await TransformationKPI.create({
      ...sanitize(req.body),
      organization: req.user.organization,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: item });
  })
);

router.put(
  '/dt/kpis/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await TransformationKPI.findByIdAndUpdate(req.params.id, sanitize(req.body), {
      new: true,
    });
    res.json({ success: true, data: item });
  })
);

router.patch(
  '/dt/kpis/:id/update-value',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const item = await TransformationKPI.findByIdAndUpdate(
      req.params.id,
      {
        actual: req.body.actual,
        trend: req.body.trend,
        $push: {
          historicalData: { $each: [{ date: new Date(), value: req.body.actual }], $slice: -1000 },
        },
      },
      { new: true }
    );
    res.json({ success: true, data: item });
  })
);

router.get(
  '/dt/dashboard/stats',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const org = req.user.organization;
    const [assessments, ideas, projects, radarEntries, kpis] = await Promise.all([
      MaturityAssessment.countDocuments({ organization: org }),
      InnovationIdea.countDocuments({ organization: org }),
      InnovationProject.countDocuments({ organization: org }),
      TechRadarEntry.countDocuments({ organization: org }),
      TransformationKPI.countDocuments({ organization: org }),
    ]);
    const approvedIdeas = await InnovationIdea.countDocuments({
      organization: org,
      status: { $in: ['approved', 'in_development', 'piloting', 'implemented'] },
    });
    const adoptedTech = await TechRadarEntry.countDocuments({
      organization: org,
      quadrant: 'adopt',
    });
    res.json({
      success: true,
      data: {
        assessments,
        ideas,
        projects,
        radarEntries,
        kpis,
        approvedIdeas,
        adoptedTech,
        ideaApprovalRate: ideas ? Math.round((approvedIdeas / ideas) * 100) : 0,
      },
    });
  })
);

module.exports = router;
