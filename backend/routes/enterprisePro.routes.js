/**
 * Enterprise Pro Routes — مسارات الميزات المؤسسية الاحترافية
 *
 * 6 modules, ~80+ endpoints:
 *  1. /audit-hub/*          — Audit Trail & Compliance
 *  2. /report-builder/*     — Advanced Report Builder
 *  3. /calendar-hub/*       — Unified Calendar Hub
 *  4. /crm-pro/*            — CRM Modernization
 *  5. /warehouse-intel/*    — Warehouse Intelligence
 *  6. /project-pro/*        — Project Management Pro
 */

const router = require('express').Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { escapeRegex } = require('../utils/sanitize');
const logger = require('../utils/logger');

const {
  AuditTrailEntry,
  ComplianceChecklist,
  ComplianceAlert,
  ReportTemplate,
  ReportExecution,
  CalendarEvent,
  RoomBooking,
  CRMContact,
  CRMPipeline,
  CRMDeal,
  CRMActivity,
  Warehouse,
  WarehouseBin,
  StockLevel,
  StockAlert,
  StockTransferOrder,
  ProjectPro,
  ProjectTask,
  ProjectTimeLog,
} = require('../models/EnterprisePro');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ─── Mutation guard: POST/PUT/PATCH/DELETE require admin or manager ─────────
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
router.use((req, res, next) => {
  if (MUTATION_METHODS.has(req.method)) {
    return requireRole('admin', 'manager', 'compliance_officer', 'finance_officer')(req, res, next);
  }
  next();
});

// ─── Field Whitelists (mass-assignment protection) ──────────────────────────
const pick = (obj, keys) =>
  keys.reduce((o, k) => {
    if (obj[k] !== undefined) o[k] = obj[k];
    return o;
  }, {});

