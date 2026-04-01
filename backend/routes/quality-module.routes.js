/**
 * Quality Module Routes — مسارات وحدة الجودة
 * prompt_08 — Rehab-ERP v2.0
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

const QualityIndicator = require('../models/quality/QualityIndicator');
const QualityMeasurement = require('../models/quality/QualityMeasurement');
const IncidentReport = require('../models/quality/IncidentReport');

router.use(authenticate);

// ═══════════════════════════════════════════════════════
// مؤشرات الجودة — Quality Indicators
// ═══════════════════════════════════════════════════════

// GET /api/quality-module/indicators
router.get('/indicators', async (req, res) => {
  try {
    const {
      category,
      measurement_frequency,
      is_active,
      branch_id,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null };
    if (category) filter.category = category;
    if (measurement_frequency) filter.measurement_frequency = measurement_frequency;
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    if (branch_id) filter.branch_id = branch_id;

    const skip = (Number(page) - 1) * Number(limit);
    const [indicators, total] = await Promise.all([
      QualityIndicator.find(filter)
        .populate('created_by', 'name')
        .sort({ category: 1, name_ar: 1 })
        .skip(skip)
        .limit(Number(limit)),
      QualityIndicator.countDocuments(filter),
    ]);
    res.json({ indicators, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-module/indicators/:id
router.get('/indicators/:id', async (req, res) => {
  try {
    const indicator = await QualityIndicator.findOne({
      _id: req.params.id,
      deleted_at: null,
    }).populate('created_by', 'name');
    if (!indicator) return res.status(404).json({ error: 'المؤشر غير موجود' });
    res.json({ indicator });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-module/indicators
router.post('/indicators', async (req, res) => {
  try {
    const indicator = new QualityIndicator({ ...req.body, created_by: req.user._id });
    await indicator.save();
    res.status(201).json({ indicator, message: 'تم إنشاء المؤشر بنجاح' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/quality-module/indicators/:id
router.put('/indicators/:id', async (req, res) => {
  try {
    const indicator = await QualityIndicator.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!indicator) return res.status(404).json({ error: 'المؤشر غير موجود' });
    res.json({ indicator, message: 'تم تحديث المؤشر' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/quality-module/indicators/:id
router.delete('/indicators/:id', async (req, res) => {
  try {
    const indicator = await QualityIndicator.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date(), is_active: false },
      { new: true }
    );
    if (!indicator) return res.status(404).json({ error: 'المؤشر غير موجود' });
    res.json({ message: 'تم حذف المؤشر' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// قياسات الجودة — Quality Measurements
// ═══════════════════════════════════════════════════════

// GET /api/quality-module/measurements
router.get('/measurements', async (req, res) => {
  try {
    const {
      indicator_id,
      period_type,
      performance_status,
      branch_id,
      date_from,
      date_to,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = { deleted_at: null };
    if (indicator_id) filter.indicator_id = indicator_id;
    if (period_type) filter.period_type = period_type;
    if (performance_status) filter.performance_status = performance_status;
    if (branch_id) filter.branch_id = branch_id;
    if (date_from || date_to) {
      filter.period_start = {};
      if (date_from) filter.period_start.$gte = new Date(date_from);
      if (date_to) filter.period_start.$lte = new Date(date_to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [measurements, total] = await Promise.all([
      QualityMeasurement.find(filter)
        .populate('indicator_id', 'name_ar indicator_code category unit target_value direction')
        .populate('measured_by', 'name')
        .sort({ period_start: -1 })
        .skip(skip)
        .limit(Number(limit)),
      QualityMeasurement.countDocuments(filter),
    ]);
    res.json({
      measurements,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-module/measurements/:id
router.get('/measurements/:id', async (req, res) => {
  try {
    const measurement = await QualityMeasurement.findOne({
      _id: req.params.id,
      deleted_at: null,
    })
      .populate(
        'indicator_id',
        'name_ar indicator_code category unit target_value direction measurement_type'
      )
      .populate('measured_by', 'name')
      .populate('verified_by', 'name');
    if (!measurement) return res.status(404).json({ error: 'القياس غير موجود' });
    res.json({ measurement });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-module/measurements
router.post('/measurements', async (req, res) => {
  try {
    // حساب حالة الأداء تلقائياً
    const indicator = await QualityIndicator.findById(req.body.indicator_id);
    const measurementData = {
      ...req.body,
      measured_by: req.user._id,
      target_value: req.body.target_value || indicator?.target_value,
    };

    // تحديد حالة الأداء
    if (indicator && measurementData.actual_value !== undefined) {
      const actual = Number(measurementData.actual_value);
      const target = Number(measurementData.target_value || indicator.target_value);
      const minAcceptable = indicator.minimum_acceptable;

      if (indicator.direction === 'higher_better') {
        if (actual >= target) measurementData.performance_status = 'met';
        else if (actual >= target * 0.95) measurementData.performance_status = 'approaching';
        else if (minAcceptable && actual < minAcceptable)
          measurementData.performance_status = 'critical';
        else measurementData.performance_status = 'not_met';
      } else if (indicator.direction === 'lower_better') {
        if (actual <= target) measurementData.performance_status = 'met';
        else if (actual <= target * 1.05) measurementData.performance_status = 'approaching';
        else measurementData.performance_status = 'not_met';
      }

      if (actual > target * 1.1 && indicator.direction === 'higher_better')
        measurementData.performance_status = 'exceeded';
    }

    const measurement = new QualityMeasurement(measurementData);
    await measurement.save();
    res.status(201).json({ measurement, message: 'تم تسجيل القياس بنجاح' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/quality-module/measurements/:id
router.put('/measurements/:id', async (req, res) => {
  try {
    const measurement = await QualityMeasurement.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!measurement) return res.status(404).json({ error: 'القياس غير موجود' });
    res.json({ measurement, message: 'تم تحديث القياس' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/quality-module/measurements/:id/verify — التحقق من القياس
router.post('/measurements/:id/verify', async (req, res) => {
  try {
    const measurement = await QualityMeasurement.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, data_verified: false },
      { data_verified: true, verified_by: req.user._id, verified_at: new Date() },
      { new: true }
    );
    if (!measurement)
      return res.status(404).json({ error: 'القياس غير موجود أو تم التحقق منه مسبقاً' });
    res.json({ measurement, message: 'تم التحقق من القياس' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/quality-module/measurements/:id
router.delete('/measurements/:id', async (req, res) => {
  try {
    const measurement = await QualityMeasurement.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );
    if (!measurement) return res.status(404).json({ error: 'القياس غير موجود' });
    res.json({ message: 'تم حذف القياس' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-module/measurements/indicator/:indicatorId/trend — اتجاه مؤشر معين
router.get('/measurements/indicator/:indicatorId/trend', async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - Number(months));

    const measurements = await QualityMeasurement.find({
      indicator_id: req.params.indicatorId,
      deleted_at: null,
      period_start: { $gte: fromDate },
    })
      .sort({ period_start: 1 })
      .select(
        'period_label period_start actual_value target_value performance_status variance_percentage trend'
      );

    res.json({ measurements, count: measurements.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// تقارير الحوادث — Incident Reports
// ═══════════════════════════════════════════════════════

// GET /api/quality-module/incidents
router.get('/incidents', async (req, res) => {
  try {
    const {
      incident_type,
      severity,
      status,
      branch_id,
      date_from,
      date_to,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { deleted_at: null };
    if (incident_type) filter.incident_type = incident_type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (branch_id) filter.branch_id = branch_id;
    if (date_from || date_to) {
      filter.incident_date = {};
      if (date_from) filter.incident_date.$gte = new Date(date_from);
      if (date_to) filter.incident_date.$lte = new Date(date_to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [incidents, total] = await Promise.all([
      IncidentReport.find(filter)
        .populate('reported_by', 'name')
        .populate('involved_beneficiary_id', 'full_name_ar file_number')
        .sort({ incident_date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      IncidentReport.countDocuments(filter),
    ]);
    res.json({ incidents, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/quality-module/incidents/:id
router.get('/incidents/:id', async (req, res) => {
  try {
    const incident = await IncidentReport.findOne({ _id: req.params.id, deleted_at: null })
      .populate('reported_by', 'name')
      .populate('involved_beneficiary_id', 'full_name_ar file_number date_of_birth')
      .populate('involved_employee_id', 'name employee_id')
      .populate('closed_by', 'name')
      .populate('corrective_actions.responsible_person_id', 'name');
    if (!incident) return res.status(404).json({ error: 'الحادثة غير موجودة' });
    res.json({ incident });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-module/incidents
router.post('/incidents', async (req, res) => {
  try {
    const incident = new IncidentReport({
      ...req.body,
      reported_by: req.user._id,
      status: 'reported',
    });
    await incident.save();
    res.status(201).json({ incident, message: 'تم تسجيل الحادثة بنجاح' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/quality-module/incidents/:id
router.put('/incidents/:id', async (req, res) => {
  try {
    const incident = await IncidentReport.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $nin: ['closed'] } },
      req.body,
      { new: true, runValidators: true }
    );
    if (!incident) return res.status(404).json({ error: 'لا يمكن تعديل هذه الحادثة' });
    res.json({ incident, message: 'تم تحديث الحادثة' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/quality-module/incidents/:id/investigate — بدء التحقيق
router.post('/incidents/:id/investigate', async (req, res) => {
  try {
    const { root_cause, contributing_factors, corrective_actions } = req.body;
    const incident = await IncidentReport.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'reported' },
      {
        status: 'under_investigation',
        root_cause,
        contributing_factors,
        corrective_actions,
      },
      { new: true }
    );
    if (!incident) return res.status(404).json({ error: 'لا يمكن فتح تحقيق لهذه الحادثة' });
    res.json({ incident, message: 'تم فتح التحقيق' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-module/incidents/:id/close — إغلاق الحادثة
router.post('/incidents/:id/close', async (req, res) => {
  try {
    const { closure_notes } = req.body;
    const incident = await IncidentReport.findOneAndUpdate(
      {
        _id: req.params.id,
        deleted_at: null,
        status: { $in: ['under_investigation', 'action_taken'] },
      },
      {
        status: 'closed',
        closed_by: req.user._id,
        closed_at: new Date(),
        closure_notes,
      },
      { new: true }
    );
    if (!incident) return res.status(404).json({ error: 'لا يمكن إغلاق هذه الحادثة' });
    res.json({ incident, message: 'تم إغلاق الحادثة' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-module/incidents/:id/escalate — تصعيد الحادثة
router.post('/incidents/:id/escalate', async (req, res) => {
  try {
    const incident = await IncidentReport.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $nin: ['closed'] } },
      { status: 'escalated', is_reported_to_authority: true, authority_report_date: new Date() },
      { new: true }
    );
    if (!incident) return res.status(404).json({ error: 'لا يمكن تصعيد هذه الحادثة' });
    res.json({ incident, message: 'تم تصعيد الحادثة للجهات المختصة' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/quality-module/incidents/:id/corrective-action/:actionId/complete — إكمال إجراء تصحيحي
router.post('/incidents/:id/corrective-action/:actionId/complete', async (req, res) => {
  try {
    const incident = await IncidentReport.findOne({ _id: req.params.id, deleted_at: null });
    if (!incident) return res.status(404).json({ error: 'الحادثة غير موجودة' });

    const action = incident.corrective_actions.id(req.params.actionId);
    if (!action) return res.status(404).json({ error: 'الإجراء غير موجود' });

    action.status = 'completed';
    action.completed_at = new Date();

    // تحقق إذا كانت كل الإجراءات مكتملة
    const allDone = incident.corrective_actions.every(a => a.status === 'completed');
    if (allDone) incident.status = 'action_taken';

    await incident.save();
    res.json({ incident, message: 'تم إكمال الإجراء التصحيحي' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/quality-module/incidents/:id
router.delete('/incidents/:id', async (req, res) => {
  try {
    const incident = await IncidentReport.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'reported' },
      { deleted_at: new Date() },
      { new: true }
    );
    if (!incident) return res.status(404).json({ error: 'لا يمكن حذف هذه الحادثة' });
    res.json({ message: 'تم حذف الحادثة' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════
// لوحة الجودة — Quality Dashboard
// ═══════════════════════════════════════════════════════

// GET /api/quality-module/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { branch_id, period_type = 'monthly' } = req.query;
    const baseFilter = { deleted_at: null };
    if (branch_id) baseFilter.branch_id = new mongoose.Types.ObjectId(branch_id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalIndicators,
      indicatorsByCategory,
      recentMeasurements,
      performanceSummary,
      openIncidents,
      incidentsBySeverity,
      criticalIncidents,
    ] = await Promise.all([
      QualityIndicator.countDocuments({ ...baseFilter, is_active: true }),

      QualityIndicator.aggregate([
        { $match: { ...baseFilter, is_active: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      QualityMeasurement.find({
        ...baseFilter,
        period_start: { $gte: thirtyDaysAgo },
      })
        .populate('indicator_id', 'name_ar indicator_code category')
        .sort({ createdAt: -1 })
        .limit(10),

      QualityMeasurement.aggregate([
        {
          $match: {
            ...baseFilter,
            period_start: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: '$performance_status', count: { $sum: 1 } } },
      ]),

      IncidentReport.countDocuments({
        ...baseFilter,
        status: { $nin: ['closed'] },
      }),

      IncidentReport.aggregate([
        { $match: { ...baseFilter, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),

      IncidentReport.find({
        ...baseFilter,
        severity: { $in: ['critical', 'sentinel'] },
        status: { $nin: ['closed'] },
      })
        .sort({ incident_date: -1 })
        .limit(5)
        .select('incident_number title incident_type severity status incident_date'),
    ]);

    res.json({
      indicators: { total: totalIndicators, byCategory: indicatorsByCategory },
      measurements: { recent: recentMeasurements, performanceSummary },
      incidents: {
        open: openIncidents,
        bySeverity: incidentsBySeverity,
        critical: criticalIncidents,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
