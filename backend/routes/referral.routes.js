/**
 * Referral Routes — مسارات بوابة التحويلات الطبية
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const safeError = require('../utils/safeError');

const {
  Referral,
  ReferralDocument,
  ReferringFacility,
  ReferralCommunication,
  ReferralAssessment,
  FhirIntegrationLog,
} = require('../models/Referral');

const {
  receiveReferral,
  reviewReferral,
  transitionStatus,
  sendCommunication,
  importFromFhir,
  getAnalytics,
  attemptAutoAssignment,
  recalculatePriority,
  canTransition,
} = require('../services/referralService');
const escapeRegex = require('../utils/escapeRegex');
const { stripUpdateMeta } = require('../utils/sanitize');

// ─── Multer Setup ─────────────────────────────────────────────────────────────

const uploadDir = path.join(__dirname, '../uploads/referrals');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc', '.xlsx'];
    const allowedMime = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) && allowedMime.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم'));
  },
});

// ─── Middleware ───────────────────────────────────────────────────────────────

router.use(authenticate);

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * GET /api/referrals/analytics
 * تحليلات وإحصائيات التحويلات
 */
router.get(
  '/analytics',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const branchId = req.user.branch;
      const analytics = await getAnalytics(branchId, req.query);
      res.json({ success: true, data: analytics });
    } catch (err) {
      safeError(res, err);
    }
  }
);

// ─── Referring Facilities ─────────────────────────────────────────────────────

/**
 * GET /api/referrals/facilities
 * قائمة الجهات المحيلة
 */
