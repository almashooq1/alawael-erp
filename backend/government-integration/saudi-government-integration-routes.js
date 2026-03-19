/* eslint-disable no-unused-vars */
/**
 * Saudi Government Integration Routes
 * مسارات التكامل مع الجهات الحكومية السعودية
 */

const express = require('express');
const router = express.Router();
const { SaudiGovernmentIntegrationService } = require('./saudi-government-integration-service');

const govService = new SaudiGovernmentIntegrationService();

/**
 * @route POST /api/government/absher/verify
 * @desc التحقق من هوية المستفيد عبر أبشر
 */
router.post('/absher/verify', async (req, res) => {
  try {
    const { nationalId } = req.body;
    const result = await govService.verifyWithAbsher(nationalId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/government/moi/sync-disability
 * @desc مزامنة بيانات الإعاقة مع وزارة الداخلية
 */
router.post('/moi/sync-disability', async (req, res) => {
  try {
    const { beneficiaryId } = req.body;
    const result = await govService.syncDisabilityData(beneficiaryId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/government/moh/medical-report
 * @desc جلب التقرير الطبي من وزارة الصحة
 */
router.post('/moh/medical-report', async (req, res) => {
  try {
    const { nationalId } = req.body;
    const result = await govService.getMedicalReport(nationalId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/government/hrsd/beneficiary-status
 * @desc التحقق من حالة المستفيد مع وزارة الموارد البشرية
 */
router.post('/hrsd/beneficiary-status', async (req, res) => {
  try {
    const { nationalId } = req.body;
    const result = await govService.getBeneficiaryStatus(nationalId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

/**
 * @route POST /api/government/sso/callback
 * @desc معالجة callback من SSO
 */
router.post('/sso/callback', async (req, res) => {
  try {
    const result = await govService.handleSSOCallback(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'حدث خطأ داخلي' });
  }
});

module.exports = router;
