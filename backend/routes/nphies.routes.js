/**
 * NPHIES Routes — مسارات المنصة الوطنية لتبادل المعلومات الصحية
 * HL7 FHIR R4 - مجلس الضمان الصحي (CHI)
 */
'use strict';

const express = require('express');
const router = express.Router();
const nphiesService = require('../services/nphies.service');
const { requireAuth } = require('../middleware/auth.middleware');

// ─── التحقق من أهلية التأمين ─────────────────────────────────────────────
/**
 * POST /api/nphies/eligibility/check
 * التحقق من أهلية مريض للتأمين الصحي
 */
router.post('/eligibility/check', requireAuth, async (req, res) => {
  try {
    const { patientData, coverageData } = req.body;
    if (!patientData?.idNumber || !coverageData?.payerId) {
      return res.status(400).json({
        success: false,
        message: 'بيانات المريض ومعرّف شركة التأمين مطلوبة',
      });
    }
    const result = await nphiesService.checkEligibility(patientData, coverageData);
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? 'تم إرسال طلب التحقق من الأهلية' : 'فشل التحقق من الأهلية',
      data: result.data,
      requestId: result.requestId,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── تقديم مطالبة تأمينية ─────────────────────────────────────────────────
/**
 * POST /api/nphies/claims/submit
 * تقديم مطالبة تأمينية
 */
router.post('/claims/submit', requireAuth, async (req, res) => {
  try {
    const claimData = req.body;
    if (!claimData.patientId || !claimData.payerId || !claimData.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'معرّف المريض وشركة التأمين والمبلغ الكلي مطلوبة',
      });
    }
    const result = await nphiesService.submitClaim(claimData);
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? 'تم تقديم المطالبة بنجاح' : 'فشل تقديم المطالبة',
      data: result.data,
      claimId: result.claimId,
      requestId: result.requestId,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── طلب الموافقة المسبقة ─────────────────────────────────────────────────
/**
 * POST /api/nphies/prior-auth/request
 * طلب موافقة مسبقة على خدمة طبية
 */
router.post('/prior-auth/request', requireAuth, async (req, res) => {
  try {
    const authData = req.body;
    if (!authData.patientId || !authData.payerId) {
      return res.status(400).json({
        success: false,
        message: 'معرّف المريض وشركة التأمين مطلوبان',
      });
    }
    const result = await nphiesService.requestPriorAuthorization(authData);
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? 'تم إرسال طلب الموافقة المسبقة' : 'فشل إرسال طلب الموافقة المسبقة',
      data: result.data,
      preAuthId: result.preAuthId,
      requestId: result.requestId,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── استعلام حالة المطالبة ────────────────────────────────────────────────
/**
 * GET /api/nphies/claims/:claimId/status
 * الاستعلام عن حالة مطالبة محددة
 */
router.get('/claims/:claimId/status', requireAuth, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { payerId } = req.query;
    if (!payerId) {
      return res.status(400).json({ success: false, message: 'معرّف شركة التأمين مطلوب' });
    }
    const result = await nphiesService.inquireClaimStatus(claimId, payerId);
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── إلغاء مطالبة ────────────────────────────────────────────────────────
/**
 * DELETE /api/nphies/claims/:claimId
 * إلغاء مطالبة مقدمة
 */
router.delete('/claims/:claimId', requireAuth, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { reason } = req.body;
    const result = await nphiesService.cancelClaim(claimId, reason);
    return res.status(result.success ? 200 : 502).json({
      success: result.success,
      message: result.success ? 'تم إلغاء المطالبة' : 'فشل إلغاء المطالبة',
      data: result.data,
      error: result.error,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── حالة الخدمة ──────────────────────────────────────────────────────────
/**
 * GET /api/nphies/status
 * حالة تكامل NPHIES
 */
router.get('/status', requireAuth, (req, res) => {
  return res.json({
    success: true,
    data: {
      service: 'NPHIES',
      env: process.env.NPHIES_ENV || 'sandbox',
      configured: !!(process.env.NPHIES_LICENSE_ID && process.env.NPHIES_SENDER_ID),
      standard: 'HL7 FHIR R4',
      features: [
        'Eligibility Verification',
        'Claims Submission',
        'Prior Authorization',
        'Claim Status Inquiry',
        'Claim Cancellation',
        'FHIR Bundle Builder',
      ],
    },
  });
});

module.exports = router;
