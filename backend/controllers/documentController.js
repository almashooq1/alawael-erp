/* eslint-disable no-unused-vars */
/**
 * Document Controller
 * تحكم إدارة المستندات - التعامل مع جميع عمليات المستندات
 */

const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const logger = require('../utils/logger');

// إنشاء مجلد التحميل إذا لم يكن موجوداً
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 📤 تحميل مستند
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'لم يتم تحديد ملف للتحميل' });
    }

    const { title, description, category, tags, folder } = req.body;
    const userId = req.user?.id || 'guest';
    const userName = req.user?.name || 'ضيف';
    const userEmail = req.user?.email || 'guest@example.com';

    // التحقق من البيانات المطلوبة
    if (!title) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'العنوان مطلوب' });
    }

    // تحديد نوع الملف
    const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
    const allowedTypes = ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'txt', 'pptx', 'zip'];
    const fileType = allowedTypes.includes(ext) ? ext : 'other';

    // إنشاء المستند الجديد
    const document = new Document({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileType,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      title,
      description: description || '',
      category: category || 'أخرى',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      folder: folder || 'root',
      uploadedBy: userId,
      uploadedByName: userName,
      uploadedByEmail: userEmail,
    });

    await document.save();

    res.status(201).json({
      message: 'تم تحميل المستند بنجاح',
      document,
    });
  } catch (error) {
    // حذف الملف في حالة الخطأ
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'خطأ في تحميل المستند' });
  }
};

// 📋 الحصول على جميع المستندات
exports.getAllDocuments = async (req, res) => {
  try {
    const { category, search, folder, sortBy = '-createdAt' } = req.query;
    const userId = req.user?.id;

    const query = { status: { $ne: 'محذوف' } };

    // البحث حسب الفئة
    if (category) {
      query.category = category;
    }

    // البحث النصي
    if (search) {
      query.$text = { $search: search };
    }

    // البحث حسب المجلد
    if (folder) {
      query.folder = folder;
    }

    // الوصول - إما الملف الخاص به أو الملفات المشاركة معه
    if (userId) {
      query.$or = [{ uploadedBy: userId }, { 'sharedWith.userId': userId }, { isPublic: true }];
    } else {
      query.isPublic = true;
    }

    const documents = await Document.find(query)
      .sort(sortBy)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email')
      .lean();

    // تحديث عدد المرات التي تم عرض المستند
    if (userId) {
      await Document.updateMany(
        { _id: { $in: documents.map(d => d._id) } },
        { $inc: { viewCount: 1 } }
      );
    }

    res.json({
      total: documents.length,
      documents,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب المستندات' });
  }
};

// 📄 الحصول على مستند واحد
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const document = await Document.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('sharedWith.userId', 'name email');

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الوصول
    if (!document.hasAccess(userId, 'view')) {
      return res.status(403).json({ message: 'ليس لديك صلاحية للوصول إلى هذا المستند' });
    }

    // تحديث عدد المرات التي تم عرضها
    document.viewCount += 1;
    await document.save();

    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب المستند' });
  }
};

// ✏️ تحديث بيانات المستند
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, tags, folder } = req.body;
    const userId = req.user?.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الملكية أو التعديل
    if (
      !document.hasAccess(userId, 'edit') &&
      document.uploadedBy.toString() !== userId.toString()
    ) {
      return res.status(403).json({ message: 'ليس لديك صلاحية تعديل هذا المستند' });
    }

    // تحديث البيانات
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (category) document.category = category;
    if (tags) document.tags = tags.split(',').map(t => t.trim());
    if (folder) document.folder = folder;

    // إضافة سجل النشاط
    document.addActivityLog('تعديل', userId, req.user?.name || 'ضيف', 'تم تحديث بيانات المستند');

    await document.save();

    res.json({
      message: 'تم تحديث المستند بنجاح',
      document,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تحديث المستند' });
  }
};

