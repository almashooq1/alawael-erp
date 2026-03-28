/* eslint-disable no-unused-vars */
/**
 * وحدة تحكم المستخدمين
 * نظام الأصول ERP - الإصدار 2.0.0
 */

const User = require('../models/User');
const Branch = require('../models/Branch');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

/**
 * الحصول على جميع المستخدمين
 * @route GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, branch, isActive } = req.query;

    // بناء الاستعلام
    const query = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { username: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
        { name: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (role) query.role = role;
    if (branch) query.branch = branch;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .populate('branch', 'name code')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('خطأ في الحصول على المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * الحصول على مستخدم بواسطة المعرف
 * @route GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('branch', 'name code')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('خطأ في الحصول على المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إنشاء مستخدم جديد
 * @route POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      name,
      nameEn,
      role,
      branch,
      phone,
      nationalId,
      jobTitle,
      department,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'الحقول المطلوبة: اسم المستخدم، البريد الإلكتروني، كلمة المرور، الاسم',
      });
    }

    // التحقق من عدم وجود المستخدم
    const existingUser = await User.findOne({
      $or: [{ username }, { email }, ...(nationalId ? [{ nationalId }] : [])],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'اسم المستخدم أو البريد الإلكتروني أو الرقم الوطني مستخدم بالفعل',
      });
    }

    // إنشاء المستخدم
    const user = new User({
      username,
      email,
      password,
      name,
      nameEn,
      role: role || 'employee',
      branch,
      phone,
      nationalId,
      jobTitle,
      department,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المستخدم بنجاح',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('خطأ في إنشاء المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تحديث مستخدم
 * @route PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { name, nameEn, email, phone, branch, role, jobTitle, department, isActive } = req.body;

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    // تحديث الحقول
    if (name) user.name = name;
    if (nameEn) user.nameEn = nameEn;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (branch) user.branch = branch;
    if (role) user.role = role;
    if (jobTitle) user.jobTitle = jobTitle;
    if (department) user.department = department;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث المستخدم بنجاح',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('خطأ في تحديث المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * حذف مستخدم
 * @route DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    // تعطيل بدلاً من الحذف
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'تم تعطيل المستخدم بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في حذف المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تغيير حالة المستخدم
 * @route PATCH /api/users/:id/status
 */
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
      data: { isActive: user.isActive },
    });
  } catch (error) {
    logger.error('خطأ في تغيير حالة المستخدم:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تحديث صلاحيات المستخدم
 * @route PUT /api/users/:id/permissions
 */
const updateUserPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    user.permissions = permissions;
    await user.save();

    res.json({
      success: true,
      message: 'تم تحديث الصلاحيات بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في تحديث الصلاحيات:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * الحصول على المستخدمين حسب الفرع
 * @route GET /api/users/branch/:branchId
 */
const getUsersByBranch = async (req, res) => {
  try {
    const users = await User.find({
      branch: req.params.branchId,
      isActive: true,
    })
      .select('-password')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error('خطأ في الحصول على مستخدمي الفرع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إحصائيات المستخدمين
 * @route GET /api/users/stats
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
        },
      },
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        byRole: stats,
      },
    });
  } catch (error) {
    logger.error('خطأ في الحصول على إحصائيات المستخدمين:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updateUserPermissions,
  getUsersByBranch,
  getUserStats,
};
