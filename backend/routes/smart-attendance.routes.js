/**
 * Smart Attendance Routes — مسارات الحضور الذكي
 * CRUD APIs for: SmartAttendanceRecord, AttendanceBehaviorPattern,
 * AttendanceAppeal, ParentNotificationPreferences, BiometricEnrollment,
 * AttendanceAnomalyAlert, AttendanceSummaryReport, CameraDevice,
 * BiometricDevice, FaceRecognitionData, FingerprintData, AttendanceViaCamera
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { escapeRegex } = require('../utils/sanitize');
const {
  SmartAttendanceRecord,
  AttendanceBehaviorPattern,
  AttendanceAppeal,
  ParentNotificationPreferences,
  BiometricEnrollment,
  AttendanceAnomalyAlert,
  AttendanceSummaryReport,
  CameraDevice,
  BiometricDevice,
  FaceRecognitionData,
  FingerprintData,
  AttendanceViaCamera,
} = require('../models/smartAttendance.model');

/* ================================================================
   Helper: generic CRUD factory
   ================================================================ */
function buildCrud(Model, modelName, opts = {}) {
  const sub = express.Router();
  const { filterFields = [], searchFields = [], defaultSort = { createdAt: -1 } } = opts;

  // GET /
  sub.get('/', requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 25, search, student_id, status, ...rest } = req.query;
      const filter = {};
      if (student_id) filter.student_id = student_id;
      if (status) filter.status = status;
      filterFields.forEach(f => {
        if (rest[f]) filter[f] = rest[f];
      });
      if (search && searchFields.length) {
        filter.$or = searchFields.map(sf => ({ [sf]: { $regex: escapeRegex(String(search)), $options: 'i' } }));
      }
      const skip = (Number(page) - 1) * Number(limit);
      const [data, total] = await Promise.all([
        Model.find(filter).sort(defaultSort).skip(skip).limit(Number(limit)).lean(),
        Model.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      });
    } catch (err) {
      logger.error(`${modelName} GET / error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // GET /stats
  sub.get('/stats', requireAuth, async (req, res) => {
    try {
      const total = await Model.countDocuments();
      const byStatus = await Model.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      res.json({ success: true, data: { total, byStatus } });
    } catch (err) {
      logger.error(`${modelName} GET /stats error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // GET /:id
  sub.get('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} GET /:id error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  // POST /
  sub.post('/', requireAuth, async (req, res) => {
    try {
      const doc = await Model.create(req.body);
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} POST / error:`, err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  });

  // PUT /:id
  sub.put('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, data: doc });
    } catch (err) {
      logger.error(`${modelName} PUT /:id error:`, err);
      res.status(400).json({ success: false, message: safeError(err) });
    }
  });

  // DELETE /:id
  sub.delete('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: `${modelName} not found` });
      res.json({ success: true, message: `${modelName} deleted` });
    } catch (err) {
      logger.error(`${modelName} DELETE /:id error:`, err);
      res.status(500).json({ success: false, message: safeError(err) });
    }
  });

  return sub;
}

/* ================================================================
   Mount sub-routers
   ================================================================ */

// 1. Smart Attendance Records — سجلات الحضور الذكي
router.use(
  '/records',
  buildCrud(SmartAttendanceRecord, 'SmartAttendanceRecord', {
    filterFields: ['verification_method', 'attendance_status'],
    defaultSort: { timestamp: -1 },
  })
);

// 2. Behavior Patterns — أنماط السلوك
router.use(
  '/behavior-patterns',
  buildCrud(AttendanceBehaviorPattern, 'AttendanceBehaviorPattern', {
    filterFields: ['risk_level'],
    defaultSort: { analysis_date: -1 },
  })
);

// 3. Appeals — الاعتراضات
router.use(
  '/appeals',
  buildCrud(AttendanceAppeal, 'AttendanceAppeal', {
    filterFields: ['appeal_status', 'appeal_type'],
    defaultSort: { submitted_at: -1 },
  })
);

// 4. Parent Notification Preferences — تفضيلات إشعار الوالدين
router.use(
  '/parent-notification-preferences',
  buildCrud(ParentNotificationPreferences, 'ParentNotificationPreferences', {
    filterFields: ['is_active'],
  })
);

// 5. Biometric Enrollment — تسجيل القياسات الحيوية
router.use(
  '/biometric-enrollments',
  buildCrud(BiometricEnrollment, 'BiometricEnrollment', {
    filterFields: ['biometric_type', 'enrollment_status'],
  })
);

// 6. Anomaly Alerts — تنبيهات الشذوذ
router.use(
  '/anomaly-alerts',
  buildCrud(AttendanceAnomalyAlert, 'AttendanceAnomalyAlert', {
    filterFields: ['alert_type', 'severity', 'resolution_status'],
    defaultSort: { detected_at: -1 },
  })
);

// 7. Summary Reports — التقارير الملخصة
router.use(
  '/summary-reports',
  buildCrud(AttendanceSummaryReport, 'AttendanceSummaryReport', {
    filterFields: ['report_type', 'status'],
    defaultSort: { generated_at: -1 },
  })
);

// 8. Camera Devices — أجهزة الكاميرا
router.use(
  '/camera-devices',
  buildCrud(CameraDevice, 'CameraDevice', {
    filterFields: ['camera_type', 'status'],
    searchFields: ['device_name', 'location.building'],
  })
);

// 9. Biometric Devices — أجهزة القياس الحيوي
router.use(
  '/biometric-devices',
  buildCrud(BiometricDevice, 'BiometricDevice', {
    filterFields: ['device_type', 'status'],
    searchFields: ['device_name'],
  })
);

// 10. Face Recognition Data — بيانات التعرف على الوجه
router.use(
  '/face-recognition',
  buildCrud(FaceRecognitionData, 'FaceRecognitionData', {
    filterFields: ['status'],
  })
);

// 11. Fingerprint Data — بيانات البصمات
router.use(
  '/fingerprint-data',
  buildCrud(FingerprintData, 'FingerprintData', {
    filterFields: ['status'],
  })
);

// 12. Attendance Via Camera — الحضور عبر الكاميرا
router.use(
  '/camera-attendance',
  buildCrud(AttendanceViaCamera, 'AttendanceViaCamera', {
    filterFields: ['verification_status', 'camera_id'],
    defaultSort: { captured_at: -1 },
  })
);

/* ── Index endpoint ─────────────────────────────────────────────── */
router.get('/', requireAuth, (_req, res) => {
  res.json({
    success: true,
    modules: [
      'records',
      'behavior-patterns',
      'appeals',
      'parent-notification-preferences',
      'biometric-enrollments',
      'anomaly-alerts',
      'summary-reports',
      'camera-devices',
      'biometric-devices',
      'face-recognition',
      'fingerprint-data',
      'camera-attendance',
    ],
  });
});

module.exports = router;
