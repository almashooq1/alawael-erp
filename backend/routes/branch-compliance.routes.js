/**
 * branch-compliance.routes.js — branch-level compliance verification
 * (municipal license + national address).
 *
 * Mount at /api/admin/branch-compliance.
 *
 * Endpoints:
 *   GET  /overview                       — aggregate across branches
 *   GET  /:branchId/status               — cached state
 *   POST /:branchId/verify-balady        — municipal license check
 *   POST /:branchId/verify-wasel         — national address lookup
 *   POST /verify-batch                   — all active branches
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken, requireRole } = require('../middleware/auth');

const Branch = require('../models/Branch');
const balady = require('../services/baladyAdapter');
const wasel = require('../services/waselAdapter');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

router.use(authenticateToken);

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'hr_manager',
  'branch_manager',
];
const WRITE_ROLES = ['admin', 'superadmin', 'super_admin', 'manager', 'branch_manager'];

// ── GET /overview ────────────────────────────────────────────────────────
router.get('/overview', requireRole(READ_ROLES), async (req, res) => {
  try {
    const total = await Branch.countDocuments({ status: 'active' });
    const [baladyActive, baladyExpired, baladyUnverified, waselVerified, waselUnverified] =
      await Promise.all([
        Branch.countDocuments({ 'balady_verification.status': 'active' }),
        Branch.countDocuments({
          'balady_verification.status': { $in: ['expired', 'suspended', 'not_found'] },
        }),
        Branch.countDocuments({
          balady_license_number: { $exists: true, $ne: '' },
          $or: [
            { balady_verification: { $exists: false } },
            { 'balady_verification.verified': false },
          ],
        }),
        Branch.countDocuments({ 'wasel_verification.status': 'match' }),
        Branch.countDocuments({
          wasel_short_code: { $exists: true, $ne: '' },
          $or: [
            { wasel_verification: { $exists: false } },
            { 'wasel_verification.verified': false },
          ],
        }),
      ]);

    const soon = new Date();
    soon.setDate(soon.getDate() + 90);
    const expiringSoon = await Branch.find({
      'balady_verification.expiryDate': { $gte: new Date(), $lte: soon },
    })
      .select('name_ar code balady_verification.expiryDate balady_verification.status')
      .limit(30)
      .lean();

    res.json({
      success: true,
      total,
      balady: {
        active: baladyActive,
        expiredOrSuspended: baladyExpired,
        unverified: baladyUnverified,
      },
      wasel: {
        verified: waselVerified,
        unverified: waselUnverified,
      },
      expiringSoon,
    });
  } catch (err) {
    return safeError(res, err, 'branch-compliance.overview');
  }
});

// ── GET /:branchId/status ────────────────────────────────────────────────
router.get('/:branchId/status', requireRole(READ_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.branchId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const b = await Branch.findById(req.params.branchId)
      .select(
        'name_ar name_en code balady_license_number wasel_short_code balady_verification wasel_verification'
      )
      .lean();
    if (!b) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({
      success: true,
      data: {
        branch: { _id: b._id, name: b.name_ar || b.name_en, code: b.code },
        balady: {
          licenseNumber: b.balady_license_number,
          ...(b.balady_verification || { verified: false }),
        },
        wasel: {
          shortCode: b.wasel_short_code,
          ...(b.wasel_verification || { verified: false }),
        },
      },
    });
  } catch (err) {
    return safeError(res, err, 'branch-compliance.status');
  }
});

// ── POST /:branchId/verify-balady ────────────────────────────────────────
router.post('/:branchId/verify-balady', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.branchId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const b = await Branch.findById(req.params.branchId);
    if (!b) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (!b.balady_license_number)
      return res.status(400).json({
        success: false,
        message: 'رقم الترخيص البلدي غير مُدخَل للفرع',
      });

    const result = await balady.verify({ licenseNumber: b.balady_license_number });
    b.balady_verification = {
      verified: result.status !== 'unknown',
      lastVerifiedAt: new Date(),
      mode: result.mode,
      status: result.status,
      licenseType: result.licenseType,
      activityName: result.activityName,
      issueDate: result.issueDate,
      expiryDate: result.expiryDate,
      governorate: result.governorate,
      city: result.city,
      remainingDays: result.remainingDays,
      message: result.message,
    };
    await b.save();

    logger.info('[branch-compliance] balady verified', {
      branchId: String(b._id),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });
    res.json({ success: true, data: b.balady_verification, message: 'تم التحقق من بلدي' });
  } catch (err) {
    return safeError(res, err, 'branch-compliance.balady');
  }
});

// ── POST /:branchId/verify-wasel ─────────────────────────────────────────
router.post('/:branchId/verify-wasel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.branchId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const b = await Branch.findById(req.params.branchId);
    if (!b) return res.status(404).json({ success: false, message: 'غير موجود' });
    if (!b.wasel_short_code)
      return res.status(400).json({
        success: false,
        message: 'الرمز البريدي (Short code) غير مُدخَل للفرع',
      });

    const result = await wasel.verifyShortCode({ shortCode: b.wasel_short_code });
    b.wasel_verification = {
      verified: result.status === 'match',
      lastVerifiedAt: new Date(),
      mode: result.mode,
      status: result.status,
      address: result.address,
      city: result.city,
      district: result.district,
      postalCode: result.postalCode,
      buildingNumber: result.buildingNumber,
      additionalNumber: result.additionalNumber,
      geo: result.geo,
      isDeliverable: result.isDeliverable,
      message: result.message,
    };
    await b.save();

    logger.info('[branch-compliance] wasel verified', {
      branchId: String(b._id),
      status: result.status,
      mode: result.mode,
      by: req.user?.id,
    });
    res.json({ success: true, data: b.wasel_verification, message: 'تم التحقق من العنوان الوطني' });
  } catch (err) {
    return safeError(res, err, 'branch-compliance.wasel');
  }
});

// ── POST /verify-batch ───────────────────────────────────────────────────
router.post(
  '/verify-batch',
  requireRole(['admin', 'superadmin', 'super_admin']),
  async (req, res) => {
    try {
      const scope = (req.body?.scope || 'both').toLowerCase(); // 'balady' | 'wasel' | 'both'
      const branches = await Branch.find({ status: 'active' })
        .select('_id balady_license_number wasel_short_code')
        .lean();

      let baladyDone = 0;
      let waselDone = 0;
      const errors = [];

      for (const br of branches) {
        if ((scope === 'balady' || scope === 'both') && br.balady_license_number) {
          try {
            const r = await balady.verify({ licenseNumber: br.balady_license_number });
            await Branch.updateOne(
              { _id: br._id },
              {
                balady_verification: {
                  verified: r.status !== 'unknown',
                  lastVerifiedAt: new Date(),
                  mode: r.mode,
                  status: r.status,
                  licenseType: r.licenseType,
                  activityName: r.activityName,
                  issueDate: r.issueDate,
                  expiryDate: r.expiryDate,
                  governorate: r.governorate,
                  city: r.city,
                  remainingDays: r.remainingDays,
                  message: r.message,
                },
              }
            );
            baladyDone++;
          } catch (e) {
            errors.push({ branchId: String(br._id), kind: 'balady', message: e?.message });
          }
        }
        if ((scope === 'wasel' || scope === 'both') && br.wasel_short_code) {
          try {
            const r = await wasel.verifyShortCode({ shortCode: br.wasel_short_code });
            await Branch.updateOne(
              { _id: br._id },
              {
                wasel_verification: {
                  verified: r.status === 'match',
                  lastVerifiedAt: new Date(),
                  mode: r.mode,
                  status: r.status,
                  address: r.address,
                  city: r.city,
                  district: r.district,
                  postalCode: r.postalCode,
                  buildingNumber: r.buildingNumber,
                  additionalNumber: r.additionalNumber,
                  geo: r.geo,
                  isDeliverable: r.isDeliverable,
                  message: r.message,
                },
              }
            );
            waselDone++;
          } catch (e) {
            errors.push({ branchId: String(br._id), kind: 'wasel', message: e?.message });
          }
        }
      }

      logger.info('[branch-compliance] batch verified', {
        scope,
        baladyDone,
        waselDone,
        errors: errors.length,
        by: req.user?.id,
      });
      res.json({
        success: true,
        scope,
        totalBranches: branches.length,
        baladyDone,
        waselDone,
        errors: errors.slice(0, 20),
        message: `تم التحقق من ${baladyDone + waselDone} فرع`,
      });
    } catch (err) {
      return safeError(res, err, 'branch-compliance.batch');
    }
  }
);

module.exports = router;
