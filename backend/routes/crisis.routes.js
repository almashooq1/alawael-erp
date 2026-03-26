/**
 * Crisis & Emergency Management Routes — مسارات إدارة الأزمات والطوارئ
 *
 * Endpoints:
 *   /api/crisis/plans          — Emergency plans CRUD
 *   /api/crisis/incidents      — Incident reporting & management
 *   /api/crisis/drills         — Emergency drills scheduling
 *   /api/crisis/contacts       — Emergency contact tree
 *   /api/crisis/dashboard      — Crisis dashboard
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  EmergencyPlan,
  CrisisIncident,
  EmergencyDrill,
  EmergencyContact,
} = require('../models/crisis.model');
const logger = require('../utils/logger');

// ── All crisis routes require authentication ──────────────────────
router.use(authenticate);

// ── Field whitelists (mass-assignment protection) ─────────────────
const PLAN_FIELDS = [
  'title',
  'type',
  'riskLevel',
  'center',
  'description',
  'objectives',
  'scope',
  'procedures',
  'communicationTree',
  'requiredResources',
  'expiresAt',
];
const INCIDENT_FIELDS = [
  'title',
  'type',
  'severity',
  'center',
  'description',
  'location',
  'relatedPlan',
  'incidentCommander',
  'assignedTeam',
];
const DRILL_FIELDS = [
  'title',
  'type',
  'center',
  'relatedPlan',
  'coordinator',
  'scheduledDate',
  'description',
  'duration',
  'participants',
  'objectives',
  'scenario',
];
const CONTACT_FIELDS = [
  'name',
  'category',
  'center',
  'role',
  'phone',
  'alternatePhone',
  'email',
  'person',
  'priority',
  'isActive',
  'notes',
];

/** Pick only allowed fields from source object */
const pick = (src, fields) => {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
};

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY PLANS — خطط الطوارئ
// ═══════════════════════════════════════════════════════════════════════════

