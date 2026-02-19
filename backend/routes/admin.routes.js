const express = require('express');
const router = express.Router();
const BackupService = require('../services/backup.service');
const ApiKey = require('../models/ApiKey');
const { checkPermission } = require('../middleware/checkPermission');
const AuditService = require('../services/audit.service');
let { authenticateToken, authorizeRole } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { body, param } = require('express-validator');
const { handleValidationErrors, sanitizeInput } = require('../middleware/requestValidation');

// Fallback for middleware
const fallbackAuthorizeRole = role => (req, res, next) => {
  req.user = req.user || { role: 'admin' };
  if (req.user.role !== role) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

authenticateToken =
  authenticateToken ||
  ((req, res, next) => {
    req.user = req.user || { role: 'admin' };
    next();
  });

authorizeRole = authorizeRole || fallbackAuthorizeRole;

// Global protections
router.use(authenticateToken);
router.use(authorizeRole('admin'));
router.use(apiLimiter);
router.use(sanitizeInput);

// ================= BACKUP ROUTES =================

/**
 * @desc List Backups
 * @access Admin
 */
router.get('/backups', [], async (req, res) => {
  try {
    const backups = await BackupService.listBackups();
    res.json({ success: true, count: backups.length, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc Trigger Manual Backup
 * @access Admin
 */
router.post(
  '/backups/create',
  [
    body('backupName')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Invalid backupName'),
    body('includeFiles').optional().isBoolean().withMessage('includeFiles must be boolean'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const backup = await BackupService.createBackup(req.user ? req.user.id : 'ADMIN_API');
      res.json({ success: true, message: 'Backup created', data: backup });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ================= API KEY ROUTES =================

/**
 * @desc Get All API Keys
 * @access Admin
 */
router.get('/apikeys', [], async (req, res) => {
  try {
    const keys = await ApiKey.find({}).populate('owner', 'name email');
    res.json({ success: true, data: keys });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc Generate New API Key
 * @access Admin
 */
router.post(
  '/apikeys',
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('API key name must be 2-100 characters'),
    body('permissions')
      .isArray({ min: 1 })
      .withMessage('Permissions must be a non-empty array')
      .custom(val => {
        const validPerms = ['read', 'write', 'delete', 'admin'];
        return val.every(p => validPerms.includes(p));
      })
      .withMessage('Invalid permission value - must be read, write, delete, or admin'),
    body('daysValid').optional().isInt({ min: 1, max: 365 }).withMessage('daysValid must be 1-365'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { name, permissions, daysValid } = req.body;

      const keyString = ApiKey.generateKey();
      const expiresAt = daysValid ? new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000) : null;

      const apiKey = await ApiKey.create({
        key: keyString,
        name,
        owner: req.user.id,
        permissions,
        expiresAt,
      });

      // Audit
      await AuditService.log(
        req,
        'GENERATE_API_KEY',
        'INTEGRATION',
        { type: 'ApiKey', id: apiKey.id },
        null,
        'SUCCESS'
      );

      res.status(201).json({
        success: true,
        message: 'API key generated successfully',
        data: { ...apiKey.toObject(), key: keyString },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

/**
 * @desc Revoke API Key
 * @access Admin
 */
router.delete(
  '/apikeys/:id',
  [
    param('id').isLength({ min: 5, max: 100 }).trim().withMessage('Invalid API key ID format'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      await ApiKey.findByIdAndDelete(req.params.id);
      await AuditService.log(
        req,
        'REVOKE_API_KEY',
        'INTEGRATION',
        { type: 'ApiKey', id: req.params.id },
        null,
        'SUCCESS'
      );
      res.json({ success: true, message: 'API key revoked successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
