/**
 * Branch Routes - مسارات إدارة الفروع
 */

const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const Camera = require('../models/Camera');
const { authenticateToken } = require('../middleware/auth');

/**
 * الحصول على جميع الفروع
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, city, limit = 50, skip = 0 } = req.query;

    let query = { deletedAt: null };
    if (status) query.status = status;
    if (city) query['location.city'] = city;

    const branches = await Branch.find(query).limit(parseInt(limit)).skip(parseInt(skip)).sort({ createdAt: -1 });

    const total = await Branch.countDocuments(query);

    res.json({
      success: true,
      data: branches,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * الحصول على فرع محدد
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch || branch.deletedAt) {
      return res.status(404).json({
        success: false,
        error: 'الفرع غير موجود',
      });
    }

    // الحصول على الكاميرات المرتبطة
    const cameras = await Camera.find({ branchId: branch._id, deletedAt: null });

    res.json({
      success: true,
      data: {
        ...branch.toJSON(),
        cameras: cameras.map(c => ({
          _id: c._id,
          name: c.name,
          status: c.status,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إنشاء فرع جديد
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, code, description, location, contact, settings } = req.body;

    const branch = new Branch({
      name,
      code: code || name.substring(0, 3).toUpperCase(),
      description,
      location,
      contact,
      settings,
      createdBy: req.user._id,
    });

    await branch.save();

    res.status(201).json({
      success: true,
      data: branch,
      message: '✅ تم إنشاء الفرع بنجاح',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'كود الفرع مستخدم بالفعل',
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * تحديث فرع
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, location, contact, settings, status } = req.body;

    const branch = await Branch.findById(req.params.id);
    if (!branch || branch.deletedAt) {
      return res.status(404).json({
        success: false,
        error: 'الفرع غير موجود',
      });
    }

    branch.name = name || branch.name;
    branch.description = description || branch.description;
    branch.location = location || branch.location;
    branch.contact = contact || branch.contact;
    branch.settings = settings || branch.settings;
    branch.status = status || branch.status;
    branch.updatedBy = req.user._id;

    await branch.save();

    res.json({
      success: true,
      data: branch,
      message: '✅ تم تحديث الفرع بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * حذف فرع (Soft Delete)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch || branch.deletedAt) {
      return res.status(404).json({
        success: false,
        error: 'الفرع غير موجود',
      });
    }

    branch.deletedAt = new Date();
    await branch.save();

    res.json({
      success: true,
      message: '✅ تم حذف الفرع بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إضافة مستخدم للفرع
 */
router.post('/:id/users', authenticate, async (req, res) => {
  try {
    const { userId, role } = req.body;

    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    await branch.addUser(userId, role);

    res.json({
      success: true,
      data: branch,
      message: '✅ تم إضافة المستخدم بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * إزالة مستخدم من الفرع
 */
router.delete('/:id/users/:userId', authenticate, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    await branch.removeUser(req.params.userId);

    res.json({
      success: true,
      data: branch,
      message: '✅ تم إزالة المستخدم بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * الحصول على إحصائيات الفرع
 */
router.get('/:id/statistics', authenticate, async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch || branch.deletedAt) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    // تحديث الإحصائيات
    await branch.updateStatistics();

    // الحصول على المزيد من الإحصائيات
    const cameras = await Camera.find({ branchId: branch._id, deletedAt: null });
    const Recording = require('../models/Recording');
    const recordings = await Recording.find({ branchId: branch._id, deletedAt: null });

    const stats = {
      branch: branch.name,
      cameras: {
        total: cameras.length,
        online: cameras.filter(c => c.status === 'online').length,
        offline: cameras.filter(c => c.status === 'offline').length,
        error: cameras.filter(c => c.status === 'error').length,
      },
      recordings: {
        total: recordings.length,
        totalSize: (recordings.reduce((sum, r) => sum + r.size, 0) / (1024 * 1024 * 1024)).toFixed(2), // GB
        uploaded: recordings.filter(r => r.storage.uploadStatus === 'completed').length,
      },
      storage: {
        used: branch.statistics.recordingSpace.used.toFixed(2),
        available: branch.statistics.recordingSpace.available.toFixed(2),
        total: (branch.statistics.recordingSpace.used + branch.statistics.recordingSpace.available).toFixed(2),
        usagePercentage: (
          (branch.statistics.recordingSpace.used / (branch.statistics.recordingSpace.used + branch.statistics.recordingSpace.available)) *
          100
        ).toFixed(2),
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

