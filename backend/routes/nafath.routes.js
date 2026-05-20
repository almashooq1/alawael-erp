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
const SSOService = require('../services/sso.service');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

// Single SSO service instance — W205b integration. We use this to issue a
// full SSO session (access/refresh/idToken triplet) on Nafath APPROVED, so
// Nafath-authenticated users get the same /sessions visibility, /logout-all
// behaviour, and per-user session cap as password-authenticated users.
const ssoService = new SSOService();

/**
 * Find a User account that matches a Nafath-verified national ID.
 *
 * Lookup order:
 *   1. User.nationalId direct match (typical staff login)
 *   2. Guardian.idNumber → Guardian.userId (parent login — Guardian uses
 *      `idNumber` not `nationalId`; W205b fixed that bug)
 *
 * Returns the lean user document or null.
 */
async function findUserByNationalId(nationalId) {
  if (!nationalId) return null;

  // Try direct User match first (staff / admin who Nafath-linked their account)
  const directUser = await User.findOne({ nationalId }).lean();
  if (directUser) return directUser;

  // Fallback: Guardian → User
  const guardian = await Guardian.findOne({ idNumber: nationalId, idType: 'national_id' })
    .populate('userId', 'email role fullName isActive customPermissions branchId regionIds')
    .lean();
  if (guardian?.userId) return guardian.userId;

  return null;
}

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

    // On APPROVED: link to existing User and mint a full SSO session (W205b)
    let token = null;
    let ssoSession = null;
    let linkedUser = null;
    if (doc.status === 'APPROVED') {
      linkedUser = await findUserByNationalId(doc.nationalId);

      if (linkedUser) {
        if (linkedUser.isActive === false) {
          logger.warn('[nafath] approved but user disabled', {
            requestId: String(doc._id),
            userId: String(linkedUser._id),
          });
          doc.linkedUserId = linkedUser._id;
          doc.errorMessage = 'الحساب معطّل';
          await doc.save();
          return res.status(403).json({
            success: false,
            status: 'APPROVED',
            error: 'account_disabled',
            message: 'الحساب معطّل — تواصل مع الإدارة',
          });
        }

        doc.linkedUserId = linkedUser._id;

        // Legacy backward-compat: existing UI flows expect `token`
        token = generateToken(
          {
            id: String(linkedUser._id),
            email: linkedUser.email,
            role: linkedUser.role || 'parent',
            permissions: linkedUser.customPermissions || [],
          },
          '8h'
        );

        // W205b: also issue an SSO session so Nafath-authenticated users
        // get the same session-management surface as password users
        try {
          const userPayload = {
            userId: String(linkedUser._id),
            email: linkedUser.email,
            fullName: linkedUser.fullName,
            role: linkedUser.role || 'parent',
            permissions: linkedUser.customPermissions || [],
            branchId: linkedUser.branchId ? String(linkedUser.branchId) : null,
            regionIds: (linkedUser.regionIds || []).map(r => String(r)),
            authMethod: 'nafath',
            nationalId: doc.nationalId,
          };
          const session = await ssoService.createSession(
            userPayload.userId,
            userPayload,
            {
              source: 'nafath',
              userAgent: req.get('user-agent'),
              ipAddress: req.ip,
              nafathRequestId: String(doc._id),
            }
          );
          ssoSession = {
            sessionId: session.sessionId,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            idToken: session.idToken,
            expiresIn: session.expiresIn,
            tokenType: session.tokenType,
          };

          // Update lastLogin (best-effort — never block on this)
          try {
            await User.updateOne(
              { _id: linkedUser._id },
              { $set: { lastLogin: new Date() } }
            );
          } catch (e) {
            logger.warn('[nafath] lastLogin update failed:', e.message);
          }
        } catch (e) {
          logger.error('[nafath] SSO session creation failed:', e);
          // Don't fail the request — caller still gets the legacy `token`
        }

        logger.info('[nafath] approved + token + sso session issued', {
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
      sso: ssoSession,
      user: linkedUser
        ? {
            id: linkedUser._id,
            email: linkedUser.email,
            role: linkedUser.role,
            name: linkedUser.fullName || linkedUser.name,
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
