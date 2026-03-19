const express = require('express');
const router = express.Router();
const CaseManagement = require('../models/CaseManagement');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// إعداد multer لرفع الملفات
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|dicom/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('نوع الملف غير مسموح به'));
  }
});

// ============= CRUD الأساسية =============

// 1. إنشاء حالة جديدة
router.post('/', authenticate, authorize(['admin', 'doctor', 'case_manager']), async (req, res) => {
  try {
    const caseData = {
      ...req.body,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    };
    
    const newCase = new CaseManagement(caseData);
    newCase.calculateAge();
    await newCase.save();
    
    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحالة بنجاح',
      data: newCase
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء الحالة',
      error: error.message
    });
  }
});

// 2. الحصول على جميع الحالات مع فلترة وترتيب
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      status,
      priority,
      search,
      page = 1,
      limit = 20,
      sortBy = 'registrationDate',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    // تطبيق الفلاتر
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { 'beneficiary.name': { $regex: search, $options: 'i' } },
        { caseNumber: { $regex: search, $options: 'i' } },
        { 'beneficiary.nationalId': { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    const cases = await CaseManagement
      .find(query)
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
          totalItems: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الحالات',
      error: error.message
    });
  }
});

// 3. الحصول على حالة محددة بالتفصيل
router.get('/:id', authenticate, async (req, res) => {
  try {
    const caseDoc = await CaseManagement
      .findById(req.params.id)
      .populate('team.member', 'name email role specialization')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('notes.author', 'name email');
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
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
        activeTreatmentPlan
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل الحالة',
      error: error.message
    });
  }
});

// 4. تحديث حالة
router.put('/:id', authenticate, authorize(['admin', 'doctor', 'case_manager']), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      lastModifiedBy: req.user._id,
      lastUpdateDate: new Date()
    };
    
    const caseDoc = await CaseManagement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    caseDoc.calculateAge();
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم تحديث الحالة بنجاح',
      data: caseDoc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الحالة',
      error: error.message
    });
  }
});

// 5. حذف حالة
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findByIdAndDelete(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    res.json({
      success: true,
      message: 'تم حذف الحالة بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الحالة',
      error: error.message
    });
  }
});

// ============= إدارة التشخيصات =============

// إضافة تشخيص جديد
router.post('/:id/diagnoses', authenticate, authorize(['doctor', 'case_manager']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const diagnosis = {
      ...req.body,
      doctor: {
        name: req.user.name,
        id: req.user._id
      }
    };
    
    caseDoc.diagnoses.push(diagnosis);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم إضافة التشخيص بنجاح',
      data: caseDoc.diagnoses[caseDoc.diagnoses.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التشخيص',
      error: error.message
    });
  }
});

// تحديث تشخيص
router.put('/:id/diagnoses/:diagnosisId', authenticate, authorize(['doctor', 'case_manager']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const diagnosis = caseDoc.diagnoses.id(req.params.diagnosisId);
    
    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'التشخيص غير موجود'
      });
    }
    
    Object.assign(diagnosis, req.body);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم تحديث التشخيص بنجاح',
      data: diagnosis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث التشخيص',
      error: error.message
    });
  }
});

// ============= إدارة الملفات الطبية =============

