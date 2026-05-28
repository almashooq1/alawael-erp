'use strict';

/**
 * hr-smart-analytics.routes.js — مسارات التحليلات الذكية للموارد البشرية
 *
 * GET  /api/v1/hr/smart-analytics/dashboard        — الحزمة الكاملة
 * GET  /api/v1/hr/smart-analytics/intelligence     — لوحة الذكاء الوظيفي
 * GET  /api/v1/hr/smart-analytics/compliance       — لوحة الامتثال
 * GET  /api/v1/hr/smart-analytics/payroll          — تحليلات الرواتب
 * GET  /api/v1/hr/smart-analytics/performance      — توزيع الأداء
 * GET  /api/v1/hr/smart-analytics/training         — فاعلية التدريب
 * GET  /api/v1/hr/smart-analytics/risk-scores      — درجات مخاطرة الموظفين
 * GET  /api/v1/hr/smart-analytics/recommendations  — التوصيات الذكية
 *
 * الصلاحيات: admin | hr_manager | manager
 * التحقق: branchId (ObjectId), month/year (int), limit (int)
 */

const express = require('express');
const mongoose = require('mongoose');
const { HrSmartAnalyticsService } = require('../../services/hr/hrSmartAnalytics.service');

// ─── تهيئة النماذج بكسل التحميل ──────────────────────────────────────────
let _svc;
function getService() {
  if (!_svc) {
    _svc = new HrSmartAnalyticsService({
      models: {
        Employee: require('../../models/HR/Employee'),
        Attendance: (() => {
          try {
            return require('../../models/HR/AttendanceRecord');
          } catch {
            return null;
          }
        })(),
        Leave: (() => {
          try {
            return require('../../models/HR/Leave');
          } catch {
            return null;
          }
        })(),
        LeaveBalance: (() => {
          try {
            return require('../../models/HR/LeaveBalance');
          } catch {
            return null;
          }
        })(),
        PayrollRecord: (() => {
          try {
            return require('../../models/HR/PayrollRecord');
          } catch {
            return null;
          }
        })(),
        PayrollRun: (() => {
          try {
            return require('../../models/HR/PayrollRun');
          } catch {
            return null;
          }
        })(),
        PerformanceReview: (() => {
          try {
            return require('../../models/HR/PerformanceReview');
          } catch {
            return null;
          }
        })(),
        Certification: (() => {
          try {
            return require('../../models/HR/Certification');
          } catch {
            return null;
          }
        })(),
        EmploymentContract: (() => {
          try {
            return require('../../models/HR/EmploymentContract');
          } catch {
            return null;
          }
        })(),
        TrainingPlan: (() => {
          try {
            return require('../../models/HR/TrainingPlan');
          } catch {
            return null;
          }
        })(),
      },
    });
  }
  return _svc;
}

// ─── تحقق من branchId ──────────────────────────────────────────────────────
function parseBranchId(val) {
  if (!val) return null;
  if (!mongoose.Types.ObjectId.isValid(val)) return undefined; // خطأ
  return new mongoose.Types.ObjectId(String(val));
}

// ─── تحقق من الأرقام الصحيحة الاختيارية ───────────────────────────────────
function parseIntOpt(val, min, max) {
  if (val == null || val === '') return undefined;
  const n = Number.parseInt(String(val), 10);
  if (Number.isNaN(n)) return undefined;
  if (min != null && n < min) return undefined;
  if (max != null && n > max) return undefined;
  return n;
}

