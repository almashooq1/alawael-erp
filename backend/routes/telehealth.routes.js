/**
 * Telehealth Routes — مسارات وحدة الطب عن بعد
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  Teleconsultation,
  TelehealthWaitingRoom,
  RemotePrescription,
  ProviderAvailabilitySlot,
  TelehealthDevice,
  VirtualSession,
  SessionRecording,
} = require('../models/Telehealth');

const {
  scheduleConsultation,
  startConsultation,
  endConsultation,
  joinWaitingRoom,
  updateDeviceTest,
  addParticipant,
  detectAndAdjustQuality,
  issuePrescription,
  getDashboardStats,
  getProviderQueue,
  generateAgoraToken,
} = require('../services/telehealthService');

const { v4: uuidv4 } = require('uuid');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ─── Middleware ───────────────────────────────────────────────────────────────

router.use(authenticate);
router.use(requireBranchAccess);
// ─── Dashboard & Stats ────────────────────────────────────────────────────────

/**
 * GET /api/telehealth/stats
 * إحصائيات لوحة التحكم
 */
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.user.branch || req.query.branchId;
    const stats = await getDashboardStats(branchId);
    res.json({ success: true, data: stats });
  } catch (err) {
    safeError(res, err);
  }
});

// ─── Consultations ────────────────────────────────────────────────────────────

/**
 * GET /api/telehealth/consultations
 * قائمة الاستشارات مع فلترة وترقيم صفحات
 */