router.get('/facilities', async (req, res) => {
  try {
    const { type, city, search, isActive = true, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };

    const total = await ReferringFacility.countDocuments(filter);
    const facilities = await ReferringFacility.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: facilities,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/referrals/facilities
 * إضافة جهة محيلة جديدة
 */
router.post(
  '/facilities',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const facility = await ReferringFacility.create({ ...req.body, uuid: uuidv4() });
      res.status(201).json({ success: true, data: facility });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/referrals/facilities/:id
 */
router.get('/facilities/:id', async (req, res) => {
  try {
    const facility = await ReferringFacility.findById(req.params.id).lean();
    if (!facility) return res.status(404).json({ success: false, message: 'الجهة غير موجودة' });
    res.json({ success: true, data: facility });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * PATCH /api/referrals/facilities/:id
 */
router.patch(
  '/facilities/:id',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const facility = await ReferringFacility.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
        new: true,
      });
      res.json({ success: true, data: facility });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * DELETE /api/referrals/facilities/:id
 */
router.delete('/facilities/:id', authorize(['admin']), async (req, res) => {
  try {
    await ReferringFacility.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'تم تعطيل الجهة المحيلة' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Referrals List & Create ──────────────────────────────────────────────────

/**
 * GET /api/referrals
 * قائمة التحويلات مع فلترة
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      priority,
      specialty,
      assignedTo,
      search,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;
    const branchId = req.user.branch;

    const filter = { branch: branchId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (specialty) filter.specialtyRequired = specialty;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      filter.$or = [
        { patientName: { $regex: escapeRegex(search), $options: 'i' } },
        { referralNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { patientNationalId: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const total = await Referral.countDocuments(filter);
    const referrals = await Referral.find(filter)
      .populate('referringFacility', 'name city type')
      .populate('assignedTo', 'name specialty')
      .populate('reviewedBy', 'name')
      .sort({ priorityScore: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: referrals,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/referrals
 * استقبال تحويل جديد
 */
router.post('/', async (req, res) => {
  try {
    const referral = await receiveReferral({
      ...req.body,
      branchId: req.user.branch,
    });
    res.status(201).json({
      success: true,
      message: `تم استقبال التحويل بنجاح — ${referral.referralNumber}`,
      data: referral,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Referral Detail ──────────────────────────────────────────────────────────

/**
 * GET /api/referrals/:id
 * تفاصيل تحويل محدد
 */
router.get('/:id', async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('referringFacility', 'name city type phone email')
      .populate('beneficiary', 'name nationalId phone dateOfBirth')
      .populate('assignedTo', 'name specialty licenseNumber')
      .populate('reviewedBy', 'name')
      .populate('completedBy', 'name')
      .lean();

    if (!referral) {
      return res.status(404).json({ success: false, message: 'التحويل غير موجود' });
    }

    const [documents, communications, assessment] = await Promise.all([
      ReferralDocument.find({ referral: req.params.id }).lean(),
      ReferralCommunication.find({ referral: req.params.id }).sort({ createdAt: -1 }).lean(),
      ReferralAssessment.findOne({ referral: req.params.id }).populate('assessedBy', 'name').lean(),
    ]);

    res.json({
      success: true,
      data: { ...referral, documents, communications, assessment },
    });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * PATCH /api/referrals/:id
 * تحديث بيانات التحويل
 */
router.patch(
  '/:id',
  authorize(['admin', 'branch_admin', 'medical_director', 'receptionist']),
  async (req, res) => {
    try {
      const allowed = [
        'assignedTo',
        'scheduledDate',
        'reviewNotes',
        'requestedDate',
        'clinicalSummary',
      ];
      const update = {};
      allowed.forEach(k => {
        if (req.body[k] !== undefined) update[k] = req.body[k];
      });
      const referral = await Referral.findByIdAndUpdate(req.params.id, update, { new: true });
      res.json({ success: true, data: referral });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ─── Review (Accept/Reject) ───────────────────────────────────────────────────

/**
 * POST /api/referrals/:id/review
 * مراجعة التحويل (قبول أو رفض)
 */
router.post(
  '/:id/review',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const reviewerId = req.user.employeeId || req.user._id;
      const referral = await reviewReferral(req.params.id, reviewerId, req.body);
      res.json({
        success: true,
        message: req.body.decision === 'accepted' ? 'تم قبول التحويل' : 'تم رفض التحويل',
        data: referral,
      });
    } catch (err) {
      res.status(422).json({ success: false, message: err.message });
    }
  }
);

// ─── Status Transition ────────────────────────────────────────────────────────

/**
 * POST /api/referrals/:id/status
 * تغيير حالة التحويل
 */
router.post(
  '/:id/status',
  authorize(['admin', 'branch_admin', 'medical_director', 'therapist']),
  async (req, res) => {
    try {
      const { status, ...data } = req.body;
      const referral = await transitionStatus(
        req.params.id,
        status,
        data,
        req.user.employeeId || req.user._id
      );
      res.json({
        success: true,
        message: `تم تغيير الحالة إلى: ${status}`,
        data: referral,
      });
    } catch (err) {
      res.status(422).json({ success: false, message: err.message });
    }
  }
);

// ─── Auto Assignment ──────────────────────────────────────────────────────────

/**
 * POST /api/referrals/:id/auto-assign
 * محاولة التعيين التلقائي
 */
router.post(
  '/:id/auto-assign',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const referral = await Referral.findById(req.params.id);
      if (!referral) return res.status(404).json({ success: false, message: 'التحويل غير موجود' });

      const assigned = await attemptAutoAssignment(referral);
      if (assigned) {
        const updated = await Referral.findById(req.params.id).populate(
          'assignedTo',
          'name specialty'
        );
        res.json({ success: true, message: 'تم التعيين التلقائي بنجاح', data: updated });
      } else {
        res.json({ success: false, message: 'لا يوجد معالج متاح بالتخصص المطلوب' });
      }
    } catch (err) {
      safeError(res, err);
    }
  }
);

// ─── Priority Recalculation ───────────────────────────────────────────────────

/**
 * POST /api/referrals/:id/recalculate-priority
 * إعادة حساب الأولوية
 */
router.post(
  '/:id/recalculate-priority',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const result = await recalculatePriority(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err);
    }
  }
);

// ─── Communications ───────────────────────────────────────────────────────────

/**
 * GET /api/referrals/:id/communications
 * سجل التواصل مع الطبيب المحيل
 */
router.get('/:id/communications', async (req, res) => {
  try {
    const comms = await ReferralCommunication.find({ referral: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: comms });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/referrals/:id/communications
 * إرسال رسالة للطبيب المحيل
 */
router.post('/:id/communications', async (req, res) => {
  try {
    const senderId = req.user._id;
    const communication = await sendCommunication(req.params.id, senderId, {
      ...req.body,
      senderName: req.user.name,
    });
    res.status(201).json({ success: true, data: communication });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/referrals/communications/:commId/read
 * تعليم الرسالة كمقروءة
 */
router.patch('/communications/:commId/read', async (req, res) => {
  try {
    const comm = await ReferralCommunication.findByIdAndUpdate(
      req.params.commId,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    res.json({ success: true, data: comm });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── Documents ────────────────────────────────────────────────────────────────

/**
 * GET /api/referrals/:id/documents
 * مستندات التحويل
 */
router.get('/:id/documents', async (req, res) => {
  try {
    const docs = await ReferralDocument.find({ referral: req.params.id }).lean();
    res.json({ success: true, data: docs });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/referrals/:id/documents
 * رفع مستند للتحويل
 */
router.post('/:id/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم رفع ملف' });

    const referral = await Referral.findById(req.params.id);
    if (!referral) return res.status(404).json({ success: false, message: 'التحويل غير موجود' });

    const doc = await ReferralDocument.create({
      referral: req.params.id,
      branch: referral.branch,
      documentType: req.body.documentType || 'referral_letter',
      fileName: req.file.originalname,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSizeBytes: req.file.size,
      description: req.body.description,
      documentDate: req.body.documentDate,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/referrals/documents/:docId
 * حذف مستند
 */
router.delete(
  '/documents/:docId',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const doc = await ReferralDocument.findById(req.params.docId);
      if (!doc) return res.status(404).json({ success: false, message: 'المستند غير موجود' });

      // Delete file from disk
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }

      await doc.deleteOne();
      res.json({ success: true, message: 'تم حذف المستند' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ─── Assessment ───────────────────────────────────────────────────────────────

/**
 * GET /api/referrals/:id/assessment
 * تقييم التحويل
 */
router.get('/:id/assessment', async (req, res) => {
  try {
    const assessment = await ReferralAssessment.findOne({ referral: req.params.id })
      .populate('assessedBy', 'name specialty')
      .lean();
    res.json({ success: true, data: assessment });
  } catch (err) {
    safeError(res, err);
  }
});

/**
 * POST /api/referrals/:id/assessment
 * إضافة/تحديث تقييم التحويل
 */
router.post(
  '/:id/assessment',
  authorize(['admin', 'branch_admin', 'medical_director', 'therapist']),
  async (req, res) => {
    try {
      const referral = await Referral.findById(req.params.id);
      if (!referral) return res.status(404).json({ success: false, message: 'التحويل غير موجود' });

      const assessedBy = req.user.employeeId || req.user._id;

      // Upsert assessment
      const assessment = await ReferralAssessment.findOneAndUpdate(
        { referral: req.params.id },
        {
          ...req.body,
          referral: req.params.id,
          branch: referral.branch,
          assessedBy,
          assessmentDate: new Date(),
        },
        { upsert: true, new: true }
      ).populate('assessedBy', 'name');

      res.json({ success: true, data: assessment });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ─── FHIR Integration ─────────────────────────────────────────────────────────

/**
 * POST /api/referrals/fhir/import
 * استيراد تحويل من FHIR ServiceRequest
 */
router.post(
  '/fhir/import',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const { fhirResource, facilityId } = req.body;
      if (!fhirResource) {
        return res.status(400).json({ success: false, message: 'fhirResource مطلوب' });
      }

      const referral = await importFromFhir(fhirResource, req.user.branch, facilityId);
      res.status(201).json({
        success: true,
        message: `تم استيراد التحويل من FHIR — ${referral.referralNumber}`,
        data: referral,
      });
    } catch (err) {
      res.status(422).json({ success: false, message: err.message });
    }
  }
);

/**
 * GET /api/referrals/fhir/logs
 * سجلات تكامل FHIR
 */
router.get(
  '/fhir/logs',
  authorize(['admin', 'branch_admin', 'medical_director']),
  async (req, res) => {
    try {
      const { resourceType, status, page = 1, limit = 50 } = req.query;
      const filter = { branch: req.user.branch };
      if (resourceType) filter.resourceType = resourceType;
      if (status) filter.status = status;

      const total = await FhirIntegrationLog.countDocuments(filter);
      const logs = await FhirIntegrationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean();

      res.json({ success: true, data: logs, total, page: Number(page) });
    } catch (err) {
      safeError(res, err);
    }
  }
);

module.exports = router;