// 📥 تنزيل مستند
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الوصول
    if (!document.hasAccess(userId, 'download')) {
      return res.status(403).json({ message: 'ليس لديك صلاحية تنزيل هذا المستند' });
    }

    // التحقق من وجود الملف
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ message: 'الملف غير موجود على السيرفر' });
    }

    // تحديث عدد مرات التنزيل
    document.downloadCount += 1;
    document.addActivityLog('تنزيل', userId, req.user?.name || 'ضيف');
    await document.save();

    // إرسال الملف
    res.download(document.filePath, document.originalFileName, err => {
      if (err) {
        logger.error('خطأ في التنزيل:', err);
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في تنزيل المستند' });
  }
};

// 🔗 مشاركة مستند مع مستخدم
exports.shareDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, permission } = req.body;
    const userId = req.user?.id;

    if (!email || !permission) {
      return res.status(400).json({ message: 'البريد الإلكتروني والصلاحية مطلوبان' });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الملكية
    if (document.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'فقط مالك المستند يمكنه مشاركته' });
    }

    // التحقق من عدم مشاركته مع نفس الشخص
    const existingShare = document.sharedWith.find(s => s.email === email);
    if (existingShare) {
      existingShare.permission = permission;
    } else {
      document.sharedWith.push({
        email,
        permission,
      });
    }

    document.addActivityLog(
      'مشاركة',
      userId,
      req.user?.name || 'ضيف',
      `تم مشاركة المستند مع ${email}`
    );
    await document.save();

    res.json({
      message: 'تم مشاركة المستند بنجاح',
      document,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في مشاركة المستند' });
  }
};

// 🚫 إزالة الوصول
exports.revokeAccess = async (req, res) => {
  try {
    const { id, shareId } = req.params;
    const userId = req.user?.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الملكية
    if (document.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'فقط مالك المستند يمكنه إزالة الوصول' });
    }

    document.sharedWith = document.sharedWith.filter(s => s._id.toString() !== shareId);

    document.addActivityLog('إزالة الوصول', userId, req.user?.name || 'ضيف');
    await document.save();

    res.json({
      message: 'تم إزالة الوصول بنجاح',
      document,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في إزالة الوصول' });
  }
};

// 🗑️ حذف مستند
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الملكية
    if (document.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'فقط مالك المستند يمكنه حذفه' });
    }

    // تحديث الحالة بدلاً من الحذف النهائي
    document.status = 'محذوف';
    document.addActivityLog('حذف', userId, req.user?.name || 'ضيف');
    await document.save();

    // حذف الملف من النظام بعد 30 يوماً (يمكن تعديله)
    // حالياً نحتفظ به للاسترجاع

    res.json({
      message: 'تم حذف المستند. يمكنك استرجاعه خلال 30 يوماً',
      document,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في حذف المستند' });
  }
};

// ♻️ استرجاع مستند محذوف
exports.restoreDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ message: 'المستند غير موجود' });
    }

    // التحقق من الملكية
    if (document.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'فقط مالك المستند يمكنه استرجاعه' });
    }

    document.status = 'نشط';
    document.addActivityLog('استرجاع', userId, req.user?.name || 'ضيف');
    await document.save();

    res.json({
      message: 'تم استرجاع المستند بنجاح',
      document,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في استرجاع المستند' });
  }
};

// 📊 الحصول على إحصائيات المستندات
exports.getDocumentStats = async (req, res) => {
  try {
    const userId = req.user?.id;

    const stats = await Document.aggregate([
      {
        $match: {
          uploadedBy: userId,
          status: { $ne: 'محذوف' },
        },
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    const totalDocuments = await Document.countDocuments({
      uploadedBy: userId,
      status: { $ne: 'محذوف' },
    });

    const totalSize = await Document.aggregate([
      {
        $match: {
          uploadedBy: userId,
          status: { $ne: 'محذوف' },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fileSize' },
        },
      },
    ]);

    res.json({
      totalDocuments,
      totalSize: totalSize[0]?.total || 0,
      byCategory: stats,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب الإحصائيات' });
  }
};

// 🔍 البحث المتقدم
exports.searchDocuments = async (req, res) => {
  try {
    const { q, category, dateFrom, dateTo } = req.query;
    const userId = req.user?.id;

    const query = { status: { $ne: 'محذوف' } };

    if (q) {
      query.$text = { $search: q };
    }

    if (category) {
      query.category = category;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // الوصول
    if (userId) {
      query.$or = [{ uploadedBy: userId }, { 'sharedWith.userId': userId }, { isPublic: true }];
    } else {
      query.isPublic = true;
    }

    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .sort('-createdAt');

    res.json({
      total: documents.length,
      documents,
    });
  } catch (error) {
    res.status(500).json({ message: 'خطأ في البحث' });
  }
};

// 📁 الحصول على المجلدات
exports.getFolders = async (req, res) => {
  try {
    const userId = req.user?.id;

    const folders = await Document.aggregate([
      {
        $match: {
          uploadedBy: userId,
          status: { $ne: 'محذوف' },
        },
      },
      {
        $group: {
          _id: '$folder',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json(folders);
  } catch (error) {
    res.status(500).json({ message: 'خطأ في جلب المجلدات' });
  }
};
