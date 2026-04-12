/**
 * NPHIES Routes — National Platform for Health Information Exchange Services
 * HL7 FHIR R4 Integration for Insurance Claims
 * البرومبت 15: تكامل NPHIES للمطالبات التأمينية الصحية
 */

const express = require('express');
const router = express.Router();
const nphiesService = require('../services/nphies.service');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// =========================================================================
// 1. التحقق من الأهلية — Eligibility Verification
// =========================================================================

/**
 * POST /api/nphies/eligibility/check
 * التحقق من أهلية المريض للتأمين
 */
router.post(
  '/eligibility/check',
  authenticateToken,
  requirePermission('nphies:eligibility:check'),
  async (req, res) => {
    try {
      const { patientData, coverageData, options = {} } = req.body;

      if (!patientData || !coverageData) {
        return res.status(400).json({
          success: false,
          message: 'patientData و coverageData مطلوبان',
        });
      }

      if (!patientData.id || !coverageData.payerId) {
        return res.status(400).json({
          success: false,
          message: 'patientData.id و coverageData.payerId مطلوبان',
        });
      }

      const result = await nphiesService.checkEligibility(patientData, coverageData, {
        ...options,
        userId: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: 'تم التحقق من الأهلية بنجاح',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Eligibility Error');
    }
  }
);

// =========================================================================
// 2. الموافقة المسبقة — Prior Authorization
// =========================================================================

/**
 * POST /api/nphies/prior-auth/request
 * طلب موافقة مسبقة من شركة التأمين
 */
router.post(
  '/prior-auth/request',
  authenticateToken,
  requirePermission('nphies:prior-auth:request'),
  async (req, res) => {
    try {
      const { authData, options = {} } = req.body;

      if (!authData) {
        return res.status(400).json({
          success: false,
          message: 'authData مطلوب',
        });
      }

      const required = ['patientId', 'payerId', 'serviceCodes', 'diagnosisCodes'];
      const missing = required.filter(f => !authData[f]);
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `الحقول التالية مطلوبة في authData: ${missing.join(', ')}`,
        });
      }

      if (!Array.isArray(authData.serviceCodes) || authData.serviceCodes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'serviceCodes يجب أن تكون مصفوفة غير فارغة',
        });
      }

      const result = await nphiesService.requestPriorAuthorization(authData, {
        ...options,
        userId: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: 'تم إرسال طلب الموافقة المسبقة',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Prior Auth Error');
    }
  }
);

// =========================================================================
// 3. تقديم المطالبة — Claim Submission
// =========================================================================

/**
 * POST /api/nphies/claims/submit
 * تقديم مطالبة تأمينية
 */
router.post(
  '/claims/submit',
  authenticateToken,
  requirePermission('nphies:claims:submit'),
  async (req, res) => {
    try {
      const { claimData, options = {} } = req.body;

      if (!claimData) {
        return res.status(400).json({
          success: false,
          message: 'claimData مطلوب',
        });
      }

      const required = ['patientId', 'payerId', 'services'];
      const missing = required.filter(f => !claimData[f]);
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `الحقول التالية مطلوبة في claimData: ${missing.join(', ')}`,
        });
      }

      if (!Array.isArray(claimData.services) || claimData.services.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'claimData.services يجب أن تكون مصفوفة غير فارغة',
        });
      }

      const result = await nphiesService.submitClaim(claimData, {
        ...options,
        userId: req.user?.id,
      });

      return res.status(200).json({
        success: true,
        message: 'تم تقديم المطالبة بنجاح',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Claim Submit Error');
    }
  }
);

/**
 * GET /api/nphies/claims/:claimId/status
 * الاستعلام عن حالة مطالبة
 */
