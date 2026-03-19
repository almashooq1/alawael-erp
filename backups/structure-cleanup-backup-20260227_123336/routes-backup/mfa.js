/**
 * MFA Routes
 * مسارات المصادقة متعددة العوامل
 */

const express = require('express');
const router = express.Router();
const mfaController = require('../controllers/mfaController');
const { protect } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============

/**
 * GET /api/mfa/setup-guide
 * Get MFA setup guide and information
 */
router.get('/setup-guide', mfaController.getMFASetupGuide);

/**
 * POST /api/mfa/login/verify
 * Verify MFA during login (requires MFA session)
 */
router.post('/login/verify', mfaController.verifyMFALogin);

// ============ PROTECTED ROUTES (requires authentication) ============

/**
 * TOTP Setup Routes
 */

/**
 * POST /api/mfa/totp/initiate
 * Initiate TOTP setup - returns QR code
 */
router.post('/totp/initiate', protect, mfaController.initiateTOTPSetup);

/**
 * POST /api/mfa/totp/verify
 * Verify TOTP token and enable TOTP
 */
router.post('/totp/verify', protect, mfaController.verifyAndEnableTOTP);

/**
 * Email OTP Routes
 */

/**
 * POST /api/mfa/email/initiate
 * Send OTP via email
 */
router.post('/email/initiate', protect, mfaController.initiateEmailOTP);

/**
 * POST /api/mfa/email/verify
 * Verify email OTP and enable
 */
router.post('/email/verify', protect, mfaController.verifyAndEnableEmailOTP);

/**
 * SMS OTP Routes
 */

/**
 * POST /api/mfa/sms/initiate
 * Send OTP via SMS
 */
router.post('/sms/initiate', protect, mfaController.initiateSMSOTP);

/**
 * POST /api/mfa/sms/verify
 * Verify SMS OTP and enable
 */
router.post('/sms/verify', protect, mfaController.verifyAndEnableSMSOTP);

/**
 * Settings Routes
 */

/**
 * GET /api/mfa/settings
 * Get user's MFA settings
 */
router.get('/settings', protect, mfaController.getMFASettings);

/**
 * POST /api/mfa/settings/disable-method
 * Disable a specific MFA method
 */
router.post('/settings/disable-method', protect, mfaController.disableMFAMethod);

/**
 * Trusted Device Routes
 */

/**
 * POST /api/mfa/device/trust
 * Mark current device as trusted
 */
router.post('/device/trust', protect, mfaController.trustDevice);

/**
 * GET /api/mfa/device/list
 * Get list of trusted devices
 */
router.get('/device/list', protect, mfaController.getTrustedDevices);

/**
 * DELETE /api/mfa/device/:deviceId
 * Revoke trust for a device
 */
router.delete('/device/:deviceId', protect, mfaController.revokeTrustedDevice);

module.exports = router;