// رفع ملف طبي
router.post('/:id/files', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }
    
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const medicalFile = {
      fileName: req.file.originalname,
      fileType: req.body.fileType,
      fileUrl: `/uploads/medical-files/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      description: req.body.description,
      tags: req.body.tags ? JSON.parse(req.body.tags) : []
    };
    
    caseDoc.medicalFiles.push(medicalFile);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      data: caseDoc.medicalFiles[caseDoc.medicalFiles.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الملف',
      error: error.message
    });
  }
});

// حذف ملف طبي
router.delete('/:id/files/:fileId', authenticate, authorize(['admin', 'doctor', 'case_manager']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const file = caseDoc.medicalFiles.id(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود'
      });
    }
    
    // حذف الملف من النظام
    const filePath = path.join(__dirname, '../', file.fileUrl);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('خطأ في حذف الملف:', err);
    }
    
    file.remove();
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم حذف الملف بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الملف',
      error: error.message
    });
  }
});

// ============= إدارة خطط العلاج =============

// إنشاء خطة علاج جديدة
router.post('/:id/treatment-plans', authenticate, authorize(['doctor', 'therapist', 'case_manager']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    caseDoc.treatmentPlans.push(req.body);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم إنشاء خطة العلاج بنجاح',
      data: caseDoc.treatmentPlans[caseDoc.treatmentPlans.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء خطة العلاج',
      error: error.message
    });
  }
});

// تحديث خطة علاج
router.put('/:id/treatment-plans/:planId', authenticate, authorize(['doctor', 'therapist', 'case_manager']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const plan = caseDoc.treatmentPlans.id(req.params.planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'خطة العلاج غير موجودة'
      });
    }
    
    Object.assign(plan, req.body);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم تحديث خطة العلاج بنجاح',
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث خطة العلاج',
      error: error.message
    });
  }
});

// إضافة جلسة لخطة العلاج
router.post('/:id/treatment-plans/:planId/sessions', authenticate, authorize(['doctor', 'therapist', 'case_manager']), async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const plan = caseDoc.treatmentPlans.id(req.params.planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'خطة العلاج غير موجودة'
      });
    }
    
    const session = {
      ...req.body,
      sessionNumber: plan.sessions.length + 1,
      therapist: {
        name: req.user.name,
        id: req.user._id
      }
    };
    
    plan.sessions.push(session);
    caseDoc.lastVisitDate = session.date || new Date();
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    res.json({
      success: true,
      message: 'تم إضافة الجلسة بنجاح',
      data: plan.sessions[plan.sessions.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الجلسة',
      error: error.message
    });
  }
});

// ============= إدارة الملاحظات =============

// إضافة ملاحظة
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const caseDoc = await CaseManagement.findById(req.params.id);
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
      });
    }
    
    const note = {
      author: req.user._id,
      content: req.body.content,
      category: req.body.category
    };
    
    caseDoc.notes.push(note);
    caseDoc.lastModifiedBy = req.user._id;
    await caseDoc.save();
    
    await caseDoc.populate('notes.author', 'name email');
    
    res.json({
      success: true,
      message: 'تم إضافة الملاحظة بنجاح',
      data: caseDoc.notes[caseDoc.notes.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الملاحظة',
      error: error.message
    });
  }
});

// ============= إحصائيات وتقارير =============

// إحصائيات عامة
router.get('/statistics/overview', authenticate, async (req, res) => {
  try {
    const totalCases = await CaseManagement.countDocuments();
    const activeCases = await CaseManagement.countDocuments({ status: 'نشطة' });
    const newCases = await CaseManagement.countDocuments({ status: 'جديدة' });
    const completedCases = await CaseManagement.countDocuments({ status: 'مكتملة' });
    
    const casesByPriority = await CaseManagement.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    const upcomingAppointments = await CaseManagement.countDocuments({
      nextAppointmentDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // خلال أسبوع
      }
    });
    
    res.json({
      success: true,
      data: {
        totalCases,
        activeCases,
        newCases,
        completedCases,
        casesByPriority,
        upcomingAppointments
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message
    });
  }
});

// تقرير تفصيلي لحالة
router.get('/:id/report', authenticate, async (req, res) => {
  try {
    const caseDoc = await CaseManagement
      .findById(req.params.id)
      .populate('team.member', 'name email role specialization')
      .populate('createdBy', 'name email')
      .populate('notes.author', 'name email');
    
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'الحالة غير موجودة'
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
        registrationDate: caseDoc.registrationDate
      },
      medicalSummary: {
        bloodType: caseDoc.medicalRecord?.bloodType,
        allergiesCount: caseDoc.medicalRecord?.allergies?.length || 0,
        chronicDiseasesCount: caseDoc.medicalRecord?.chronicDiseases?.length || 0,
        latestDiagnosis: latestDiagnosis
      },
      treatmentSummary: {
        activePlan: activeTreatmentPlan,
        totalPlans: statistics.totalTreatmentPlans,
        totalSessions: statistics.totalSessions,
        completedSessions: statistics.completedSessions,
        completionRate: statistics.totalSessions > 0 
          ? Math.round((statistics.completedSessions / statistics.totalSessions) * 100) 
          : 0
      },
      documentsSummary: {
        totalFiles: statistics.totalFiles,
        totalDiagnoses: statistics.totalDiagnoses,
        totalNotes: statistics.totalNotes
      },
      team: caseDoc.team,
      generatedAt: new Date(),
      generatedBy: req.user.name
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التقرير',
      error: error.message
    });
  }
});

module.exports = router;
