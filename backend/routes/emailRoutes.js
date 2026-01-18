/**
 * Email Routes
 * Handles email operations like sending, verifying, templates
 */
const express = require('express');
const { sendEmail, sendBulkEmail, verifyEmailService } = require('../services/emailService');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');
const asyncHandler = require('express-async-handler');

const router = express.Router();

/**
 * @route POST /api/email/send
 * @desc Send single email
 * @access Private/Admin
 */
router.post(
  '/send',
  authenticate,
  authorizeRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { to, templateName, data } = req.body;

    if (!to || !templateName || !data) {
      return res.status(400).json({
        success: false,
        message: 'to, templateName, and data are required',
      });
    }

    const result = await sendEmail(to, templateName, data);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  }),
);

/**
 * @route POST /api/email/send-bulk
 * @desc Send bulk emails
 * @access Private/Admin
 */
router.post(
  '/send-bulk',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { recipients, templateName, data } = req.body;

    if (!recipients || !Array.isArray(recipients) || !templateName || !data) {
      return res.status(400).json({
        success: false,
        message: 'recipients (array), templateName, and data are required',
      });
    }

    const results = await sendBulkEmail(recipients, templateName, data);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `Bulk email sent: ${successCount} success, ${failedCount} failed`,
      successCount,
      failedCount,
      results,
    });
  }),
);

/**
 * @route POST /api/email/verify
 * @desc Verify email service connection
 * @access Private/Admin
 */
router.post(
  '/verify',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const result = await verifyEmailService();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  }),
);

/**
 * @route POST /api/email/send-welcome
 * @desc Send welcome email to new user
 * @access Private/Admin
 */
router.post(
  '/send-welcome',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { userId, email, fullName } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'email and fullName are required',
      });
    }

    const result = await sendEmail(email, 'welcomeEmail', { email, fullName });

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route POST /api/email/send-password-reset
 * @desc Send password reset email
 * @access Public
 */
router.post(
  '/send-password-reset',
  asyncHandler(async (req, res) => {
    const { email, fullName, resetToken } = req.body;

    if (!email || !fullName || !resetToken) {
      return res.status(400).json({
        success: false,
        message: 'email, fullName, and resetToken are required',
      });
    }

    const result = await sendEmail(email, 'passwordReset', { fullName, resetToken });

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route POST /api/email/send-verification
 * @desc Send email verification link
 * @access Public
 */
router.post(
  '/send-verification',
  asyncHandler(async (req, res) => {
    const { email, fullName, verificationToken } = req.body;

    if (!email || !fullName || !verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'email, fullName, and verificationToken are required',
      });
    }

    const result = await sendEmail(email, 'emailVerification', {
      fullName,
      verificationToken,
    });

    res.status(result.success ? 200 : 400).json(result);
  }),
);

/**
 * @route GET /api/email/templates
 * @desc Get all email templates
 * @access Private/Admin
 */
router.get(
  '/templates',
  authenticate,
  authorizeRole('admin'),
  asyncHandler(async (req, res) => {
    const { emailTemplates } = require('../services/emailService');
    const templates = Object.keys(emailTemplates);

    res.status(200).json({
      success: true,
      templates,
      count: templates.length,
    });
  }),
);

module.exports = router;
