/**
 * SMS Routes
 * Handles SMS operations like sending, templates
 */
const express = require('express');
const { sendSMS, sendSMSWithTemplate, sendBulkSMS, checkSMSBalance, smsTemplates } = require('../services/smsService');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

const router = express.Router();

/**
 * @route POST /api/sms/send
 * @desc Send single SMS
 * @access Private/Admin
 */
router.post(
  '/send',
  authenticate,
  authorizeRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { toNumber, message } = req.body;

    if (!toNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'toNumber and message are required',
      });
    }

    const result = await sendSMS(toNumber, message);

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route POST /api/sms/send-template
 * @desc Send SMS with template
 * @access Private/Admin
 */
router.post(
  '/send-template',
  authenticate,
  authorizeRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { toNumber, templateName, data } = req.body;

    if (!toNumber || !templateName || !data) {
      return res.status(400).json({
        success: false,
        message: 'toNumber, templateName, and data are required',
      });
    }

    const result = await sendSMSWithTemplate(toNumber, templateName, data);

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route POST /api/sms/send-bulk
 * @desc Send bulk SMS
 * @access Private/Admin
 */
router.post(
  '/send-bulk',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || !message) {
      return res.status(400).json({
        success: false,
        message: 'recipients (array) and message are required',
      });
    }

    const results = await sendBulkSMS(recipients, message);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Bulk SMS sent: ${successCount} success, ${failedCount} failed`,
      successCount,
      failedCount,
      results,
    });
  }),
);

/**
 * @route POST /api/sms/verification-code
 * @desc Send verification code SMS
 * @access Public
 */
router.post(
  '/verification-code',
  asyncHandler(async (req, res) => {
    const { toNumber, code } = req.body;

    if (!toNumber || !code) {
      return res.status(400).json({
        success: false,
        message: 'toNumber and code are required',
      });
    }

    const result = await sendSMSWithTemplate(toNumber, 'verificationCode', code);

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route GET /api/sms/balance
 * @desc Check SMS balance
 * @access Private/Admin
 */
router.get(
  '/balance',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await checkSMSBalance();

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route GET /api/sms/templates
 * @desc Get all SMS templates
 * @access Private/Admin
 */
router.get(
  '/templates',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const templates = Object.keys(smsTemplates);

    res.status(200).json({
      success: true,
      templates,
      count: templates.length,
      examples: {
        verificationCode: '123456',
        employeeAlert: { name: 'أحمد', action: 'تحديث' },
        orderConfirmation: { orderId: '12345', amount: '500' },
      },
    });
  }),
);

module.exports = router;

