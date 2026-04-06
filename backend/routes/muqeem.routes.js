/**
 * Muqeem Routes — مسارات مقيم (وزارة الداخلية)
 * إدارة الإقامات وتأشيرات الخروج والعودة للموظفين الأجانب
 */
'use strict';

const express = require('express');
const router = express.Router();
const muqeemService = require('../services/muqeem.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const safeError = require('../utils/safeError');
const requireAuth = authenticateToken;

// ─── الاستعلام عن إقامة موظف ───────────────────────────────────────────────
/**
 * GET /api/muqeem/residence/:iqamaNumber
 * الاستعلام عن بيانات الإقامة لرقم إقامة محدد
 */
router.get('/residence/:iqamaNumber', requireAuth, async (req, res) => {
  try {
    const { iqamaNumber } = req.params;
    if (!iqamaNumber || !/^\d{10}$/.test(iqamaNumber)) {
      return res
        .status(400)
        .json({ success: false, message: 'رقم الإقامة يجب أن يتكون من 10 أرقام' });
    }
    const result = await muqeemService.getResidenceInfo(iqamaNumber);
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل الاستعلام عن بيانات الإقامة', error: result.error });
    }
    return res.json({ success: true, data: result.data });
  } catch (err) {
    return safeError(res, err);
  }
});

// ─── قائمة موظفي المنشأة ────────────────────────────────────────────────────
/**
 * GET /api/muqeem/workers
 * جلب قائمة الموظفين المسجلين في المنشأة لدى مقيم
 */
router.get('/workers', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await muqeemService.getEstablishmentWorkers(Number(page), Number(limit));
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل جلب قائمة الموظفين', error: result.error });
    }
    return res.json({ success: true, data: result.data });
  } catch (err) {
    return safeError(res, err);
  }
});

// ─── الإقامات المنتهية قريباً ────────────────────────────────────────────────
/**
 * GET /api/muqeem/expiring
 * الحصول على الموظفين الذين تنتهي إقاماتهم خلال عدد أيام محدد
 */
router.get('/expiring', requireAuth, async (req, res) => {
  try {
    const { daysAhead = 90 } = req.query;
    const result = await muqeemService.getExpiringResidencies(Number(daysAhead));
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل جلب الإقامات المنتهية', error: result.error });
    }
    return res.json({ success: true, data: result.data });
  } catch (err) {
    return safeError(res, err);
  }
});

// ─── تجديد إقامة ────────────────────────────────────────────────────────────
/**
 * POST /api/muqeem/residence/renew
 * تجديد إقامة موظف
 */
router.post('/residence/renew', requireAuth, async (req, res) => {
  try {
    const { iqamaNumber, renewalPeriod } = req.body;
    if (!iqamaNumber) {
      return res.status(400).json({ success: false, message: 'رقم الإقامة مطلوب' });
    }
    const result = await muqeemService.renewResidence(iqamaNumber, renewalPeriod);
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل تجديد الإقامة', error: result.error });
    }
    return res.json({ success: true, message: 'تم تجديد الإقامة بنجاح', data: result.data });
  } catch (err) {
    return safeError(res, err);
  }
});

// ─── إصدار تأشيرة خروج وعودة ────────────────────────────────────────────────
/**
 * POST /api/muqeem/visa/exit-reentry
 * إصدار تأشيرة خروج وعودة لموظف
 */
router.post('/visa/exit-reentry', requireAuth, async (req, res) => {
  try {
    const { iqamaNumber, duration, numberOfTrips, purpose } = req.body;
    if (!iqamaNumber) {
      return res.status(400).json({ success: false, message: 'رقم الإقامة مطلوب' });
    }
    const result = await muqeemService.issueExitReEntryVisa(iqamaNumber, {
      duration,
      numberOfTrips,
      purpose,
    });
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل إصدار تأشيرة الخروج والعودة', error: result.error });
    }
    return res.json({
      success: true,
      message: 'تم إصدار تأشيرة الخروج والعودة بنجاح',
      data: result.data,
    });
  } catch (err) {
    return safeError(res, err);
  }
});

// ─── إصدار تأشيرة خروج نهائي ────────────────────────────────────────────────
/**
 * POST /api/muqeem/visa/final-exit
 * إصدار تأشيرة خروج نهائي لموظف (إنهاء الخدمة)
 */
router.post('/visa/final-exit', requireAuth, async (req, res) => {
  try {
    const { iqamaNumber } = req.body;
    if (!iqamaNumber) {
      return res.status(400).json({ success: false, message: 'رقم الإقامة مطلوب' });
    }
    const result = await muqeemService.issueFinalExitVisa(iqamaNumber);
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل إصدار تأشيرة الخروج النهائي', error: result.error });
    }
    return res.json({
      success: true,
      message: 'تم إصدار تأشيرة الخروج النهائي بنجاح',
      data: result.data,
    });
  } catch (err) {
    return safeError(res, err);
  }
});

// ─── تغيير مهنة ──────────────────────────────────────────────────────────────
/**
 * POST /api/muqeem/worker/change-occupation
 * تغيير مهنة موظف في مقيم
 */
router.post('/worker/change-occupation', requireAuth, async (req, res) => {
  try {
    const { iqamaNumber, newOccupation } = req.body;
    if (!iqamaNumber || !newOccupation) {
      return res
        .status(400)
        .json({ success: false, message: 'رقم الإقامة والمهنة الجديدة مطلوبان' });
    }
    const result = await muqeemService.changeOccupation(iqamaNumber, newOccupation);
    if (!result.success) {
      return res
        .status(502)
        .json({ success: false, message: 'فشل تغيير المهنة', error: result.error });
    }
    return res.json({ success: true, message: 'تم تغيير المهنة بنجاح', data: result.data });
  } catch (err) {
    return safeError(res, err);
  }
});

module.exports = router;
