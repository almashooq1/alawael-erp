/**
 * IoT & Wearables Routes — البرومبت 28
 * مسارات نظام IoT والأجهزة القابلة للارتداء
 *
 * @module routes/iot-wearables.routes
 * @description نظام متكامل لإدارة أجهزة IoT والأجهزة القابلة للارتداء في مراكز التأهيل
 * Base paths:
 *   /api/iot-wearables
 *   /api/v1/iot-wearables
 */

const express = require('express');
const router = express.Router();

const {
  IotWearablesService,
  IotDeviceType,
  IotDevice,
  IotDeviceAssignment,
  IotReading,
  IotAlertRule,
  IotAlert,
  IotMaintenance,
  VitalBaseline,
} = require('../rehabilitation-gamification/iot-wearables-service');

const service = new IotWearablesService();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, msg, status = 500) => res.status(status).json({ success: false, error: msg });

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 لوحة المراقبة — Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/dashboard
 * @desc   لوحة المراقبة الحية لأجهزة IoT
 */
router.get('/dashboard', async (req, res) => {
  try {
    const branchId = req.query.branch_id || req.headers['x-branch-id'];
    const data = await service.getDashboard(branchId);
    ok(res, { data });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 أنواع الأجهزة — Device Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/device-types
 * @desc   قائمة أنواع الأجهزة
 */
router.get('/device-types', async (req, res) => {
  try {
    const { search, category, branch_id, page = 1, limit = 20 } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (category) query.category = category;
    if (search)
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { name_ar: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
      ];

    const total = await IotDeviceType.countDocuments(query);
    const data = await IotDeviceType.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/device-types
 * @desc   إنشاء نوع جهاز جديد
 */
router.post('/device-types', async (req, res) => {
  try {
    const {
      name,
      name_ar,
      category,
      communication_protocol,
      manufacturer,
      model_number,
      supported_metrics,
      specifications,
      firmware_version,
      description,
      setup_instructions,
    } = req.body;

    if (!name || !name_ar || !category || !communication_protocol) {
      return fail(res, 'الحقول المطلوبة: name, name_ar, category, communication_protocol', 400);
    }

    const deviceType = await IotDeviceType.create({
      uuid: require('crypto').randomUUID(),
      name,
      name_ar,
      category,
      communication_protocol,
      manufacturer,
      model_number,
      supported_metrics,
      specifications,
      firmware_version,
      description,
      setup_instructions,
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });

    ok(res, { data: deviceType, message: 'تم إنشاء نوع الجهاز بنجاح' }, 201);
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/device-types/:id
 * @desc   تفاصيل نوع جهاز
 */
router.get('/device-types/:id', async (req, res) => {
  try {
    const dt = await IotDeviceType.findById(req.params.id).lean();
    if (!dt) return fail(res, 'نوع الجهاز غير موجود', 404);
    ok(res, { data: dt });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/iot-wearables/device-types/:id
 * @desc   تحديث نوع جهاز
 */
router.put('/device-types/:id', async (req, res) => {
  try {
    const dt = await IotDeviceType.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!dt) return fail(res, 'نوع الجهاز غير موجود', 404);
    ok(res, { data: dt, message: 'تم التحديث بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/iot-wearables/device-types/:id
 * @desc   حذف نوع جهاز
 */
router.delete('/device-types/:id', async (req, res) => {
  try {
    const usedCount = await IotDevice.countDocuments({ device_type_id: req.params.id });
    if (usedCount > 0) return fail(res, `لا يمكن حذف هذا النوع، يرتبط به ${usedCount} جهاز`, 422);
    await IotDeviceType.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📱 الأجهزة — Devices
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/devices
 * @desc   قائمة الأجهزة مع الفلترة
 */
router.get('/devices', async (req, res) => {
  try {
    const result = await service.listDevices(req.query);
    ok(res, result);
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/devices/form-options
 * @desc   خيارات النماذج
 */
router.get('/devices/form-options', async (req, res) => {
  try {
    const options = await service.getFormOptions();
    ok(res, { data: options });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/devices
 * @desc   تسجيل جهاز جديد
 */
router.post('/devices', async (req, res) => {
  try {
    const { device_type_id, serial_number, name } = req.body;
    if (!device_type_id || !serial_number || !name) {
      return fail(res, 'الحقول المطلوبة: device_type_id, serial_number, name', 400);
    }

    const device = await service.registerDevice({
      ...req.body,
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });

    ok(res, { data: device, message: 'تم تسجيل الجهاز بنجاح' }, 201);
  } catch (e) {
    if (e.code === 11000) return fail(res, 'الرقم التسلسلي مستخدم مسبقاً', 422);
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/devices/:id
 * @desc   تفاصيل جهاز
 */
router.get('/devices/:id', async (req, res) => {
  try {
    const device = await IotDevice.findById(req.params.id)
      .populate('device_type_id', 'name name_ar category communication_protocol supported_metrics')
      .lean();
    if (!device) return fail(res, 'الجهاز غير موجود', 404);

    // إضافة التعيين الحالي
    const assignment = await IotDeviceAssignment.findOne({
      device_id: device._id,
      status: 'active',
    })
      .populate('beneficiary_id', 'full_name')
      .lean();
    device.current_assignment = assignment;
    device.is_online =
      device.last_ping_at && Date.now() - new Date(device.last_ping_at).getTime() < 5 * 60 * 1000;

    ok(res, { data: device });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/iot-wearables/devices/:id
 * @desc   تحديث بيانات جهاز
 */
router.put('/devices/:id', async (req, res) => {
  try {
    const device = await IotDevice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true, runValidators: true }
    ).populate('device_type_id', 'name name_ar');

    if (!device) return fail(res, 'الجهاز غير موجود', 404);
    ok(res, { data: device, message: 'تم التحديث بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/iot-wearables/devices/:id
 * @desc   حذف جهاز
 */
router.delete('/devices/:id', async (req, res) => {
  try {
    const activeAssignment = await IotDeviceAssignment.findOne({
      device_id: req.params.id,
      status: 'active',
    });
    if (activeAssignment) {
      return fail(res, 'لا يمكن حذف جهاز معين لمستفيد نشط', 422);
    }
    await IotDevice.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم حذف الجهاز بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/devices/:id/assign
 * @desc   تعيين جهاز لمستفيد
 */
router.post('/devices/:id/assign', async (req, res) => {
  try {
    const { beneficiary_id, device_settings } = req.body;
    if (!beneficiary_id) return fail(res, 'beneficiary_id مطلوب', 400);

    const assignment = await service.assignTobeneficiary(
      req.params.id,
      beneficiary_id,
      req.user?.id || req.body.assigned_by,
      device_settings || {}
    );

    ok(res, { data: assignment, message: 'تم تعيين الجهاز بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/devices/:id/return
 * @desc   إرجاع جهاز
 */
router.post('/devices/:id/return', async (req, res) => {
  try {
    const updated = await IotDeviceAssignment.findOneAndUpdate(
      { device_id: req.params.id, status: 'active' },
      {
        status: 'returned',
        returned_at: new Date(),
        return_notes: req.body.return_notes,
      },
      { new: true }
    );

    if (!updated) return fail(res, 'لا يوجد تعيين نشط لهذا الجهاز', 404);
    ok(res, { data: updated, message: 'تم إرجاع الجهاز بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/devices/:id/readings
 * @desc   قراءات جهاز محدد
 */
router.get('/devices/:id/readings', async (req, res) => {
  try {
    const { metric_type, from, to, page = 1, limit = 50 } = req.query;
    const query = { device_id: req.params.id };
    if (metric_type) query.metric_type = metric_type;
    if (from || to) {
      query.recorded_at = {};
      if (from) query.recorded_at.$gte = new Date(from);
      if (to) query.recorded_at.$lte = new Date(to);
    }

    const total = await IotReading.countDocuments(query);
    const readings = await IotReading.find(query)
      .sort({ recorded_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: readings, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/devices/:id/alerts
 * @desc   تنبيهات جهاز محدد
 */
router.get('/devices/:id/alerts', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { device_id: req.params.id };
    if (status) query.status = status;

    const total = await IotAlert.countDocuments(query);
    const alerts = await IotAlert.find(query)
      .sort({ triggered_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: alerts, total });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/devices/:id/assignments
 * @desc   سجل تعيينات الجهاز
 */
router.get('/devices/:id/assignments', async (req, res) => {
  try {
    const assignments = await IotDeviceAssignment.find({ device_id: req.params.id })
      .populate('beneficiary_id', 'full_name')
      .populate('assigned_by', 'name')
      .sort({ assigned_at: -1 })
      .lean();
    ok(res, { data: assignments });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/devices/:id/maintenance
 * @desc   سجل صيانة الجهاز
 */
router.get('/devices/:id/maintenance', async (req, res) => {
  try {
    const records = await IotMaintenance.find({ device_id: req.params.id })
      .populate('technician_id', 'name')
      .sort({ scheduled_date: -1 })
      .lean();
    ok(res, { data: records });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📡 استقبال البيانات — Data Ingestion (Webhook/MQTT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  POST /api/iot-wearables/readings/ingest
 * @desc   استقبال قراءة من جهاز IoT (Webhook)
 */
router.post('/readings/ingest', async (req, res) => {
  try {
    const { serial_number, metric_type, value, unit } = req.body;
    if (!serial_number || !metric_type || value === undefined || !unit) {
      return fail(res, 'الحقول المطلوبة: serial_number, metric_type, value, unit', 400);
    }

    const reading = await service.processReading(req.body);
    ok(res, { data: reading, message: 'تمت معالجة القراءة' }, 201);
  } catch (e) {
    if (e.message.includes('غير موجود')) return fail(res, e.message, 404);
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/readings/batch
 * @desc   استقبال مجموعة قراءات (Batch Ingestion)
 */
router.post('/readings/batch', async (req, res) => {
  try {
    const { readings } = req.body;
    if (!Array.isArray(readings) || readings.length === 0) {
      return fail(res, 'يجب إرسال مصفوفة readings', 400);
    }

    const results = [];
    const errors = [];
    for (const r of readings) {
      try {
        const reading = await service.processReading(r);
        results.push({ serial_number: r.serial_number, id: reading._id });
      } catch (e) {
        errors.push({ serial_number: r.serial_number, error: e.message });
      }
    }

    ok(res, { data: { processed: results.length, failed: errors.length, results, errors } });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 التنبيهات — Alerts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/alerts
 * @desc   قائمة التنبيهات
 */
router.get('/alerts', async (req, res) => {
  try {
    const { status, severity, branch_id, page = 1, limit = 20 } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const total = await IotAlert.countDocuments(query);
    const alerts = await IotAlert.find(query)
      .populate('device_id', 'name serial_number')
      .populate('beneficiary_id', 'full_name')
      .sort({ triggered_at: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: alerts, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/alerts/:id/acknowledge
 * @desc   الإقرار بتنبيه
 */
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alert = await IotAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: 'acknowledged',
        acknowledged_at: new Date(),
        acknowledged_by: req.user?.id,
      },
      { new: true }
    );
    if (!alert) return fail(res, 'التنبيه غير موجود', 404);
    ok(res, { data: alert, message: 'تم الإقرار بالتنبيه' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/alerts/:id/resolve
 * @desc   حل التنبيه
 */
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await IotAlert.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: req.user?.id,
        resolution_notes: req.body.resolution_notes,
      },
      { new: true }
    );
    if (!alert) return fail(res, 'التنبيه غير موجود', 404);
    ok(res, { data: alert, message: 'تم حل التنبيه' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ قواعد التنبيهات — Alert Rules
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/alert-rules
 * @desc   قائمة قواعد التنبيهات
 */
router.get('/alert-rules', async (req, res) => {
  try {
    const { branch_id, metric_type, is_active } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (metric_type) query.metric_type = metric_type;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const rules = await IotAlertRule.find(query)
      .populate('device_type_id', 'name name_ar')
      .sort({ createdAt: -1 })
      .lean();
    ok(res, { data: rules });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/alert-rules
 * @desc   إنشاء قاعدة تنبيه
 */
router.post('/alert-rules', async (req, res) => {
  try {
    const { name, name_ar, metric_type, condition, threshold_min } = req.body;
    if (!name || !name_ar || !metric_type || !condition || threshold_min === undefined) {
      return fail(
        res,
        'الحقول المطلوبة: name, name_ar, metric_type, condition, threshold_min',
        400
      );
    }
    const rule = await IotAlertRule.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });
    ok(res, { data: rule, message: 'تم إنشاء قاعدة التنبيه بنجاح' }, 201);
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/iot-wearables/alert-rules/:id
 * @desc   تحديث قاعدة تنبيه
 */
router.put('/alert-rules/:id', async (req, res) => {
  try {
    const rule = await IotAlertRule.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true, runValidators: true }
    );
    if (!rule) return fail(res, 'القاعدة غير موجودة', 404);
    ok(res, { data: rule, message: 'تم التحديث بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  DELETE /api/iot-wearables/alert-rules/:id
 * @desc   حذف قاعدة تنبيه
 */
router.delete('/alert-rules/:id', async (req, res) => {
  try {
    await IotAlertRule.findByIdAndDelete(req.params.id);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 الصيانة — Maintenance
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/maintenance
 * @desc   قائمة سجلات الصيانة
 */
router.get('/maintenance', async (req, res) => {
  try {
    const { branch_id, status, type, page = 1, limit = 20 } = req.query;
    const query = {};
    if (branch_id) query.branch_id = branch_id;
    if (status) query.status = status;
    if (type) query.type = type;

    const total = await IotMaintenance.countDocuments(query);
    const records = await IotMaintenance.find(query)
      .populate('device_id', 'name serial_number')
      .populate('technician_id', 'name')
      .sort({ scheduled_date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    ok(res, { data: records, total, page: parseInt(page) });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/maintenance
 * @desc   جدولة صيانة جديدة
 */
router.post('/maintenance', async (req, res) => {
  try {
    const { device_id, type, scheduled_date } = req.body;
    if (!device_id || !type || !scheduled_date) {
      return fail(res, 'الحقول المطلوبة: device_id, type, scheduled_date', 400);
    }
    const record = await IotMaintenance.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });
    ok(res, { data: record, message: 'تم جدولة الصيانة بنجاح' }, 201);
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  PUT /api/iot-wearables/maintenance/:id
 * @desc   تحديث سجل صيانة
 */
router.put('/maintenance/:id', async (req, res) => {
  try {
    const record = await IotMaintenance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_by: req.user?.id },
      { new: true }
    );
    if (!record) return fail(res, 'السجل غير موجود', 404);

    // تحديث تاريخ الصيانة التالية في الجهاز إن اكتملت
    if (req.body.status === 'completed' && req.body.completed_date) {
      await IotDevice.findByIdAndUpdate(record.device_id, {
        next_maintenance_date: req.body.next_maintenance_date,
        calibration_date: record.type === 'calibration' ? req.body.completed_date : undefined,
      });
    }

    ok(res, { data: record, message: 'تم التحديث بنجاح' });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 💗 خطوط الأساس للعلامات الحيوية — Vital Baselines
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/baselines/beneficiary/:id
 * @desc   خطوط الأساس لمستفيد محدد
 */
router.get('/baselines/beneficiary/:id', async (req, res) => {
  try {
    const baselines = await VitalBaseline.find({
      beneficiary_id: req.params.id,
      $or: [{ effective_to: null }, { effective_to: { $gte: new Date() } }],
    })
      .populate('set_by', 'name')
      .lean();
    ok(res, { data: baselines });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  POST /api/iot-wearables/baselines
 * @desc   تعيين خط أساس للعلامات الحيوية
 */
router.post('/baselines', async (req, res) => {
  try {
    const { beneficiary_id, metric_type, baseline_min, baseline_max, unit, effective_from } =
      req.body;
    if (
      !beneficiary_id ||
      !metric_type ||
      baseline_min === undefined ||
      baseline_max === undefined ||
      !unit ||
      !effective_from
    ) {
      return fail(res, 'الحقول المطلوبة ناقصة', 400);
    }

    // إنهاء الخط الأساسي الحالي للمقياس نفسه
    await VitalBaseline.updateMany(
      { beneficiary_id, metric_type, effective_to: null },
      { effective_to: new Date(effective_from) }
    );

    const baseline = await VitalBaseline.create({
      ...req.body,
      uuid: require('crypto').randomUUID(),
      set_by: req.user?.id || req.body.set_by,
      branch_id: req.body.branch_id || req.headers['x-branch-id'],
      created_by: req.user?.id,
    });

    ok(res, { data: baseline, message: 'تم تعيين خط الأساس بنجاح' }, 201);
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 علامات حيوية المستفيد — Beneficiary Vitals
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/beneficiary/:id/vitals
 * @desc   العلامات الحيوية لمستفيد محدد
 */
router.get('/beneficiary/:id/vitals', async (req, res) => {
  try {
    const result = await service.getBeneficiaryVitals(req.params.id, req.query);
    ok(res, { data: result });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/beneficiary/:id/devices
 * @desc   أجهزة مستفيد محدد
 */
router.get('/beneficiary/:id/devices', async (req, res) => {
  try {
    const assignments = await IotDeviceAssignment.find({
      beneficiary_id: req.params.id,
      status: 'active',
    })
      .populate({
        path: 'device_id',
        populate: { path: 'device_type_id', select: 'name name_ar category supported_metrics' },
      })
      .lean();

    const devices = assignments.map(a => {
      const d = a.device_id;
      d.is_online =
        d.last_ping_at && Date.now() - new Date(d.last_ping_at).getTime() < 5 * 60 * 1000;
      return d;
    });

    ok(res, { data: devices });
  } catch (e) {
    fail(res, e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 إحصائيات وتقارير — Statistics & Reports
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route  GET /api/iot-wearables/stats
 * @desc   إحصائيات عامة
 */
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.query.branch_id || req.headers['x-branch-id'];
    const stats = await service.getStats(branchId);
    ok(res, { data: stats });
  } catch (e) {
    fail(res, e.message);
  }
});

/**
 * @route  GET /api/iot-wearables/readings/aggregate
 * @desc   تجميع القراءات الإحصائية
 */
router.get('/readings/aggregate', async (req, res) => {
  try {
    const { device_id, beneficiary_id, metric_type, from, to, interval = 'hour' } = req.query;

    const matchStage = {};
    if (device_id) matchStage.device_id = require('mongoose').Types.ObjectId(device_id);
    if (beneficiary_id)
      matchStage.beneficiary_id = require('mongoose').Types.ObjectId(beneficiary_id);
    if (metric_type) matchStage.metric_type = metric_type;
    if (from || to) {
      matchStage.recorded_at = {};
      if (from) matchStage.recorded_at.$gte = new Date(from);
      if (to) matchStage.recorded_at.$lte = new Date(to);
    }

    const groupFormat =
      interval === 'day' ? '%Y-%m-%d' : interval === 'minute' ? '%Y-%m-%dT%H:%M' : '%Y-%m-%dT%H';

    const aggregated = await IotReading.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            metric: '$metric_type',
            period: { $dateToString: { format: groupFormat, date: '$recorded_at' } },
          },
          avg_value: { $avg: '$value' },
          min_value: { $min: '$value' },
          max_value: { $max: '$value' },
          count: { $sum: 1 },
          anomaly_count: { $sum: { $cond: ['$is_anomaly', 1, 0] } },
        },
      },
      { $sort: { '_id.period': 1 } },
    ]);

    ok(res, { data: aggregated });
  } catch (e) {
    fail(res, e.message);
  }
});

module.exports = router;
