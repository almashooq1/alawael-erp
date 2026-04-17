/**
 * hr-compliance.routes.js — employee compliance verification (GOSI + SCFHS).
 *
 * Mount at /api/admin/hr/compliance.
 *
 * Endpoints:
 *   GET  /overview              — aggregate status across all employees
 *   GET  /:employeeId/status    — cached verification state
 *   POST /:employeeId/verify-gosi
 *   POST /:employeeId/verify-scfhs
 *   POST /verify-batch          — re-verify all employees (admin-only, async)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Employee = require('../models/HR/Employee');
const gosi = require('../services/gosiAdapter');
const scfhs = require('../services/scfhsAdapter');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr',
  'hr_manager',
  'clinical_supervisor',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'hr', 'hr_manager'];

// ── GET /overview ────────────────────────────────────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const total = await Employee.countDocuments({ status: { $ne: 'terminated' } });
    const [gosiActive, gosiInactive, gosiUnverified, scfhsActive, scfhsExpired, scfhsUnverified] =
      await Promise.all([
        Employee.countDocuments({ 'gosi_verification.status': 'active' }),
        Employee.countDocuments({
          'gosi_verification.status': { $in: ['inactive', 'not_found'] },
        }),
        Employee.countDocuments({
          $or: [{ gosi_verification: { $exists: false } }, { 'gosi_verification.verified': false }],
        }),
        Employee.countDocuments({ 'scfhs_verification.status': 'active' }),
        Employee.countDocuments({
          'scfhs_verification.status': { $in: ['expired', 'suspended', 'not_found'] },
        }),
        Employee.countDocuments({
          scfhs_number: { $exists: true, $ne: '' },
          $or: [
            { scfhs_verification: { $exists: false } },
            { 'scfhs_verification.verified': false },
          ],
        }),
      ]);

    // Upcoming expiries within 90 days
    const soon = new Date();
    soon.setDate(soon.getDate() + 90);
    const expiringSoon = await Employee.find({
      'scfhs_verification.expiryDate': { $gte: new Date(), $lte: soon },
    })
      .select(
        'firstName_ar lastName_ar national_id scfhs_verification.expiryDate scfhs_verification.classification'
      )
      .limit(50)
      .lean();

    res.json({
      success: true,
      total,
      gosi: {
        active: gosiActive,
        inactive: gosiInactive,
        unverified: gosiUnverified,
      },
      scfhs: {
        active: scfhsActive,
        expiredOrSuspended: scfhsExpired,
        unverified: scfhsUnverified,
      },
      expiringSoon,
    });
  } catch (err) {
    return safeError(res, err, 'compliance.overview');
  }
});

// ── GET /:employeeId/status ──────────────────────────────────────────────
router.get('/:employeeId/status', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.employeeId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const e = await Employee.findById(req.params.employeeId)
      .select(
        'firstName firstName_ar lastName lastName_ar national_id scfhs_number scfhs_classification scfhs_expiry gosi_number gosi_registered gosi_verification scfhs_verification'
      )
      .lean();
    if (!e) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({
      success: true,
      data: {
        employee: {
          _id: e._id,
          name: `${e.firstName_ar || e.firstName || ''} ${e.lastName_ar || e.lastName || ''}`.trim(),
          nationalId: e.national_id,
          scfhsNumber: e.scfhs_number,
          gosiNumber: e.gosi_number,
        },
        gosi: e.gosi_verification || { verified: false },
        scfhs: e.scfhs_verification || { verified: false },
      },
    });
  } catch (err) {
    return safeError(res, err, 'compliance.status');
  }
});

// ── POST /:employeeId/verify-gosi ────────────────────────────────────────
router.post('/:employeeId/verify-gosi', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.employeeId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const e = await Employee.findById(req.params.employeeId);
    if (!e) return res.status(404).json({ success: false, message: 'غير موجود' });

    const result = await gosi.verify({
      nationalId: e.national_id,
      gosiNumber: e.gosi_number,
    });
    e.gosi_verification = {
      verified: result.status !== 'unknown',
      lastVerifiedAt: new Date(),
      mode: result.mode,
      status: result.status,
      employerName: result.employerName,
      monthlyWage: result.monthlyWage,
      registrationDate: result.registrationDate,
      message: result.message,
    };
    // Sync flag
    if (result.status === 'active') {
      e.gosi_registered = true;
      if (result.registrationDate && !e.gosi_registration_date)
        e.gosi_registration_date = result.registrationDate;
    }
    await e.save();

    logger.info('[compliance] gosi verified', {
      employeeId: String(e._id),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });
    res.json({ success: true, data: e.gosi_verification, message: 'تم التحقق من GOSI' });
  } catch (err) {
    return safeError(res, err, 'compliance.gosi');
  }
});

// ── POST /:employeeId/verify-scfhs ───────────────────────────────────────
router.post('/:employeeId/verify-scfhs', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.employeeId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const e = await Employee.findById(req.params.employeeId);
    if (!e) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (!e.scfhs_number)
      return res.status(400).json({
        success: false,
        message: 'رقم الترخيص غير مُدخَل في ملف الموظف',
      });

    const result = await scfhs.verify({
      licenseNumber: e.scfhs_number,
      nationalId: e.national_id,
    });
    e.scfhs_verification = {
      verified: result.status !== 'unknown',
      lastVerifiedAt: new Date(),
      mode: result.mode,
      status: result.status,
      classification: result.classification,
      specialty: result.specialty,
      licenseNumber: e.scfhs_number,
      expiryDate: result.expiryDate,
      message: result.message,
    };
    if (result.classification && !e.scfhs_classification)
      e.scfhs_classification = result.classification;
    if (result.expiryDate) e.scfhs_expiry = result.expiryDate;
    await e.save();

    logger.info('[compliance] scfhs verified', {
      employeeId: String(e._id),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });
    res.json({ success: true, data: e.scfhs_verification, message: 'تم التحقق من SCFHS' });
  } catch (err) {
    return safeError(res, err, 'compliance.scfhs');
  }
});

// ── POST /verify-batch ───────────────────────────────────────────────────
router.post(
  '/verify-batch',
  requireRole(['admin', 'superadmin', 'super_admin']),
  async (req, res) => {
    try {
      const scope = (req.body?.scope || 'both').toLowerCase(); // 'gosi' | 'scfhs' | 'both'
      const filter = { status: { $ne: 'terminated' } };
      const employees = await Employee.find(filter).select('_id national_id scfhs_number').lean();

      let gosiDone = 0;
      let scfhsDone = 0;
      const errors = [];

      for (const emp of employees) {
        if ((scope === 'gosi' || scope === 'both') && emp.national_id) {
          try {
            const r = await gosi.verify({ nationalId: emp.national_id });
            await Employee.updateOne(
              { _id: emp._id },
              {
                gosi_verification: {
                  verified: r.status !== 'unknown',
                  lastVerifiedAt: new Date(),
                  mode: r.mode,
                  status: r.status,
                  employerName: r.employerName,
                  monthlyWage: r.monthlyWage,
                  registrationDate: r.registrationDate,
                  message: r.message,
                },
              }
            );
            gosiDone++;
          } catch (e) {
            errors.push({ employeeId: String(emp._id), kind: 'gosi', message: e?.message });
          }
        }
        if ((scope === 'scfhs' || scope === 'both') && emp.scfhs_number) {
          try {
            const r = await scfhs.verify({
              licenseNumber: emp.scfhs_number,
              nationalId: emp.national_id,
            });
            await Employee.updateOne(
              { _id: emp._id },
              {
                scfhs_verification: {
                  verified: r.status !== 'unknown',
                  lastVerifiedAt: new Date(),
                  mode: r.mode,
                  status: r.status,
                  classification: r.classification,
                  specialty: r.specialty,
                  licenseNumber: emp.scfhs_number,
                  expiryDate: r.expiryDate,
                  message: r.message,
                },
              }
            );
            scfhsDone++;
          } catch (e) {
            errors.push({ employeeId: String(emp._id), kind: 'scfhs', message: e?.message });
          }
        }
      }

      logger.info('[compliance] batch verified', {
        scope,
        gosiDone,
        scfhsDone,
        errors: errors.length,
        by: req.user?.id,
      });
      res.json({
        success: true,
        scope,
        totalEmployees: employees.length,
        gosiDone,
        scfhsDone,
        errors: errors.slice(0, 20),
        message: `تم التحقق من ${gosiDone + scfhsDone} سجلاً`,
      });
    } catch (err) {
      return safeError(res, err, 'compliance.batch');
    }
  }
);

module.exports = router;
