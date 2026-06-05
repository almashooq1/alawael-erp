const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { assertBranchMatch } = require('../middleware/assertBranchMatch');

const scopedById = (req, id) => ({ _id: id, ...branchFilter(req) });
const mergeTenantFilter = (req, extra = {}) => ({ ...extra, ...branchFilter(req) });
// Service exports a singleton instance — use directly (no `new`)
const svc = require('../services/quality/quality-enhanced.service');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ── لوحة مؤشرات الجودة ───────────────────────────────
router.get('/dashboard/:branchId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    assertBranchMatch(req, req.params.branchId, 'quality dashboard');
    const data = await svc.getQualityDashboard(req.params.branchId, req.query.period || 'month');
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err);
  }
});

// ── معايير الجودة ─────────────────────────────────────
router.get('/standards', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { QualityStandard } = require('../models/QualityModels');
    const { source, chapter } = req.query;
    const filter = { isActive: true };
    if (source) filter.source = source;
    if (chapter) filter.chapter = chapter;
    const standards = await QualityStandard.find(filter).sort({ code: 1 });
    res.json({ success: true, data: standards });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/standards',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { QualityStandard } = require('../models/QualityModels');
      const standard = await QualityStandard.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: standard });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/standards/:id',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { QualityStandard } = require('../models/QualityModels');
      const standard = await QualityStandard.findByIdAndUpdate(
        req.params.id,
        stripUpdateMeta(req.body),
        { returnDocument: 'after' }
      );
      res.json({ success: true, data: standard });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── قوائم الفحص ───────────────────────────────────────
router.get('/checklists', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Checklist } = require('../models/QualityModels');
    const { type, frequency } = req.query;
    const filter = mergeTenantFilter(req, { isActive: true });
    if (type) filter.type = type;
    if (frequency) filter.frequency = frequency;
    if (filter.branchId) {
      const scopedBranch = filter.branchId;
      delete filter.branchId;
      filter.$or = [{ branchId: scopedBranch }, { branchId: null }];
    }
    const checklists = await Checklist.find(filter).sort({ titleAr: 1 });
    res.json({ success: true, data: checklists });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/checklists',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Checklist } = require('../models/QualityModels');
      const checklist = await Checklist.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: checklist });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/checklists/:id',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Checklist } = require('../models/QualityModels');
      const tenant = branchFilter(req);
      const query = { _id: req.params.id };
      if (tenant.branchId) {
        query.$or = [{ branchId: tenant.branchId }, { branchId: null }];
      }
      const checklist = await Checklist.findOneAndUpdate(query, stripUpdateMeta(req.body), {
        returnDocument: 'after',
      });
      if (!checklist) {
        return res.status(404).json({ success: false, message: 'قائمة الفحص غير موجودة' });
      }
      res.json({ success: true, data: checklist });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── تقديم قوائم الفحص ────────────────────────────────
router.get('/checklist-submissions', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { ChecklistSubmission } = require('../models/QualityModels');
    const { checklistId, status, from, to } = req.query;
    const filter = mergeTenantFilter(req);
    if (checklistId) filter.checklistId = checklistId;
    if (status) filter.status = status;
    if (from || to) filter.submissionDate = {};
    if (from) filter.submissionDate.$gte = new Date(from);
    if (to) filter.submissionDate.$lte = new Date(to);
    const submissions = await ChecklistSubmission.find(filter)
      .populate('checklistId submittedBy reviewedBy')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: submissions });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/checklist-submissions', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const result = await svc.submitChecklist(req.body, req.user._id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── الحوادث ───────────────────────────────────────────
