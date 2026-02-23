const express = require('express');
const router = express.Router();
const dmsService = require('../services/dmsService');
const { authenticateToken } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter');
const { body, param } = require('express-validator');
const { handleValidationErrors, sanitizeInput } = require('../middleware/requestValidation');

// Global protections
router.use(authenticateToken);
router.use(apiLimiter);
router.use(sanitizeInput);

// Upload new version
router.post(
  '/:id/version',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid id'),
    body('path').optional().isString().isLength({ min: 2, max: 500 }).withMessage('Invalid path'),
    body('size')
      .optional()
      .isNumeric()
      .custom(v => Number(v) >= 1)
      .withMessage('Invalid size'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const fileData = { path: req.body.path || 'mock/path/v2.pdf', size: req.body.size || 1024 };
      const userId = (req.user && (req.user._id || req.user.id)) || 'user-test';
      const doc = await dmsService.createNewVersion(req.params.id, fileData, userId);
      res.json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Sign Document
router.post(
  '/:id/sign',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid id'),
    body('pin')
      .isString()
      .matches(/^\d{4,6}$/)
      .withMessage('PIN must be 4-6 digits'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = (req.user && (req.user._id || req.user.id)) || 'user-test';
      const { pin } = req.body;
      const doc = await dmsService.signDocument(req.params.id, userId, pin);
      res.json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Share Document
router.post(
  '/:id/share',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid id'),
    body('targetUserId')
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Invalid targetUserId'),
    body('permission').isIn(['read', 'edit', 'owner']).withMessage('Invalid permission'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { targetUserId, permission } = req.body;
      const doc = await dmsService.grantAccess(req.params.id, targetUserId, permission);
      res.json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get Document with details
router.get(
  '/:id',
  [param('id').isString().isLength({ min: 2 }).withMessage('Invalid id'), handleValidationErrors],
  async (req, res) => {
    try {
      const doc = await dmsService.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
      res.json({ success: true, data: doc });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

