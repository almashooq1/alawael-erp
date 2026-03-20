/**
 * Student Health Tracker Routes
 * مسارات المتابعة الصحية اليومية للطلاب
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// ─── Health Record Schema ────────────────────────────────────────────────────
const healthRecordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, default: Date.now },
    type: {
      type: String,
      enum: ['فحص يومي', 'تقرير طبي', 'تطعيم', 'دواء', 'حالة طارئة', 'فحص دوري', 'متابعة'],
      required: true,
    },
    vitalSigns: {
      temperature: Number, // درجة الحرارة
      heartRate: Number, // معدل نبض القلب
      bloodPressure: String, // ضغط الدم
      weight: Number, // الوزن
      height: Number, // الطول
      oxygenLevel: Number, // مستوى الأكسجين
    },
    generalCondition: {
      type: String,
      enum: ['ممتاز', 'جيد', 'متوسط', 'يحتاج متابعة', 'حرج'],
      default: 'جيد',
    },
    symptoms: [
      {
        name: String,
        severity: { type: String, enum: ['خفيف', 'متوسط', 'شديد'] },
        startDate: Date,
        notes: String,
      },
    ],
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String, // مرة يومياً، مرتين، إلخ
        startDate: Date,
        endDate: Date,
        administered: { type: Boolean, default: false },
        administeredAt: Date,
        administeredBy: String,
        sideEffects: String,
      },
    ],
    allergies: [
      {
        allergen: String,
        reaction: String,
        severity: { type: String, enum: ['خفيف', 'متوسط', 'شديد', 'مهدد للحياة'] },
        discoveredAt: Date,
      },
    ],
    vaccinations: [
      {
        name: String,
        doseNumber: Number,
        administeredAt: Date,
        nextDoseDate: Date,
        batchNumber: String,
        provider: String,
      },
    ],
    moodTracking: {
      mood: { type: String, enum: ['سعيد جداً', 'سعيد', 'طبيعي', 'حزين', 'قلق', 'غاضب'] },
      energyLevel: { type: Number, min: 1, max: 10 },
      sleepQuality: { type: String, enum: ['ممتاز', 'جيد', 'متوسط', 'سيء'] },
      sleepHours: Number,
      notes: String,
    },
    nutritionLog: {
      breakfast: { type: Boolean, default: false },
      lunch: { type: Boolean, default: false },
      snacks: { type: Boolean, default: false },
      waterIntake: Number, // عدد الأكواب
      specialDiet: String,
      notes: String,
    },
    physicalActivity: {
      type: String,
      duration: Number, // بالدقائق
      intensity: { type: String, enum: ['خفيف', 'متوسط', 'مكثف'] },
      notes: String,
    },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recorderName: String,
    recorderRole: { type: String, enum: ['ممرض', 'طبيب', 'معالج', 'معلم', 'ولي أمر', 'النظام'] },
    doctorNotes: String,
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    followUpNotes: String,
    attachments: [{ name: String, url: String, type: String }],
    alerts: [
      {
        type: { type: String, enum: ['تنبيه دواء', 'موعد تطعيم', 'فحص دوري', 'حالة طارئة'] },
        message: String,
        isRead: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

healthRecordSchema.index({ studentId: 1, date: -1 });

let HealthRecord;
try {
  HealthRecord = mongoose.model('StudentHealthRecord');
} catch {
  HealthRecord = mongoose.model('StudentHealthRecord', healthRecordSchema);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET / — سجلات المتابعة الصحية
router.get('/:studentId', async (req, res) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 15 } = req.query;
    const filter = { studentId: req.params.studentId };
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      HealthRecord.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      HealthRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Health records list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب السجلات الصحية' });
  }
});

// GET /today — الحالة الصحية اليوم
router.get('/:studentId/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await HealthRecord.find({
      studentId: req.params.studentId,
      date: { $gte: today, $lt: tomorrow },
    })
      .sort({ date: -1 })
      .lean();

    // جلب التنبيهات النشطة
    const alerts = await HealthRecord.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(req.params.studentId) } },
      { $unwind: '$alerts' },
      { $match: { 'alerts.isRead': false } },
      { $sort: { 'alerts.createdAt': -1 } },
      { $limit: 10 },
      { $project: { alert: '$alerts' } },
    ]);

    // جلب الأدوية المطلوبة اليوم
    const medications = await HealthRecord.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(req.params.studentId) } },
      { $unwind: '$medications' },
      {
        $match: {
          'medications.startDate': { $lte: tomorrow },
          $or: [{ 'medications.endDate': { $gte: today } }, { 'medications.endDate': null }],
        },
      },
      { $project: { medication: '$medications' } },
    ]);

    res.json({
      success: true,
      data: {
        records,
        alerts: alerts.map(a => a.alert),
        todayMedications: medications.map(m => m.medication),
        hasCheckIn: records.some(r => r.type === 'فحص يومي'),
      },
    });
  } catch (err) {
    logger.error('Health today error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحالة الصحية اليومية' });
  }
});

// POST / — إضافة سجل صحي جديد
router.post('/:studentId', async (req, res) => {
  try {
    const record = new HealthRecord({
      studentId: req.params.studentId,
      recordedBy: req.user?._id,
      recorderName: req.user?.fullName,
      ...req.body,
    });
    await record.save();
    logger.info(`Health record created for student ${req.params.studentId}`);
    res.status(201).json({ success: true, data: record, message: 'تم تسجيل الحالة الصحية بنجاح' });
  } catch (err) {
    logger.error('Health record create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل الحالة الصحية' });
  }
});

// POST /daily-checkin — التسجيل الصحي اليومي
router.post('/:studentId/daily-checkin', async (req, res) => {
  try {
    const record = new HealthRecord({
      studentId: req.params.studentId,
      type: 'فحص يومي',
      recordedBy: req.user?._id,
      recorderName: req.user?.fullName || 'النظام',
      recorderRole: req.user?.role || 'النظام',
      ...req.body,
    });

    // إنشاء تنبيهات تلقائية
    if (req.body.vitalSigns?.temperature > 38) {
      record.alerts.push({
        type: 'حالة طارئة',
        message: 'درجة حرارة مرتفعة - يرجى المراجعة الطبية',
      });
      record.followUpRequired = true;
    }
    if (req.body.generalCondition === 'يحتاج متابعة' || req.body.generalCondition === 'حرج') {
      record.followUpRequired = true;
      record.alerts.push({ type: 'حالة طارئة', message: 'الحالة العامة تحتاج متابعة طبية عاجلة' });
    }

    await record.save();
    res.status(201).json({ success: true, data: record, message: 'تم التسجيل الصحي اليومي بنجاح' });
  } catch (err) {
    logger.error('Daily checkin error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التسجيل الصحي اليومي' });
  }
});

// GET /summary — ملخص صحي شامل
router.get('/:studentId/summary', async (req, res) => {
  try {
    const studentId = new mongoose.Types.ObjectId(req.params.studentId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentRecords, moodTrend, conditionStats, medicationCompliance] = await Promise.all([
      HealthRecord.find({ studentId, date: { $gte: thirtyDaysAgo } })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
      HealthRecord.aggregate([
        {
          $match: {
            studentId,
            date: { $gte: thirtyDaysAgo },
            'moodTracking.mood': { $exists: true },
          },
        },
        { $group: { _id: '$moodTracking.mood', count: { $sum: 1 } } },
      ]),
      HealthRecord.aggregate([
        { $match: { studentId, date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$generalCondition', count: { $sum: 1 } } },
      ]),
      HealthRecord.aggregate([
        { $match: { studentId } },
        { $unwind: '$medications' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            administered: { $sum: { $cond: ['$medications.administered', 1, 0] } },
          },
        },
      ]),
    ]);

    const compliance = medicationCompliance[0];
    res.json({
      success: true,
      data: {
        recentRecords: recentRecords.length,
        moodDistribution: moodTrend.reduce((a, m) => {
          a[m._id] = m.count;
          return a;
        }, {}),
        conditionDistribution: conditionStats.reduce((a, c) => {
          a[c._id] = c.count;
          return a;
        }, {}),
        medicationCompliance: compliance
          ? Math.round((compliance.administered / compliance.total) * 100)
          : 100,
        latestRecord: recentRecords[0] || null,
        alerts: recentRecords.flatMap(r => r.alerts?.filter(a => !a.isRead) || []).slice(0, 5),
      },
    });
  } catch (err) {
    logger.error('Health summary error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الملخص الصحي' });
  }
});

// PUT /:id — تحديث سجل صحي
router.put('/:studentId/:id', async (req, res) => {
  try {
    const record = await HealthRecord.findOneAndUpdate(
      { _id: req.params.id, studentId: req.params.studentId },
      { $set: req.body },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
    res.json({ success: true, data: record, message: 'تم تحديث السجل الصحي' });
  } catch (err) {
    logger.error('Health record update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث السجل الصحي' });
  }
});

// POST /medication-reminder — تنبيه دواء
router.post('/:studentId/medication-reminder', async (req, res) => {
  try {
    const { medicationName, time: _time, notes } = req.body;
    const record = new HealthRecord({
      studentId: req.params.studentId,
      type: 'دواء',
      recordedBy: req.user?._id,
      recorderName: 'النظام',
      recorderRole: 'النظام',
      alerts: [
        {
          type: 'تنبيه دواء',
          message: `تذكير: حان وقت تناول ${medicationName}`,
        },
      ],
      doctorNotes: notes,
    });
    await record.save();
    res.status(201).json({ success: true, data: record, message: 'تم إنشاء تنبيه الدواء' });
  } catch (err) {
    logger.error('Medication reminder error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء تنبيه الدواء' });
  }
});

module.exports = router;