router.get('/incidents', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const { status, severity, type, from, to } = req.query;
    const filter = mergeTenantFilter(req);
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    if (from || to) filter.occurredAt = {};
    if (from) filter.occurredAt.$gte = new Date(from);
    if (to) filter.occurredAt.$lte = new Date(to);
    const incidents = await Incident.find(filter)
      .populate('reportedBy assignedTo closedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: incidents });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/incidents', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const incident = await svc.reportIncident({ ...req.body, reportedBy: req.user._id });
    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/incidents/:incidentId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findOne(scopedById(req, req.params.incidentId)).populate(
      'reportedBy assignedTo closedBy branchId'
    );
    if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    res.json({ success: true, data: incident });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/incidents/:incidentId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findOneAndUpdate(
      scopedById(req, req.params.incidentId),
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/incidents/:incidentId/rca', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findOne(scopedById(req, req.params.incidentId));
    if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    const updated = await svc.submitRca(
      incident._id,
      'five_why',
      { whys: req.body.whys },
      req.user._id
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post(
  '/incidents/:incidentId/actions',
  authenticate,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { Incident } = require('../models/QualityModels');
      const incident = await Incident.findOneAndUpdate(
        scopedById(req, req.params.incidentId),
        {
          $push: {
            correctiveActions: {
              $each: [{ ...req.body, addedBy: req.user._id, addedAt: new Date() }],
              $slice: -200,
            },
          },
        },
        { returnDocument: 'after' }
      );
      if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
      res.json({ success: true, data: incident });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/incidents/:incidentId/close',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager', 'branch_manager'),
  async (req, res) => {
    try {
      const { Incident } = require('../models/QualityModels');
      const incident = await Incident.findOneAndUpdate(
        scopedById(req, req.params.incidentId),
        {
          status: 'closed',
          closedBy: req.user._id,
          closedAt: new Date(),
          closureNotes: req.body.notes,
        },
        { returnDocument: 'after' }
      );
      if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
      res.json({ success: true, data: incident });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── الشكاوى ────────────────────────────────────────────
router.get('/complaints', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Complaint } = require('../models/QualityModels');
    const { status, category, priority } = req.query;
    const filter = mergeTenantFilter(req);
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    const complaints = await Complaint.find(filter)
      .populate('assignedTo resolvedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/complaints', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const complaint = await svc.createComplaint(req.body, req.user._id);
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/complaints/:complaintId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Complaint } = require('../models/QualityModels');
    const complaint = await Complaint.findOne(scopedById(req, req.params.complaintId)).populate(
      'assignedTo resolvedBy'
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/complaints/:complaintId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Complaint } = require('../models/QualityModels');
    const complaint = await Complaint.findOneAndUpdate(
      scopedById(req, req.params.complaintId),
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put(
  '/complaints/:complaintId/resolve',
  authenticate,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { Complaint } = require('../models/QualityModels');
      const exists = await Complaint.findOne(scopedById(req, req.params.complaintId)).select('_id');
      if (!exists) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
      const result = await svc.resolveComplaint(
        req.params.complaintId,
        req.body.resolution,
        req.user._id
      );
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── استبيانات الرضا والـ NPS ──────────────────────────
router.get('/surveys', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { SatisfactionSurvey } = require('../models/QualityModels');
    const { surveyType, from, to } = req.query;
    const filter = mergeTenantFilter(req);
    if (surveyType) filter.surveyType = surveyType;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    const surveys = await SatisfactionSurvey.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: surveys });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/surveys', async (req, res) => {
  // بدون مصادقة - يمكن للمستفيدين/الأولياء الإجابة
  try {
    const { SatisfactionSurvey } = require('../models/QualityModels');
    const survey = await SatisfactionSurvey.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: survey });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/surveys/nps/:branchId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    assertBranchMatch(req, req.params.branchId, 'NPS survey');
    const { from, to } = req.query;
    const data = await svc.calculateNps(req.params.branchId, from, to);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err);
  }
});

// ── عمليات التدقيق ────────────────────────────────────
router.get('/audits', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Audit } = require('../models/QualityModels');
    const { standard, status, type } = req.query;
    const filter = mergeTenantFilter(req);
    if (standard) filter.standard = standard;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const audits = await Audit.find(filter).sort({ plannedDate: -1 });
    res.json({ success: true, data: audits });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/audits',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const audit = await svc.createAudit(req.body);
      res.status(201).json({ success: true, data: audit });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/audits/:auditId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Audit } = require('../models/QualityModels');
    const audit = await Audit.findOne(scopedById(req, req.params.auditId));
    if (!audit) return res.status(404).json({ success: false, message: 'التدقيق غير موجود' });
    res.json({ success: true, data: audit });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/audits/:auditId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Audit } = require('../models/QualityModels');
      const audit = await Audit.findOneAndUpdate(
        scopedById(req, req.params.auditId),
        stripUpdateMeta(req.body),
        { returnDocument: 'after' }
      );
      if (!audit) return res.status(404).json({ success: false, message: 'التدقيق غير موجود' });
      res.json({ success: true, data: audit });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── مشاريع التحسين PDCA ───────────────────────────────
