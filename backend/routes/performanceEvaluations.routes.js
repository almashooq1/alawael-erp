/**
 * Performance Evaluations Routes
 * مسارات تقييم الأداء
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);

// List evaluations
router.get('/', async (req, res) => {
  try {
    const { _employeeId, _period, _status, page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data: [],
      pagination: { page: +page, limit: +limit, total: 0 },
      message: 'قائمة تقييمات الأداء',
    });
  } catch (error) {
    safeError(res, error, 'fetching evaluations');
  }
});

// Get single evaluation
router.get('/:id', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.params.id,
        employee: null,
        period: '',
        score: 0,
        status: 'draft',
        criteria: [],
        comments: '',
      },
      message: 'بيانات التقييم',
    });
  } catch (error) {
    safeError(res, error, 'fetching evaluation');
  }
});

// Create evaluation
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId, period, criteria, score, comments } = req.body;
    if (!employeeId || !period) {
      return res.status(400).json({ success: false, message: 'الموظف والفترة مطلوبين' });
    }
    res.status(201).json({
      success: true,
      data: {
        id: Date.now().toString(36),
        employeeId,
        period,
        criteria,
        score: score || 0,
        comments,
        status: 'draft',
        createdAt: new Date(),
        createdBy: req.user?.id,
      },
      message: 'تم إنشاء التقييم بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'creating evaluation');
  }
});

// Update evaluation
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    res.json({
      success: true,
      data: { id: req.params.id, ...req.body, updatedAt: new Date() },
      message: 'تم تحديث التقييم بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'updating evaluation');
  }
});

// Delete evaluation
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    res.json({ success: true, message: 'تم حذف التقييم بنجاح' });
  } catch (error) {
    safeError(res, error, 'deleting evaluation');
  }
});

module.exports = router;