// ─── بناء الراوتر ──────────────────────────────────────────────────────────
function createHrSmartAnalyticsRouter({ logger = console } = {}) {
  const router = express.Router();

  // ── حارس الصلاحيات ─────────────────────────────────────────────────────
  router.use((req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'auth required' });
    const allowed = ['admin', 'hr_manager', 'manager', 'superadmin', 'super_admin'];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'insufficient permissions' });
    }
    next();
  });

  // ── مساعد: استخراج branchId من الاستعلام ──────────────────────────────
  // يُرجع:
  //   false   — branchId غير صالح، وقد أُرسل رد 400 بالفعل (أوقف المعالج)
  //   null    — لا يوجد branchId (نطاق كامل: كل الفروع) — قيمة صحيحة تُمرَّر للخدمة
  //   ObjectId — نطاق فرع محدّد
  // ملاحظة: لا تستخدم null كإشارة "توقف" لأنه نطاق صالح (W: تسبّب في تعليق الطلب).
  function extractScope(req, res) {
    const raw = req.query.branchId;
    const branchId = parseBranchId(raw);
    if (branchId === undefined) {
      res.status(400).json({ error: 'invalid branchId' });
      return false;
    }
    return branchId;
  }

  // ─── GET /dashboard — الحزمة الكاملة ──────────────────────────────────
  router.get('/dashboard', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const data = await getService().getFullDashboard({ branchId });
      return res.json({ success: true, data });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:dashboard]', err.message);
      return res.status(500).json({ error: 'dashboard failed' });
    }
  });

  // ─── GET /intelligence ─────────────────────────────────────────────────
  router.get('/intelligence', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const data = await getService().getIntelligenceDashboard({ branchId });
      return res.json({ success: true, data });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:intelligence]', err.message);
      return res.status(500).json({ error: 'intelligence failed' });
    }
  });

  // ─── GET /compliance ───────────────────────────────────────────────────
  router.get('/compliance', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const data = await getService().getComplianceDashboard({ branchId });
      return res.json({ success: true, data });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:compliance]', err.message);
      return res.status(500).json({ error: 'compliance failed' });
    }
  });

  // ─── GET /payroll ──────────────────────────────────────────────────────
  router.get('/payroll', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const month = parseIntOpt(req.query.month, 1, 12);
      const year = parseIntOpt(req.query.year, 2000, 2100);
      const data = await getService().getPayrollAnalytics({ branchId, month, year });
      return res.json({ success: true, data });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:payroll]', err.message);
      return res.status(500).json({ error: 'payroll analytics failed' });
    }
  });

  // ─── GET /performance ──────────────────────────────────────────────────
  router.get('/performance', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const year = parseIntOpt(req.query.year, 2000, 2100);
      const data = await getService().getPerformanceDistribution({ branchId, year });
      return res.json({ success: true, data });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:performance]', err.message);
      return res.status(500).json({ error: 'performance distribution failed' });
    }
  });

  // ─── GET /training ─────────────────────────────────────────────────────
  router.get('/training', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const year = parseIntOpt(req.query.year, 2000, 2100);
      const data = await getService().getTrainingEffectiveness({ branchId, year });
      return res.json({ success: true, data });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:training]', err.message);
      return res.status(500).json({ error: 'training effectiveness failed' });
    }
  });

  // ─── GET /risk-scores ──────────────────────────────────────────────────
  router.get('/risk-scores', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const limit = parseIntOpt(req.query.limit, 1, 100) ?? 20;
      const { department } = req.query;
      const data = await getService().getTurnoverRiskScores({ branchId, department, limit });
      return res.json({ success: true, data, count: data.length });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:risk-scores]', err.message);
      return res.status(500).json({ error: 'risk scores failed' });
    }
  });

  // ─── GET /recommendations ──────────────────────────────────────────────
  router.get('/recommendations', async (req, res) => {
    try {
      const branchId = extractScope(req, res);
      if (branchId === false) return;
      const data = await getService().getSmartRecommendations({ branchId });
      return res.json({ success: true, data, count: data.length });
    } catch (err) {
      logger.error && logger.error('[HrSmartAnalytics:recommendations]', err.message);
      return res.status(500).json({ error: 'recommendations failed' });
    }
  });

  return router;
}

module.exports = { createHrSmartAnalyticsRouter };
