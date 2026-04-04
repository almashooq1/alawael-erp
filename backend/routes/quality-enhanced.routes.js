const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const QualityEnhancedService = require('../services/quality/quality-enhanced.service');

const svc = new QualityEnhancedService();

// ── لوحة مؤشرات الجودة ───────────────────────────────
router.get('/dashboard/:branchId', authenticate, async (req, res) => {
  try {
    const data = await svc.getQualityDashboard(req.params.branchId, req.query.period || 'month');
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── معايير الجودة ─────────────────────────────────────
router.get('/standards', authenticate, async (req, res) => {
  try {
    const { QualityStandard } = require('../models/QualityModels');
    const { source, chapter } = req.query;
    const filter = { isActive: true };
    if (source) filter.source = source;
    if (chapter) filter.chapter = chapter;
    const standards = await QualityStandard.find(filter).sort({ code: 1 });
    res.json({ success: true, data: standards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/standards',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { QualityStandard } = require('../models/QualityModels');
      const standard = await QualityStandard.create(req.body);
      res.status(201).json({ success: true, data: standard });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/standards/:id',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { QualityStandard } = require('../models/QualityModels');
      const standard = await QualityStandard.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      res.json({ success: true, data: standard });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── قوائم الفحص ───────────────────────────────────────
router.get('/checklists', authenticate, async (req, res) => {
  try {
    const { Checklist } = require('../models/QualityModels');
    const { type, frequency, branchId } = req.query;
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (frequency) filter.frequency = frequency;
    if (branchId) filter.$or = [{ branchId }, { branchId: null }];
    const checklists = await Checklist.find(filter).sort({ titleAr: 1 });
    res.json({ success: true, data: checklists });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/checklists',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Checklist } = require('../models/QualityModels');
      const checklist = await Checklist.create(req.body);
      res.status(201).json({ success: true, data: checklist });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/checklists/:id',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Checklist } = require('../models/QualityModels');
      const checklist = await Checklist.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json({ success: true, data: checklist });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── تقديم قوائم الفحص ────────────────────────────────
router.get('/checklist-submissions', authenticate, async (req, res) => {
  try {
    const { ChecklistSubmission } = require('../models/QualityModels');
    const { branchId, checklistId, status, from, to } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
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
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/checklist-submissions', authenticate, async (req, res) => {
  try {
    const result = await svc.submitChecklist(req.body, req.user._id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── الحوادث ───────────────────────────────────────────
router.get('/incidents', authenticate, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const { branchId, status, severity, type, from, to } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
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
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/incidents', authenticate, async (req, res) => {
  try {
    const incident = await svc.reportIncident({ ...req.body, reportedBy: req.user._id });
    res.status(201).json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/incidents/:incidentId', authenticate, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findById(req.params.incidentId).populate(
      'reportedBy assignedTo closedBy branchId'
    );
    if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/incidents/:incidentId', authenticate, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findByIdAndUpdate(req.params.incidentId, req.body, {
      new: true,
    });
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/incidents/:incidentId/rca', authenticate, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findById(req.params.incidentId);
    if (!incident) return res.status(404).json({ success: false, message: 'الحادثة غير موجودة' });
    await svc.performFiveWhyAnalysis(incident, req.body.whys);
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/incidents/:incidentId/actions', authenticate, async (req, res) => {
  try {
    const { Incident } = require('../models/QualityModels');
    const incident = await Incident.findByIdAndUpdate(
      req.params.incidentId,
      { $push: { correctiveActions: { ...req.body, addedBy: req.user._id, addedAt: new Date() } } },
      { new: true }
    );
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put(
  '/incidents/:incidentId/close',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager', 'branch_manager'),
  async (req, res) => {
    try {
      const { Incident } = require('../models/QualityModels');
      const incident = await Incident.findByIdAndUpdate(
        req.params.incidentId,
        {
          status: 'closed',
          closedBy: req.user._id,
          closedAt: new Date(),
          closureNotes: req.body.notes,
        },
        { new: true }
      );
      res.json({ success: true, data: incident });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── الشكاوى ────────────────────────────────────────────
router.get('/complaints', authenticate, async (req, res) => {
  try {
    const { Complaint } = require('../models/QualityModels');
    const { branchId, status, category, priority } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    const complaints = await Complaint.find(filter)
      .populate('assignedTo resolvedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/complaints', authenticate, async (req, res) => {
  try {
    const complaint = await svc.createComplaint(req.body, req.user._id);
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/complaints/:complaintId', authenticate, async (req, res) => {
  try {
    const { Complaint } = require('../models/QualityModels');
    const complaint = await Complaint.findById(req.params.complaintId).populate(
      'assignedTo resolvedBy'
    );
    if (!complaint) return res.status(404).json({ success: false, message: 'الشكوى غير موجودة' });
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/complaints/:complaintId', authenticate, async (req, res) => {
  try {
    const { Complaint } = require('../models/QualityModels');
    const complaint = await Complaint.findByIdAndUpdate(req.params.complaintId, req.body, {
      new: true,
    });
    res.json({ success: true, data: complaint });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/complaints/:complaintId/resolve', authenticate, async (req, res) => {
  try {
    const result = await svc.resolveComplaint(
      req.params.complaintId,
      req.body.resolution,
      req.user._id
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── استبيانات الرضا والـ NPS ──────────────────────────
router.get('/surveys', authenticate, async (req, res) => {
  try {
    const { SatisfactionSurvey } = require('../models/QualityModels');
    const { branchId, surveyType, from, to } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (surveyType) filter.surveyType = surveyType;
    if (from || to) filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
    const surveys = await SatisfactionSurvey.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: surveys });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/surveys', async (req, res) => {
  // بدون مصادقة - يمكن للمستفيدين/الأولياء الإجابة
  try {
    const { SatisfactionSurvey } = require('../models/QualityModels');
    const survey = await SatisfactionSurvey.create(req.body);
    res.status(201).json({ success: true, data: survey });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/surveys/nps/:branchId', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await svc.calculateNps(req.params.branchId, from, to);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── عمليات التدقيق ────────────────────────────────────
router.get('/audits', authenticate, async (req, res) => {
  try {
    const { Audit } = require('../models/QualityModels');
    const { branchId, standard, status, type } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (standard) filter.standard = standard;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const audits = await Audit.find(filter).sort({ plannedDate: -1 });
    res.json({ success: true, data: audits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  '/audits',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Audit } = require('../models/QualityModels');
      const audit = await Audit.create({
        ...req.body,
        auditNumber: await svc.generateAuditNumber(),
      });
      res.status(201).json({ success: true, data: audit });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/audits/:auditId', authenticate, async (req, res) => {
  try {
    const { Audit } = require('../models/QualityModels');
    const audit = await Audit.findById(req.params.auditId);
    if (!audit) return res.status(404).json({ success: false, message: 'التدقيق غير موجود' });
    res.json({ success: true, data: audit });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put(
  '/audits/:auditId',
  authenticate,
  authorize('admin', 'super_admin', 'quality_manager'),
  async (req, res) => {
    try {
      const { Audit } = require('../models/QualityModels');
      const audit = await Audit.findByIdAndUpdate(req.params.auditId, req.body, { new: true });
      res.json({ success: true, data: audit });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── مشاريع التحسين PDCA ───────────────────────────────
router.get('/improvements', authenticate, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const { branchId, status, currentPhase } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (currentPhase) filter.currentPhase = currentPhase;
    const projects = await ImprovementProject.find(filter)
      .populate('ownerId')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/improvements', authenticate, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const project = await ImprovementProject.create({
      ...req.body,
      ownerId: req.user._id,
      projectNumber: await svc.generateProjectNumber(),
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/improvements/:projectId', authenticate, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const project = await ImprovementProject.findById(req.params.projectId).populate('ownerId');
    if (!project) return res.status(404).json({ success: false, message: 'المشروع غير موجود' });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/improvements/:projectId', authenticate, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const project = await ImprovementProject.findByIdAndUpdate(req.params.projectId, req.body, {
      new: true,
    });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/improvements/:projectId/phase', authenticate, async (req, res) => {
  try {
    const { ImprovementProject } = require('../models/QualityModels');
    const { phase, data: phaseData } = req.body;
    const update = { currentPhase: phase };
    update[`${phase}Phase`] = phaseData;
    const project = await ImprovementProject.findByIdAndUpdate(req.params.projectId, update, {
      new: true,
    });
    res.json({ success: true, data: project });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── إدارة المخاطر ─────────────────────────────────────
router.get('/risks', authenticate, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    const { branchId, category, status, riskLevel } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    const risks = await Risk.find(filter).populate('ownerId').sort({ riskScore: -1 });
    res.json({ success: true, data: risks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/risks', authenticate, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    const riskLevel = svc.assessRiskLevel(req.body.likelihood, req.body.impact);
    const risk = await Risk.create({
      ...req.body,
      riskLevel,
      riskNumber: await svc.generateRiskNumber(),
      ownerId: req.body.ownerId || req.user._id,
    });
    res.status(201).json({ success: true, data: risk });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/risks/matrix/:branchId', authenticate, async (req, res) => {
  try {
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
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/risks/:riskId', authenticate, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    const risk = await Risk.findById(req.params.riskId).populate('ownerId');
    if (!risk) return res.status(404).json({ success: false, message: 'المخاطرة غير موجودة' });
    res.json({ success: true, data: risk });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/risks/:riskId', authenticate, async (req, res) => {
  try {
    const { Risk } = require('../models/QualityModels');
    if (req.body.likelihood || req.body.impact) {
      const existing = await Risk.findById(req.params.riskId);
      const likelihood = req.body.likelihood || existing.likelihood;
      const impact = req.body.impact || existing.impact;
      req.body.riskLevel = svc.assessRiskLevel(likelihood, impact);
    }
    const risk = await Risk.findByIdAndUpdate(req.params.riskId, req.body, { new: true });
    res.json({ success: true, data: risk });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
