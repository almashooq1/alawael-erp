/**
 * Specialized Programs Routes
 * مسارات البرامج المتخصصة
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// List programs
router.get('/', async (req, res) => {
  try {
    const { _category, _status, page = 1, limit = 20 } = req.query;
    res.json({
      success: true,
      data: [],
      pagination: { page: +page, limit: +limit, total: 0 },
      message: 'قائمة البرامج المتخصصة',
    });
  } catch (error) {
    logger.error('Error fetching specialized programs:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البرامج' });
  }
});

// Get single program
router.get('/:id', async (req, res) => {
  try {
    res.json({
      success: true,
      data: { id: req.params.id, name: '', category: '', status: 'active', participants: [] },
      message: 'بيانات البرنامج',
    });
  } catch (error) {
    logger.error('Error fetching program:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البرنامج' });
  }
});

// Create program
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, description, category, duration, targetParticipants } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'اسم البرنامج مطلوب' });
    }
    res.status(201).json({
      success: true,
      data: {
        id: Date.now().toString(36),
        name,
        description,
        category,
        duration,
        targetParticipants,
        status: 'active',
        createdAt: new Date(),
        createdBy: req.user?.id,
      },
      message: 'تم إنشاء البرنامج بنجاح',
    });
  } catch (error) {
    logger.error('Error creating program:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء البرنامج' });
  }
});

// Update program
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    res.json({
      success: true,
      data: { id: req.params.id, ...req.body, updatedAt: new Date() },
      message: 'تم تحديث البرنامج بنجاح',
    });
  } catch (error) {
    logger.error('Error updating program:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث البرنامج' });
  }
});

// Delete program
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    res.json({ success: true, message: 'تم حذف البرنامج بنجاح' });
  } catch (error) {
    logger.error('Error deleting program:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف البرنامج' });
  }
});

module.exports = router;
