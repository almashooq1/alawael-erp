/**
 * ═══════════════════════════════════════════════════════════════════════
 * 
 *   API Routes - نظام الألعاب التفاعلية لتأهيل ذوي الإعاقة
 *   Interactive Games Rehabilitation System - API Routes
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const InteractiveGamesRehabSystem = require('../lib/interactive_games_rehab_system');

// إنشاء نسخة من النظام
const rehabSystem = new InteractiveGamesRehabSystem();

/**
 * ═══════════════════════════════════════════════════════════════════
 * Helper Functions - دوال مساعدة
 * ═══════════════════════════════════════════════════════════════════
 */

const sendSuccess = (res, data, message = 'Success') => {
  res.json({
    success: true,
    message,
    data
  });
};

const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    error: error.message || 'An error occurred',
    details: error
  });
};

/**
 * ═══════════════════════════════════════════════════════════════════
 * Health & Status Endpoints - نقاط الفحص والحالة
 * ═══════════════════════════════════════════════════════════════════
 */

// نقطة فحص صحة النظام
router.get('/health', (req, res) => {
  sendSuccess(res, {
    status: 'operational',
    service: 'Interactive Games Rehabilitation System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }, 'System is healthy');
});

// إحصائيات النظام الكاملة
router.get('/stats', (req, res) => {
  try {
    const stats = rehabSystem.getSystemStats();
    sendSuccess(res, stats, 'System statistics retrieved');
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Patient Management Endpoints - نقاط إدارة المرضى
 * ═══════════════════════════════════════════════════════════════════
 */

// إضافة مريض جديد
router.post('/patients', (req, res) => {
  try {
    const patient = rehabSystem.addPatient(req.body);
    sendSuccess(res, patient, 'Patient added successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// الحصول على بيانات مريض محدد
router.get('/patients/:id', (req, res) => {
  try {
    const patient = rehabSystem.getPatient(req.params.id);
    sendSuccess(res, patient);
  } catch (error) {
    sendError(res, error, 404);
  }
});

// تحديث بيانات مريض
router.put('/patients/:id', (req, res) => {
  try {
    const patient = rehabSystem.updatePatient(req.params.id, req.body);
    sendSuccess(res, patient, 'Patient updated successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// الحصول على قائمة المرضى مع فلترة اختيارية
router.get('/patients', (req, res) => {
  try {
    const filters = {
      therapistId: req.query.therapistId,
      disabilityType: req.query.disabilityType,
      status: req.query.status
    };
    const patients = rehabSystem.getAllPatients(filters);
    sendSuccess(res, { patients, count: patients.length });
  } catch (error) {
    sendError(res, error);
  }
});

// لوحة معلومات المريض
router.get('/patients/:id/dashboard', (req, res) => {
  try {
    const dashboard = rehabSystem.getPatientDashboard(req.params.id);
    sendSuccess(res, dashboard);
  } catch (error) {
    sendError(res, error, 404);
  }
});

// الحصول على تقدم المريض
router.get('/patients/:id/progress', (req, res) => {
  try {
    const options = {};
    if (req.query.gameId) options.gameId = req.query.gameId;
    if (req.query.dateFrom && req.query.dateTo) {
      options.dateRange = { from: req.query.dateFrom, to: req.query.dateTo };
    }
    
    const progress = rehabSystem.getPatientProgress(req.params.id, options);
    sendSuccess(res, { progress, count: progress.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

// الحصول على إنجازات المريض
router.get('/patients/:id/achievements', (req, res) => {
  try {
    const achievements = rehabSystem.getPatientAchievements(req.params.id);
    sendSuccess(res, { achievements, count: achievements.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

// الحصول على تقييمات المريض
router.get('/patients/:id/assessments', (req, res) => {
  try {
    const assessments = rehabSystem.getPatientAssessments(req.params.id);
    sendSuccess(res, { assessments, count: assessments.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

// الحصول على تمارين المريض
router.get('/patients/:id/exercises', (req, res) => {
  try {
    const exercises = rehabSystem.getPatientExercises(req.params.id);
    sendSuccess(res, { exercises, count: exercises.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Therapist Management Endpoints - نقاط إدارة المعالجين
 * ═══════════════════════════════════════════════════════════════════
 */

// إضافة معالج جديد
router.post('/therapists', (req, res) => {
  try {
    const therapist = rehabSystem.addTherapist(req.body);
    sendSuccess(res, therapist, 'Therapist added successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// الحصول على بيانات معالج
router.get('/therapists/:id', (req, res) => {
  try {
    const therapist = rehabSystem.getTherapist(req.params.id);
    sendSuccess(res, therapist);
  } catch (error) {
    sendError(res, error, 404);
  }
});

// الحصول على إحصائيات المعالج
router.get('/therapists/:id/stats', (req, res) => {
  try {
    const stats = rehabSystem.getTherapistStats(req.params.id);
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, error, 404);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Games Management Endpoints - نقاط إدارة الألعاب
 * ═══════════════════════════════════════════════════════════════════
 */

// إضافة لعبة جديدة
router.post('/games', (req, res) => {
  try {
    const game = rehabSystem.addGame(req.body);
    sendSuccess(res, game, 'Game added successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// الحصول على بيانات لعبة محددة
router.get('/games/:id', (req, res) => {
  try {
    const game = rehabSystem.getGame(req.params.id);
    sendSuccess(res, game);
  } catch (error) {
    sendError(res, error, 404);
  }
});

// البحث عن الألعاب
router.get('/games', (req, res) => {
  try {
    const criteria = {
      category: req.query.category,
      targetDisability: req.query.targetDisability,
      difficulty: req.query.difficulty,
      searchText: req.query.search
    };
    
    if (req.query.minAge && req.query.maxAge) {
      criteria.ageRange = {
        min: parseInt(req.query.minAge),
        max: parseInt(req.query.maxAge)
      };
    }
    
    const games = rehabSystem.searchGames(criteria);
    sendSuccess(res, { games, count: games.length });
  } catch (error) {
    sendError(res, error);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Session Management Endpoints - نقاط إدارة الجلسات
 * ═══════════════════════════════════════════════════════════════════
 */

// إنشاء جلسة جديدة
router.post('/sessions', (req, res) => {
  try {
    const session = rehabSystem.createSession(req.body);
    sendSuccess(res, session, 'Session created successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// بدء جلسة
router.post('/sessions/:id/start', (req, res) => {
  try {
    const session = rehabSystem.startSession(req.params.id);
    sendSuccess(res, session, 'Session started');
  } catch (error) {
    sendError(res, error, 404);
  }
});

// إنهاء جلسة
router.post('/sessions/:id/complete', (req, res) => {
  try {
    const session = rehabSystem.completeSession(req.params.id, req.body);
    sendSuccess(res, session, 'Session completed successfully');
  } catch (error) {
    sendError(res, error, 404);
  }
});

// الحصول على جلسات مريض
router.get('/sessions/patient/:patientId', (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      gameId: req.query.gameId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };
    const sessions = rehabSystem.getPatientSessions(req.params.patientId, filters);
    sendSuccess(res, { sessions, count: sessions.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Assessment Endpoints - نقاط التقييم
 * ═══════════════════════════════════════════════════════════════════
 */

// إنشاء تقييم
router.post('/assessments', (req, res) => {
  try {
    const assessment = rehabSystem.createAssessment(req.body);
    sendSuccess(res, assessment, 'Assessment created successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// الحصول على تقييمات مريض
router.get('/assessments/patient/:patientId', (req, res) => {
  try {
    const assessments = rehabSystem.getPatientAssessments(req.params.patientId);
    sendSuccess(res, { assessments, count: assessments.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Exercise Endpoints - نقاط التمارين
 * ═══════════════════════════════════════════════════════════════════
 */

// إنشاء تمرين مخصص
router.post('/exercises', (req, res) => {
  try {
    const exercise = rehabSystem.createExercise(req.body);
    sendSuccess(res, exercise, 'Exercise created successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

// الحصول على تمارين مريض
router.get('/exercises/patient/:patientId', (req, res) => {
  try {
    const exercises = rehabSystem.getPatientExercises(req.params.patientId);
    sendSuccess(res, { exercises, count: exercises.length });
  } catch (error) {
    sendError(res, error, 404);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * Reports Endpoints - نقاط التقارير
 * ═══════════════════════════════════════════════════════════════════
 */

// توليد تقرير شامل
router.post('/reports/generate', (req, res) => {
  try {
    const { patientId, dateFrom, dateTo, therapistId } = req.body;
    const report = rehabSystem.generateReport(patientId, { dateFrom, dateTo, therapistId });
    sendSuccess(res, report, 'Report generated successfully');
  } catch (error) {
    sendError(res, error, 400);
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * تصدير الراوتر - Export Router
 * ═══════════════════════════════════════════════════════════════════
 */

module.exports = {
  router,
  rehabSystem
};
