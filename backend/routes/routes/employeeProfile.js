/**
 * مسارات إدارة الملفات الشخصية للموظفين
 * Employee Profile Routes
 */

const express = require('express');
const router = express.Router();
const EmployeeProfile = require('../models/EmployeeProfile');
const authMiddleware = require('../middleware/auth');
const { _validateInput } = require('../middleware/validation');

// GET - الحصول على ملف الموظف
router.get('/:employeeId', authMiddleware, async (req, res) => {
  try {
    const profile = await EmployeeProfile.findOne({ userId: req.params.employeeId })
      .populate('userId', 'email name role');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على ملف الموظف'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على ملف الموظف',
      error: error.message
    });
  }
});

// POST - إنشاء ملف موظف جديد
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { userId, personalInfo, jobInfo } = req.body;

    const existingProfile = await EmployeeProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'ملف الموظف موجود بالفعل'
      });
    }

    const profile = new EmployeeProfile({
      userId,
      personalInfo,
      jobInfo,
      createdBy: req.userId
    });

    await profile.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء ملف الموظف بنجاح',
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء ملف الموظف',
      error: error.message
    });
  }
});

// PUT - تحديث المعلومات الأساسية
router.put('/:employeeId/update-info', authMiddleware, async (req, res) => {
  try {
    const { personalInfo, jobInfo } = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        personalInfo,
        jobInfo,
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على ملف الموظف'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الملف بنجاح',
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث الملف',
      error: error.message
    });
  }
});

// POST - إضافة مؤهل علمي
router.post('/:employeeId/add-qualification', authMiddleware, async (req, res) => {
  try {
    const { degree, field, institution, graduationDate, gpa } = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        $push: {
          'professionalRecord.qualifications': {
            degree,
            field,
            institution,
            graduationDate,
            gpa
          }
        },
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة المؤهل العلمي بنجاح',
      data: profile.professionalRecord.qualifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المؤهل',
      error: error.message
    });
  }
});

// POST - إضافة شهادة مهنية
router.post('/:employeeId/add-certification', authMiddleware, async (req, res) => {
  try {
    const certification = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        $push: {
          'professionalRecord.certifications': certification
        },
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة الشهادة المهنية بنجاح',
      data: profile.professionalRecord.certifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الشهادة',
      error: error.message
    });
  }
});

// POST - إضافة دورة تدريبية
router.post('/:employeeId/add-training', authMiddleware, async (req, res) => {
  try {
    const training = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        $push: {
          'professionalRecord.trainingCourses': training
        },
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة الدورة التدريبية بنجاح',
      data: profile.professionalRecord.trainingCourses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الدورة',
      error: error.message
    });
  }
});

// POST - إضافة تخصص
router.post('/:employeeId/add-specialization', authMiddleware, async (req, res) => {
  try {
    const specialization = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        $push: {
          'professionalRecord.specializations': specialization
        },
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة التخصص بنجاح',
      data: profile.professionalRecord.specializations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة التخصص',
      error: error.message
    });
  }
});

// POST - إضافة خبرة سابقة
router.post('/:employeeId/add-experience', authMiddleware, async (req, res) => {
  try {
    const experience = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        $push: {
          'professionalRecord.workExperience': experience
        },
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم إضافة الخبرة السابقة بنجاح',
      data: profile.professionalRecord.workExperience
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الخبرة',
      error: error.message
    });
  }
});

// PUT - تحديث المهارات
router.put('/:employeeId/update-skills', authMiddleware, async (req, res) => {
  try {
    const { technical, softSkills, languages } = req.body;

    const profile = await EmployeeProfile.findOneAndUpdate(
      { userId: req.params.employeeId },
      {
        skills: { technical, softSkills, languages },
        updatedAt: new Date(),
        updatedBy: req.userId
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'تم تحديث المهارات بنجاح',
      data: profile.skills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المهارات',
      error: error.message
    });
  }
});

// GET - الحصول على ملخص الملف
router.get('/:employeeId/summary', authMiddleware, async (req, res) => {
  try {
    const profile = await EmployeeProfile.findOne({ userId: req.params.employeeId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على ملف الموظف'
      });
    }

    const summary = {
      employeeInfo: profile.personalInfo,
      jobInfo: profile.jobInfo,
      qualificationsCount: profile.professionalRecord.qualifications.length,
      certificationsCount: profile.professionalRecord.certifications.length,
      trainingsCount: profile.professionalRecord.trainingCourses.length,
      specializationsCount: profile.professionalRecord.specializations.length,
      experienceYears: profile.professionalRecord.workExperience.length,
      technicalSkillsCount: profile.skills.technical.length,
      softSkillsCount: profile.skills.softSkills.length,
      languagesCount: profile.skills.languages.length,
      documentsCount: Object.values(profile.documents || {}).filter(d => d).length
    };

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على ملخص الملف',
      error: error.message
    });
  }
});

// GET - البحث عن الموظفين
router.get('/search/profiles', authMiddleware, async (req, res) => {
  try {
    const { department, position, status, keyword } = req.query;
    const filter = {};

    if (department) filter['jobInfo.department'] = department;
    if (position) filter['jobInfo.position'] = position;
    if (status) filter.status = status;
    if (keyword) {
      filter.$or = [
        { 'personalInfo.firstName': new RegExp(keyword, 'i') },
        { 'personalInfo.lastName': new RegExp(keyword, 'i') },
        { 'personalInfo.email': new RegExp(keyword, 'i') }
      ];
    }

    const profiles = await EmployeeProfile.find(filter)
      .populate('userId', 'email name role')
      .limit(50);

    res.json({
      success: true,
      count: profiles.length,
      data: profiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث عن الملفات',
      error: error.message
    });
  }
});

module.exports = router;
