/**
 * nafath.routes.js — Nafath SSO endpoints.
 *
 * Mount at /api/auth/nafath. All public (no auth required since this IS
 * the login flow).
 *
 * Endpoints:
 *   POST /initiate            — start Nafath request for a nationalId
 *   GET  /status/:requestId   — poll status, return token on APPROVED
 *   POST /cancel/:requestId   — user-cancelled transaction
 *
 * Rate-limited via existing authRateLimiter if available.
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');

const NafathRequest = require('../models/NafathRequest');
const User = require('../models/User');
const Guardian = require('../models/Guardian');
const nafathAdapter = require('../services/nafathAdapter');
const { generateToken } = require('../middleware/auth');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function hashIp(ip) {
  if (!ip) return '';
  return crypto
    .createHash('sha256')
    .update(`${ip}:${process.env.JWT_SECRET || 'pdpl-salt'}`)
    .digest('hex')
    .slice(0, 32);
}

// ── POST /initiate ───────────────────────────────────────────────────────
router.post('/initiate', async (req, res) => {
  try {
    const { nationalId, purpose = 'login' } = req.body || {};
    if (!nafathAdapter.validateNationalId(nationalId)) {
      return res
        .status(400)
        .json({ success: false, message: 'رقم الهوية الوطنية غير صالح (10 أرقام تبدأ بـ 1 أو 2)' });
    }

    const { transactionId, randomNumber, expiresAt, mode } = await nafathAdapter.initiate({
      nationalId,
      purpose,
    });

    const doc = await NafathRequest.create({
      transactionId,
      randomNumber,
      nationalId,
      purpose,
      mode,
      status: 'PENDING',
      expiresAt,
      ipHash: hashIp(req.ip),
      userAgent: req.get('user-agent') || '',
    });

    logger.info('[nafath] initiated', {
      requestId: String(doc._id),
      purpose,
      mode,
    });

    res.json({
      success: true,
      requestId: doc._id,
      transactionId,
      randomNumber,
      expiresAt,
      mode,
      message:
        mode === 'mock'
          ? 'وضع تطوير — ستتم الموافقة تلقائياً خلال ثوانٍ'
          : 'افتح تطبيق نفاذ واعتمد الطلب الذي يحمل الرقم المعروض',
    });
  } catch (err) {
    if (err?.code === 'INVALID_ID')
      return res.status(400).json({ success: false, message: err.message });
    if (err?.code === 'NAFATH_UNCONFIGURED')
      return res.status(503).json({ success: false, message: err.message });
    return safeError(res, err, 'nafath.initiate');
  }
});

// ── GET /status/:requestId ───────────────────────────────────────────────
router.get('/status/:requestId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await NafathRequest.findById(req.params.requestId);
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });

    // If already resolved, just report the current state (don't re-poll Nafath)
    if (doc.status !== 'PENDING') {
      return res.json({
        success: true,
        status: doc.status,
        requestId: doc._id,
        attributes: doc.status === 'APPROVED' ? doc.attributes : undefined,
      });
    }

    if (doc.expiresAt < new Date()) {
      doc.status = 'EXPIRED';
      await doc.save();
      return res.json({ success: true, status: 'EXPIRED', requestId: doc._id });
    }

    // Poll adapter
    const result = await nafathAdapter.checkStatus({
      transactionId: doc.transactionId,
      nationalId: doc.nationalId,
      createdAtMs: doc.createdAt.getTime(),
    });

    if (result.status === 'PENDING') {
      return res.json({ success: true, status: 'PENDING', requestId: doc._id });
    }

    // Resolve and persist
    doc.status = result.status;
    if (result.status === 'APPROVED') {
      doc.approvedAt = new Date();
      if (result.attributes) {
        doc.attributes = {
          fullName: result.attributes.fullName,
          firstName_ar: result.attributes.firstName_ar,
          lastName_ar: result.attributes.lastName_ar,
          dateOfBirth: result.attributes.dateOfBirth
            ? new Date(result.attributes.dateOfBirth)
            : undefined,
          phone: result.attributes.phone,
          email: result.attributes.email,
        };
      }
    } else if (result.status === 'REJECTED') {
      doc.rejectedAt = new Date();
      doc.errorMessage = result.message;
    } else if (result.status === 'ERROR') {
      doc.errorMessage = result.message;
    }

    // On APPROVED: link to existing User OR create guardian account
    let token = null;
    let linkedUser = null;
    if (doc.status === 'APPROVED') {
      // Strategy: find Guardian with this nationalId → their User
      //           OR find User with matching nationalId field
      //           OR auto-provision guardian if purpose is register_guardian
      const guardian = await Guardian.findOne({ nationalId: doc.nationalId })
        .populate('userId', 'email role name firstName lastName')
        .lean();

      if (guardian?.userId) {
        linkedUser = guardian.userId;
      } else {
        linkedUser = await User.findOne({ nationalId: doc.nationalId }).lean();
      }

      if (linkedUser) {
        doc.linkedUserId = linkedUser._id;
        token = generateToken(
          {
            id: String(linkedUser._id),
            email: linkedUser.email,
            role: linkedUser.role || 'parent',
            permissions: linkedUser.permissions || [],
          },
          '8h'
        );
        logger.info('[nafath] approved + token issued', {
          requestId: String(doc._id),
          userId: String(linkedUser._id),
        });
      } else {
        logger.warn('[nafath] approved but no user linked', {
          nationalId: doc.nationalId,
          requestId: String(doc._id),
        });
      }
    }

    await doc.save();

    return res.json({
      success: true,
      status: doc.status,
      requestId: doc._id,
      attributes: doc.status === 'APPROVED' ? doc.attributes : undefined,
      token,
      user: linkedUser
        ? {
            id: linkedUser._id,
            email: linkedUser.email,
            role: linkedUser.role,
            name:
              linkedUser.name ||
              `${linkedUser.firstName || ''} ${linkedUser.lastName || ''}`.trim(),
          }
        : null,
      needsOnboarding: doc.status === 'APPROVED' && !linkedUser,
      message:
        doc.status === 'APPROVED' && !linkedUser
          ? 'تم التحقق من هويتك لكن لا يوجد حساب مرتبط — تواصل مع الإدارة'
          : undefined,
    });
  } catch (err) {
    return safeError(res, err, 'nafath.status');
  }
});

// ── POST /cancel/:requestId ──────────────────────────────────────────────
router.post('/cancel/:requestId', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.requestId))
      return res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    const doc = await NafathRequest.findById(req.params.requestId);
    if (!doc) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    if (doc.status === 'PENDING') {
      doc.status = 'REJECTED';
      doc.rejectedAt = new Date();
      doc.errorMessage = 'أُلغي من قِبَل المستخدم';
      await doc.save();
    }
    res.json({ success: true, status: doc.status });
  } catch (err) {
    return safeError(res, err, 'nafath.cancel');
  }
});

module.exports = router;
