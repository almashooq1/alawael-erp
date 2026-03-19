/* eslint-disable no-unused-vars */
/**
 * وحدة تحكم الفروع
 * نظام الأصول ERP - الإصدار 2.0.0
 */

const Branch = require('../models/Branch');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

/**
 * الحصول على جميع الفروع
 * @route GET /api/branches
 */
const getAllBranches = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, city, isActive } = req.query;

    // بناء الاستعلام
    const query = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { nameEn: { $regex: escapedSearch, $options: 'i' } },
        { code: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    if (type) query.type = type;
    if (city) query['address.city'] = { $regex: escapeRegex(city), $options: 'i' };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const branches = await Branch.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Branch.countDocuments(query);

    res.json({
      success: true,
      data: branches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('خطأ في الحصول على الفروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * الحصول على فرع بواسطة المعرف
 * @route GET /api/branches/:id
 */
const getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود',
      });
    }

    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    logger.error('خطأ في الحصول على الفرع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إنشاء فرع جديد
 * @route POST /api/branches
 */
const createBranch = async (req, res) => {
  try {
    const {
      name,
      nameEn,
      code,
      type,
      address,
      contact,
      workingHours,
      facilities,
      capacity,
      manager,
      licenseNumber,
      licenseExpiry,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'الحقول المطلوبة: اسم الفرع، الرمز',
      });
    }

    // التحقق من عدم وجود الفرع
    const existingBranch = await Branch.findOne({ code });
    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: 'رمز الفرع مستخدم بالفعل',
      });
    }

    // إنشاء الفرع
    const branch = new Branch({
      name,
      nameEn,
      code,
      type: type || 'main',
      address,
      contact,
      workingHours,
      facilities,
      capacity,
      manager,
      licenseNumber,
      licenseExpiry,
    });

    await branch.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الفرع بنجاح',
      data: branch,
    });
  } catch (error) {
    logger.error('خطأ في إنشاء الفرع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تحديث فرع
 * @route PUT /api/branches/:id
 */
const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود',
      });
    }

    // تحديث الحقول
    const updateFields = [
      'name',
      'nameEn',
      'type',
      'address',
      'contact',
      'workingHours',
      'facilities',
      'capacity',
      'manager',
      'licenseNumber',
      'licenseExpiry',
      'isActive',
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        branch[field] = req.body[field];
      }
    });

    await branch.save();

    res.json({
      success: true,
      message: 'تم تحديث الفرع بنجاح',
      data: branch,
    });
  } catch (error) {
    logger.error('خطأ في تحديث الفرع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * حذف فرع
 * @route DELETE /api/branches/:id
 */
const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود',
      });
    }

    // تعطيل بدلاً من الحذف
    branch.isActive = false;
    await branch.save();

    res.json({
      success: true,
      message: 'تم تعطيل الفرع بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في حذف الفرع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تغيير حالة الفرع
 * @route PATCH /api/branches/:id/status
 */
const toggleBranchStatus = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'الفرع غير موجود',
      });
    }

    branch.isActive = !branch.isActive;
    await branch.save();

    res.json({
      success: true,
      message: branch.isActive ? 'تم تفعيل الفرع' : 'تم تعطيل الفرع',
      data: { isActive: branch.isActive },
    });
  } catch (error) {
    logger.error('خطأ في تغيير حالة الفرع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * الحصول على الفروع النشطة
 * @route GET /api/branches/active
 */
const getActiveBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ isActive: true })
      .select('name nameEn code type address.city')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: branches,
    });
  } catch (error) {
    logger.error('خطأ في الحصول على الفروع النشطة:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إحصائيات الفروع
 * @route GET /api/branches/stats
 */
const getBranchStats = async (req, res) => {
  try {
    const stats = await Branch.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
        },
      },
    ]);

    const totalBranches = await Branch.countDocuments();
    const activeBranches = await Branch.countDocuments({ isActive: true });

    // الفروع حسب المدينة
    const byCity = await Branch.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$address.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        total: totalBranches,
        active: activeBranches,
        byType: stats,
        byCity,
      },
    });
  } catch (error) {
    logger.error('خطأ في الحصول على إحصائيات الفروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  toggleBranchStatus,
  getActiveBranches,
  getBranchStats,
};
