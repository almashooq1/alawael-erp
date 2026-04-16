/**
 * Notification Templates Routes
 * مسارات قوالب الإشعارات
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// List templates
router.get('/', async (req, res) => {
  try {
    const { _type, _channel, page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data: [],
      pagination: { page: +page, limit: +limit, total: 0 },
      message: 'قائمة قوالب الإشعارات',
    });
  } catch (error) {
    safeError(res, error, 'fetching notification templates');
  }
});

// Get single template
router.get('/:id', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.params.id,
        name: '',
        subject: '',
        body: '',
        type: 'email',
        channel: 'email',
        variables: [],
        isActive: true,
      },
      message: 'بيانات القالب',
    });
  } catch (error) {
    safeError(res, error, 'fetching template');
  }
});

// Create template
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, subject, body, type, channel, variables } = req.body;
    if (!name || !body) {
      return res.status(400).json({ success: false, message: 'الاسم والمحتوى مطلوبين' });
    }
    res.status(201).json({
      success: true,
      data: {
        id: Date.now().toString(36),
        name,
        subject,
        body,
        type: type || 'email',
        channel: channel || 'email',
        variables: variables || [],
        isActive: true,
        createdAt: new Date(),
        createdBy: req.user?.id,
      },
      message: 'تم إنشاء القالب بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'creating template');
  }
});

// Update template
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    res.json({
      success: true,
      data: { id: req.params.id, ...req.body, updatedAt: new Date() },
      message: 'تم تحديث القالب بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'updating template');
  }
});

// Delete template
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    res.json({ success: true, message: 'تم حذف القالب بنجاح' });
  } catch (error) {
    safeError(res, error, 'deleting template');
  }
});

module.exports = router;