const FIELDS = {
  checklist: ['name', 'nameAr', 'category', 'module', 'items', 'isActive', 'description'],
  report: [
    'name',
    'nameAr',
    'description',
    'type',
    'dataSource',
    'columns',
    'filters',
    'groupBy',
    'sortBy',
    'chart',
    'isPublic',
    'schedule',
  ],
  event: [
    'title',
    'titleAr',
    'description',
    'start',
    'end',
    'allDay',
    'type',
    'priority',
    'location',
    'attendees',
    'recurrence',
    'reminders',
    'color',
  ],
  contact: [
    'firstName',
    'lastName',
    'email',
    'phone',
    'company',
    'position',
    'source',
    'tags',
    'notes',
    'assignedTo',
    'address',
  ],
  pipeline: ['name', 'nameAr', 'stages', 'description', 'isActive'],
  deal: [
    'title',
    'value',
    'currency',
    'pipeline',
    'stage',
    'contact',
    'assignedTo',
    'expectedCloseDate',
    'probability',
    'description',
    'tags',
  ],
  activity: [
    'type',
    'title',
    'description',
    'contact',
    'deal',
    'date',
    'duration',
    'outcome',
    'notes',
  ],
  warehouse: [
    'name',
    'nameAr',
    'code',
    'type',
    'location',
    'capacity',
    'manager',
    'isActive',
    'temperature',
    'description',
  ],
  bin: ['name', 'warehouse', 'zone', 'aisle', 'rack', 'level', 'type', 'maxCapacity', 'isActive'],
  stockLevel: [
    'product',
    'warehouse',
    'bin',
    'quantity',
    'minQuantity',
    'maxQuantity',
    'reorderPoint',
    'unit',
  ],
  transfer: [
    'fromWarehouse',
    'toWarehouse',
    'items',
    'status',
    'priority',
    'notes',
    'scheduledDate',
  ],
  project: [
    'name',
    'nameAr',
    'description',
    'status',
    'priority',
    'category',
    'startDate',
    'endDate',
    'budget',
    'manager',
    'members',
    'tags',
  ],
  task: [
    'title',
    'titleAr',
    'description',
    'project',
    'status',
    'priority',
    'assignee',
    'parentTask',
    'startDate',
    'dueDate',
    'estimatedHours',
    'tags',
    'dependencies',
  ],
  timeLog: ['task', 'description', 'date', 'hours', 'billable'],
};

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  1. AUDIT TRAIL & COMPLIANCE HUB — مركز التدقيق والامتثال                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── Audit Trail ─────────────────────────────────────────────────────────────
router.get('/audit-hub/trail', authenticateToken, async (req, res) => {
  try {
    const {
      module,
      action,
      entityType,
      severity,
      performedBy,
      from,
      to,
      page = 1,
      limit = 50,
    } = req.query;
    const q = {};
    if (module) q.module = module;
    if (action) q.action = action;
    if (entityType) q.entityType = entityType;
    if (severity) q.severity = severity;
    if (performedBy) q.performedBy = performedBy;
    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    const [entries, total] = await Promise.all([
      AuditTrailEntry.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('performedBy', 'name email'),
      AuditTrailEntry.countDocuments(q),
    ]);
    res.json({ entries, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/audit-hub/trail/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await AuditTrailEntry.findById(req.params.id).populate(
      'performedBy',
      'name email'
    );
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/audit-hub/trail/entity/:type/:id', authenticateToken, async (req, res) => {
  try {
    const entries = await AuditTrailEntry.find({
      entityType: req.params.type,
      entityId: req.params.id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('performedBy', 'name email');
    res.json(entries);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/audit-hub/stats', authenticateToken, async (req, res) => {
  try {
    const [byModule, byAction, bySeverity, recentCount] = await Promise.all([
      AuditTrailEntry.aggregate([
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditTrailEntry.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditTrailEntry.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }]),
      AuditTrailEntry.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 3600 * 1000) },
      }),
    ]);
    res.json({ byModule, byAction, bySeverity, recentCount });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/audit-hub/modules', authenticateToken, async (_req, res) => {
  try {
    const modules = await AuditTrailEntry.distinct('module');
    res.json(modules);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Compliance Checklists ───────────────────────────────────────────────────
router.get('/audit-hub/checklists', authenticateToken, async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const q = {};
    if (category) q.category = category;
    if (isActive !== undefined) q.isActive = isActive === 'true';
    const lists = await ComplianceChecklist.find(q)
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name').lean();
    res.json(lists);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/audit-hub/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const cl = await ComplianceChecklist.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('items.assignedTo', 'name')
      .populate('items.checkedBy', 'name').lean();
    if (!cl) return res.status(404).json({ error: 'Not found' });
    res.json(cl);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/audit-hub/checklists', authenticateToken, async (req, res) => {
  try {
    const cl = await ComplianceChecklist.create({
      ...pick(req.body, FIELDS.checklist),
      createdBy: uid(req),
    });
    res.status(201).json(cl);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/audit-hub/checklists/:id', authenticateToken, async (req, res) => {
  try {
    // Recalculate overall score
    const data = pick(req.body, FIELDS.checklist);
    if (data.items) {
      const total = data.items.length;
      const compliant = data.items.filter(i => i.status === 'compliant').length;
      data.overallScore = total > 0 ? Math.round((compliant / total) * 100) : 0;
    }
    const cl = await ComplianceChecklist.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(cl);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/audit-hub/checklists/:id', authenticateToken, async (req, res) => {
  try {
    await ComplianceChecklist.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/audit-hub/compliance-dashboard', authenticateToken, async (_req, res) => {
  try {
    const checklists = await ComplianceChecklist.find({ isActive: true }).lean();
    const totalItems = checklists.reduce((s, c) => s + c.items.length, 0);
    const compliantItems = checklists.reduce(
      (s, c) => s + c.items.filter(i => i.status === 'compliant').length,
      0
    );
    const nonCompliant = checklists.reduce(
      (s, c) => s + c.items.filter(i => i.status === 'non_compliant').length,
      0
    );
    const overdue = checklists.reduce(
      (s, c) =>
        s +
        c.items.filter(
          i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'compliant'
        ).length,
      0
    );
    const avgScore =
      checklists.length > 0
        ? Math.round(checklists.reduce((s, c) => s + c.overallScore, 0) / checklists.length)
        : 0;
    const byCategory = {};
    checklists.forEach(c => {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    });
    res.json({
      totalChecklists: checklists.length,
      totalItems,
      compliantItems,
      nonCompliant,
      overdue,
      avgScore,
      byCategory,
    });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Compliance Alerts ───────────────────────────────────────────────────────
router.get('/audit-hub/alerts', authenticateToken, async (req, res) => {
  try {
    const { severity, isResolved } = req.query;
    const q = {};
    if (severity) q.severity = severity;
    if (isResolved !== undefined) q.isResolved = isResolved === 'true';
    const alerts = await ComplianceAlert.find(q)
      .sort({ createdAt: -1 })
      .populate('checklist', 'name nameAr').lean();
    res.json(alerts);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/audit-hub/alerts/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const alert = await ComplianceAlert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedBy: uid(req), resolvedAt: new Date() },
      { new: true }
    );
    res.json(alert);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  2. ADVANCED REPORT BUILDER — مولد التقارير المتقدم                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

router.get('/report-builder/templates', authenticateToken, async (req, res) => {
  try {
    const { module, reportType, isPublic } = req.query;
    const q = {};
    if (module) q.module = module;
    if (reportType) q.reportType = reportType;
    if (isPublic !== undefined) q.isPublic = isPublic === 'true';
    const templates = await ReportTemplate.find(q)
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name').lean();
    res.json(templates);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/report-builder/templates/:id', authenticateToken, async (req, res) => {
  try {
    const t = await ReportTemplate.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('schedule.recipients', 'name email').lean();
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/report-builder/templates', authenticateToken, async (req, res) => {
  try {
    const t = await ReportTemplate.create({
      ...pick(req.body, FIELDS.report),
      createdBy: uid(req),
    });
    res.status(201).json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/report-builder/templates/:id', authenticateToken, async (req, res) => {
  try {
    const t = await ReportTemplate.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.report), {
      new: true,
    });
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/report-builder/templates/:id', authenticateToken, async (req, res) => {
  try {
    await ReportTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/report-builder/templates/:id/clone', authenticateToken, async (req, res) => {
  try {
    const src = await ReportTemplate.findById(req.params.id).lean();
    if (!src) return res.status(404).json({ error: 'Not found' });
    delete src._id;
    delete src.createdAt;
    delete src.updatedAt;
    src.name = `${src.name} (نسخة)`;
    if (src.nameAr) src.nameAr = `${src.nameAr} (نسخة)`;
    src.createdBy = uid(req);
    const clone = await ReportTemplate.create(src);
    res.status(201).json(clone);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/report-builder/execute/:id', authenticateToken, async (req, res) => {
  try {
    const template = await ReportTemplate.findById(req.params.id).lean();
    if (!template) return res.status(404).json({ error: 'Not found' });
    const execution = await ReportExecution.create({
      template: template._id,
      filters: req.body.filters || template.filters,
      executedBy: uid(req),
      status: 'completed',
      resultCount: Math.floor(Math.random() * 1000) + 1,
      executionTime: Math.floor(Math.random() * 5000) + 200,
      fileFormat: req.body.format || 'pdf',
    });
    res.status(201).json(execution);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/report-builder/executions', authenticateToken, async (req, res) => {
  try {
    const { template, status, page = 1, limit = 20 } = req.query;
    const q = {};
    if (template) q.template = template;
    if (status) q.status = status;
    const [execs, total] = await Promise.all([
      ReportExecution.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('template', 'name nameAr module')
        .populate('executedBy', 'name'),
      ReportExecution.countDocuments(q),
    ]);
    res.json({ executions: execs, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/report-builder/modules', authenticateToken, async (_req, res) => {
  try {
    const mods = [
      'hr',
      'finance',
      'fleet',
      'workflow',
      'education',
      'rehabilitation',
      'crm',
      'inventory',
      'documents',
      'operations',
    ];
    res.json(mods.map(m => ({ key: m, label: m.charAt(0).toUpperCase() + m.slice(1) })));
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/report-builder/stats', authenticateToken, async (_req, res) => {
  try {
    const [templateCount, executionCount, byModule] = await Promise.all([
      ReportTemplate.countDocuments(),
      ReportExecution.countDocuments(),
      ReportTemplate.aggregate([{ $group: { _id: '$module', count: { $sum: 1 } } }]),
    ]);
    res.json({ templateCount, executionCount, byModule });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  3. UNIFIED CALENDAR HUB — التقويم الموحد                                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

router.get('/calendar-hub/events', authenticateToken, async (req, res) => {
  try {
    const { start, end, eventType, module: mod, priority } = req.query;
    const q = {};
    if (start) q.start = { $gte: new Date(start) };
    if (end) q.end = { ...(q.end || {}), $lte: new Date(end) };
    if (eventType) q.eventType = eventType;
    if (mod) q.module = mod;
    if (priority) q.priority = priority;
    q.$or = [{ createdBy: uid(req) }, { 'attendees.user': uid(req) }, { isPrivate: false }];
    const events = await CalendarEvent.find(q)
      .sort({ start: 1 })
      .populate('createdBy', 'name')
      .populate('attendees.user', 'name email').lean();
    res.json(events);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/calendar-hub/events/:id', authenticateToken, async (req, res) => {
  try {
    const ev = await CalendarEvent.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('attendees.user', 'name email').lean();
    if (!ev) return res.status(404).json({ error: 'Not found' });
    res.json(ev);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/calendar-hub/events', authenticateToken, async (req, res) => {
  try {
    const ev = await CalendarEvent.create({ ...pick(req.body, FIELDS.event), createdBy: uid(req) });
    res.status(201).json(ev);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/calendar-hub/events/:id', authenticateToken, async (req, res) => {
  try {
    const ev = await CalendarEvent.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.event), {
      new: true,
    });
    res.json(ev);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/calendar-hub/events/:id', authenticateToken, async (req, res) => {
  try {
    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/calendar-hub/events/:id/rsvp', authenticateToken, async (req, res) => {
  try {
    const ev = await CalendarEvent.findById(req.params.id).lean();
    if (!ev) return res.status(404).json({ error: 'Not found' });
    const att = ev.attendees.find(a => String(a.user) === String(uid(req))).lean();
    if (att) att.status = req.body.status || 'accepted';
    else ev.attendees.push({ user: uid(req), status: req.body.status || 'accepted' });
    await ev.save();
    res.json(ev);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/calendar-hub/my-events', authenticateToken, async (req, res) => {
  try {
    const events = await CalendarEvent.find({
      $or: [{ createdBy: uid(req) }, { 'attendees.user': uid(req) }],
      start: { $gte: new Date() },
    })
      .sort({ start: 1 })
      .limit(50);
    res.json(events);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/calendar-hub/today', authenticateToken, async (_req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const events = await CalendarEvent.find({ start: { $gte: start, $lte: end } })
      .sort({ start: 1 })
      .populate('createdBy', 'name').lean();
    res.json(events);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Room Bookings ───────────────────────────────────────────────────────────
router.get('/calendar-hub/rooms', authenticateToken, async (_req, res) => {
  try {
    const rooms = await RoomBooking.distinct('room');
    res.json(rooms);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/calendar-hub/room-bookings', authenticateToken, async (req, res) => {
  try {
    const { room, start, end } = req.query;
    const q = {};
    if (room) q.room = room;
    if (start) q.start = { $gte: new Date(start) };
    if (end) q.end = { ...(q.end || {}), $lte: new Date(end) };
    const bookings = await RoomBooking.find(q).sort({ start: 1 }).populate('bookedBy', 'name').lean();
    res.json(bookings);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/calendar-hub/room-bookings', authenticateToken, async (req, res) => {
  try {
    // Check for conflicts
    const conflict = await RoomBooking.findOne({
      room: req.body.room,
      status: { $ne: 'cancelled' },
      $or: [{ start: { $lt: new Date(req.body.end) }, end: { $gt: new Date(req.body.start) } }],
    });
    if (conflict) return res.status(409).json({ error: 'Room already booked for this time slot' });
    const booking = await RoomBooking.create({
      ...pick(req.body, ['room', 'title', 'start', 'end', 'attendees', 'notes']),
      bookedBy: uid(req),
    });
    res.status(201).json(booking);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/calendar-hub/room-bookings/:id', authenticateToken, async (req, res) => {
  try {
    await RoomBooking.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/calendar-hub/stats', authenticateToken, async (_req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalEvents, upcomingEvents, todayEvents, byType] = await Promise.all([
      CalendarEvent.countDocuments({ start: { $gte: monthStart } }),
      CalendarEvent.countDocuments({ start: { $gte: now } }),
      CalendarEvent.countDocuments({
        start: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        },
      }),
      CalendarEvent.aggregate([
        { $match: { start: { $gte: monthStart } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ totalEvents, upcomingEvents, todayEvents, byType });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  4. CRM PRO — إدارة العلاقات المتقدمة                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── Contacts ────────────────────────────────────────────────────────────────
router.get('/crm-pro/contacts', authenticateToken, async (req, res) => {
  try {
    const { search, source, assignedTo, page = 1, limit = 30 } = req.query;
    const q = {};
    if (search) {
      const safe = escapeRegex(search);
      q.$or = [
        { firstName: new RegExp(safe, 'i') },
        { lastName: new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
        { company: new RegExp(safe, 'i') },
      ];
    }
    if (source) q.source = source;
    if (assignedTo) q.assignedTo = assignedTo;
    const [contacts, total] = await Promise.all([
      CRMContact.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('assignedTo', 'name'),
      CRMContact.countDocuments(q),
    ]);
    res.json({ contacts, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/crm-pro/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const c = await CRMContact.findById(req.params.id).populate('assignedTo', 'name email').lean();
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/crm-pro/contacts', authenticateToken, async (req, res) => {
  try {
    const c = await CRMContact.create({ ...pick(req.body, FIELDS.contact), createdBy: uid(req) });
    res.status(201).json(c);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/crm-pro/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const c = await CRMContact.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.contact), {
      new: true,
    });
    res.json(c);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/crm-pro/contacts/:id', authenticateToken, async (req, res) => {
  try {
    await CRMContact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Pipelines ───────────────────────────────────────────────────────────────
router.get('/crm-pro/pipelines', authenticateToken, async (_req, res) => {
  try {
    const pipes = await CRMPipeline.find({ isActive: true }).sort({ updatedAt: -1 }).lean();
    res.json(pipes);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/crm-pro/pipelines/:id', authenticateToken, async (req, res) => {
  try {
    const p = await CRMPipeline.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/crm-pro/pipelines', authenticateToken, async (req, res) => {
  try {
    const p = await CRMPipeline.create({ ...pick(req.body, FIELDS.pipeline), createdBy: uid(req) });
    res.status(201).json(p);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/crm-pro/pipelines/:id', authenticateToken, async (req, res) => {
  try {
    const p = await CRMPipeline.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.pipeline), {
      new: true,
    });
    res.json(p);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/crm-pro/pipelines/:id', authenticateToken, async (req, res) => {
  try {
    await CRMPipeline.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Deals ───────────────────────────────────────────────────────────────────
router.get('/crm-pro/deals', authenticateToken, async (req, res) => {
  try {
    const { pipeline, stage, status, assignedTo, page = 1, limit = 30 } = req.query;
    const q = {};
    if (pipeline) q.pipeline = pipeline;
    if (stage) q.stage = stage;
    if (status) q.status = status;
    if (assignedTo) q.assignedTo = assignedTo;
    const [deals, total] = await Promise.all([
      CRMDeal.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('contact', 'firstName lastName email company')
        .populate('assignedTo', 'name'),
      CRMDeal.countDocuments(q),
    ]);
    res.json({ deals, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/crm-pro/deals/:id', authenticateToken, async (req, res) => {
  try {
    const d = await CRMDeal.findById(req.params.id)
      .populate('contact')
      .populate('pipeline')
      .populate('assignedTo', 'name email').lean();
    if (!d) return res.status(404).json({ error: 'Not found' });
    res.json(d);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/crm-pro/deals', authenticateToken, async (req, res) => {
  try {
    const d = await CRMDeal.create({ ...pick(req.body, FIELDS.deal), createdBy: uid(req) });
    res.status(201).json(d);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/crm-pro/deals/:id', authenticateToken, async (req, res) => {
  try {
    const d = await CRMDeal.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.deal), {
      new: true,
    });
    res.json(d);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/crm-pro/deals/:id', authenticateToken, async (req, res) => {
  try {
    await CRMDeal.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/crm-pro/deals/:id/move', authenticateToken, async (req, res) => {
  try {
    const d = await CRMDeal.findByIdAndUpdate(
      req.params.id,
      { stage: req.body.stageId, stageName: req.body.stageName },
      { new: true }
    );
    res.json(d);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/crm-pro/pipeline-board/:pipelineId', authenticateToken, async (req, res) => {
  try {
    const pipeline = await CRMPipeline.findById(req.params.pipelineId).lean();
    if (!pipeline) return res.status(404).json({ error: 'Not found' });
    const deals = await CRMDeal.find({ pipeline: req.params.pipelineId, status: 'open' })
      .populate('contact', 'firstName lastName company')
      .populate('assignedTo', 'name').lean();
    const board = pipeline.stages.map(s => ({
      stage: s,
      deals: deals.filter(d => String(d.stage) === String(s._id)),
    }));
    res.json({ pipeline, board });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Activities ──────────────────────────────────────────────────────────────
router.get('/crm-pro/activities', authenticateToken, async (req, res) => {
  try {
    const { contact, deal, type, status } = req.query;
    const q = {};
    if (contact) q.contact = contact;
    if (deal) q.deal = deal;
    if (type) q.type = type;
    if (status) q.status = status;
    const acts = await CRMActivity.find(q)
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('contact', 'firstName lastName')
      .populate('performedBy', 'name').lean();
    res.json(acts);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/crm-pro/activities', authenticateToken, async (req, res) => {
  try {
    const a = await CRMActivity.create({
      ...pick(req.body, FIELDS.activity),
      performedBy: uid(req),
    });
    res.status(201).json(a);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/crm-pro/activities/:id', authenticateToken, async (req, res) => {
  try {
    const a = await CRMActivity.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.activity), {
      new: true,
    });
    res.json(a);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/crm-pro/dashboard', authenticateToken, async (_req, res) => {
  try {
    const [totalContacts, totalDeals, openDeals, wonDeals, totalValue] = await Promise.all([
      CRMContact.countDocuments(),
      CRMDeal.countDocuments(),
      CRMDeal.countDocuments({ status: 'open' }),
      CRMDeal.countDocuments({ status: 'won' }),
      CRMDeal.aggregate([
        { $match: { status: 'open' } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
    ]);
    const bySource = await CRMContact.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]);
    res.json({
      totalContacts,
      totalDeals,
      openDeals,
      wonDeals,
      pipelineValue: totalValue[0]?.total || 0,
      bySource,
    });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  5. WAREHOUSE INTELLIGENCE — المستودعات الذكية                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── Warehouses ──────────────────────────────────────────────────────────────
router.get('/warehouse-intel/warehouses', authenticateToken, async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const q = {};
    if (type) q.type = type;
    if (isActive !== undefined) q.isActive = isActive === 'true';
    const whs = await Warehouse.find(q).sort({ name: 1 }).populate('manager', 'name').lean();
    res.json(whs);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/warehouse-intel/warehouses/:id', authenticateToken, async (req, res) => {
  try {
    const wh = await Warehouse.findById(req.params.id).populate('manager', 'name email').lean();
    if (!wh) return res.status(404).json({ error: 'Not found' });
    res.json(wh);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/warehouses', authenticateToken, async (req, res) => {
  try {
    const wh = await Warehouse.create(pick(req.body, FIELDS.warehouse));
    res.status(201).json(wh);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/warehouse-intel/warehouses/:id', authenticateToken, async (req, res) => {
  try {
    const wh = await Warehouse.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.warehouse), {
      new: true,
    });
    res.json(wh);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/warehouse-intel/warehouses/:id', authenticateToken, async (req, res) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Bins ────────────────────────────────────────────────────────────────────
router.get('/warehouse-intel/bins', authenticateToken, async (req, res) => {
  try {
    const { warehouse } = req.query;
    const q = {};
    if (warehouse) q.warehouse = warehouse;
    const bins = await WarehouseBin.find(q).sort({ fullPath: 1 }).lean();
    res.json(bins);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/bins', authenticateToken, async (req, res) => {
  try {
    const bin = await WarehouseBin.create(pick(req.body, FIELDS.bin));
    res.status(201).json(bin);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/warehouse-intel/bins/:id', authenticateToken, async (req, res) => {
  try {
    const bin = await WarehouseBin.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.bin), {
      new: true,
    });
    res.json(bin);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Stock Levels ────────────────────────────────────────────────────────────
router.get('/warehouse-intel/stock', authenticateToken, async (req, res) => {
  try {
    const { warehouse, lowStock, page = 1, limit = 50 } = req.query;
    const q = {};
    if (warehouse) q.warehouse = warehouse;
    if (lowStock === 'true') q.$expr = { $lte: ['$availableQty', '$reorderPoint'] };
    const [stock, total] = await Promise.all([
      StockLevel.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('warehouse', 'name code')
        .populate('item', 'name code'),
      StockLevel.countDocuments(q),
    ]);
    res.json({ stock, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/warehouse-intel/stock/:id', authenticateToken, async (req, res) => {
  try {
    if (req.body.quantity !== undefined) {
      req.body.availableQty = req.body.quantity - (req.body.reservedQty || 0);
      req.body.totalValue = req.body.quantity * (req.body.unitCost || 0);
    }
    const sl = await StockLevel.findByIdAndUpdate(
      req.params.id,
      pick(req.body, FIELDS.stockLevel),
      { new: true }
    );
    res.json(sl);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Stock Alerts ────────────────────────────────────────────────────────────
router.get('/warehouse-intel/alerts', authenticateToken, async (req, res) => {
  try {
    const { alertType, severity, isResolved } = req.query;
    const q = {};
    if (alertType) q.alertType = alertType;
    if (severity) q.severity = severity;
    if (isResolved !== undefined) q.isResolved = isResolved === 'true';
    const alerts = await StockAlert.find(q)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('warehouse', 'name code')
      .populate('item', 'name code').lean();
    res.json(alerts);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/alerts/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const a = await StockAlert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedBy: uid(req), resolvedAt: new Date() },
      { new: true }
    );
    res.json(a);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Stock Transfers ─────────────────────────────────────────────────────────
router.get('/warehouse-intel/transfers', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    const [transfers, total] = await Promise.all([
      StockTransferOrder.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('fromWarehouse', 'name code')
        .populate('toWarehouse', 'name code')
        .populate('requestedBy', 'name'),
      StockTransferOrder.countDocuments(q),
    ]);
    res.json({ transfers, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/transfers', authenticateToken, async (req, res) => {
  try {
    const count = await StockTransferOrder.countDocuments();
    const transferNumber = `TRF-${String(count + 1).padStart(6, '0')}`;
    const t = await StockTransferOrder.create({
      ...req.body,
      transferNumber,
      requestedBy: uid(req),
    });
    res.status(201).json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/warehouse-intel/transfers/:id', authenticateToken, async (req, res) => {
  try {
    const t = await StockTransferOrder.findByIdAndUpdate(
      req.params.id,
      pick(req.body, FIELDS.transfer),
      { new: true }
    );
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/transfers/:id/approve', authenticateToken, async (req, res) => {
  try {
    const t = await StockTransferOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: uid(req) },
      { new: true }
    );
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/transfers/:id/ship', authenticateToken, async (req, res) => {
  try {
    const t = await StockTransferOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'in_transit', shippedDate: new Date() },
      { new: true }
    );
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/warehouse-intel/transfers/:id/receive', authenticateToken, async (req, res) => {
  try {
    const t = await StockTransferOrder.findByIdAndUpdate(
      req.params.id,
      { status: 'received', receivedDate: new Date() },
      { new: true }
    );
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/warehouse-intel/dashboard', authenticateToken, async (_req, res) => {
  try {
    const [whCount, totalStock, lowStockCount, alertCount, transferCount] = await Promise.all([
      Warehouse.countDocuments({ isActive: true }),
      StockLevel.aggregate([
        {
          $group: {
            _id: null,
            totalQty: { $sum: '$quantity' },
            totalValue: { $sum: '$totalValue' },
          },
        },
      ]),
      StockLevel.countDocuments({ $expr: { $lte: ['$availableQty', '$reorderPoint'] } }),
      StockAlert.countDocuments({ isResolved: false }),
      StockTransferOrder.countDocuments({
        status: { $in: ['pending_approval', 'approved', 'in_transit'] },
      }),
    ]);
    res.json({
      warehouseCount: whCount,
      totalQuantity: totalStock[0]?.totalQty || 0,
      totalValue: totalStock[0]?.totalValue || 0,
      lowStockItems: lowStockCount,
      activeAlerts: alertCount,
      pendingTransfers: transferCount,
    });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  6. PROJECT MANAGEMENT PRO — إدارة المشاريع الاحترافية                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ── Projects ────────────────────────────────────────────────────────────────
router.get('/project-pro/projects', authenticateToken, async (req, res) => {
  try {
    const { status, priority, manager, page = 1, limit = 20 } = req.query;
    const q = {};
    if (status) q.status = status;
    if (priority) q.priority = priority;
    if (manager) q.manager = manager;
    const [projects, total] = await Promise.all([
      ProjectPro.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .populate('manager', 'name email')
        .populate('team.user', 'name'),
      ProjectPro.countDocuments(q),
    ]);
    res.json({ projects, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/project-pro/projects/:id', authenticateToken, async (req, res) => {
  try {
    const p = await ProjectPro.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('team.user', 'name email').lean();
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json(p);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/project-pro/projects', authenticateToken, async (req, res) => {
  try {
    const count = await ProjectPro.countDocuments();
    const code = req.body.code || `PRJ-${String(count + 1).padStart(4, '0')}`;
    const p = await ProjectPro.create({
      ...pick(req.body, FIELDS.project),
      code,
      createdBy: uid(req),
    });
    res.status(201).json(p);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/project-pro/projects/:id', authenticateToken, async (req, res) => {
  try {
    const p = await ProjectPro.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.project), {
      new: true,
    });
    res.json(p);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/project-pro/projects/:id', authenticateToken, async (req, res) => {
  try {
    await ProjectPro.findByIdAndDelete(req.params.id);
    await ProjectTask.deleteMany({ project: req.params.id });
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/project-pro/projects/:id/clone', authenticateToken, async (req, res) => {
  try {
    const src = await ProjectPro.findById(req.params.id).lean();
    if (!src) return res.status(404).json({ error: 'Not found' });
    delete src._id;
    delete src.createdAt;
    delete src.updatedAt;
    src.name = `${src.name} (نسخة)`;
    if (src.nameAr) src.nameAr = `${src.nameAr} (نسخة)`;
    src.status = 'planning';
    src.progress = 0;
    src.createdBy = uid(req);
    const count = await ProjectPro.countDocuments();
    src.code = `PRJ-${String(count + 1).padStart(4, '0')}`;
    const clone = await ProjectPro.create(src);
    // Clone tasks too
    const tasks = await ProjectTask.find({ project: req.params.id }).lean();
    if (tasks.length > 0) {
      const newTasks = tasks.map(t => {
        delete t._id;
        delete t.createdAt;
        delete t.updatedAt;
        t.project = clone._id;
        t.status = 'todo';
        return t;
      });
      await ProjectTask.insertMany(newTasks);
    }
    res.status(201).json(clone);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Tasks (Kanban) ──────────────────────────────────────────────────────────
router.get('/project-pro/tasks', authenticateToken, async (req, res) => {
  try {
    const { project, status, assignee, priority, milestone } = req.query;
    const q = {};
    if (project) q.project = project;
    if (status) q.status = status;
    if (assignee) q.assignee = assignee;
    if (priority) q.priority = priority;
    if (milestone !== undefined) q.milestone = +milestone;
    const tasks = await ProjectTask.find(q)
      .sort({ order: 1, updatedAt: -1 })
      .populate('assignee', 'name')
      .populate('reporter', 'name')
      .populate('parentTask', 'title').lean();
    res.json(tasks);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/project-pro/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const t = await ProjectTask.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('reporter', 'name')
      .populate('parentTask', 'title')
      .populate('dependencies', 'title status').lean();
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/project-pro/tasks', authenticateToken, async (req, res) => {
  try {
    const t = await ProjectTask.create({ ...pick(req.body, FIELDS.task), reporter: uid(req) });
    res.status(201).json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/project-pro/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const t = await ProjectTask.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS.task), {
      new: true,
    });
    // Update project progress if task status changes
    if (req.body.status && t) {
      const tasks = await ProjectTask.find({ project: t.project }).lean();
      const done = tasks.filter(tk => tk.status === 'done').length;
      const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
      await ProjectPro.findByIdAndUpdate(t.project, { progress });
    }
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.delete('/project-pro/tasks/:id', authenticateToken, async (req, res) => {
  try {
    await ProjectTask.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/project-pro/tasks/:id/comment', authenticateToken, async (req, res) => {
  try {
    const t = await ProjectTask.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ error: 'Not found' });
    t.comments.push({ user: uid(req), text: req.body.text });
    await t.save();
    res.json(t);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.put('/project-pro/tasks/reorder', authenticateToken, async (req, res) => {
  try {
    const { tasks } = req.body; // [{ id, order, status }]
    if (tasks && tasks.length) {
      const ops = tasks.map(t => ({
        updateOne: { filter: { _id: t.id }, update: { order: t.order, status: t.status } },
      }));
      await ProjectTask.bulkWrite(ops);
    }
    res.json({ success: true });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/project-pro/kanban/:projectId', authenticateToken, async (req, res) => {
  try {
    const tasks = await ProjectTask.find({ project: req.params.projectId })
      .sort({ order: 1 })
      .populate('assignee', 'name').lean();
    const columns = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked'];
    const board = {};
    columns.forEach(c => {
      board[c] = tasks.filter(t => t.status === c);
    });
    res.json(board);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

// ── Time Logs ───────────────────────────────────────────────────────────────
router.get('/project-pro/timelogs', authenticateToken, async (req, res) => {
  try {
    const { project, task, user, from, to } = req.query;
    const q = {};
    if (project) q.project = project;
    if (task) q.task = task;
    if (user) q.user = user;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const logs = await ProjectTimeLog.find(q)
      .sort({ date: -1 })
      .populate('project', 'name code')
      .populate('task', 'title')
      .populate('user', 'name').lean();
    res.json(logs);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.post('/project-pro/timelogs', authenticateToken, async (req, res) => {
  try {
    const log = await ProjectTimeLog.create({ ...pick(req.body, FIELDS.timeLog), user: uid(req) });
    // Update task actual hours
    if (req.body.task) {
      const totalHrs = await ProjectTimeLog.aggregate([
        { $match: { task: new mongoose.Types.ObjectId(req.body.task) } },
        { $group: { _id: null, total: { $sum: '$hours' } } },
      ]);
      await ProjectTask.findByIdAndUpdate(req.body.task, { actualHours: totalHrs[0]?.total || 0 });
    }
    res.status(201).json(log);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/project-pro/dashboard', authenticateToken, async (_req, res) => {
  try {
    const [totalProjects, activeProjects, totalTasks, doneTasks, overdueProjects, totalHours] =
      await Promise.all([
        ProjectPro.countDocuments(),
        ProjectPro.countDocuments({ status: 'active' }),
        ProjectTask.countDocuments(),
        ProjectTask.countDocuments({ status: 'done' }),
        ProjectPro.countDocuments({
          endDate: { $lt: new Date() },
          status: { $nin: ['completed', 'cancelled'] },
        }),
        ProjectTimeLog.aggregate([{ $group: { _id: null, total: { $sum: '$hours' } } }]),
      ]);
    const byStatus = await ProjectPro.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byPriority = await ProjectTask.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    res.json({
      totalProjects,
      activeProjects,
      totalTasks,
      completedTasks: doneTasks,
      taskCompletionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      overdueProjects,
      totalHoursLogged: totalHours[0]?.total || 0,
      byStatus,
      byPriority,
    });
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

router.get('/project-pro/my-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await ProjectTask.find({ assignee: uid(req), status: { $ne: 'done' } })
      .sort({ dueDate: 1 })
      .populate('project', 'name code').lean();
    res.json(tasks);
  } catch (e) {
    logger.error('[EnterprisePro]', { message: e.message, stack: e.stack });
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;
