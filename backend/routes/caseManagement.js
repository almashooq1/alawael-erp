const express = require('express');
const router = express.Router();
const CaseManagement = require('../models/CaseManagement');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

/** Safely parse JSON — returns fallback on invalid input */
const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

/* ━━━ Field Whitelists ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const CASE_FIELDS = [
  'patientName',
  'nationalId',
  'dateOfBirth',
  'gender',
  'phone',
  'email',
  'address',
  'emergencyContact',
  'caseType',
  'status',
  'priority',
  'department',
  'referralSource',
  'insuranceInfo',
  'medicalHistory',
  'allergies',
  'currentMedications',
  'primaryDiagnosis',
  'notes',
];
const DIAGNOSIS_FIELDS = [
  'diagnosisCode',
  'diagnosisName',
  'description',
  'severity',
  'type',
  'notes',
  'date',
];
const TREATMENT_PLAN_FIELDS = [
  'name',
  'description',
  'goals',
  'startDate',
  'endDate',
  'status',
  'notes',
  'frequency',
  'type',
];
const SESSION_FIELDS = ['date', 'duration', 'notes', 'status', 'objectives', 'outcomes', 'type'];
const _REFERRAL_FIELDS = [
  'referralTo',
  'referralType',
  'reason',
  'priority',
  'notes',
  'department',
  'externalProvider',
  'dueDate',
];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/medical-files');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|dicom/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مسموح به'));
  },
});

// ============= CRUD الأساسية =============

// 1. إنشاء حالة جديدة
router.post('/', authenticate, requireBranchAccess, authorize(['admin', 'doctor', 'case_manager']), async (req, res) => {
  try {
    const caseData = {
      ...pick(req.body, CASE_FIELDS),
      createdBy: req.user._id,
      lastModifiedBy: req.user._id,
    };

    const newCase = new CaseManagement(caseData);
    newCase.calculateAge();
    await newCase.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحالة بنجاح',
      data: newCase,
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// 2. الحصول على جميع الحالات مع فلترة وترتيب
router.get('/', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      page = 1,
      limit = 20,
      sortBy = 'registrationDate',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // تطبيق الفلاتر
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { 'beneficiary.name': { $regex: escapeRegex(search), $options: 'i' } },
        { caseNumber: { $regex: escapeRegex(search), $options: 'i' } },
        { 'beneficiary.nationalId': { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const cases = await CaseManagement.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('team.member', 'name email role')
      .populate('createdBy', 'name email')
      .lean();

    const total = await CaseManagement.countDocuments(query);

    res.json({
      success: true,
      data: {
        cases,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// ============= إحصائيات وتقارير =============

// إحصائيات عامة
router.get('/statistics/overview', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const totalCases = await CaseManagement.countDocuments();
    const activeCases = await CaseManagement.countDocuments({ status: 'نشطة' });
    const newCases = await CaseManagement.countDocuments({ status: 'جديدة' });
    const completedCases = await CaseManagement.countDocuments({ status: 'مكتملة' });

    const casesByPriority = await CaseManagement.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const upcomingAppointments = await CaseManagement.countDocuments({
      nextAppointmentDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // خلال أسبوع
      },
    });

    res.json({
      success: true,
      data: {
        totalCases,
        activeCases,
        newCases,
        completedCases,
        casesByPriority,
        upcomingAppointments,
      },
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// 3. الحصول على حالة محددة بالتفصيل
router.get('/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id)
      .populate('team.member', 'name email role specialization')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('notes.author', 'name email');

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة',
      });
    }

    const statistics = caseDoc.getStatistics();
    const latestDiagnosis = caseDoc.getLatestDiagnosis();
    const activeTreatmentPlan = caseDoc.getActiveTreatmentPlan();

    res.json({
      success: true,
      data: {
        case: caseDoc,
        statistics,
        latestDiagnosis,
        activeTreatmentPlan,
      },
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// 4. تحديث حالة
router.put(
  '/:id',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'doctor', 'case_manager']),
  async (req, res) => {
    try {
      const updateData = {
        ...pick(req.body, CASE_FIELDS),
        lastModifiedBy: req.user._id,
        lastUpdateDate: new Date(),
      };

      const caseDoc = await CaseManagement.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      caseDoc.calculateAge();
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم تحديث الحالة بنجاح',
        data: caseDoc,
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// 5. حذف حالة
router.delete('/:id', authenticate, requireBranchAccess, authorize(['admin']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findByIdAndDelete(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة',
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الحالة بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// ============= إدارة التشخيصات =============

// إضافة تشخيص جديد
router.post(
  '/:id/diagnoses',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['doctor', 'case_manager']),
  async (req, res) => {
    try {
      const caseDoc = await CaseManagement.findById(req.params.id);

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      const diagnosis = {
        ...pick(req.body, DIAGNOSIS_FIELDS),
        doctor: {
          name: req.user.name,
          id: req.user._id,
        },
      };

      caseDoc.diagnoses.push(diagnosis);
      caseDoc.lastModifiedBy = req.user._id;
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم إضافة التشخيص بنجاح',
        data: caseDoc.diagnoses[caseDoc.diagnoses.length - 1],
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// تحديث تشخيص
router.put(
  '/:id/diagnoses/:diagnosisId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['doctor', 'case_manager']),
  async (req, res) => {
    try {
      const caseDoc = await CaseManagement.findById(req.params.id);

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      const diagnosis = caseDoc.diagnoses.id(req.params.diagnosisId);

      if (!diagnosis) {
        return res.status(404).json({
          success: false,
          message: 'التشخيص غير موجود',
        });
      }

      Object.assign(diagnosis, pick(req.body, DIAGNOSIS_FIELDS));
      caseDoc.lastModifiedBy = req.user._id;
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم تحديث التشخيص بنجاح',
        data: diagnosis,
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// ============= إدارة الملفات الطبية =============

// رفع ملف طبي
router.post('/:id/files', authenticate, requireBranchAccess, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف',
      });
    }

    const caseDoc = await CaseManagement.findById(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة',
      });
    }

    const medicalFile = {
      fileName: req.file.originalname,
      fileType: req.body.fileType,
      fileUrl: `/uploads/medical-files/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      description: req.body.description,
      tags: safeJsonParse(req.body.tags, []),
    };

    caseDoc.medicalFiles.push(medicalFile);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();

    res.json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      data: caseDoc.medicalFiles[caseDoc.medicalFiles.length - 1],
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// حذف ملف طبي
router.delete(
  '/:id/files/:fileId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'doctor', 'case_manager']),
  async (req, res) => {
    try {
      const caseDoc = await CaseManagement.findById(req.params.id);

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      const file = caseDoc.medicalFiles.id(req.params.fileId);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'الملف غير موجود',
        });
      }

      // حذف الملف من النظام
      const filePath = path.join(__dirname, '../', file.fileUrl);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        logger.error('خطأ في حذف الملف:', { message: err.message });
      }

      file.remove();
      caseDoc.lastModifiedBy = req.user._id;
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم حذف الملف بنجاح',
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// ============= إدارة خطط العلاج =============

// إنشاء خطة علاج جديدة
router.post(
  '/:id/treatment-plans',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['doctor', 'therapist', 'case_manager']),
  async (req, res) => {
    try {
      const caseDoc = await CaseManagement.findById(req.params.id);

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      caseDoc.treatmentPlans.push(req.body);
      caseDoc.lastModifiedBy = req.user._id;
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم إنشاء خطة العلاج بنجاح',
        data: caseDoc.treatmentPlans[caseDoc.treatmentPlans.length - 1],
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// تحديث خطة علاج
router.put(
  '/:id/treatment-plans/:planId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['doctor', 'therapist', 'case_manager']),
  async (req, res) => {
    try {
      const caseDoc = await CaseManagement.findById(req.params.id);

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      const plan = caseDoc.treatmentPlans.id(req.params.planId);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'خطة العلاج غير موجودة',
        });
      }

      Object.assign(plan, pick(req.body, TREATMENT_PLAN_FIELDS));
      caseDoc.lastModifiedBy = req.user._id;
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم تحديث خطة العلاج بنجاح',
        data: plan,
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// إضافة جلسة لخطة العلاج
router.post(
  '/:id/treatment-plans/:planId/sessions',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['doctor', 'therapist', 'case_manager']),
  async (req, res) => {
    try {
      const caseDoc = await CaseManagement.findById(req.params.id);

      if (!caseDoc) {
        return res.status(404).json({
          success: false,
          message: 'الحالة غير موجودة',
        });
      }

      const plan = caseDoc.treatmentPlans.id(req.params.planId);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'خطة العلاج غير موجودة',
        });
      }

      const session = {
        ...pick(req.body, SESSION_FIELDS),
        sessionNumber: plan.sessions.length + 1,
        therapist: {
          name: req.user.name,
          id: req.user._id,
        },
      };

      plan.sessions.push(session);
      caseDoc.lastVisitDate = session.date || new Date();
      caseDoc.lastModifiedBy = req.user._id;
      await caseDoc.save();

      res.json({
        success: true,
        message: 'تم إضافة الجلسة بنجاح',
        data: plan.sessions[plan.sessions.length - 1],
      });
    } catch (error) {
      safeError(res, error, 'caseManagement');
    }
  }
);

// ============= إدارة الملاحظات =============

// إضافة ملاحظة
router.post('/:id/notes', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة',
      });
    }

    const note = {
      author: req.user._id,
      content: req.body.content,
      category: req.body.category,
    };

    caseDoc.notes.push(note);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();

    await caseDoc.populate('notes.author', 'name email');

    res.json({
      success: true,
      message: 'تم إضافة الملاحظة بنجاح',
      data: caseDoc.notes[caseDoc.notes.length - 1],
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

// تقرير تفصيلي لحالة
router.get('/:id/report', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id)
      .populate('team.member', 'name email role specialization')
      .populate('createdBy', 'name email')
      .populate('notes.author', 'name email');

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة',
      });
    }

    const statistics = caseDoc.getStatistics();
    const latestDiagnosis = caseDoc.getLatestDiagnosis();
    const activeTreatmentPlan = caseDoc.getActiveTreatmentPlan();

    const report = {
      caseInformation: {
        caseNumber: caseDoc.caseNumber,
        beneficiaryName: caseDoc.beneficiary.name,
        age: caseDoc.beneficiary.age,
        status: caseDoc.status,
        priority: caseDoc.priority,
        registrationDate: caseDoc.registrationDate,
      },
      medicalSummary: {
        bloodType: caseDoc.medicalRecord?.bloodType,
        allergiesCount: caseDoc.medicalRecord?.allergies?.length || 0,
        chronicDiseasesCount: caseDoc.medicalRecord?.chronicDiseases?.length || 0,
        latestDiagnosis: latestDiagnosis,
      },
      treatmentSummary: {
        activePlan: activeTreatmentPlan,
        totalPlans: statistics.totalTreatmentPlans,
        totalSessions: statistics.totalSessions,
        completedSessions: statistics.completedSessions,
        completionRate:
          statistics.totalSessions > 0
            ? Math.round((statistics.completedSessions / statistics.totalSessions) * 100)
            : 0,
      },
      documentsSummary: {
        totalFiles: statistics.totalFiles,
        totalDiagnoses: statistics.totalDiagnoses,
        totalNotes: statistics.totalNotes,
      },
      team: caseDoc.team,
      generatedAt: new Date(),
      generatedBy: req.user.name,
    };

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    safeError(res, error, 'caseManagement');
  }
});

module.exports = router;
