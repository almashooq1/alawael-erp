/**
 * نظام إدارة المستخدمين المتقدم
 * User Management System — Advanced Routes
 * @module routes/user-management
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Branch = require('../models/Branch');
const safeError = require('../utils/safeError');

// ─── Helper: Validate MongoDB ObjectId ────────────────────
const isValidObjectId = id => mongoose.Types.ObjectId.isValid(id);

// ─── Helper: Sanitize string input ────────────────────────
const sanitize = str => {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // strip HTML brackets
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

// ─── Helper: Validate password strength ───────────────────
const MIN_PASSWORD_LENGTH = 8;
const validatePassword = password => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
    };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على حرف كبير على الأقل' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على حرف صغير على الأقل' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'كلمة المرور يجب أن تحتوي على رقم على الأقل' };
  }
  return { valid: true };
};

// ─── Constants ────────────────────────────────────────────
const MAX_PAGE_LIMIT = 100;
const ALLOWED_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'supervisor',
  'hr',
  'hr_manager',
  'accountant',
  'finance',
  'doctor',
  'therapist',
  'teacher',
  'receptionist',
  'data_entry',
  'parent',
  'student',
  'viewer',
  'user',
  'guest',
];

const ROLE_LABELS = {
  super_admin: 'مدير النظام',
  admin: 'مدير',
  manager: 'مدير إداري',
  supervisor: 'مشرف',
  hr: 'موارد بشرية',
  hr_manager: 'مدير موارد بشرية',
  accountant: 'محاسب',
  finance: 'مالية',
  doctor: 'طبيب',
  therapist: 'معالج',
  teacher: 'معلم',
  receptionist: 'استقبال',
  data_entry: 'إدخال بيانات',
  parent: 'ولي أمر',
  student: 'طالب',
  viewer: 'مشاهد',
  user: 'مستخدم',
  guest: 'زائر',
};

// ─── Middleware ────────────────────────────────────────────
router.use(authenticate);
router.use(requireBranchAccess);
router.use(authorize(['admin', 'super_admin', 'hr', 'hr_manager', 'manager']));

// ─── Helper: Log Audit ────────────────────────────────────
async function logAudit(action, userId, performedBy, details = {}) {
  try {
    await AuditLog.create({
      action,
      userId,
      performedBy,
      details,
      timestamp: new Date(),
      ip: details.ip || '',
    });
  } catch (err) {
    logger.error('Audit log error:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════
// GET /stats — إحصائيات المستخدمين
// ═══════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      lockedUsers,
      recentUsers,
      roleStats,
      branchStats,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600000) } }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            active: { $sum: { $cond: ['$isActive', 1, 0] } },
          },
        },
        { $sort: { count: -1 } },
      ]),
      User.aggregate([
        { $match: { branch: { $ne: null } } },
        { $group: { _id: '$branch', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // آخر تسجيلات الدخول
    const recentLogins = await User.find({ lastLogin: { $ne: null } })
      .select('fullName username email role lastLogin')
      .sort({ lastLogin: -1 })
      .limit(10)
      .lean();

    // إحصائيات يومية (آخر 7 أيام)
    const dailyStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        locked: lockedUsers,
        newThisMonth: recentUsers,
        byRole: roleStats.map(r => ({
          role: r._id,
          roleLabel: ROLE_LABELS[r._id] || r._id,
          count: r.count,
          active: r.active,
        })),
        byBranch: branchStats,
        recentLogins,
        dailyRegistrations: dailyStats,
      },
    });
  } catch (err) {
    safeError(res, err, 'User stats error');
  }
});

// ═══════════════════════════════════════════════════════════
// GET / — قائمة المستخدمين مع فلترة وبحث متقدم
// ═══════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      branch,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
    } = req.query;

    const safeLimit = Math.min(+limit || 20, MAX_PAGE_LIMIT);
    const filter = {};

    // بحث نصي
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { fullName: { $regex: escaped, $options: 'i' } },
        { username: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    // فلاتر
    if (role && role !== 'all') filter.role = role;
    if (isActive !== undefined && isActive !== 'all') filter.isActive = isActive === 'true';
    if (branch && branch !== 'all') filter.branch = branch;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // ترتيب (مع تحقق من الحقول المسموحة)
    const ALLOWED_SORT_FIELDS = [
      'createdAt',
      'fullName',
      'email',
      'username',
      'role',
      'isActive',
      'lastLogin',
      'updatedAt',
    ];
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const sortOptions = {};
    sortOptions[safeSortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (Math.max(1, +page) - 1) * safeLimit;

    const [data, total] = await Promise.all([
      User.find(filter)
        .select(
          '-password -passwordHistory -mfa.secret -mfa.backupCodes -resetPasswordToken -resetPasswordExpires'
        )
        .populate('branch', 'name code')
        .sort(sortOptions)
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // إضافة التسميات العربية
    const enrichedData = data.map(u => ({
      ...u,
      roleLabel: ROLE_LABELS[u.role] || u.role,
      statusLabel: u.isActive ? 'نشط' : 'معطل',
      isLocked: !!(u.lockUntil && new Date(u.lockUntil) > new Date()),
    }));

    res.json({
      success: true,
      data: enrichedData,
      pagination: {
        page: +page,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    safeError(res, err, 'User list error');
  }
});

// ═══════════════════════════════════════════════════════════
// GET /roles — قائمة الأدوار المتاحة
// ═══════════════════════════════════════════════════════════
router.get('/roles', async (_req, res) => {
  res.json({
    success: true,
    data: ALLOWED_ROLES.map(r => ({
      value: r,
      label: ROLE_LABELS[r] || r,
    })),
  });
});

// ═════════════════════════════════════════════════════════
// GET /branches — قائمة الفروع المتاحة
// ⚠️ MUST be before /:id to avoid route shadowing
// ═════════════════════════════════════════════════════════
router.get('/branches', async (_req, res) => {
  try {
    const branches = await Branch.find({ status: 'active' })
      .select('name_ar name_en code type')
      .sort({ name_ar: 1 })
      .lean();

    res.json({
      success: true,
      data: branches.map(b => ({
        _id: b._id,
        name_ar: b.name_ar,
        name_en: b.name_en,
        name: b.name_ar,
        code: b.code,
        type: b.type,
      })),
    });
  } catch (err) {
    safeError(res, err, 'Get branches error');
  }
});

// ═══════════════════════════════════════════════════════════
// GET /export/all — تصدير جميع المستخدمين
// ⚠️ MUST be before /:id to avoid route shadowing
// ═══════════════════════════════════════════════════════════
router.get('/export/all', async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (isActive !== undefined && isActive !== 'all') filter.isActive = isActive === 'true';

    const users = await User.find(filter)
      .select('fullName username email phone role isActive branch createdAt lastLogin')
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const exportData = users.map(u => ({
      الاسم: u.fullName,
      'اسم المستخدم': u.username || '',
      'البريد الإلكتروني': u.email || '',
      الهاتف: u.phone || '',
      الدور: ROLE_LABELS[u.role] || u.role,
      الحالة: u.isActive ? 'نشط' : 'معطل',
      الفرع: u.branch?.name || '',
      'تاريخ الإنشاء': u.createdAt,
      'آخر تسجيل دخول': u.lastLogin || '',
    }));

    await logAudit('users_exported', null, req.user?.id, {
      count: exportData.length,
      ip: req.ip,
    });

    res.json({ success: true, data: exportData });
  } catch (err) {
    safeError(res, err, 'Export users error');
  }
});

// ═══════════════════════════════════════════════════════════
// POST /bulk-action — عمليات جماعية
// ⚠️ MUST be before /:id to avoid route shadowing
// ═══════════════════════════════════════════════════════════
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'يجب تحديد مستخدمين' });
    }

    let result;
    switch (action) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true, updatedAt: new Date() }
        );
        break;
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: false, updatedAt: new Date() }
        );
        break;
      case 'reset-password': {
        // Generate unique password per user for security
        const passwords = {};
        const ops = userIds.map(async uid => {
          const tempPass = crypto.randomBytes(8).toString('hex');
          passwords[uid] = tempPass;
          const user = await User.findById(uid);
          if (user) {
            user.password = tempPass; // Let pre('save') hook hash
            user.requirePasswordChange = true;
            user.passwordChangedAt = new Date();
            user.updatedAt = new Date();
            await user.save();
          }
        });
        await Promise.all(ops);
        result = { modifiedCount: Object.keys(passwords).length, passwords };
        break;
      }
      case 'unlock':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          {
            failedLoginAttempts: 0,
            $unset: { lockUntil: '' },
            updatedAt: new Date(),
          }
        );
        break;
      case 'change-role': {
        const { newRole } = req.body;
        if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
          return res.status(400).json({ success: false, message: 'الدور غير صالح' });
        }
        // حماية دور مدير النظام
        if (newRole === 'super_admin' && req.user?.role !== 'super_admin') {
          return res
            .status(403)
            .json({ success: false, message: 'فقط مدير النظام يمكنه تعيين هذا الدور' });
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { role: newRole, updatedAt: new Date() }
        );
        break;
      }
      default:
        return res.status(400).json({ success: false, message: 'الإجراء غير مدعوم' });
    }

    await logAudit('bulk_action', null, req.user?.id, {
      action,
      userIds,
      modifiedCount: result.modifiedCount,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount || 0,
        passwords: result.passwords, // individual passwords per user (for reset-password)
      },
      message: `تم تنفيذ العملية على ${result.modifiedCount || 0} مستخدم`,
    });
  } catch (err) {
    safeError(res, err, 'Bulk action error');
  }
});

// ═══════════════════════════════════════════════════════════
// POST /import — استيراد مستخدمين
// ⚠️ MUST be before /:id to avoid route shadowing
// ═══════════════════════════════════════════════════════════
router.post('/import', async (req, res) => {
  try {
    const { users: usersData } = req.body;

    if (!Array.isArray(usersData) || usersData.length === 0) {
      return res.status(400).json({ success: false, message: 'لا توجد بيانات للاستيراد' });
    }

    // Limit import batch size
    if (usersData.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: 'الحد الأقصى للاستيراد 500 مستخدم في المرة الواحدة' });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const userData of usersData) {
      try {
        const fullName = sanitize(userData.fullName || userData.name);
        if (!fullName) {
          results.errors.push({ data: userData, error: 'الاسم مطلوب' });
          results.skipped++;
          continue;
        }

        const orConditions = [];
        if (userData.email) orConditions.push({ email: userData.email.toLowerCase().trim() });
        if (userData.username) orConditions.push({ username: sanitize(userData.username) });

        if (orConditions.length > 0) {
          const existing = await User.findOne({ $or: orConditions });
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        const tempPass = crypto.randomBytes(8).toString('hex');
        await User.create({
          fullName,
          username: sanitize(userData.username) || undefined,
          email: userData.email?.toLowerCase().trim() || undefined,
          phone: sanitize(userData.phone) || undefined,
          password: tempPass,
          role: ALLOWED_ROLES.includes(userData.role) ? userData.role : 'user',
          isActive: true,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ data: userData, error: err.message });
        results.skipped++;
      }
    }

    await logAudit('users_imported', null, req.user?.id, {
      total: usersData.length,
      created: results.created,
      skipped: results.skipped,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: results,
      message: `تم استيراد ${results.created} مستخدم، تم تخطي ${results.skipped}`,
    });
  } catch (err) {
    safeError(res, err, 'Import users error');
  }
});

// ═══════════════════════════════════════════════════════════
// GET /:id — تفاصيل مستخدم
// ═══════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const user = await User.findById(req.params.id)
      .select(
        '-password -passwordHistory -mfa.secret -mfa.backupCodes -resetPasswordToken -resetPasswordExpires'
      )
      .populate('branch', 'name code')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    // سجل النشاط الأخير
    const recentActivity = await AuditLog.find({
      $or: [{ userId: user._id }, { performedBy: user._id }],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: {
        ...user,
        roleLabel: ROLE_LABELS[user.role] || user.role,
        statusLabel: user.isActive ? 'نشط' : 'معطل',
        isLocked: !!(user.lockUntil && new Date(user.lockUntil) > new Date()),
        recentActivity,
      },
    });
  } catch (err) {
    safeError(res, err, 'User detail error');
  }
});

// ═══════════════════════════════════════════════════════════
// POST / — إنشاء مستخدم جديد
// ═══════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  try {
    const {
      fullName: rawFullName,
      username: rawUsername,
      email,
      phone: rawPhone,
      password,
      role,
      branch,
      isActive,
      customPermissions,
      deniedPermissions,
      notifyByEmail,
    } = req.body;

    // Sanitize inputs
    const fullName = sanitize(rawFullName);
    const username = sanitize(rawUsername);
    const phone = sanitize(rawPhone);

    // التحقق من الحقول المطلوبة
    if (!fullName) {
      return res.status(400).json({ success: false, message: 'الاسم الكامل مطلوب' });
    }
    if (!email && !username && !phone) {
      return res
        .status(400)
        .json({ success: false, message: 'يجب توفير بريد إلكتروني أو اسم مستخدم أو هاتف' });
    }

    // التحقق من الدور
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير مسموح به' });
    }

    // حماية دور مدير النظام
    if (role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res
        .status(403)
        .json({ success: false, message: 'فقط مدير النظام يمكنه إنشاء حساب مدير نظام' });
    }

    // التحقق من صيغة البريد الإلكتروني
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'صيغة البريد الإلكتروني غير صالحة' });
    }

    // التحقق من التكرار
    const orConditions = [];
    if (email) orConditions.push({ email: email.toLowerCase() });
    if (username) orConditions.push({ username });
    if (phone) orConditions.push({ phone });

    const existing = await User.findOne({ $or: orConditions });
    if (existing) {
      let field = 'البيانات';
      if (existing.email === email?.toLowerCase()) field = 'البريد الإلكتروني';
      else if (existing.username === username) field = 'اسم المستخدم';
      else if (existing.phone === phone) field = 'رقم الهاتف';
      return res.status(400).json({ success: false, message: `${field} مسجل بالفعل` });
    }

    // التحقق من قوة كلمة المرور
    if (password) {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return res.status(400).json({ success: false, message: pwCheck.message });
      }
    }

    // كلمة المرور: مُرسلة أو عشوائية
    const finalPassword = password || crypto.randomBytes(8).toString('hex');

    const user = await User.create({
      fullName,
      username: username || undefined,
      email: email?.toLowerCase() || undefined,
      phone: phone || undefined,
      password: finalPassword,
      role: role || 'user',
      branch: branch || undefined,
      isActive: isActive !== undefined ? isActive : true,
      customPermissions: customPermissions || [],
      deniedPermissions: deniedPermissions || [],
    });

    const safeUser = await User.findById(user._id)
      .select('-password -passwordHistory -mfa.secret -mfa.backupCodes')
      .populate('branch', 'name code')
      .lean();

    // تسجيل في سجل التدقيق
    await logAudit('user_created', user._id, req.user?.id, {
      role: user.role,
      email: user.email,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        ...safeUser,
        roleLabel: ROLE_LABELS[safeUser.role] || safeUser.role,
        tempPassword: !password ? finalPassword : undefined,
      },
      message: 'تم إنشاء المستخدم بنجاح',
    });
  } catch (err) {
    logger.error('Create user error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'البيانات مسجلة بالفعل (تكرار)' });
    }
    safeError(res, err, 'user-management');
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /:id — تحديث مستخدم
// ═══════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const {
      fullName,
      username,
      email,
      phone,
      role,
      branch,
      isActive,
      customPermissions,
      deniedPermissions,
    } = req.body;

    // التحقق من الدور
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'الدور غير مسموح به' });
    }

    // منع ترقية نفسك إلى super_admin
    if (role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعيين دور مدير النظام' });
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (username !== undefined) updateData.username = username || undefined;
    if (email !== undefined) updateData.email = email?.toLowerCase() || undefined;
    if (phone !== undefined) updateData.phone = phone || undefined;
    if (role !== undefined) updateData.role = role;
    if (branch !== undefined) updateData.branch = branch || undefined;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (customPermissions !== undefined) updateData.customPermissions = customPermissions;
    if (deniedPermissions !== undefined) updateData.deniedPermissions = deniedPermissions;
    updateData.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .select('-password -passwordHistory -mfa.secret -mfa.backupCodes')
      .populate('branch', 'name code')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await logAudit('user_updated', user._id, req.user?.id, {
      changes: Object.keys(updateData),
      ip: req.ip,
    });

    res.json({
      success: true,
      data: { ...user, roleLabel: ROLE_LABELS[user.role] || user.role },
      message: 'تم تحديث المستخدم بنجاح',
    });
  } catch (err) {
    logger.error('Update user error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'البيانات مسجلة بالفعل (تكرار)' });
    }
    safeError(res, err, 'user-management');
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /:id — تعطيل مستخدم (حذف ناعم)
// ═══════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    // منع حذف نفسك
    if (req.params.id === req.user?.id || req.params.id === req.user?.userId) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تعطيل حسابك الخاص' });
    }

    // حماية حساب مدير النظام
    const targetUser = await User.findById(req.params.id).select('role').lean();
    if (targetUser?.role === 'super_admin' && req.user?.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعطيل حساب مدير النظام' });
    }

    const { reason } = req.body || {};

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: req.user?._id,
        deactivationReason: reason || undefined,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await logAudit('user_deactivated', user._id, req.user?.id, { reason, ip: req.ip });

    res.json({ success: true, message: 'تم تعطيل المستخدم بنجاح' });
  } catch (err) {
    safeError(res, err, 'Deactivate user error');
  }
});

// ═══════════════════════════════════════════════════════════
// PATCH /:id/toggle-status — تبديل حالة المستخدم
// ═══════════════════════════════════════════════════════════
router.patch('/:id/toggle-status', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    // منع تبديل حالة الحساب الخاص
    if (req.params.id === req.user?.id || req.params.id === req.user?.userId) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تبديل حالة حسابك الخاص' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    await logAudit(user.isActive ? 'user_activated' : 'user_deactivated', user._id, req.user?.id, {
      ip: req.ip,
    });

    res.json({
      success: true,
      data: { isActive: user.isActive },
      message: user.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
    });
  } catch (err) {
    safeError(res, err, 'Toggle user status error');
  }
});

// ═══════════════════════════════════════════════════════════
// POST /:id/reset-password — إعادة تعيين كلمة المرور
// ═══════════════════════════════════════════════════════════
router.post('/:id/reset-password', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const { newPassword } = req.body;

    // Validate password if provided
    if (newPassword) {
      const pwCheck = validatePassword(newPassword);
      if (!pwCheck.valid) {
        return res.status(400).json({ success: false, message: pwCheck.message });
      }
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const finalPassword = newPassword || crypto.randomBytes(8).toString('hex');
    user.password = finalPassword;
    user.requirePasswordChange = true;
    user.passwordChangedAt = new Date();
    user.passwordResetReason = 'admin_reset';
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await logAudit('password_reset_by_admin', user._id, req.user?.id, { ip: req.ip });

    res.json({
      success: true,
      data: { tempPassword: !newPassword ? finalPassword : undefined },
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
    });
  } catch (err) {
    safeError(res, err, 'Reset password error');
  }
});

// ═══════════════════════════════════════════════════════════
// POST /:id/unlock — فك قفل الحساب
// ═══════════════════════════════════════════════════════════
router.post('/:id/unlock', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        failedLoginAttempts: 0,
        $unset: { lockUntil: '' },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await logAudit('user_unlocked', user._id, req.user?.id, { ip: req.ip });

    res.json({ success: true, message: 'تم فك قفل الحساب بنجاح' });
  } catch (err) {
    safeError(res, err, 'Unlock user error');
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /:id/permissions — تحديث الصلاحيات
// ═══════════════════════════════════════════════════════════
router.put('/:id/permissions', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const { customPermissions, deniedPermissions } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        customPermissions: customPermissions || [],
        deniedPermissions: deniedPermissions || [],
        updatedAt: new Date(),
      },
      { new: true }
    )
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await logAudit('permissions_updated', user._id, req.user?.id, {
      customPermissions,
      deniedPermissions,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        customPermissions: user.customPermissions,
        deniedPermissions: user.deniedPermissions,
      },
      message: 'تم تحديث الصلاحيات بنجاح',
    });
  } catch (err) {
    safeError(res, err, 'Update permissions error');
  }
});

// ═══════════════════════════════════════════════════════════
// GET /:id/activity — سجل نشاط المستخدم
// ═══════════════════════════════════════════════════════════
router.get('/:id/activity', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, +page) - 1) * +limit;

    const [logs, total] = await Promise.all([
      AuditLog.find({
        $or: [{ userId: req.params.id }, { performedBy: req.params.id }],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .lean(),
      AuditLog.countDocuments({
        $or: [{ userId: req.params.id }, { performedBy: req.params.id }],
      }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page: +page, limit: +limit, total },
    });
  } catch (err) {
    safeError(res, err, 'User activity error');
  }
});

// ═════════════════════════════════════════════════════════
// GET /:id/login-history — سجل تسجيلات الدخول
// ═════════════════════════════════════════════════════════
router.get('/:id/login-history', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.params.id).select('loginHistory fullName username').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    const history = (user.loginHistory || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    const start = (Math.max(1, +page) - 1) * +limit;
    const paginated = history.slice(start, start + +limit);

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: +page,
        limit: +limit,
        total: history.length,
        pages: Math.ceil(history.length / +limit),
      },
    });
  } catch (err) {
    safeError(res, err, 'Login history error');
  }
});

// ═════════════════════════════════════════════════════════
// PATCH /:id/mfa/reset — إعادة تعيين المصادقة الثنائية
// ═════════════════════════════════════════════════════════
router.patch('/:id/mfa/reset', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    if (user.mfa) {
      user.mfa.enabled = false;
      user.mfa.secret = undefined;
      user.mfa.backupCodes = [];
      user.mfa.trustedDevices = [];
      user.mfa.enabledAt = undefined;
    }
    user.updatedAt = new Date();
    await user.save();

    await logAudit('mfa_reset_by_admin', user._id, req.user?.id, { ip: req.ip });

    res.json({ success: true, message: 'تم إعادة تعيين المصادقة الثنائية بنجاح' });
  } catch (err) {
    safeError(res, err, 'MFA reset error');
  }
});

// ═════════════════════════════════════════════════════════
// PATCH /:id/verify — تغيير حالة التحقق (بريد/هاتف)
// ═════════════════════════════════════════════════════════
router.patch('/:id/verify', async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
  }
  try {
    const { emailVerified, phoneVerified } = req.body;
    const updateData = { updatedAt: new Date() };
    if (emailVerified !== undefined) updateData.emailVerified = emailVerified;
    if (phoneVerified !== undefined) updateData.phoneVerified = phoneVerified;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .select('emailVerified phoneVerified fullName')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    }

    await logAudit('verification_status_changed', user._id, req.user?.id, {
      emailVerified,
      phoneVerified,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: { emailVerified: user.emailVerified, phoneVerified: user.phoneVerified },
      message: 'تم تحديث حالة التحقق',
    });
  } catch (err) {
    safeError(res, err, 'Verify status error');
  }
});

module.exports = router;
