'use strict';

/**
 * hr-extensions.routes.js — Phase 30 follow-up modules.
 *
 * Single router that surfaces four new HR sub-modules:
 *
 *   • Document Vault       /documents      (EmployeeDocument)
 *   • Performance Goals    /goals          (EmployeeGoal)
 *   • Recruitment / ATS    /vacancies      (Vacancy + nested applicants)
 *   • Saudi Compliance     /saudi-compliance/snapshot  (computed)
 *
 * Mounted at `/api/v1/hr` so resulting paths are:
 *   /api/v1/hr/documents
 *   /api/v1/hr/goals
 *   /api/v1/hr/vacancies
 *   /api/v1/hr/saudi-compliance/snapshot
 *
 * Why one file: each module is small + the data flows overlap (compliance
 * snapshot reads from Employee + Document + Vacancy). Splitting them would
 * create three near-empty files with the same imports.
 */

const express = require('express');
const { authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');

const ADMIN_ROLES = ['admin', 'super_admin', 'hr_manager'];
const MANAGER_ROLES = [...ADMIN_ROLES, 'manager'];

function createHrExtensionsRouter({ logger } = {}) {
  const router = express.Router();

  function tryLoad(key, path) {
    try {
      return require(path);
    } catch (err) {
      logger?.warn?.(`[hr-extensions] ${key} unavailable: ${err.message}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Document Vault
  // ═══════════════════════════════════════════════════════════════════

  router.get('/documents', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const EmployeeDocument = tryLoad('EmployeeDocument', '../../models/HR/EmployeeDocument');
      if (!EmployeeDocument) return res.json({ success: true, data: { items: [], total: 0 } });
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const filter = {};
      if (req.query.employeeId) filter.employeeId = req.query.employeeId;
      if (req.query.docType) filter.docType = req.query.docType;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.expiring === 'true') {
        filter.expiryDate = { $gte: new Date(), $lte: new Date(Date.now() + 60 * 86400000) };
        filter.status = 'active';
      }
      const [items, total] = await Promise.all([
        EmployeeDocument.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        EmployeeDocument.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: { items, total, pagination: { page, pages: Math.ceil(total / limit), limit } },
      });
    } catch (err) {
      safeError(res, err, 'hr-extensions documents');
    }
  });

  router.post('/documents', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const EmployeeDocument = tryLoad('EmployeeDocument', '../../models/HR/EmployeeDocument');
      if (!EmployeeDocument)
        return res.status(503).json({ success: false, message: 'model unavailable' });
      const doc = await EmployeeDocument.create({
        ...req.body,
        uploadedByUserId: req.user?._id,
        uploadedByName: req.user?.name || req.user?.email,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'hr-extensions document.create');
    }
  });

  router.delete('/documents/:id', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const EmployeeDocument = tryLoad('EmployeeDocument', '../../models/HR/EmployeeDocument');
      if (!EmployeeDocument)
        return res.status(503).json({ success: false, message: 'model unavailable' });
      // Soft-delete: archive rather than remove for audit trail
      const doc = await EmployeeDocument.findByIdAndUpdate(
        req.params.id,
        { status: 'archived' },
        { new: true }
      );
      if (!doc) return res.status(404).json({ success: false, message: 'not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'hr-extensions document.delete');
    }
  });

  router.get('/documents/types', authorize(MANAGER_ROLES), (_req, res) => {
    const EmployeeDocument = tryLoad('EmployeeDocument', '../../models/HR/EmployeeDocument');
    res.json({ success: true, data: EmployeeDocument?.DOC_TYPES ?? [] });
  });

  // ═══════════════════════════════════════════════════════════════════
  // Performance Goals
  // ═══════════════════════════════════════════════════════════════════

  router.get('/goals', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const EmployeeGoal = tryLoad('EmployeeGoal', '../../models/HR/EmployeeGoal');
      if (!EmployeeGoal) return res.json({ success: true, data: { items: [], total: 0 } });
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const filter = {};
      if (req.query.employeeId) filter.employeeId = req.query.employeeId;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.category) filter.category = req.query.category;
      const [items, total] = await Promise.all([
        EmployeeGoal.find(filter)
          .sort({ 'period.endDate': -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        EmployeeGoal.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: { items, total, pagination: { page, pages: Math.ceil(total / limit), limit } },
      });
    } catch (err) {
      safeError(res, err, 'hr-extensions goals');
    }
  });

  router.post('/goals', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const EmployeeGoal = tryLoad('EmployeeGoal', '../../models/HR/EmployeeGoal');
      if (!EmployeeGoal)
        return res.status(503).json({ success: false, message: 'model unavailable' });
      const goal = await EmployeeGoal.create({
        ...req.body,
        assignedByUserId: req.user?._id,
        assignedByName: req.user?.name || req.user?.email,
      });
      res.status(201).json({ success: true, data: goal });
    } catch (err) {
      safeError(res, err, 'hr-extensions goal.create');
    }
  });

  // PATCH /goals/:id/check-in — progress update with note. Anyone with
  // access to the goal can check in (employee tracks their own work).
  router.patch('/goals/:id/check-in', async (req, res) => {
    try {
      const EmployeeGoal = tryLoad('EmployeeGoal', '../../models/HR/EmployeeGoal');
      if (!EmployeeGoal)
        return res.status(503).json({ success: false, message: 'model unavailable' });
      const { currentValue, percentComplete, note } = req.body || {};
      const goal = await EmployeeGoal.findById(req.params.id);
      if (!goal) return res.status(404).json({ success: false, message: 'not found' });
      const checkIn = {
        at: new Date(),
        byUserId: req.user?._id,
        byName: req.user?.name || req.user?.email,
        currentValue: Number(currentValue) || 0,
        percentComplete: Math.max(0, Math.min(100, Number(percentComplete) || 0)),
        note: typeof note === 'string' ? note.slice(0, 1000) : null,
      };
      goal.progress.checkIns.push(checkIn);
      goal.progress.currentValue = checkIn.currentValue;
      goal.progress.percentComplete = checkIn.percentComplete;
      goal.progress.lastUpdatedAt = new Date();
      if (checkIn.percentComplete >= 100 && goal.status !== 'achieved') goal.status = 'achieved';
      else if (checkIn.percentComplete < 30 && goal.status === 'active') goal.status = 'at_risk';
      await goal.save();
      res.json({ success: true, data: goal });
    } catch (err) {
      safeError(res, err, 'hr-extensions goal.checkIn');
    }
  });

  router.patch('/goals/:id', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const EmployeeGoal = tryLoad('EmployeeGoal', '../../models/HR/EmployeeGoal');
      if (!EmployeeGoal)
        return res.status(503).json({ success: false, message: 'model unavailable' });
      const { title, description, status, weight } = req.body || {};
      const update = {};
      if (typeof title === 'string') update.title = title;
      if (typeof description === 'string') update.description = description;
      if (typeof status === 'string') update.status = status;
      if (typeof weight === 'number') update.weight = weight;
      const goal = await EmployeeGoal.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true }
      );
      if (!goal) return res.status(404).json({ success: false, message: 'not found' });
      res.json({ success: true, data: goal });
    } catch (err) {
      safeError(res, err, 'hr-extensions goal.update');
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // Recruitment / Vacancies
  // ═══════════════════════════════════════════════════════════════════

  router.get('/vacancies', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const Vacancy = tryLoad('Vacancy', '../../models/HR/Vacancy');
      if (!Vacancy) return res.json({ success: true, data: { items: [], total: 0 } });
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.department) filter.department = req.query.department;
      const [items, total] = await Promise.all([
        Vacancy.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean({ virtuals: true }),
        Vacancy.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: { items, total, pagination: { page, pages: Math.ceil(total / limit), limit } },
      });
    } catch (err) {
      safeError(res, err, 'hr-extensions vacancies');
    }
  });

  router.post('/vacancies', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const Vacancy = tryLoad('Vacancy', '../../models/HR/Vacancy');
      if (!Vacancy) return res.status(503).json({ success: false, message: 'model unavailable' });
      const doc = await Vacancy.create({
        ...req.body,
        createdByUserId: req.user?._id,
      });
      res.status(201).json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'hr-extensions vacancy.create');
    }
  });

  router.get('/vacancies/:id', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const Vacancy = tryLoad('Vacancy', '../../models/HR/Vacancy');
      if (!Vacancy) return res.status(503).json({ success: false, message: 'model unavailable' });
      const v = await Vacancy.findById(req.params.id).lean({ virtuals: true });
      if (!v) return res.status(404).json({ success: false, message: 'not found' });
      res.json({ success: true, data: v });
    } catch (err) {
      safeError(res, err, 'hr-extensions vacancy.get');
    }
  });

  router.post('/vacancies/:id/applicants', authorize(MANAGER_ROLES), async (req, res) => {
    try {
      const Vacancy = tryLoad('Vacancy', '../../models/HR/Vacancy');
      if (!Vacancy) return res.status(503).json({ success: false, message: 'model unavailable' });
      const v = await Vacancy.findById(req.params.id);
      if (!v) return res.status(404).json({ success: false, message: 'not found' });
      v.applicants.push(req.body);
      await v.save();
      res.status(201).json({ success: true, data: v.applicants[v.applicants.length - 1] });
    } catch (err) {
      safeError(res, err, 'hr-extensions applicant.add');
    }
  });

  router.patch(
    '/vacancies/:id/applicants/:applicantId/stage',
    authorize(MANAGER_ROLES),
    async (req, res) => {
      try {
        const Vacancy = tryLoad('Vacancy', '../../models/HR/Vacancy');
        if (!Vacancy) return res.status(503).json({ success: false, message: 'model unavailable' });
        const { stage, rejectedReason, rating, notes } = req.body || {};
        const v = await Vacancy.findById(req.params.id);
        if (!v) return res.status(404).json({ success: false, message: 'not found' });
        const applicant = v.applicants.id(req.params.applicantId);
        if (!applicant)
          return res.status(404).json({ success: false, message: 'applicant not found' });
        if (typeof stage === 'string') applicant.stage = stage;
        if (typeof rejectedReason === 'string') applicant.rejectedReason = rejectedReason;
        if (typeof rating === 'number') applicant.rating = rating;
        if (typeof notes === 'string') applicant.notes = notes;
        await v.save();
        res.json({ success: true, data: applicant });
      } catch (err) {
        safeError(res, err, 'hr-extensions applicant.stage');
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════
  // Saudi Compliance Center — read-only snapshot
  // ═══════════════════════════════════════════════════════════════════

  router.get('/saudi-compliance/snapshot', authorize(MANAGER_ROLES), async (_req, res) => {
    try {
      const Employee = tryLoad('Employee', '../../models/Employee');
      if (!Employee)
        return res.status(503).json({ success: false, message: 'Employee model unavailable' });

      const now = new Date();
      const day = 86400000;
      const in30 = new Date(now.getTime() + 30 * day);
      const in90 = new Date(now.getTime() + 90 * day);

      const [
        totalActive,
        saudiActive,
        gosiUnregistered,
        iqamaExpiring30,
        iqamaExpired,
        licenseExpiring30,
      ] = await Promise.all([
        Employee.countDocuments({ status: 'active' }),
        Employee.countDocuments({ status: 'active', nationality: 'SA' }),
        Employee.countDocuments({
          status: 'active',
          nationality: 'SA',
          $or: [{ gosiNumber: { $exists: false } }, { gosiNumber: null }, { gosiNumber: '' }],
        }),
        Employee.countDocuments({
          status: 'active',
          nationality: { $ne: 'SA' },
          iqamaExpiry: { $gte: now, $lte: in30 },
        }),
        Employee.countDocuments({
          status: 'active',
          nationality: { $ne: 'SA' },
          iqamaExpiry: { $lt: now },
        }),
        Employee.countDocuments({
          status: 'active',
          licenseExpiry: { $gte: now, $lte: in30 },
        }),
      ]);

      const nonSaudi = Math.max(0, totalActive - saudiActive);
      const saudizationPercent = totalActive > 0 ? (saudiActive / totalActive) * 100 : 0;

      // Nitaqat tier — heuristic based on standard healthcare bands (the
      // real classification is set by Qiwa per industry size; we surface
      // the calculated tier so admins can compare to the official letter).
      let nitaqatBand = 'red';
      if (saudizationPercent >= 40) nitaqatBand = 'platinum';
      else if (saudizationPercent >= 30) nitaqatBand = 'green_high';
      else if (saudizationPercent >= 20) nitaqatBand = 'green_medium';
      else if (saudizationPercent >= 10) nitaqatBand = 'green_low';

      // 7 expected document types per employee (for vault completeness %)
      const EmployeeDocument = tryLoad('EmployeeDocument', '../../models/HR/EmployeeDocument');
      let documentsVaulted = 0;
      let documentsExpiring30 = 0;
      if (EmployeeDocument) {
        [documentsVaulted, documentsExpiring30] = await Promise.all([
          EmployeeDocument.countDocuments({ status: 'active' }),
          EmployeeDocument.countDocuments({
            status: 'active',
            expiryDate: { $gte: now, $lte: in30 },
          }),
        ]);
      }

      // Critical alerts list, sorted by severity
      const alerts = [];
      if (gosiUnregistered > 0) {
        alerts.push({
          kind: 'gosi_missing',
          severity: 'high',
          count: gosiUnregistered,
          label: 'موظفون سعوديون غير مسجَّلين في التأمينات الاجتماعية',
        });
      }
      if (iqamaExpired > 0) {
        alerts.push({
          kind: 'iqama_expired',
          severity: 'critical',
          count: iqamaExpired,
          label: 'إقامات منتهية (مخالفة قانونية فورية)',
        });
      }
      if (iqamaExpiring30 > 0) {
        alerts.push({
          kind: 'iqama_expiring',
          severity: 'high',
          count: iqamaExpiring30,
          label: 'إقامات تنتهي خلال 30 يوماً',
        });
      }
      if (licenseExpiring30 > 0) {
        alerts.push({
          kind: 'license_expiring',
          severity: 'medium',
          count: licenseExpiring30,
          label: 'تراخيص مهنية تنتهي خلال 30 يوماً',
        });
      }
      if (saudizationPercent < 20 && totalActive > 5) {
        alerts.push({
          kind: 'saudization_low',
          severity: 'high',
          count: 1,
          label: `نسبة السعودة ${saudizationPercent.toFixed(1)}% — أقل من الحد الأخضر المنخفض (20%)`,
        });
      }

      const severityRank = { critical: 0, high: 1, medium: 2, low: 3 };
      alerts.sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));

      res.json({
        success: true,
        data: {
          computedAt: now.toISOString(),
          workforce: { total: totalActive, saudi: saudiActive, nonSaudi },
          saudization: {
            percent: Math.round(saudizationPercent * 10) / 10,
            nitaqatBand,
          },
          gosi: { unregistered: gosiUnregistered },
          iqama: { expired: iqamaExpired, expiring30: iqamaExpiring30 },
          professionalLicense: { expiring30: licenseExpiring30 },
          documents: { active: documentsVaulted, expiring30: documentsExpiring30 },
          alerts,
          _in90Reserved: in90.toISOString(), // reserved for future 90-day band
        },
      });
    } catch (err) {
      safeError(res, err, 'hr-extensions saudi-compliance');
    }
  });

  return router;
}

module.exports = { createHrExtensionsRouter };