router.get('/plans', async (req, res) => {
  try {
    const { type, status, riskLevel, center, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (center) filter.center = center;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [plans, total] = await Promise.all([
      EmergencyPlan.find(filter)
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      EmergencyPlan.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: plans,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Crisis] Plans list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/plans/:id', async (req, res) => {
  try {
    const plan = await EmergencyPlan.findById(req.params.id)
      .populate('approvedBy', 'name')
      .populate('procedures.responsible', 'name phone')
      .populate('communicationTree.person', 'name phone')
      .lean();
    if (!plan) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/plans', async (req, res) => {
  try {
    const plan = await EmergencyPlan.create({
      ...pick(req.body, PLAN_FIELDS),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const plan = await EmergencyPlan.findByIdAndUpdate(req.params.id, pick(req.body, PLAN_FIELDS), {
      new: true,
      runValidators: true,
    });
    if (!plan) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/plans/:id/approve', async (req, res) => {
  try {
    const plan = await EmergencyPlan.findByIdAndUpdate(
      req.params.id,
      { status: 'active', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, data: plan, message: 'تمت الموافقة على الخطة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    const plan = await EmergencyPlan.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, error: 'الخطة غير موجودة' });
    res.json({ success: true, message: 'تم حذف الخطة' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// INCIDENTS — الحوادث والأزمات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/incidents', async (req, res) => {
  try {
    const { type, severity, status, center, page = 1, limit = 20 } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (center) filter.center = center;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [incidents, total] = await Promise.all([
      CrisisIncident.find(filter)
        .populate('reportedBy', 'name')
        .populate('incidentCommander', 'name')
        .sort({ reportedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      CrisisIncident.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: incidents,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[Crisis] Incidents list error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/incidents/:id', async (req, res) => {
  try {
    const incident = await CrisisIncident.findById(req.params.id)
      .populate('reportedBy', 'name phone')
      .populate('incidentCommander', 'name phone')
      .populate('assignedTeam', 'name phone')
      .populate('relatedPlan', 'title planNumber')
      .populate('timeline.performedBy', 'name')
      .lean();
    if (!incident) return res.status(404).json({ success: false, error: 'الحادثة غير موجودة' });
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/incidents', async (req, res) => {
  try {
    const incident = await CrisisIncident.create({
      ...pick(req.body, INCIDENT_FIELDS),
      reportedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/incidents/:id', async (req, res) => {
  try {
    const incident = await CrisisIncident.findByIdAndUpdate(
      req.params.id,
      pick(req.body, INCIDENT_FIELDS),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!incident) return res.status(404).json({ success: false, error: 'الحادثة غير موجودة' });
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/incidents/:id/status', async (req, res) => {
  try {
    const { status: newStatus, notes } = req.body;
    const incident = await CrisisIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, error: 'الحادثة غير موجودة' });

    incident.status = newStatus;
    incident.timeline.push({
      action: `تغيير الحالة إلى ${newStatus}`,
      performedBy: req.user._id,
      notes,
    });

    if (newStatus === 'contained') incident.containedAt = new Date();
    if (newStatus === 'resolved') incident.resolvedAt = new Date();
    if (newStatus === 'closed') incident.closedAt = new Date();

    await incident.save();
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/incidents/:id/timeline', async (req, res) => {
  try {
    const incident = await CrisisIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, error: 'الحادثة غير موجودة' });

    const { action, notes } = req.body;
    incident.timeline.push({ action, notes, performedBy: req.user._id });
    await incident.save();
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/incidents/:id/corrective-action', async (req, res) => {
  try {
    const incident = await CrisisIncident.findById(req.params.id);
    if (!incident) return res.status(404).json({ success: false, error: 'الحادثة غير موجودة' });

    const { description: caDesc, assignedTo, dueDate, priority: caPriority } = req.body;
    incident.correctiveActions.push({
      description: caDesc,
      assignedTo,
      dueDate,
      priority: caPriority,
    });
    await incident.save();
    res.json({ success: true, data: incident, message: 'تم إضافة الإجراء التصحيحي' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DRILLS — تمارين الطوارئ
// ═══════════════════════════════════════════════════════════════════════════

router.get('/drills', async (req, res) => {
  try {
    const { type, status, center, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (center) filter.center = center;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [drills, total] = await Promise.all([
      EmergencyDrill.find(filter)
        .populate('coordinator', 'name')
        .populate('relatedPlan', 'title planNumber')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      EmergencyDrill.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: drills,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/drills', async (req, res) => {
  try {
    const drill = await EmergencyDrill.create({
      ...pick(req.body, DRILL_FIELDS),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: drill });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/drills/:id', async (req, res) => {
  try {
    const drill = await EmergencyDrill.findByIdAndUpdate(
      req.params.id,
      pick(req.body, DRILL_FIELDS),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!drill) return res.status(404).json({ success: false, error: 'التمرين غير موجود' });
    res.json({ success: true, data: drill });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.patch('/drills/:id/complete', async (req, res) => {
  try {
    const { results, duration, participants, evacuationTime } = req.body;
    const drill = await EmergencyDrill.findById(req.params.id);
    if (!drill) return res.status(404).json({ success: false, error: 'التمرين غير موجود' });

    drill.status = 'completed';
    drill.actualDate = new Date();
    if (results) drill.results = results;
    if (duration) drill.duration.actual = duration;
    if (participants) drill.participants.actual = participants;
    if (evacuationTime) drill.evacuationTime = evacuationTime;

    await drill.save();
    res.json({ success: true, data: drill, message: 'تم إكمال التمرين' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTACTS — جهات اتصال الطوارئ
// ═══════════════════════════════════════════════════════════════════════════

router.get('/contacts', async (req, res) => {
  try {
    const { category, center, active } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (center) filter.center = center;
    if (active !== undefined) filter.isActive = active === 'true';

    const contacts = await EmergencyContact.find(filter)
      .populate('person', 'name email')
      .sort({ priority: 1 })
      .lean();

    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const contact = await EmergencyContact.create(pick(req.body, CONTACT_FIELDS));
    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findByIdAndUpdate(
      req.params.id,
      pick(req.body, CONTACT_FIELDS),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ success: false, error: 'جهة الاتصال غير موجودة' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — لوحة تحكم الأزمات
// ═══════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const [
      activePlans,
      activeIncidents,
      criticalIncidents,
      upcomingDrills,
      incidentsByType,
      incidentsBySeverity,
      recentIncidents,
    ] = await Promise.all([
      EmergencyPlan.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
      CrisisIncident.countDocuments({
        status: { $in: ['reported', 'acknowledged', 'in_progress', 'escalated'] },
        isDeleted: { $ne: true },
      }),
      CrisisIncident.countDocuments({
        severity: 'critical',
        status: { $nin: ['resolved', 'closed'] },
        isDeleted: { $ne: true },
      }),
      EmergencyDrill.countDocuments({
        status: 'scheduled',
        scheduledDate: { $gte: new Date() },
      }),
      CrisisIncident.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      CrisisIncident.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      CrisisIncident.find({ isDeleted: { $ne: true } })
        .sort({ reportedAt: -1 })
        .limit(10)
        .populate('reportedBy', 'name')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        activePlans,
        activeIncidents,
        criticalIncidents,
        upcomingDrills,
        incidentsByType,
        incidentsBySeverity: Object.fromEntries(incidentsBySeverity.map(s => [s._id, s.count])),
        recentIncidents,
      },
    });
  } catch (error) {
    logger.error('[Crisis] Dashboard error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
