/**
 * Workflow Pro Routes — مسارات سير العمل الاحترافية
 *
 * 6 feature modules with ~70 endpoints:
 * 1. Custom Forms      (9 endpoints)
 * 2. Escalation Mgmt   (12 endpoints)
 * 3. SLA Policies      (11 endpoints)
 * 4. KPI Dashboard      (8 endpoints)
 * 5. Approval Chains   (14 endpoints)
 * 6. Automation Rules  (12 endpoints)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');

const {
  WorkflowFormTemplate,
  WorkflowEscalationRule,
  WorkflowEscalationLog,
  WorkflowSLAPolicy,
  WorkflowApprovalChain,
  WorkflowApprovalInstance,
  WorkflowAutomationRule,
  WorkflowAutomationLog,
  WorkflowKPISnapshot,
} = require('../models/WorkflowPro');

const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');

router.use(authenticateToken);

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ═══════════════════════════════════════════════════════════════════════════════
// 1) CUSTOM FORMS — نماذج مخصصة
// ═══════════════════════════════════════════════════════════════════════════════

// GET /forms — List form templates
router.get('/forms', async (req, res) => {
  try {
    const { workflowDefinition, stepId, isActive, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (workflowDefinition) filter.workflowDefinition = workflowDefinition;
    if (stepId) filter.stepId = stepId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [forms, total] = await Promise.all([
      WorkflowFormTemplate.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name nameAr email')
        .lean(),
      WorkflowFormTemplate.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: forms,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('GET /forms error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في جلب النماذج', error: safeError(err) });
  }
});

// GET /forms/:id — Get form detail
router.get('/forms/:id', async (req, res) => {
  try {
    const form = await WorkflowFormTemplate.findById(req.params.id)
      .populate('createdBy', 'name nameAr email')
      .lean();
    if (!form) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
    res.json({ success: true, data: form });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب النموذج', error: safeError(err) });
  }
});

// POST /forms — Create form template
router.post('/forms', async (req, res) => {
  try {
    const form = await WorkflowFormTemplate.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: form, message: 'تم إنشاء النموذج بنجاح' });
  } catch (err) {
    logger.error('POST /forms error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء النموذج', error: safeError(err) });
  }
});

// PUT /forms/:id — Update form template
router.put('/forms/:id', async (req, res) => {
  try {
    const form = await WorkflowFormTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!form) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
    res.json({ success: true, data: form, message: 'تم تحديث النموذج بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث النموذج', error: safeError(err) });
  }
});

// DELETE /forms/:id — Delete form template
router.delete('/forms/:id', async (req, res) => {
  try {
    const form = await WorkflowFormTemplate.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });
    res.json({ success: true, message: 'تم حذف النموذج بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف النموذج', error: safeError(err) });
  }
});

// POST /forms/:id/clone — Clone form template
router.post('/forms/:id/clone', async (req, res) => {
  try {
    const original = await WorkflowFormTemplate.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;
    original.name = `${original.name} (نسخة)`;
    original.nameAr = `${original.nameAr} (نسخة)`;
    original.usageCount = 0;
    original.createdBy = uid(req);

    const clone = await WorkflowFormTemplate.create(original);
    res.status(201).json({ success: true, data: clone, message: 'تم نسخ النموذج بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في نسخ النموذج', error: safeError(err) });
  }
});

// POST /forms/:id/validate — Validate form data against template
router.post('/forms/:id/validate', async (req, res) => {
  try {
    const form = await WorkflowFormTemplate.findById(req.params.id).lean();
    if (!form) return res.status(404).json({ success: false, message: 'النموذج غير موجود' });

    const { data } = req.body;
    const errors = [];

    for (const field of form.fields) {
      const value = data?.[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: field.name, message: `الحقل "${field.nameAr}" مطلوب` });
      }
      if (value && field.validation) {
        const v = field.validation;
        if (v.minLength && String(value).length < v.minLength) {
          errors.push({
            field: field.name,
            message: `الحقل "${field.nameAr}" يجب أن يكون ${v.minLength} أحرف على الأقل`,
          });
        }
        if (v.maxLength && String(value).length > v.maxLength) {
          errors.push({
            field: field.name,
            message: `الحقل "${field.nameAr}" يجب أن لا يتجاوز ${v.maxLength} حرف`,
          });
        }
        if (v.min !== undefined && Number(value) < v.min) {
          errors.push({
            field: field.name,
            message: `الحقل "${field.nameAr}" يجب أن يكون ${v.min} على الأقل`,
          });
        }
        if (v.max !== undefined && Number(value) > v.max) {
          errors.push({
            field: field.name,
            message: `الحقل "${field.nameAr}" يجب أن لا يتجاوز ${v.max}`,
          });
        }
        if (v.pattern) {
          // Guard against ReDoS: reject patterns that nest quantifiers
          const DANGEROUS_RE = /(\+|\*|\{)\s*(\+|\*|\{)/;
          let patternSafe = true;
          try {
            if (DANGEROUS_RE.test(v.pattern) || v.pattern.length > 256) {
              patternSafe = false;
            } else {
              new RegExp(v.pattern); // syntax check
            }
          } catch {
            patternSafe = false;
          }
          if (!patternSafe) {
            errors.push({
              field: field.name,
              message: `نمط التحقق للحقل "${field.nameAr}" غير آمن أو غير صالح`,
            });
          } else if (!new RegExp(v.pattern).test(String(value))) {
            errors.push({
              field: field.name,
              message: v.patternMessage || `الحقل "${field.nameAr}" غير صالح`,
            });
          }
        }
      }
    }

    res.json({ success: true, valid: errors.length === 0, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في التحقق', error: safeError(err) });
  }
});

// GET /forms/field-types — List available field types
router.get('/forms/field-types', async (_req, res) => {
  const fieldTypes = [
    { value: 'text', label: 'نص', icon: 'TextFields' },
    { value: 'textarea', label: 'نص طويل', icon: 'Notes' },
    { value: 'number', label: 'رقم', icon: 'Pin' },
    { value: 'email', label: 'بريد إلكتروني', icon: 'Email' },
    { value: 'phone', label: 'هاتف', icon: 'Phone' },
    { value: 'date', label: 'تاريخ', icon: 'CalendarToday' },
    { value: 'datetime', label: 'تاريخ ووقت', icon: 'Schedule' },
    { value: 'time', label: 'وقت', icon: 'AccessTime' },
    { value: 'select', label: 'قائمة اختيار', icon: 'ArrowDropDown' },
    { value: 'multi_select', label: 'اختيار متعدد', icon: 'CheckBox' },
    { value: 'radio', label: 'اختيار واحد', icon: 'RadioButtonChecked' },
    { value: 'checkbox', label: 'مربع اختيار', icon: 'CheckBoxOutlineBlank' },
    { value: 'file', label: 'ملف', icon: 'AttachFile' },
    { value: 'image', label: 'صورة', icon: 'Image' },
    { value: 'signature', label: 'توقيع', icon: 'Draw' },
    { value: 'currency', label: 'مبلغ مالي', icon: 'AttachMoney' },
    { value: 'percentage', label: 'نسبة مئوية', icon: 'Percent' },
    { value: 'user_lookup', label: 'بحث مستخدم', icon: 'PersonSearch' },
    { value: 'department_lookup', label: 'بحث قسم', icon: 'Business' },
    { value: 'table', label: 'جدول', icon: 'TableChart' },
    { value: 'rich_text', label: 'نص منسق', icon: 'FormatBold' },
    { value: 'rating', label: 'تقييم', icon: 'Star' },
  ];
  res.json({ success: true, data: fieldTypes });
});

// GET /forms/stats — Form usage statistics
router.get('/forms/stats', async (_req, res) => {
  try {
    const [total, active, byType] = await Promise.all([
      WorkflowFormTemplate.countDocuments(),
      WorkflowFormTemplate.countDocuments({ isActive: true }),
      WorkflowFormTemplate.aggregate([
        { $unwind: '$fields' },
        { $group: { _id: '$fields.fieldType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    res.json({
      success: true,
      data: { total, active, inactive: total - active, fieldUsage: byType },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إحصائيات النماذج', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2) ESCALATION MANAGEMENT — إدارة التصعيد
// ═══════════════════════════════════════════════════════════════════════════════

// GET /escalations/rules — List escalation rules
router.get('/escalations/rules', async (req, res) => {
  try {
    const { isActive, scope, triggerOn, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (scope) filter['scope.type'] = scope;
    if (triggerOn) filter.triggerOn = triggerOn;

    const skip = (Number(page) - 1) * Number(limit);
    const [rules, total] = await Promise.all([
      WorkflowEscalationRule.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name nameAr email')
        .lean(),
      WorkflowEscalationRule.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: rules,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('GET /escalations/rules error: %s', err.message);
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب قواعد التصعيد', error: err.message });
  }
});

// GET /escalations/rules/:id — Get rule detail
router.get('/escalations/rules/:id', async (req, res) => {
  try {
    const rule = await WorkflowEscalationRule.findById(req.params.id)
      .populate('createdBy', 'name nameAr email')
      .populate('levels.escalateTo.userId', 'name nameAr email')
      .lean();
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب القاعدة', error: safeError(err) });
  }
});

// POST /escalations/rules — Create escalation rule
router.post('/escalations/rules', async (req, res) => {
  try {
    const rule = await WorkflowEscalationRule.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: rule, message: 'تم إنشاء قاعدة التصعيد بنجاح' });
  } catch (err) {
    logger.error('POST /escalations/rules error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء القاعدة', error: safeError(err) });
  }
});

// PUT /escalations/rules/:id — Update escalation rule
router.put('/escalations/rules/:id', async (req, res) => {
  try {
    const rule = await WorkflowEscalationRule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule, message: 'تم تحديث القاعدة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث القاعدة', error: safeError(err) });
  }
});

// DELETE /escalations/rules/:id — Delete escalation rule
router.delete('/escalations/rules/:id', async (req, res) => {
  try {
    const rule = await WorkflowEscalationRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    res.json({ success: true, message: 'تم حذف القاعدة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف القاعدة', error: safeError(err) });
  }
});

// POST /escalations/rules/:id/toggle — Toggle active status
router.post('/escalations/rules/:id/toggle', async (req, res) => {
  try {
    const rule = await WorkflowEscalationRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    rule.isActive = !rule.isActive;
    await rule.save();
    res.json({
      success: true,
      data: rule,
      message: rule.isActive ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة',
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تبديل حالة القاعدة', error: err.message });
  }
});

// GET /escalations/logs — List escalation logs
router.get('/escalations/logs', async (req, res) => {
  try {
    const { status, escalationRule, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (escalationRule) filter.escalationRule = escalationRule;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      WorkflowEscalationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('escalationRule', 'name nameAr')
        .populate('escalatedTo', 'name nameAr email')
        .populate('escalatedFrom', 'name nameAr email')
        .lean(),
      WorkflowEscalationLog.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب سجل التصعيد', error: safeError(err) });
  }
});

// POST /escalations/logs/:id/resolve — Resolve an escalation
router.post('/escalations/logs/:id/resolve', async (req, res) => {
  try {
    const log = await WorkflowEscalationLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    if (log.status === 'resolved')
      return res.status(400).json({ success: false, message: 'تم حل التصعيد مسبقاً' });

    log.status = 'resolved';
    log.resolvedAt = new Date();
    log.resolvedBy = uid(req);
    log.resolution = req.body.resolution || '';
    await log.save();

    // Increment resolved counter on rule
    await WorkflowEscalationRule.findByIdAndUpdate(log.escalationRule, {
      $inc: { 'stats.resolvedBeforeEscalation': 1 },
    });

    res.json({ success: true, data: log, message: 'تم حل التصعيد بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حل التصعيد', error: safeError(err) });
  }
});

// POST /escalations/process — Process pending escalations (cron)
router.post('/escalations/process', async (req, res) => {
  try {
    const activeRules = await WorkflowEscalationRule.find({ isActive: true }).lean();
    let processed = 0;
    let escalated = 0;

    for (const rule of activeRules) {
      const TaskInstance = mongoose.models.TaskInstance;
      if (!TaskInstance) continue;

      const overdueTasks = await TaskInstance.find({
        status: { $in: ['assigned', 'in_progress'] },
        'sla.deadline': { $lt: new Date() },
      }).lean();

      for (const task of overdueTasks) {
        processed++;
        const existingLog = await WorkflowEscalationLog.findOne({
          escalationRule: rule._id,
          taskInstance: task._id,
          status: 'active',
        });

        if (!existingLog) {
          const firstLevel = rule.levels?.[0];
          if (firstLevel) {
            await WorkflowEscalationLog.create({
              escalationRule: rule._id,
              taskInstance: task._id,
              workflowInstance: task.workflowInstance,
              currentLevel: 1,
              escalatedTo: firstLevel.escalateTo?.userId,
              reason: `مهمة متأخرة: ${task.nameAr || task.name}`,
              status: 'active',
            });
            escalated++;
          }
        }
      }

      await WorkflowEscalationRule.findByIdAndUpdate(rule._id, {
        $inc: { 'stats.totalTriggered': escalated },
        'stats.lastTriggered': new Date(),
      });
    }

    res.json({
      success: true,
      message: `تمت المعالجة: ${processed} مهمة، ${escalated} تصعيد جديد`,
    });
  } catch (err) {
    logger.error('POST /escalations/process error: %s', err.message);
    res
      .status(500)
      .json({ success: false, message: 'خطأ في معالجة التصعيدات', error: err.message });
  }
});

// GET /escalations/stats — Escalation statistics
router.get('/escalations/stats', async (_req, res) => {
  try {
    const [totalRules, activeRules, statusCounts, recentLogs] = await Promise.all([
      WorkflowEscalationRule.countDocuments(),
      WorkflowEscalationRule.countDocuments({ isActive: true }),
      WorkflowEscalationLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      WorkflowEscalationLog.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('escalationRule', 'nameAr')
        .lean(),
    ]);

    const statusMap = {};
    statusCounts.forEach(s => {
      statusMap[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        totalRules,
        activeRules,
        totalEscalations:
          (statusMap.active || 0) + (statusMap.resolved || 0) + (statusMap.expired || 0),
        activeEscalations: statusMap.active || 0,
        resolvedEscalations: statusMap.resolved || 0,
        recentLogs,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إحصائيات التصعيد', error: err.message });
  }
});

// POST /escalations/simulate — Simulate escalation for a rule
router.post('/escalations/simulate', async (req, res) => {
  try {
    const { ruleId, delayMinutes = 60 } = req.body;
    const rule = await WorkflowEscalationRule.findById(ruleId).lean();
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });

    const simulation = [];
    let elapsed = 0;
    for (const level of rule.levels) {
      elapsed += level.triggerAfterMinutes;
      simulation.push({
        level: level.level,
        nameAr: level.nameAr || `المستوى ${level.level}`,
        triggersAfterMinutes: elapsed,
        triggersAfterFormatted: `${Math.floor(elapsed / 60)} ساعة و ${elapsed % 60} دقيقة`,
        escalateTo: level.escalateTo,
        actions: level.actions?.map(a => a.type) || [],
        wouldTrigger: delayMinutes >= elapsed,
      });
    }

    res.json({
      success: true,
      data: {
        rule: { name: rule.nameAr, triggerOn: rule.triggerOn },
        simulation,
        inputDelay: delayMinutes,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في المحاكاة', error: safeError(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3) SLA POLICIES — سياسات مستوى الخدمة
// ═══════════════════════════════════════════════════════════════════════════════

// GET /sla-policies — List SLA policies
router.get('/sla-policies', async (req, res) => {
  try {
    const { isActive, scope, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (scope) filter['scope.type'] = scope;

    const skip = (Number(page) - 1) * Number(limit);
    const [policies, total] = await Promise.all([
      WorkflowSLAPolicy.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name nameAr email')
        .lean(),
      WorkflowSLAPolicy.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: policies,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('GET /sla-policies error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في جلب السياسات', error: safeError(err) });
  }
});

// GET /sla-policies/:id — Get policy detail
router.get('/sla-policies/:id', async (req, res) => {
  try {
    const policy = await WorkflowSLAPolicy.findById(req.params.id)
      .populate('createdBy', 'name nameAr email')
      .lean();
    if (!policy) return res.status(404).json({ success: false, message: 'السياسة غير موجودة' });
    res.json({ success: true, data: policy });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب السياسة', error: safeError(err) });
  }
});

// POST /sla-policies — Create SLA policy
router.post('/sla-policies', async (req, res) => {
  try {
    const policy = await WorkflowSLAPolicy.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: policy, message: 'تم إنشاء سياسة SLA بنجاح' });
  } catch (err) {
    logger.error('POST /sla-policies error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء السياسة', error: safeError(err) });
  }
});

// PUT /sla-policies/:id — Update policy
router.put('/sla-policies/:id', async (req, res) => {
  try {
    const policy = await WorkflowSLAPolicy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!policy) return res.status(404).json({ success: false, message: 'السياسة غير موجودة' });
    res.json({ success: true, data: policy, message: 'تم تحديث السياسة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث السياسة', error: safeError(err) });
  }
});

// DELETE /sla-policies/:id — Delete policy
router.delete('/sla-policies/:id', async (req, res) => {
  try {
    const policy = await WorkflowSLAPolicy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ success: false, message: 'السياسة غير موجودة' });
    res.json({ success: true, message: 'تم حذف السياسة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف السياسة', error: safeError(err) });
  }
});

// POST /sla-policies/:id/toggle — Toggle policy active status
router.post('/sla-policies/:id/toggle', async (req, res) => {
  try {
    const policy = await WorkflowSLAPolicy.findById(req.params.id);
    if (!policy) return res.status(404).json({ success: false, message: 'السياسة غير موجودة' });
    policy.isActive = !policy.isActive;
    await policy.save();
    res.json({
      success: true,
      data: policy,
      message: policy.isActive ? 'تم تفعيل السياسة' : 'تم تعطيل السياسة',
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تبديل حالة السياسة', error: err.message });
  }
});

// POST /sla-policies/check-compliance — Run compliance check
router.post('/sla-policies/check-compliance', async (req, res) => {
  try {
    const activePolicies = await WorkflowSLAPolicy.find({ isActive: true }).lean();
    const results = [];

    for (const policy of activePolicies) {
      const TaskInstance = mongoose.models.TaskInstance;
      const _WorkflowInstance = mongoose.models.WorkflowInstance;

      let totalChecked = 0;
      let totalMet = 0;
      let totalBreached = 0;

      if (TaskInstance && policy.targets.resolutionTimeMinutes) {
        const tasks = await TaskInstance.find({
          status: 'completed',
          completedAt: { $exists: true },
        })
          .sort({ completedAt: -1 })
          .limit(100)
          .lean();

        for (const task of tasks) {
          totalChecked++;
          if (task.startedAt && task.completedAt) {
            const elapsed = (new Date(task.completedAt) - new Date(task.startedAt)) / 60000;
            if (elapsed <= policy.targets.resolutionTimeMinutes) {
              totalMet++;
            } else {
              totalBreached++;
            }
          }
        }
      }

      const complianceRate = totalChecked > 0 ? Math.round((totalMet / totalChecked) * 100) : 100;

      await WorkflowSLAPolicy.findByIdAndUpdate(policy._id, {
        'compliance.totalChecked': totalChecked,
        'compliance.totalMet': totalMet,
        'compliance.totalBreached': totalBreached,
        'compliance.complianceRate': complianceRate,
        'compliance.lastCheckedAt': new Date(),
      });

      results.push({
        policyId: policy._id,
        nameAr: policy.nameAr,
        totalChecked,
        totalMet,
        totalBreached,
        complianceRate,
      });
    }

    res.json({ success: true, data: results, message: `تم فحص ${results.length} سياسة SLA` });
  } catch (err) {
    logger.error('POST /sla-policies/check-compliance error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في فحص الامتثال', error: safeError(err) });
  }
});

// GET /sla-policies/dashboard — SLA compliance dashboard
router.get('/sla-policies/dashboard', async (_req, res) => {
  try {
    const [policies, totalActive, overallStats] = await Promise.all([
      WorkflowSLAPolicy.find({ isActive: true })
        .select('nameAr compliance thresholds targets scope')
        .lean(),
      WorkflowSLAPolicy.countDocuments({ isActive: true }),
      WorkflowSLAPolicy.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            avgCompliance: { $avg: '$compliance.complianceRate' },
            totalChecked: { $sum: '$compliance.totalChecked' },
            totalBreached: { $sum: '$compliance.totalBreached' },
          },
        },
      ]),
    ]);

    const stats = overallStats[0] || { avgCompliance: 100, totalChecked: 0, totalBreached: 0 };

    res.json({
      success: true,
      data: {
        totalPolicies: totalActive,
        avgComplianceRate: Math.round(stats.avgCompliance || 100),
        totalChecked: stats.totalChecked,
        totalBreached: stats.totalBreached,
        policies: policies.map(p => ({
          id: p._id,
          nameAr: p.nameAr,
          complianceRate: p.compliance?.complianceRate ?? 100,
          totalChecked: p.compliance?.totalChecked ?? 0,
          totalBreached: p.compliance?.totalBreached ?? 0,
          status:
            (p.compliance?.complianceRate ?? 100) >= (p.thresholds?.breach ?? 100)
              ? 'healthy'
              : (p.compliance?.complianceRate ?? 100) >= (p.thresholds?.critical ?? 90)
                ? 'warning'
                : 'critical',
          lastChecked: p.compliance?.lastCheckedAt,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في لوحة SLA', error: safeError(err) });
  }
});

// GET /sla-policies/stats — Overall SLA statistics
router.get('/sla-policies/stats', async (_req, res) => {
  try {
    const [total, active, byScopeType] = await Promise.all([
      WorkflowSLAPolicy.countDocuments(),
      WorkflowSLAPolicy.countDocuments({ isActive: true }),
      WorkflowSLAPolicy.aggregate([
        {
          $group: {
            _id: '$scope.type',
            count: { $sum: 1 },
            avgCompliance: { $avg: '$compliance.complianceRate' },
          },
        },
      ]),
    ]);
    res.json({ success: true, data: { total, active, inactive: total - active, byScopeType } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إحصائيات SLA', error: safeError(err) });
  }
});

// POST /sla-policies/:id/clone — Clone SLA policy
router.post('/sla-policies/:id/clone', async (req, res) => {
  try {
    const original = await WorkflowSLAPolicy.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ success: false, message: 'السياسة غير موجودة' });

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;
    original.name = `${original.name} (نسخة)`;
    original.nameAr = `${original.nameAr} (نسخة)`;
    original.compliance = { totalChecked: 0, totalMet: 0, totalBreached: 0, complianceRate: 100 };
    original.createdBy = uid(req);

    const clone = await WorkflowSLAPolicy.create(original);
    res.status(201).json({ success: true, data: clone, message: 'تم نسخ السياسة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في نسخ السياسة', error: safeError(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4) KPI DASHBOARD — مؤشرات الأداء
// ═══════════════════════════════════════════════════════════════════════════════

// GET /kpi/realtime — Real-time KPIs
router.get('/kpi/realtime', async (_req, res) => {
  try {
    const WorkflowInstance = mongoose.models.WorkflowInstance;
    const TaskInstance = mongoose.models.TaskInstance;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 86400000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const safeCount = async (Model, filter) => {
      if (!Model) return 0;
      try {
        return await Model.countDocuments(filter);
      } catch {
        return 0;
      }
    };

    const [
      activeInstances,
      completedToday,
      completedWeek,
      completedMonth,
      pendingTasks,
      overdueTasks,
      totalTasks,
      avgCycleTime,
    ] = await Promise.all([
      safeCount(WorkflowInstance, { status: 'running' }),
      safeCount(WorkflowInstance, { status: 'completed', updatedAt: { $gte: today } }),
      safeCount(WorkflowInstance, { status: 'completed', updatedAt: { $gte: thisWeek } }),
      safeCount(WorkflowInstance, { status: 'completed', updatedAt: { $gte: thisMonth } }),
      safeCount(TaskInstance, { status: { $in: ['assigned', 'pending'] } }),
      safeCount(TaskInstance, {
        status: { $in: ['assigned', 'in_progress'] },
        'sla.deadline': { $lt: now },
      }),
      safeCount(TaskInstance, {}),
      (async () => {
        if (!WorkflowInstance) return 0;
        try {
          const result = await WorkflowInstance.aggregate([
            {
              $match: {
                status: 'completed',
                completedAt: { $exists: true },
                startedAt: { $exists: true },
              },
            },
            { $project: { duration: { $subtract: ['$completedAt', '$startedAt'] } } },
            { $group: { _id: null, avg: { $avg: '$duration' } } },
          ]);
          return result[0] ? Math.round(result[0].avg / 60000) : 0;
        } catch {
          return 0;
        }
      })(),
    ]);

    const throughputRate = completedWeek > 0 ? Math.round(completedWeek / 7) : 0;
    const onTimeRate =
      totalTasks > 0 ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 100;

    res.json({
      success: true,
      data: {
        activeInstances,
        completedToday,
        completedThisWeek: completedWeek,
        completedThisMonth: completedMonth,
        pendingTasks,
        overdueTasks,
        avgCycleTimeMinutes: avgCycleTime,
        dailyThroughput: throughputRate,
        onTimeCompletionRate: onTimeRate,
        timestamp: now,
      },
    });
  } catch (err) {
    logger.error('GET /kpi/realtime error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في مؤشرات الأداء', error: safeError(err) });
  }
});

// GET /kpi/trends — KPI trends over time
router.get('/kpi/trends', async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const startDate = new Date(Date.now() - Number(days) * 86400000);

    const snapshots = await WorkflowKPISnapshot.find({
      period,
      date: { $gte: startDate },
    })
      .sort({ date: 1 })
      .lean();

    res.json({ success: true, data: snapshots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في اتجاهات الأداء', error: safeError(err) });
  }
});

// POST /kpi/snapshot — Generate KPI snapshot (manual or cron)
router.post('/kpi/snapshot', async (req, res) => {
  try {
    const { period = 'daily' } = req.body;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const WorkflowInstance = mongoose.models.WorkflowInstance;
    const TaskInstance = mongoose.models.TaskInstance;

    const safeCount = async (Model, filter) => {
      if (!Model) return 0;
      try {
        return await Model.countDocuments(filter);
      } catch {
        return 0;
      }
    };

    const yesterday = new Date(today.getTime() - 86400000);

    const snapshot = await WorkflowKPISnapshot.findOneAndUpdate(
      { period, date: today },
      {
        period,
        date: today,
        throughput: {
          instancesStarted: await safeCount(WorkflowInstance, {
            createdAt: { $gte: yesterday, $lt: today },
          }),
          instancesCompleted: await safeCount(WorkflowInstance, {
            status: 'completed',
            updatedAt: { $gte: yesterday, $lt: today },
          }),
          instancesCancelled: await safeCount(WorkflowInstance, {
            status: 'cancelled',
            updatedAt: { $gte: yesterday, $lt: today },
          }),
          tasksCreated: await safeCount(TaskInstance, {
            createdAt: { $gte: yesterday, $lt: today },
          }),
          tasksCompleted: await safeCount(TaskInstance, {
            status: 'completed',
            updatedAt: { $gte: yesterday, $lt: today },
          }),
        },
        workload: {
          activeInstances: await safeCount(WorkflowInstance, { status: 'running' }),
          pendingTasks: await safeCount(TaskInstance, { status: { $in: ['assigned', 'pending'] } }),
          overdueItems: await safeCount(TaskInstance, {
            status: { $in: ['assigned', 'in_progress'] },
            'sla.deadline': { $lt: now },
          }),
        },
        generatedBy: 'manual',
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: snapshot, message: 'تم توليد لقطة مؤشرات الأداء' });
  } catch (err) {
    logger.error('POST /kpi/snapshot error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في توليد اللقطة', error: safeError(err) });
  }
});

// GET /kpi/bottlenecks — Identify workflow bottlenecks
router.get('/kpi/bottlenecks', async (_req, res) => {
  try {
    const TaskInstance = mongoose.models.TaskInstance;
    if (!TaskInstance) return res.json({ success: true, data: [] });

    const bottlenecks = await TaskInstance.aggregate([
      { $match: { status: { $in: ['assigned', 'in_progress'] } } },
      {
        $group: {
          _id: { stepName: '$nameAr', stepId: '$stepId' },
          count: { $sum: 1 },
          avgWaitMinutes: {
            $avg: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 60000] },
          },
          overdueCount: {
            $sum: { $cond: [{ $lt: ['$sla.deadline', new Date()] }, 1, 0] },
          },
        },
      },
      { $sort: { avgWaitMinutes: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      success: true,
      data: bottlenecks.map(b => ({
        stepName: b._id.stepName || b._id.stepId,
        pendingCount: b.count,
        avgWaitMinutes: Math.round(b.avgWaitMinutes),
        avgWaitFormatted: `${Math.floor(b.avgWaitMinutes / 60)} ساعة ${Math.round(b.avgWaitMinutes % 60)} دقيقة`,
        overdueCount: b.overdueCount,
        severity:
          b.avgWaitMinutes > 1440 ? 'critical' : b.avgWaitMinutes > 480 ? 'warning' : 'normal',
      })),
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحليل الاختناقات', error: err.message });
  }
});

// GET /kpi/workload-distribution — Workload per user
router.get('/kpi/workload-distribution', async (_req, res) => {
  try {
    const TaskInstance = mongoose.models.TaskInstance;
    if (!TaskInstance) return res.json({ success: true, data: [] });

    const distribution = await TaskInstance.aggregate([
      { $match: { status: { $in: ['assigned', 'in_progress'] } } },
      {
        $group: {
          _id: '$assignee',
          totalTasks: { $sum: 1 },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $lt: ['$sla.deadline', new Date()] }, 1, 0] } },
        },
      },
      { $sort: { totalTasks: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, nameAr: 1, email: 1, department: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ]);

    res.json({
      success: true,
      data: distribution.map(d => ({
        userId: d._id,
        userName: d.user?.nameAr || d.user?.name || 'غير معروف',
        email: d.user?.email,
        department: d.user?.department,
        totalTasks: d.totalTasks,
        inProgress: d.inProgress,
        assigned: d.assigned,
        overdue: d.overdue,
        load: d.totalTasks > 10 ? 'high' : d.totalTasks > 5 ? 'medium' : 'low',
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في توزيع عبء العمل', error: safeError(err) });
  }
});

// GET /kpi/completion-trend — Daily completion trend
router.get('/kpi/completion-trend', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const WorkflowInstance = mongoose.models.WorkflowInstance;
    if (!WorkflowInstance) return res.json({ success: true, data: [] });

    const startDate = new Date(Date.now() - Number(days) * 86400000);

    const trend = await WorkflowInstance.aggregate([
      { $match: { status: 'completed', updatedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: trend.map(t => ({ date: t._id, completed: t.count })) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في اتجاه الإنجاز', error: safeError(err) });
  }
});

// GET /kpi/category-breakdown — Performance by category
router.get('/kpi/category-breakdown', async (_req, res) => {
  try {
    const WorkflowInstance = mongoose.models.WorkflowInstance;
    if (!WorkflowInstance) return res.json({ success: true, data: [] });

    const breakdown = await WorkflowInstance.aggregate([
      {
        $lookup: {
          from: 'workflowdefinitions',
          localField: 'definition',
          foreignField: '_id',
          as: 'def',
        },
      },
      { $unwind: { path: '$def', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$def.category',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: breakdown });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحليل الفئات', error: safeError(err) });
  }
});

// GET /kpi/snapshots — List historical KPI snapshots
router.get('/kpi/snapshots', async (req, res) => {
  try {
    const { period = 'daily', page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [snapshots, total] = await Promise.all([
      WorkflowKPISnapshot.find({ period })
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WorkflowKPISnapshot.countDocuments({ period }),
    ]);
    res.json({ success: true, data: snapshots, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب اللقطات', error: safeError(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5) APPROVAL CHAINS — سلاسل الموافقات
// ═══════════════════════════════════════════════════════════════════════════════

// GET /approval-chains — List approval chains
router.get('/approval-chains', async (req, res) => {
  try {
    const { category, isTemplate, isActive, chainType, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isTemplate !== undefined) filter.isTemplate = isTemplate === 'true';
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (chainType) filter.chainType = chainType;

    const skip = (Number(page) - 1) * Number(limit);
    const [chains, total] = await Promise.all([
      WorkflowApprovalChain.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name nameAr email')
        .lean(),
      WorkflowApprovalChain.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: chains,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('GET /approval-chains error: %s', err.message);
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب سلاسل الموافقات', error: err.message });
  }
});

// GET /approval-chains/:id — Get chain detail
router.get('/approval-chains/:id', async (req, res) => {
  try {
    const chain = await WorkflowApprovalChain.findById(req.params.id)
      .populate('createdBy', 'name nameAr email')
      .populate('steps.approverUser', 'name nameAr email')
      .populate('steps.approverGroup', 'name nameAr email')
      .lean();
    if (!chain) return res.status(404).json({ success: false, message: 'السلسلة غير موجودة' });
    res.json({ success: true, data: chain });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب السلسلة', error: safeError(err) });
  }
});

// POST /approval-chains — Create approval chain
router.post('/approval-chains', async (req, res) => {
  try {
    const chain = await WorkflowApprovalChain.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: chain, message: 'تم إنشاء سلسلة الموافقات بنجاح' });
  } catch (err) {
    logger.error('POST /approval-chains error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء السلسلة', error: safeError(err) });
  }
});

// PUT /approval-chains/:id — Update chain
router.put('/approval-chains/:id', async (req, res) => {
  try {
    const chain = await WorkflowApprovalChain.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!chain) return res.status(404).json({ success: false, message: 'السلسلة غير موجودة' });
    res.json({ success: true, data: chain, message: 'تم تحديث السلسلة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث السلسلة', error: safeError(err) });
  }
});

// DELETE /approval-chains/:id — Delete chain
router.delete('/approval-chains/:id', async (req, res) => {
  try {
    const chain = await WorkflowApprovalChain.findByIdAndDelete(req.params.id);
    if (!chain) return res.status(404).json({ success: false, message: 'السلسلة غير موجودة' });
    res.json({ success: true, message: 'تم حذف السلسلة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف السلسلة', error: safeError(err) });
  }
});

// POST /approval-chains/:id/clone — Clone chain
router.post('/approval-chains/:id/clone', async (req, res) => {
  try {
    const original = await WorkflowApprovalChain.findById(req.params.id).lean();
    if (!original) return res.status(404).json({ success: false, message: 'السلسلة غير موجودة' });

    delete original._id;
    delete original.createdAt;
    delete original.updatedAt;
    original.name = `${original.name} (نسخة)`;
    original.nameAr = `${original.nameAr} (نسخة)`;
    original.stats = { timesUsed: 0, avgCompletionMinutes: 0, approvalRate: 0 };
    original.createdBy = uid(req);

    const clone = await WorkflowApprovalChain.create(original);
    res.status(201).json({ success: true, data: clone, message: 'تم نسخ السلسلة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في نسخ السلسلة', error: safeError(err) });
  }
});

// POST /approval-chains/:id/start — Start an approval instance
router.post('/approval-chains/:id/start', async (req, res) => {
  try {
    const chain = await WorkflowApprovalChain.findById(req.params.id);
    if (!chain) return res.status(404).json({ success: false, message: 'السلسلة غير موجودة' });

    const instance = await WorkflowApprovalInstance.create({
      approvalChain: chain._id,
      workflowInstance: req.body.workflowInstanceId,
      taskInstance: req.body.taskInstanceId,
      currentStep: 0,
      status: 'in_progress',
      formData: req.body.formData,
      initiatedBy: uid(req),
    });

    chain.stats.timesUsed = (chain.stats.timesUsed || 0) + 1;
    await chain.save();

    res.status(201).json({ success: true, data: instance, message: 'تم بدء سلسلة الموافقات' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في بدء السلسلة', error: safeError(err) });
  }
});

// GET /approval-chains/instances — List approval instances
router.get('/approval-chains/instances', async (req, res) => {
  try {
    const { status, approvalChain, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (approvalChain) filter.approvalChain = approvalChain;

    const skip = (Number(page) - 1) * Number(limit);
    const [instances, total] = await Promise.all([
      WorkflowApprovalInstance.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('approvalChain', 'name nameAr chainType')
        .populate('initiatedBy', 'name nameAr email')
        .populate('stepResults.approver', 'name nameAr email')
        .lean(),
      WorkflowApprovalInstance.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: instances,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب مثيلات الموافقات', error: err.message });
  }
});

// POST /approval-chains/instances/:id/decide — Submit approval decision
router.post('/approval-chains/instances/:id/decide', async (req, res) => {
  try {
    const { decision, comment } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res
        .status(400)
        .json({ success: false, message: 'القرار يجب أن يكون "approved" أو "rejected"' });
    }

    const instance = await WorkflowApprovalInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ success: false, message: 'المثيل غير موجود' });
    if (!['pending', 'in_progress'].includes(instance.status)) {
      return res.status(400).json({ success: false, message: 'لا يمكن اتخاذ قرار على هذا المثيل' });
    }

    instance.stepResults.push({
      stepOrder: instance.currentStep,
      approver: uid(req),
      decision,
      comment,
      decidedAt: new Date(),
    });

    const chain = await WorkflowApprovalChain.findById(instance.approvalChain);
    const totalSteps = chain?.steps?.length || 1;

    if (decision === 'rejected') {
      instance.status = 'rejected';
      instance.completedAt = new Date();
    } else if (instance.currentStep + 1 >= totalSteps) {
      instance.status = 'approved';
      instance.completedAt = new Date();
    } else {
      instance.currentStep += 1;
    }

    await instance.save();

    res.json({
      success: true,
      data: instance,
      message:
        decision === 'approved'
          ? instance.status === 'approved'
            ? 'تمت الموافقة النهائية'
            : 'تمت الموافقة، بانتظار المستوى التالي'
          : 'تم الرفض',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في اتخاذ القرار', error: safeError(err) });
  }
});

// GET /approval-chains/instances/:id/timeline — Get approval timeline
router.get('/approval-chains/instances/:id/timeline', async (req, res) => {
  try {
    const instance = await WorkflowApprovalInstance.findById(req.params.id)
      .populate('approvalChain', 'name nameAr steps')
      .populate('stepResults.approver', 'name nameAr email')
      .populate('initiatedBy', 'name nameAr email')
      .lean();
    if (!instance) return res.status(404).json({ success: false, message: 'المثيل غير موجود' });

    const timeline = [
      {
        type: 'initiated',
        actor: instance.initiatedBy,
        date: instance.startedAt,
        description: 'بدء سلسلة الموافقات',
      },
      ...instance.stepResults.map(sr => ({
        type: sr.decision,
        actor: sr.approver,
        date: sr.decidedAt,
        stepOrder: sr.stepOrder,
        comment: sr.comment,
        description:
          sr.decision === 'approved' ? 'موافقة' : sr.decision === 'rejected' ? 'رفض' : sr.decision,
      })),
    ];

    if (instance.completedAt) {
      timeline.push({
        type: instance.status,
        date: instance.completedAt,
        description: instance.status === 'approved' ? 'تمت الموافقة النهائية' : 'تم الرفض',
      });
    }

    res.json({ success: true, data: { instance, timeline } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الخط الزمني', error: safeError(err) });
  }
});

// GET /approval-chains/stats — Approval chain statistics
router.get('/approval-chains/stats', async (_req, res) => {
  try {
    const [totalChains, activeChains, templates, instanceStats, categoryBreakdown] =
      await Promise.all([
        WorkflowApprovalChain.countDocuments(),
        WorkflowApprovalChain.countDocuments({ isActive: true }),
        WorkflowApprovalChain.countDocuments({ isTemplate: true }),
        WorkflowApprovalInstance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        WorkflowApprovalChain.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

    const statusMap = {};
    instanceStats.forEach(s => {
      statusMap[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        totalChains,
        activeChains,
        templates,
        instances: {
          pending: statusMap.pending || 0,
          inProgress: statusMap.in_progress || 0,
          approved: statusMap.approved || 0,
          rejected: statusMap.rejected || 0,
          total: Object.values(statusMap).reduce((a, b) => a + b, 0),
        },
        byCategory: categoryBreakdown,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إحصائيات الموافقات', error: err.message });
  }
});

// GET /approval-chains/my-pending — My pending approvals
router.get('/approval-chains/my-pending', async (req, res) => {
  try {
    const userId = uid(req);
    const instances = await WorkflowApprovalInstance.find({
      status: 'in_progress',
    })
      .populate('approvalChain', 'name nameAr steps')
      .populate('initiatedBy', 'name nameAr email')
      .lean();

    // Filter to instances where current step's approver is the requesting user
    const myPending = instances.filter(inst => {
      const chain = inst.approvalChain;
      if (!chain?.steps) return false;
      const currentStep = chain.steps[inst.currentStep];
      if (!currentStep) return false;
      if (currentStep.approverType === 'specific_user') {
        return String(currentStep.approverUser) === String(userId);
      }
      if (currentStep.approverType === 'group') {
        return currentStep.approverGroup?.some(u => String(u) === String(userId));
      }
      return false;
    });

    res.json({ success: true, data: myPending, total: myPending.length });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب الموافقات المعلقة', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6) AUTOMATION RULES — قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════════════════════

// GET /automations — List automation rules
router.get('/automations', async (req, res) => {
  try {
    const { isActive, event, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (event) filter['trigger.event'] = event;

    const skip = (Number(page) - 1) * Number(limit);
    const [rules, total] = await Promise.all([
      WorkflowAutomationRule.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'name nameAr email')
        .lean(),
      WorkflowAutomationRule.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: rules,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    logger.error('GET /automations error: %s', err.message);
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب قواعد الأتمتة', error: err.message });
  }
});

// GET /automations/:id — Get automation rule detail
router.get('/automations/:id', async (req, res) => {
  try {
    const rule = await WorkflowAutomationRule.findById(req.params.id)
      .populate('createdBy', 'name nameAr email')
      .lean();
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب القاعدة', error: safeError(err) });
  }
});

// POST /automations — Create automation rule
router.post('/automations', async (req, res) => {
  try {
    const rule = await WorkflowAutomationRule.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: rule, message: 'تم إنشاء قاعدة الأتمتة بنجاح' });
  } catch (err) {
    logger.error('POST /automations error: %s', err.message);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء القاعدة', error: safeError(err) });
  }
});

// PUT /automations/:id — Update automation rule
router.put('/automations/:id', async (req, res) => {
  try {
    const rule = await WorkflowAutomationRule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    res.json({ success: true, data: rule, message: 'تم تحديث القاعدة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث القاعدة', error: safeError(err) });
  }
});

// DELETE /automations/:id — Delete automation rule
router.delete('/automations/:id', async (req, res) => {
  try {
    const rule = await WorkflowAutomationRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    res.json({ success: true, message: 'تم حذف القاعدة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف القاعدة', error: safeError(err) });
  }
});

// POST /automations/:id/toggle — Toggle active status
router.post('/automations/:id/toggle', async (req, res) => {
  try {
    const rule = await WorkflowAutomationRule.findById(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });
    rule.isActive = !rule.isActive;
    await rule.save();
    res.json({
      success: true,
      data: rule,
      message: rule.isActive ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة',
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تبديل حالة القاعدة', error: err.message });
  }
});

// POST /automations/:id/test — Test automation rule (dry run)
router.post('/automations/:id/test', async (req, res) => {
  try {
    const rule = await WorkflowAutomationRule.findById(req.params.id).lean();
    if (!rule) return res.status(404).json({ success: false, message: 'القاعدة غير موجودة' });

    const { testData = {} } = req.body;
    const conditionResults = rule.conditions.map(cond => {
      const actual = testData[cond.field];
      let passed = false;
      switch (cond.operator) {
        case 'equals':
          passed = actual === cond.value;
          break;
        case 'not_equals':
          passed = actual !== cond.value;
          break;
        case 'contains':
          passed = String(actual || '').includes(String(cond.value));
          break;
        case 'gt':
          passed = Number(actual) > Number(cond.value);
          break;
        case 'gte':
          passed = Number(actual) >= Number(cond.value);
          break;
        case 'lt':
          passed = Number(actual) < Number(cond.value);
          break;
        case 'lte':
          passed = Number(actual) <= Number(cond.value);
          break;
        case 'in':
          passed = Array.isArray(cond.value) ? cond.value.includes(actual) : false;
          break;
        case 'is_empty':
          passed = !actual || actual === '';
          break;
        case 'not_empty':
          passed = !!actual && actual !== '';
          break;
        default:
          passed = false;
      }
      return { field: cond.field, operator: cond.operator, expected: cond.value, actual, passed };
    });

    const allPassed =
      rule.conditionLogic === 'or'
        ? conditionResults.some(c => c.passed)
        : conditionResults.every(c => c.passed);

    const wouldExecuteActions = allPassed
      ? rule.actions.map(a => ({ actionType: a.actionType, config: a.config, delay: a.delay }))
      : [];

    res.json({
      success: true,
      data: {
        ruleName: rule.nameAr,
        conditionResults,
        conditionLogic: rule.conditionLogic,
        allConditionsMet: allPassed,
        wouldExecuteActions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في اختبار القاعدة', error: safeError(err) });
  }
});

// GET /automations/logs — List automation execution logs
router.get('/automations/logs', async (req, res) => {
  try {
    const { automationRule, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (automationRule) filter.automationRule = automationRule;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      WorkflowAutomationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('automationRule', 'name nameAr trigger.event')
        .lean(),
      WorkflowAutomationLog.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data: logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب سجل الأتمتة', error: safeError(err) });
  }
});

// GET /automations/stats — Automation statistics
router.get('/automations/stats', async (_req, res) => {
  try {
    const [totalRules, activeRules, eventBreakdown, executionStats, recentLogs] = await Promise.all(
      [
        WorkflowAutomationRule.countDocuments(),
        WorkflowAutomationRule.countDocuments({ isActive: true }),
        WorkflowAutomationRule.aggregate([
          { $group: { _id: '$trigger.event', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        WorkflowAutomationLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        WorkflowAutomationLog.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('automationRule', 'nameAr')
          .lean(),
      ]
    );

    const execMap = {};
    executionStats.forEach(s => {
      execMap[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        totalRules,
        activeRules,
        totalExecutions: Object.values(execMap).reduce((a, b) => a + b, 0),
        successfulExecutions: execMap.success || 0,
        failedExecutions: execMap.failed || 0,
        byEvent: eventBreakdown,
        recentLogs,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إحصائيات الأتمتة', error: err.message });
  }
});

// GET /automations/events — List available trigger events
router.get('/automations/events', async (_req, res) => {
  const events = [
    { value: 'instance_started', label: 'بدء مثيل سير عمل', category: 'instance' },
    { value: 'instance_completed', label: 'إتمام مثيل سير عمل', category: 'instance' },
    { value: 'instance_cancelled', label: 'إلغاء مثيل سير عمل', category: 'instance' },
    { value: 'instance_suspended', label: 'تعليق مثيل سير عمل', category: 'instance' },
    { value: 'task_created', label: 'إنشاء مهمة', category: 'task' },
    { value: 'task_assigned', label: 'تعيين مهمة', category: 'task' },
    { value: 'task_started', label: 'بدء مهمة', category: 'task' },
    { value: 'task_completed', label: 'إتمام مهمة', category: 'task' },
    { value: 'task_overdue', label: 'تأخر مهمة', category: 'task' },
    { value: 'approval_requested', label: 'طلب موافقة', category: 'approval' },
    { value: 'approval_granted', label: 'منح موافقة', category: 'approval' },
    { value: 'approval_rejected', label: 'رفض موافقة', category: 'approval' },
    { value: 'sla_warning', label: 'تحذير SLA', category: 'sla' },
    { value: 'sla_breach', label: 'انتهاك SLA', category: 'sla' },
    { value: 'comment_added', label: 'إضافة تعليق', category: 'other' },
    { value: 'field_changed', label: 'تغيير حقل', category: 'other' },
    { value: 'schedule', label: 'مجدول', category: 'other' },
  ];
  res.json({ success: true, data: events });
});

// GET /automations/actions — List available action types
router.get('/automations/actions', async (_req, res) => {
  const actions = [
    { value: 'assign_task', label: 'تعيين مهمة', category: 'task' },
    { value: 'reassign_task', label: 'إعادة تعيين مهمة', category: 'task' },
    { value: 'change_priority', label: 'تغيير الأولوية', category: 'task' },
    { value: 'add_tag', label: 'إضافة تصنيف', category: 'metadata' },
    { value: 'remove_tag', label: 'إزالة تصنيف', category: 'metadata' },
    { value: 'add_comment', label: 'إضافة تعليق', category: 'communication' },
    { value: 'send_notification', label: 'إرسال إشعار', category: 'communication' },
    { value: 'send_email', label: 'إرسال بريد', category: 'communication' },
    { value: 'send_sms', label: 'إرسال رسالة نصية', category: 'communication' },
    { value: 'trigger_webhook', label: 'تشغيل Webhook', category: 'integration' },
    { value: 'start_sub_workflow', label: 'بدء سير عمل فرعي', category: 'workflow' },
    { value: 'update_field', label: 'تحديث حقل', category: 'data' },
    { value: 'set_deadline', label: 'تحديد موعد نهائي', category: 'data' },
    { value: 'escalate', label: 'تصعيد', category: 'workflow' },
    { value: 'approve_auto', label: 'موافقة تلقائية', category: 'approval' },
    { value: 'reject_auto', label: 'رفض تلقائي', category: 'approval' },
    { value: 'move_to_step', label: 'الانتقال لخطوة', category: 'workflow' },
    { value: 'suspend_instance', label: 'تعليق المثيل', category: 'workflow' },
    { value: 'cancel_instance', label: 'إلغاء المثيل', category: 'workflow' },
    { value: 'log_audit', label: 'تسجيل في سجل المراجعة', category: 'audit' },
  ];
  res.json({ success: true, data: actions });
});

module.exports = router;
