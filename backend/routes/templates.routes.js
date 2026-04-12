/**
 * Templates Routes
 * مسارات القوالب العامة
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);

// List templates
router.get('/', async (req, res) => {
  try {
    const { _category, _type, page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data: [],
      pagination: { page: +page, limit: +limit, total: 0 },
      message: 'قائمة القوالب',
    });
  } catch (error) {
    safeError(res, error, 'fetching templates');
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
        category: '',
        type: 'document',
        content: '',
        fields: [],
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
    const { name, category, type, content, fields } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم القالب مطلوب' });
    }
    res.status(201).json({
      success: true,
      data: {
        id: Date.now().toString(36),
        name,
        category,
        type: type || 'document',
        content,
        fields: fields || [],
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
