const express = require('express');
const router = express.Router();
const Communication = require('../models/Communication');

// ============================================
// GET /api/communications - الحصول على جميع الاتصالات مع فلترة
// ============================================
router.get('/', async (req, res) => {
  try {
    const {
      type,
      status,
      priority,
      starred,
      archived,
      search,
      page = 1,
      limit = 20,
      sortBy = 'sentDate',
      sortOrder = 'desc',
    } = req.query;

    // بناء الفلتر
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (starred === 'true') filter.isStarred = true;
    if (archived === 'true') filter.isArchived = true;
    else if (archived !== 'all') filter.isArchived = false; // إخفاء المؤرشف افتراضياً

    // البحث النصي
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { 'sender.name': { $regex: search, $options: 'i' } },
        { 'receiver.name': { $regex: search, $options: 'i' } },
      ];
    }

    // إعداد الترتيب
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // حساب الصفحات
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // جلب البيانات
    const communications = await Communication.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // استخدام lean لأداء أفضل

    // عدد النتائج الكلي
    const total = await Communication.countDocuments(filter);

    res.json({
      success: true,
      communications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب البيانات',
      error: error.message,
    });
  }
});

// ============================================
// GET /api/communications/stats - إحصائيات الاتصالات
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const stats = await Communication.aggregate([
      {
        $facet: {
          byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          totals: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                starred: { $sum: { $cond: ['$isStarred', 1, 0] } },
                archived: { $sum: { $cond: ['$isArchived', 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      stats: stats[0],
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الإحصائيات',
      error: error.message,
    });
  }
});

// ============================================
// GET /api/communications/:id - الحصول على اتصال واحد
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    // تسجيل المشاهدة (يمكن إضافة معلومات المستخدم الحالي)
    // communication.tracking.viewedBy.push({
    //   userId: req.user?.id,
    //   name: req.user?.name,
    //   viewedAt: new Date()
    // });
    // await communication.save();

    res.json({
      success: true,
      communication,
    });
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب البيانات',
      error: error.message,
    });
  }
});

// ============================================
// POST /api/communications - إنشاء اتصال جديد
// ============================================
router.post('/', async (req, res) => {
  try {
    const communicationData = {
      ...req.body,
      createdBy: {
        userId: req.body.createdBy?.userId || 'admin',
        name: req.body.createdBy?.name || 'مدير النظام',
        email: req.body.createdBy?.email || 'admin@example.com',
      },
    };

    const communication = new Communication(communicationData);
    await communication.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الاتصال بنجاح',
      communication,
    });
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(400).json({
      success: false,
      message: 'خطأ في إنشاء الاتصال',
      error: error.message,
    });
  }
});

// ============================================
// PUT /api/communications/:id - تحديث اتصال
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedBy: {
        userId: req.body.updatedBy?.userId || 'admin',
        name: req.body.updatedBy?.name || 'مدير النظام',
        email: req.body.updatedBy?.email || 'admin@example.com',
      },
    };

    const communication = await Communication.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث الاتصال بنجاح',
      communication,
    });
  } catch (error) {
    console.error('Error updating communication:', error);
    res.status(400).json({
      success: false,
      message: 'خطأ في تحديث الاتصال',
      error: error.message,
    });
  }
});

// ============================================
// DELETE /api/communications/:id - حذف اتصال
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const communication = await Communication.findByIdAndDelete(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الاتصال بنجاح',
    });
  } catch (error) {
    console.error('Error deleting communication:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الاتصال',
      error: error.message,
    });
  }
});

// ============================================
// POST /api/communications/:id/star - تفضيل/إلغاء تفضيل
// ============================================
router.post('/:id/star', async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    communication.isStarred = !communication.isStarred;
    await communication.save();

    res.json({
      success: true,
      message: communication.isStarred ? 'تم إضافة للمفضلة' : 'تم إزالة من المفضلة',
      isStarred: communication.isStarred,
    });
  } catch (error) {
    console.error('Error toggling star:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المفضلة',
      error: error.message,
    });
  }
});

// ============================================
// POST /api/communications/:id/archive - أرشفة/إلغاء أرشفة
// ============================================
router.post('/:id/archive', async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    communication.isArchived = !communication.isArchived;
    await communication.save();

    res.json({
      success: true,
      message: communication.isArchived ? 'تم الأرشفة' : 'تم إلغاء الأرشفة',
      isArchived: communication.isArchived,
    });
  } catch (error) {
    console.error('Error toggling archive:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الأرشفة',
      error: error.message,
    });
  }
});

// ============================================
// POST /api/communications/:id/approve - الموافقة على مرحلة
// ============================================
router.post('/:id/approve', async (req, res) => {
  try {
    const { stageIndex, comments, userId, userName } = req.body;

    const communication = await Communication.findById(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    if (!communication.approvalWorkflow.enabled) {
      return res.status(400).json({
        success: false,
        message: 'نظام الموافقات غير مفعل',
      });
    }

    const stage = communication.approvalWorkflow.stages[stageIndex];
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'المرحلة غير موجودة',
      });
    }

    stage.status = 'approved';
    stage.actionDate = new Date();
    stage.comments = comments;

    // تحديث المرحلة الحالية
    if (stageIndex === communication.approvalWorkflow.currentStage) {
      communication.approvalWorkflow.currentStage = stageIndex + 1;
    }

    // تحديث حالة الاتصال
    communication.updateWorkflowStatus();

    await communication.save();

    res.json({
      success: true,
      message: 'تمت الموافقة بنجاح',
      communication,
    });
  } catch (error) {
    console.error('Error approving stage:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الموافقة',
      error: error.message,
    });
  }
});

// ============================================
// POST /api/communications/:id/reject - رفض مرحلة
// ============================================
router.post('/:id/reject', async (req, res) => {
  try {
    const { stageIndex, comments, userId, userName } = req.body;

    const communication = await Communication.findById(req.params.id);

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    if (!communication.approvalWorkflow.enabled) {
      return res.status(400).json({
        success: false,
        message: 'نظام الموافقات غير مفعل',
      });
    }

    const stage = communication.approvalWorkflow.stages[stageIndex];
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: 'المرحلة غير موجودة',
      });
    }

    stage.status = 'rejected';
    stage.actionDate = new Date();
    stage.comments = comments;

    // تحديث حالة الاتصال
    communication.updateWorkflowStatus();

    await communication.save();

    res.json({
      success: true,
      message: 'تم الرفض بنجاح',
      communication,
    });
  } catch (error) {
    console.error('Error rejecting stage:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في الرفض',
      error: error.message,
    });
  }
});

// ============================================
// GET /api/communications/:id/tracking - معلومات التتبع
// ============================================
router.get('/:id/tracking', async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id).select(
      'tracking approvalWorkflow referenceNumber title'
    );

    if (!communication) {
      return res.status(404).json({
        success: false,
        message: 'الاتصال غير موجود',
      });
    }

    res.json({
      success: true,
      tracking: communication.tracking,
      workflow: communication.approvalWorkflow,
    });
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب معلومات التتبع',
      error: error.message,
    });
  }
});

module.exports = router;

