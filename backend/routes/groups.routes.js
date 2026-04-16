/**
 * Groups Routes
 * مسارات المجموعات
 *
 * CRUD endpoints for group management.
 * Mounted at /api/groups
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const Group = require('../models/Group');
const { escapeRegex } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// حماية جميع المسارات
router.use(authenticate);
router.use(requireBranchAccess);
// ─── GET /api/groups — قائمة مجموعات المستخدم ───
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { search, status = 'active' } = req.query;

    const query = {
      status,
      $or: [{ createdBy: userId }, { 'members.user': userId }],
    };

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { description: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        },
      ];
    }

    const groups = await Group.find(query).sort({ updatedAt: -1 }).lean();

    res.json({ success: true, data: groups });
  } catch (err) {
    safeError(res, err, 'Groups list error');
  }
});

// ─── GET /api/groups/contacts — جهات الاتصال المتاحة ───
router.get('/contacts', async (req, res) => {
  try {
    // Return users that can be added to groups
    let User;
    try {
      User = require('../models/User');
    } catch {
      User = null;
    }

    if (User) {
      const users = await User.find({ isActive: { $ne: false } })
        .select('name email firstName lastName')
        .limit(100)
        .lean();
      const contacts = users.map(u => ({
        _id: u._id,
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        email: u.email,
      }));
      return res.json({ success: true, data: contacts });
    }

    res.json({ success: true, data: [] });
  } catch (err) {
    safeError(res, err, 'Groups contacts error');
  }
});

// ─── GET /api/groups/:id — تفاصيل مجموعة ───
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).lean();
    if (!group) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }
    res.json({ success: true, data: group });
  } catch (err) {
    safeError(res, err, 'Group detail error');
  }
});

// ─── POST /api/groups — إنشاء مجموعة ───
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('اسم المجموعة مطلوب'),
    body('description').optional().isString().withMessage('الوصف يجب أن يكون نصاً'),
    body('members').optional().isArray().withMessage('الأعضاء يجب أن تكون قائمة'),
  ]),
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { name, description, members = [] } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'اسم المجموعة مطلوب' });
      }

      // Build members array — always include the creator
      const membersList = [
        {
          user: userId,
          name: req.user.name || req.user.email || 'أنت',
          email: req.user.email,
          role: 'admin',
        },
        ...members.map(m => ({
          user: m._id || m.id || undefined,
          name: m.name,
          email: m.email,
          role: 'member',
        })),
      ];

      const group = await Group.create({
        name: name.trim(),
        description: (description || '').trim(),
        members: membersList,
        createdBy: userId,
      });

      logger.info(`Group created: ${group._id} by user ${userId}`);
      res.status(201).json({ success: true, data: group });
    } catch (err) {
      logger.error('Group create error:', err);
      if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: 'خطأ في البيانات المدخلة' });
      }
      safeError(res, err, 'groups');
    }
  }
);

// ─── PUT /api/groups/:id — تحديث مجموعة ───
router.put(
  '/:id',
  validate([
    body('name').optional().trim().notEmpty().withMessage('اسم المجموعة لا يمكن أن يكون فارغاً'),
    body('description').optional().isString().withMessage('الوصف يجب أن يكون نصاً'),
  ]),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const updates = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();

      const group = await Group.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!group) {
        return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
      }

      res.json({ success: true, data: group });
    } catch (err) {
      safeError(res, err, 'Group update error');
    }
  }
);

// ─── DELETE /api/groups/:id — حذف مجموعة ───
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'deleted' } },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    res.json({ success: true, message: 'تم حذف المجموعة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Group delete error');
  }
});

// ─── POST /api/groups/:id/members — إضافة عضو ───
router.post(
  '/:id/members',
  validate([
    body('name').trim().notEmpty().withMessage('اسم العضو مطلوب'),
    body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح'),
  ]),
  async (req, res) => {
    try {
      const { name, email, userId: memberId } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'اسم العضو مطلوب' });
      }

      const group = await Group.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
      }

      // Check for duplicate
      if (email && group.members.some(m => m.email === email)) {
        return res.status(400).json({ success: false, error: 'العضو موجود بالفعل في المجموعة' });
      }

      group.members.push({
        user: memberId || undefined,
        name,
        email,
        role: 'member',
      });

      await group.save();
      res.json({ success: true, data: group });
    } catch (err) {
      safeError(res, err, 'Add member error');
    }
  }
);

// ─── DELETE /api/groups/:id/members/:memberId — إزالة عضو ───
router.delete('/:id/members/:memberIndex', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'المجموعة غير موجودة' });
    }

    const memberIdx = parseInt(req.params.memberIndex, 10);
    if (isNaN(memberIdx) || memberIdx < 0 || memberIdx >= group.members.length) {
      return res.status(400).json({ success: false, error: 'عضو غير صالح' });
    }

    group.members.splice(memberIdx, 1);
    await group.save();

    res.json({ success: true, data: group });
  } catch (err) {
    safeError(res, err, 'Remove member error');
  }
});

module.exports = router;