router.get('/consultations', async (req, res) => {
  try {
    const { status, date, providerId, search, page = 1, limit = 20 } = req.query;
    const branchId = req.user.branch;

    const filter = { branch: branchId };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.scheduledAt = { $gte: d, $lt: nextDay };
    }
    if (providerId) filter.provider = providerId;

    const query = Teleconsultation.find(filter)
      .populate('beneficiary', 'name nationalId phone')
      .populate('provider', 'name specialty')
      .sort({ scheduledAt: -1 });

    if (search) {
      // Search is done via populate filter — use aggregation for production
      const all = await query.lean();
      const filtered = all.filter(
        c => c.beneficiary?.name?.includes(search) || c.consultationNumber?.includes(search)
      );
      return res.json({
        success: true,
        data: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page: Number(page),
        pages: Math.ceil(filtered.length / limit),
      });
    }

    const total = await Teleconsultation.countDocuments(filter);
    const consultations = await query
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: consultations,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/telehealth/consultations
 * حجز استشارة جديدة
 */
router.post(
  '/consultations',
  authorize(['admin', 'branch_admin', 'therapist', 'doctor', 'receptionist']),
  async (req, res) => {
    try {
      const consultation = await scheduleConsultation({
        ...req.body,
        branchId: req.user.branch,
      });
      res.status(201).json({
        success: true,
        message: `تم جدولة الاستشارة بنجاح — ${consultation.consultationNumber}`,
        data: consultation,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/telehealth/consultations/:id
 * تفاصيل استشارة محددة
 */
router.get('/consultations/:id', async (req, res) => {
  try {
    const consultation = await Teleconsultation.findById(req.params.id)
      .populate('beneficiary', 'name nationalId phone dateOfBirth')
      .populate('provider', 'name specialty licenseNumber')
      .populate('cancelledBy', 'name')
      .lean();

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'الاستشارة غير موجودة' });
    }

    // Load related data
    const [waitingRoom, prescriptions, recording, participants, virtualSession] = await Promise.all(
      [
        TelehealthWaitingRoom.findOne({ teleconsultation: req.params.id }).lean(),
        RemotePrescription.find({ teleconsultation: req.params.id })
          .populate('prescriber', 'name')
          .lean(),
        SessionRecording.findOne({ teleconsultation: req.params.id }).lean(),
        require('../models/Telehealth').TeleconsultationParticipant
          ? require('../models/Telehealth')
              .TeleconsultationParticipant.find({
                teleconsultation: req.params.id,
              })
              .lean()
          : [],
        VirtualSession.findOne({ teleconsultation: req.params.id }).lean(),
      ]
    );

    res.json({
      success: true,
      data: {
        ...consultation,
        waitingRoom,
        prescriptions,
        recording,
        participants,
        virtualSession,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * PATCH /api/telehealth/consultations/:id
 * تحديث بيانات استشارة (الملاحظات، إلخ)
 */
router.patch('/consultations/:id', async (req, res) => {
  try {
    const allowed = ['clinicalNotes', 'notesBefore', 'chiefComplaint', 'vitalSigns', 'summary'];
    const update = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const consultation = await Teleconsultation.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    res.json({ success: true, data: consultation });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/telehealth/consultations/:id
 * إلغاء استشارة
 */
router.delete(
  '/consultations/:id',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const { reason } = req.body;
      await Teleconsultation.findByIdAndUpdate(req.params.id, {
        status: 'cancelled',
        cancelledBy: req.user._id,
        cancellationReason: reason,
      });
      res.json({ success: true, message: 'تم إلغاء الاستشارة' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /api/telehealth/consultations/:id/start
 * بدء الجلسة وتوليد توكنات WebRTC
 */
router.post(
  '/consultations/:id/start',
  authorize(['admin', 'branch_admin', 'doctor', 'therapist', 'medical_director']),
  async (req, res) => {
    try {
      const tokens = await startConsultation(req.params.id);
      res.json({ success: true, message: 'تم بدء الجلسة', data: tokens });
    } catch (err) {
      res.status(422).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /api/telehealth/consultations/:id/end
 * إنهاء الجلسة وحفظ الملاحظات السريرية
 */
router.post(
  '/consultations/:id/end',
  authorize(['admin', 'branch_admin', 'doctor', 'therapist', 'medical_director']),
  async (req, res) => {
    try {
      const consultation = await endConsultation(req.params.id, req.body);
      res.json({ success: true, message: 'تم إنهاء الجلسة بنجاح', data: consultation });
    } catch (err) {
      res.status(422).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /api/telehealth/consultations/:id/participants
 * إضافة مشارك (ولي أمر/مترجم)
 */
router.post('/consultations/:id/participants', async (req, res) => {
  try {
    const result = await addParticipant(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(422).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/telehealth/consultations/:id/adjust-quality
 * ضبط جودة الاتصال تلقائياً
 */
router.post('/consultations/:id/adjust-quality', async (req, res) => {
  try {
    const { bandwidthKbps } = req.body;
    if (!bandwidthKbps) {
      return res.status(400).json({ success: false, message: 'bandwidthKbps مطلوب' });
    }
    const settings = await detectAndAdjustQuality(req.params.id, Number(bandwidthKbps));
    res.json({ success: true, data: settings });
  } catch (err) {
    safeError(res, err);
  }
});

// ─── Waiting Room ─────────────────────────────────────────────────────────────

/**
 * GET /api/telehealth/waiting-room/:consultationId
 * عرض غرفة الانتظار
 */
router.get('/waiting-room/:consultationId', async (req, res) => {
  try {
    const waitingRoom = await TelehealthWaitingRoom.findOne({
      teleconsultation: req.params.consultationId,
    })
      .populate('beneficiary', 'name')
      .lean();

    const consultation = await Teleconsultation.findById(req.params.consultationId)
      .populate('beneficiary', 'name')
      .populate('provider', 'name')
      .lean();

    const queueLength = await TelehealthWaitingRoom.countDocuments({
      branch: consultation?.branch,
      status: 'waiting',
    });

    res.json({ success: true, data: { consultation, waitingRoom, queueLength } });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/telehealth/waiting-room/:consultationId/join
 * انضمام المريض لغرفة الانتظار
 */
router.post('/waiting-room/:consultationId/join', async (req, res) => {
  try {
    const waitingRoom = await joinWaitingRoom(req.params.consultationId, req.body);
    res.json({
      success: true,
      data: waitingRoom,
      position: waitingRoom.queuePosition,
      message: 'تم الانضمام لغرفة الانتظار. سيتم استدعاؤك قريباً.',
    });
  } catch (err) {
    res.status(422).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/telehealth/waiting-room/:id/device-test
 * تحديث نتيجة اختبار الجهاز
 */
router.patch('/waiting-room/:id/device-test', async (req, res) => {
  try {
    const { room, isReady } = await updateDeviceTest(req.params.id, req.body);
    res.json({ success: true, data: room, isReady });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/telehealth/provider/queue
 * قائمة انتظار المريض للمعالج
 */
router.get('/provider/queue', async (req, res) => {
  try {
    const branchId = req.user.branch;
    const providerId = req.user.employeeId || req.user._id;
    const queue = await getProviderQueue(branchId, providerId);
    res.json({ success: true, data: queue });
  } catch (err) {
    safeError(res, err);
  }
});

// ─── Prescriptions ────────────────────────────────────────────────────────────

/**
 * POST /api/telehealth/consultations/:id/prescriptions
 * إصدار وصفة طبية إلكترونية
 */
router.post(
  '/consultations/:id/prescriptions',
  authorize(['admin', 'medical_director', 'doctor']),
  async (req, res) => {
    try {
      const prescriberId = req.user.employeeId || req.user._id;
      const prescription = await issuePrescription(req.params.id, prescriberId, req.body);
      res.status(201).json({
        success: true,
        message: `تم إصدار الوصفة بنجاح — ${prescription.prescriptionNumber}`,
        data: prescription,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/telehealth/prescriptions/:id
 * تفاصيل وصفة طبية
 */
router.get('/prescriptions/:id', async (req, res) => {
  try {
    const prescription = await RemotePrescription.findById(req.params.id)
      .populate('prescriber', 'name licenseNumber')
      .populate('beneficiary', 'name nationalId')
      .populate('teleconsultation', 'consultationNumber scheduledAt')
      .lean();
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
    }
    res.json({ success: true, data: prescription });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/telehealth/prescriptions/:id/cancel
 * إلغاء وصفة طبية
 */
router.post(
  '/prescriptions/:id/cancel',
  authorize(['admin', 'medical_director', 'doctor']),
  async (req, res) => {
    try {
      const prescription = await RemotePrescription.findById(req.params.id);
      if (!prescription) {
        return res.status(404).json({ success: false, message: 'الوصفة غير موجودة' });
      }
      if (prescription.status === 'dispensed') {
        return res.status(422).json({ success: false, message: 'لا يمكن إلغاء وصفة تم صرفها.' });
      }
      await prescription.updateOne({
        status: 'cancelled',
        specialNotes: req.body.reason,
      });
      res.json({ success: true, message: 'تم إلغاء الوصفة.' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/telehealth/prescriptions/verify/:uuid
 * التحقق من صحة وصفة طبية (بدون مصادقة)
 */
router.get('/prescriptions/verify/:uuid', async (req, res) => {
  try {
    const prescription = await RemotePrescription.findOne({ uuid: req.params.uuid })
      .populate('prescriber', 'name licenseNumber')
      .populate('beneficiary', 'name nationalId')
      .lean();
    if (!prescription) {
      return res.status(404).json({ success: false, message: 'الوصفة غير موجودة أو غير صالحة' });
    }
    const isExpired = prescription.validUntil && new Date(prescription.validUntil) < new Date();
    res.json({
      success: true,
      data: {
        prescriptionNumber: prescription.prescriptionNumber,
        beneficiaryName: prescription.beneficiary?.name,
        prescriberName: prescription.prescriber?.name,
        type: prescription.type,
        status: prescription.status,
        issuedAt: prescription.issuedAt,
        validUntil: prescription.validUntil,
        isExpired,
      },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// ─── Provider Availability Slots ──────────────────────────────────────────────

/**
 * GET /api/telehealth/availability-slots
 * فترات توفر المعالجين
 */
router.get('/availability-slots', async (req, res) => {
  try {
    const { providerId, date, status = 'available' } = req.query;
    const filter = { branch: req.user.branch };
    if (providerId) filter.provider = providerId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.slotDate = { $gte: d, $lt: next };
    }
    if (status) filter.status = status;

    const slots = await ProviderAvailabilitySlot.find(filter)
      .populate('provider', 'name specialty')
      .sort({ slotDate: 1, startTime: 1 })
      .lean();

    res.json({ success: true, data: slots });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/telehealth/availability-slots
 * إضافة فترة توفر جديدة
 */
router.post(
  '/availability-slots',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const slot = await ProviderAvailabilitySlot.create({
        ...req.body,
        branch: req.user.branch,
      });
      res.status(201).json({ success: true, data: slot });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /api/telehealth/availability-slots/bulk
 * إضافة فترات توفر متعددة دفعة واحدة
 */
router.post(
  '/availability-slots/bulk',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const { slots } = req.body;
      if (!Array.isArray(slots)) {
        return res.status(400).json({ success: false, message: 'slots يجب أن تكون مصفوفة' });
      }
      const docs = slots.map(s => ({ ...s, branch: req.user.branch, uuid: uuidv4() }));
      const created = await ProviderAvailabilitySlot.insertMany(docs);
      res.status(201).json({ success: true, data: created, count: created.length });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/telehealth/availability-slots/:id
 */
router.get('/availability-slots/:id', async (req, res) => {
  try {
    const slot = await ProviderAvailabilitySlot.findById(req.params.id)
      .populate('provider', 'name specialty')
      .lean();
    if (!slot) return res.status(404).json({ success: false, message: 'الفترة غير موجودة' });
    res.json({ success: true, data: slot });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * PATCH /api/telehealth/availability-slots/:id
 */
router.patch(
  '/availability-slots/:id',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const slot = await ProviderAvailabilitySlot.findByIdAndUpdate(
        req.params.id,
        stripUpdateMeta(req.body),
        {
          new: true,
        }
      );
      res.json({ success: true, data: slot });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * DELETE /api/telehealth/availability-slots/:id
 */
router.delete('/availability-slots/:id', authorize(['admin', 'branch_admin']), async (req, res) => {
  try {
    await ProviderAvailabilitySlot.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/telehealth/providers/:providerId/availability
 * فترات توفر معالج محدد
 */
router.get('/providers/:providerId/availability', async (req, res) => {
  try {
    const { from, to, status = 'available' } = req.query;
    const filter = {
      branch: req.user.branch,
      provider: req.params.providerId,
      status,
    };
    if (from) filter.slotDate = { $gte: new Date(from) };
    if (to) {
      filter.slotDate = filter.slotDate || {};
      filter.slotDate.$lte = new Date(to);
    }
    const slots = await ProviderAvailabilitySlot.find(filter)
      .sort({ slotDate: 1, startTime: 1 })
      .lean();
    res.json({ success: true, data: slots });
  } catch (err) {
    safeError(res, err);
  }
});

// ─── Remote Monitoring ────────────────────────────────────────────────────────

/**
 * GET /api/telehealth/devices
 * أجهزة المراقبة عن بعد
 */
router.get('/devices', async (req, res) => {
  try {
    const { beneficiaryId, deviceType, status } = req.query;
    const filter = { branch: req.user.branch };
    if (beneficiaryId) filter.beneficiary = beneficiaryId;
    if (deviceType) filter.deviceType = deviceType;
    if (status) filter.status = status;

    const devices = await TelehealthDevice.find(filter)
      .populate('beneficiary', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: devices });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/telehealth/devices
 * تسجيل جهاز مراقبة جديد
 */
router.post(
  '/devices',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const device = await TelehealthDevice.create({
        ...req.body,
        uuid: uuidv4(),
        branch: req.user.branch,
      });
      res.status(201).json({ success: true, data: device });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * POST /api/telehealth/devices/:id/reading
 * تسجيل قراءة من جهاز المراقبة
 */
router.post('/devices/:id/reading', async (req, res) => {
  try {
    const device = await TelehealthDevice.findByIdAndUpdate(
      req.params.id,
      {
        lastReadingAt: new Date(),
        lastReadingData: req.body.reading,
      },
      { new: true }
    );
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    // Check alert thresholds
    const alerts = checkAlertThresholds(device, req.body.reading);

    res.json({ success: true, data: device, alerts });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

function checkAlertThresholds(device, reading) {
  const alerts = [];
  if (!device.alertEnabled || !device.alertThresholds) return alerts;

  const thresholds = device.alertThresholds;
  Object.keys(reading || {}).forEach(key => {
    const val = reading[key];
    const th = thresholds[key];
    if (th) {
      if (th.min !== undefined && val < th.min) {
        alerts.push({ field: key, value: val, type: 'below_min', threshold: th.min });
      }
      if (th.max !== undefined && val > th.max) {
        alerts.push({ field: key, value: val, type: 'above_max', threshold: th.max });
      }
    }
  });
  return alerts;
}

// ─── Virtual Sessions ─────────────────────────────────────────────────────────

/**
 * POST /api/telehealth/virtual-sessions
 * إنشاء جلسة افتراضية
 */
router.post('/virtual-sessions', async (req, res) => {
  try {
    const session = await VirtualSession.create({
      ...req.body,
      uuid: uuidv4(),
      branch: req.user.branch,
    });
    res.status(201).json({ success: true, data: session });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/telehealth/virtual-sessions/:id/whiteboard
 * حفظ بيانات اللوح الأبيض
 */
router.patch('/virtual-sessions/:id/whiteboard', async (req, res) => {
  try {
    const session = await VirtualSession.findByIdAndUpdate(
      req.params.id,
      { whiteboardData: req.body.data },
      { new: true }
    );
    res.json({ success: true, data: session });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Session Recordings ───────────────────────────────────────────────────────

/**
 * GET /api/telehealth/recordings/:consultationId
 * جلب تسجيل الجلسة
 */
router.get('/recordings/:consultationId', async (req, res) => {
  try {
    const recording = await SessionRecording.findOne({
      teleconsultation: req.params.consultationId,
    }).lean();
    if (!recording) {
      return res.status(404).json({ success: false, message: 'لا يوجد تسجيل لهذه الجلسة' });
    }
    res.json({ success: true, data: recording });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;
