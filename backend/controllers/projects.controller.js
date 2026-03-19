/* eslint-disable no-unused-vars */
/**
 * وحدة تحكم المشاريع
 * نظام الأصول ERP - الإصدار 2.0.0
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

/**
 * الحصول على جميع المشاريع
 * @route GET /api/projects
 */
const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, priority, branchId } = req.query;

    // بناء الاستعلام
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { code: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (branchId) query.branch = branchId;

    // فلترة حسب صلاحيات المستخدم
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      query.$or = [{ manager: req.user._id }, { team: req.user._id }, { branch: req.user.branch }];
    }

    const Project = mongoose.model('Project');
    const projects = await Project.find(query)
      .populate('branch', 'name nameEn')
      .populate('manager', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('خطأ في الحصول على المشاريع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * الحصول على مشروع بواسطة المعرف
 * @route GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(req.params.id)
      .populate('branch', 'name nameEn address')
      .populate('manager', 'name email phone')
      .populate('team', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('خطأ في الحصول على المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إنشاء مشروع جديد
 * @route POST /api/projects
 */
const createProject = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      branch,
      manager,
      team,
      startDate,
      endDate,
      budget,
      priority,
      status,
      tags,
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name || !branch) {
      return res.status(400).json({
        success: false,
        message: 'الحقول المطلوبة: اسم المشروع، الفرع',
      });
    }

    const Project = mongoose.model('Project');

    // التحقق من عدم وجود المشروع
    const existingProject = await Project.findOne({ code });
    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'رمز المشروع مستخدم بالفعل',
      });
    }

    // إنشاء المشروع
    const project = new Project({
      name,
      code,
      description,
      branch,
      manager: manager || req.user._id,
      team,
      startDate,
      endDate,
      budget,
      priority: priority || 'medium',
      status: status || 'planning',
      tags,
      createdBy: req.user._id,
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المشروع بنجاح',
      data: project,
    });
  } catch (error) {
    logger.error('خطأ في إنشاء المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تحديث مشروع
 * @route PUT /api/projects/:id
 */
const updateProject = async (req, res) => {
  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود',
      });
    }

    // تحديث الحقول
    const updateFields = [
      'name',
      'description',
      'branch',
      'manager',
      'team',
      'startDate',
      'endDate',
      'budget',
      'priority',
      'status',
      'tags',
      'progress',
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    project.updatedBy = req.user._id;
    await project.save();

    res.json({
      success: true,
      message: 'تم تحديث المشروع بنجاح',
      data: project,
    });
  } catch (error) {
    logger.error('خطأ في تحديث المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * حذف مشروع
 * @route DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود',
      });
    }

    // تغيير الحالة إلى ملغي بدلاً من الحذف
    project.status = 'cancelled';
    project.updatedBy = req.user._id;
    await project.save();

    res.json({
      success: true,
      message: 'تم إلغاء المشروع بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في حذف المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * تغيير حالة المشروع
 * @route PATCH /api/projects/:id/status
 */
const changeProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['planning', 'active', 'on-hold', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'حالة المشروع غير صالحة',
      });
    }

    const Project = mongoose.model('Project');
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود',
      });
    }

    project.status = status;
    project.updatedBy = req.user._id;
    await project.save();

    res.json({
      success: true,
      message: 'تم تغيير حالة المشروع بنجاح',
      data: { status: project.status },
    });
  } catch (error) {
    logger.error('خطأ في تغيير حالة المشروع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إضافة عضو للفريق
 * @route POST /api/projects/:id/team
 */
const addTeamMember = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
      });
    }

    const Project = mongoose.model('Project');
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'المشروع غير موجود',
      });
    }

    // التحقق من عدم وجود العضو
    if (project.team.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'العضو موجود بالفعل في الفريق',
      });
    }

    project.team.push(userId);
    await project.save();

    res.json({
      success: true,
      message: 'تم إضافة العضو للفريق بنجاح',
    });
  } catch (error) {
    logger.error('خطأ في إضافة عضو للفريق:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

/**
 * إحصائيات المشاريع
 * @route GET /api/projects/stats
 */
const getProjectStats = async (req, res) => {
  try {
    const Project = mongoose.model('Project');

    // إحصائيات حسب الحالة
    const byStatus = await Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

    // إحصائيات حسب الأولوية
    const byPriority = await Project.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // إحصائيات حسب الفرع
    const byBranch = await Project.aggregate([
      { $group: { _id: '$branch', count: { $sum: 1 } } },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      { $project: { count: 1, branchName: '$branch.name' } },
    ]);

    const totalProjects = await Project.countDocuments();
    const activeProjects = await Project.countDocuments({ status: 'active' });
    const completedProjects = await Project.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      data: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        byStatus,
        byPriority,
        byBranch,
      },
    });
  } catch (error) {
    logger.error('خطأ في الحصول على إحصائيات المشاريع:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'حدث خطأ داخلي',
    });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  changeProjectStatus,
  addTeamMember,
  getProjectStats,
};