router.get(
  '/claims/:claimId/status',
  authenticateToken,
  requirePermission('nphies:claims:read'),
  async (req, res) => {
    try {
      const { claimId } = req.params;
      const { payerId } = req.query;

      if (!payerId) {
        return res.status(400).json({
          success: false,
          message: 'payerId مطلوب في query string',
        });
      }

      const result = await nphiesService.inquireClaimStatus(claimId, payerId);

      return res.status(200).json({
        success: true,
        message: 'تم استرجاع حالة المطالبة',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Claim Status Error');
    }
  }
);

/**
 * DELETE /api/nphies/claims/:claimId
 * إلغاء مطالبة
 */
router.delete(
  '/claims/:claimId',
  authenticateToken,
  requirePermission('nphies:claims:cancel'),
  async (req, res) => {
    try {
      const { claimId } = req.params;
      const { reason } = req.body;

      const result = await nphiesService.cancelClaim(claimId, reason || 'Cancelled by provider');

      return res.status(200).json({
        success: true,
        message: 'تم إرسال طلب إلغاء المطالبة',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Claim Cancel Error');
    }
  }
);

// =========================================================================
// 4. التواصل — Communication (طلبات مستندات إضافية)
// =========================================================================

/**
 * POST /api/nphies/communication/respond
 * الرد على طلب مستندات إضافية من شركة التأمين
 */
router.post(
  '/communication/respond',
  authenticateToken,
  requirePermission('nphies:communication:respond'),
  async (req, res) => {
    try {
      const { communicationData } = req.body;

      if (!communicationData) {
        return res.status(400).json({
          success: false,
          message: 'communicationData مطلوب',
        });
      }

      const required = ['communicationRequestId', 'claimId', 'payerId', 'message'];
      const missing = required.filter(f => !communicationData[f]);
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: `الحقول التالية مطلوبة: ${missing.join(', ')}`,
        });
      }

      const result = await nphiesService.respondToCommunication(communicationData);

      return res.status(200).json({
        success: true,
        message: 'تم إرسال الرد على طلب المستندات بنجاح',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Communication Error');
    }
  }
);

// =========================================================================
// 5. تسوية الدفع — Payment Reconciliation
// =========================================================================

/**
 * POST /api/nphies/payment/reconcile
 * طلب تسوية دفع لدفعة محددة
 */
router.post(
  '/payment/reconcile',
  authenticateToken,
  requirePermission('nphies:payment:reconcile'),
  async (req, res) => {
    try {
      const { paymentReference, payerId } = req.body;

      if (!paymentReference || !payerId) {
        return res.status(400).json({
          success: false,
          message: 'paymentReference و payerId مطلوبان',
        });
      }

      const result = await nphiesService.reconcilePayment(paymentReference, payerId);

      return res.status(200).json({
        success: true,
        message: 'تم استرجاع بيانات تسوية الدفع بنجاح',
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Payment Reconciliation Error');
    }
  }
);

// =========================================================================
// 6. رموز CPT — CPT Codes for Rehabilitation Centers
// =========================================================================

/**
 * GET /api/nphies/cpt-codes
 * الحصول على قائمة رموز CPT لمراكز التأهيل
 */
router.get('/cpt-codes', authenticateToken, async (req, res) => {
  try {
    const { specialty } = req.query;
    let codes = nphiesService.getRehabCptCodes();

    // تصفية حسب التخصص إذا تم تحديده
    if (specialty) {
      codes = codes.filter(
        c => c.specialty && c.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    return res.status(200).json({
      success: true,
      message: 'رموز CPT لمراكز التأهيل',
      data: {
        total: codes.length,
        codes,
        specialties: ['علاج طبيعي', 'علاج وظيفي', 'نطق ولغة', 'تحليل سلوك', 'نفسي', 'نمائي'],
      },
    });
  } catch (error) {
    safeError(res, error, 'NPHIES CPT Codes Error');
  }
});

/**
 * GET /api/nphies/cpt-codes/:code
 * الحصول على تفاصيل رمز CPT محدد
 */
router.get('/cpt-codes/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const description = nphiesService.getCptDescription(code);

    if (!description) {
      return res.status(404).json({
        success: false,
        message: `رمز CPT ${code} غير موجود في قائمة رموز التأهيل`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        code,
        description,
      },
    });
  } catch (error) {
    safeError(res, error, 'NPHIES CPT Code Lookup Error');
  }
});

// =========================================================================
// 7. الحالة العامة — Service Status
// =========================================================================

/**
 * GET /api/nphies/status
 * التحقق من حالة خدمة NPHIES وإعداداتها
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = nphiesService.getStatus();

    return res.status(200).json({
      success: true,
      message: 'حالة خدمة NPHIES',
      data: status,
    });
  } catch (error) {
    safeError(res, error, 'NPHIES Status Error');
  }
});

// =========================================================================
// 8. بناء FHIR Bundle يدوي — Manual FHIR Bundle Builder (للاختبار)
// =========================================================================

/**
 * POST /api/nphies/fhir/bundle
 * بناء FHIR Bundle يدوي للاختبار والتطوير
 */
router.post(
  '/fhir/bundle',
  authenticateToken,
  requirePermission('nphies:admin'),
  async (req, res) => {
    try {
      const { messageType, resources, options = {} } = req.body;

      if (!messageType || !resources) {
        return res.status(400).json({
          success: false,
          message: 'messageType و resources مطلوبان',
        });
      }

      const validTypes = [
        'eligibility-request',
        'priorauth-request',
        'claim-request',
        'communication',
        'status-check',
        'cancel-request',
        'payment-reconciliation',
        'poll-request',
      ];

      if (!validTypes.includes(messageType)) {
        return res.status(400).json({
          success: false,
          message: `messageType غير صالح. الأنواع المتاحة: ${validTypes.join(', ')}`,
        });
      }

      const bundle = nphiesService.buildBundle(messageType, resources, options);

      return res.status(200).json({
        success: true,
        message: 'تم بناء FHIR Bundle بنجاح',
        data: bundle,
      });
    } catch (error) {
      safeError(res, error, 'NPHIES Bundle Builder Error');
    }
  }
);

module.exports = router;