router.get('/improvements', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const { status, currentPhase } = req.query;
    const filter = mergeTenantFilter(req);
    if (status) filter.status = status;
    if (currentPhase) filter.currentPhase = currentPhase;
    const projects = await ImprovementProject.find(filter)
      .populate('ownerId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/improvements', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const project = await svc.createImprovementProject(req.body, req.user._id);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/improvements/:projectId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const project = await ImprovementProject.findOne(
      scopedById(req, req.params.projectId)
    ).populate('ownerId');
    if (!project) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    res.json({ success: true, data: project });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/improvements/:projectId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const project = await ImprovementProject.findOneAndUpdate(
      scopedById(req, req.params.projectId),
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!project) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put(
  '/improvements/:projectId/phase',
  authenticate,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { ImprovementProject } = require('../models/QualityModels');
      const { phase, data: phaseData } = req.body;
      const update = { currentPhase: phase };
      update[`${phase}Phase`] = phaseData;
      const project = await ImprovementProject.findOneAndUpdate(
        scopedById(req, req.params.projectId),
        update,
        { returnDocument: 'after' }
      );
      if (!project) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
      res.json({ success: true, data: project });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── إدارة المخاطر ─────────────────────────────────────
router.get('/risks', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    const { category, status, riskLevel } = req.query;
    const filter = mergeTenantFilter(req);
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    const risks = await Risk.find(filter).populate('ownerId').sort({ riskScore: -1 });
    res.json({ success: true, data: risks });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/risks', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const riskLevel = svc.assessRiskLevel(req.body.likelihood, req.body.impact);
    const risk = await svc.createRisk({ ...req.body, riskLevel }, req.body.ownerId || req.user._id);
    res.status(201).json({ success: true, data: risk });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/risks/matrix/:branchId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    assertBranchMatch(req, req.params.branchId, 'risk matrix');
    const { Risk } = require('../models/QualityModels');
    const risks = await Risk.find({
      branchId: req.params.branchId,
      status: { $ne: 'closed' },
    })
      .populate('ownerId', 'nameAr')
      .sort({ riskScore: -1 });

    const matrix = { critical: [], high: [], medium: [], low: [] };
    risks.forEach(r => {
      const level = r.riskLevel || 'low';
      if (matrix[level]) matrix[level].push(r);
    });
    res.json({ success: true, data: { risks, matrix } });
  } catch (err) {
    safeError(res, err);
  }
});

router.get('/risks/:riskId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    const risk = await Risk.findOne(scopedById(req, req.params.riskId)).populate('ownerId');
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk });
  } catch (err) {
    safeError(res, err);
  }
});

router.put('/risks/:riskId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    if (req.body.likelihood || req.body.impact) {
      const existing = await Risk.findOne(scopedById(req, req.params.riskId));
      if (!existing)
        return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
      const likelihood = req.body.likelihood || existing.likelihood;
      const impact = req.body.impact || existing.impact;
      req.body.riskLevel = svc.assessRiskLevel(likelihood, impact);
    }
    const risk = await Risk.findOneAndUpdate(
      scopedById(req, req.params.riskId),
      stripUpdateMeta(req.body),
      { returnDocument: 'after' }
    );
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
