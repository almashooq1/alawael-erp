const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');

const { validateUploadedFile } = require('../utils/uploadValidator');
const safeError = require('../utils/safeError');

/** Safely parse JSON — returns fallback on invalid input */
const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// إعداد مجلدات التخزين
const UPLOAD_DIRS = {
  أشعة: 'radiology',
  تحاليل: 'lab-results',
  'تقرير طبي': 'medical-reports',
  'وصفة طبية': 'prescriptions',
  صورة: 'images',
  مستند: 'documents',
  أخرى: 'other',
};

// إنشاء المجلدات عند بدء التشغيل
const initUploadDirs = async () => {
  const baseDir = path.join(__dirname, '../uploads/medical-files');
  await fs.mkdir(baseDir, { recursive: true });

  for (const dir of Object.values(UPLOAD_DIRS)) {
    await fs.mkdir(path.join(baseDir, dir), { recursive: true });
  }
};

initUploadDirs().catch(err =>
  logger.error('Failed to init upload dirs:', { message: err.message })
);

// إعداد Multer للتخزين
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const fileType = req.body.fileType || 'أخرى';
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const uploadPath = path.join(__dirname, '../uploads/medical-files', subDir);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // توليد اسم فريد للملف
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    cb(null, `${timestamp}-${uniqueSuffix}${ext}`);
  },
});

// الأنواع المسموح بها
const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/dicom': ['.dcm'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

// فلتر الملفات
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // التحقق من نوع الملف
  if (ALLOWED_FILE_TYPES[mimeType] && ALLOWED_FILE_TYPES[mimeType].includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `نوع الملف غير مسموح به. الأنواع المسموحة: ${Object.values(ALLOWED_FILE_TYPES).flat().join(', ')}`
      ),
      false
    );
  }
};

// إعداد Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10, // حد أقصى 10 ملفات في طلب واحد
  },
});

// معالج الأخطاء لـ Multer
const handleMulterError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'حجم الملف كبير جداً. الحد الأقصى 20 ميجابايت',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'عدد الملفات كبير جداً. الحد الأقصى 10 ملفات',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'خطأ في البيانات المدخلة',
    });
  }

  if (err) {
    safeError(res, error, 'medicalFiles');
  }

  next();
};

// ============= Routes =============

// رفع ملف واحد
router.post(
  '/single',
  authenticate, requireBranchAccess, requireBranchAccess,
  upload.single('file'),
  validateUploadedFile,
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع أي ملف',
        });
      }

      const fileInfo = {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        fileType: req.body.fileType || 'أخرى',
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: `/uploads/medical-files/${UPLOAD_DIRS[req.body.fileType] || 'other'}/${req.file.filename}`,
        uploadDate: new Date(),
        uploadedBy: req.user.id,
        description: req.body.description || '',
        tags: safeJsonParse(req.body.tags, []),
      };

      res.json({
        success: true,
        message: 'تم رفع الملف بنجاح',
        data: fileInfo,
      });
    } catch (error) {
      // حذف الملف في حالة الخطأ
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error('خطأ في حذف الملف:', { message: unlinkError.message });
        }
      }

      safeError(res, unlinkError, 'medicalFiles');
    }
  }
);

// رفع عدة ملفات
router.post(
  '/multiple',
  authenticate, requireBranchAccess, requireBranchAccess,
  upload.array('files', 10),
  validateUploadedFile,
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع أي ملفات',
        });
      }

      const parsedFileTypes = safeJsonParse(req.body.fileTypes, []);
      const parsedDescriptions = safeJsonParse(req.body.descriptions, []);
      const parsedTags = safeJsonParse(req.body.tags, []);

      const filesInfo = req.files.map((file, index) => ({
        originalName: file.originalname,
        fileName: file.filename,
        fileType: parsedFileTypes[index] || 'أخرى',
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/medical-files/${file.path.split('medical-files')[1].replace(/\\/g, '/')}`,
        uploadDate: new Date(),
        uploadedBy: req.user.id,
        description: parsedDescriptions[index] || '',
        tags: parsedTags,
      }));

      res.json({
        success: true,
        message: `تم رفع ${filesInfo.length} ملف بنجاح`,
        data: filesInfo,
      });
    } catch (error) {
      // حذف الملفات في حالة الخطأ
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            logger.error('خطأ في حذف الملف:', { message: unlinkError.message });
          }
        }
      }

      safeError(res, error, 'medicalFiles');
    }
  }
);

// عرض ملف
router.get('/view/:fileType/:fileName', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    // Path-traversal protection
    const safeName = path.basename(fileName);
    const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
    const filePath = path.join(baseDir, safeName);
    if (!path.resolve(filePath).startsWith(path.resolve(baseDir))) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }

    // التحقق من وجود الملف
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
      });
    }

    // إرسال الملف
    res.sendFile(filePath);
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// تحميل ملف
router.get('/download/:fileType/:fileName', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    // Path-traversal protection
    const safeName = path.basename(fileName);
    const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
    const filePath = path.join(baseDir, safeName);
    if (!path.resolve(filePath).startsWith(path.resolve(baseDir))) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }

    // التحقق من وجود الملف
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
      });
    }

    // الحصول على معلومات الملف
    const _stats = await fs.stat(filePath);

    // تحميل الملف
    res.download(filePath, fileName, err => {
      if (err) {
        logger.error('خطأ في تحميل الملف:', { message: err.message });
      }
    });
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// حذف ملف
router.delete(
  '/:fileType/:fileName',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'doctor', 'case_manager']),
  async (req, res) => {
    try {
      const { fileType, fileName } = req.params;
      const subDir = UPLOAD_DIRS[fileType] || 'other';
      // Path-traversal protection
      const safeName = path.basename(fileName);
      const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
      const filePath = path.join(baseDir, safeName);
      if (!path.resolve(filePath).startsWith(path.resolve(baseDir))) {
        return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
      }

      // التحقق من وجود الملف
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({
          success: false,
          message: 'الملف غير موجود',
        });
      }

      // حذف الملف
      await fs.unlink(filePath);

      res.json({
        success: true,
        message: 'تم حذف الملف بنجاح',
      });
    } catch (error) {
      safeError(res, error, 'medicalFiles');
    }
  }
);

// الحصول على معلومات ملف
router.get('/info/:fileType/:fileName', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    // Path-traversal protection
    const safeName = path.basename(fileName);
    const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
    const filePath = path.join(baseDir, safeName);
    if (!path.resolve(filePath).startsWith(path.resolve(baseDir))) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }

    // التحقق من وجود الملف
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'الملف غير موجود',
      });
    }

    // الحصول على معلومات الملف
    const stats = await fs.stat(filePath);

    const fileInfo = {
      fileName: fileName,
      fileType: fileType,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      path: filePath,
      url: `/uploads/medical-files/${subDir}/${fileName}`,
    };

    res.json({
      success: true,
      data: fileInfo,
    });
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// إحصائيات المساحة المستخدمة
router.get('/storage/statistics', authenticate, requireBranchAccess, authorize(['admin']), async (req, res) => {
  try {
    const baseDir = path.join(__dirname, '../uploads/medical-files');
    const stats = {};
    let totalSize = 0;
    let totalFiles = 0;

    for (const [type, dir] of Object.entries(UPLOAD_DIRS)) {
      const dirPath = path.join(baseDir, dir);
      try {
        const files = await fs.readdir(dirPath);
        let dirSize = 0;

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const fileStat = await fs.stat(filePath);
          if (fileStat.isFile()) {
            dirSize += fileStat.size;
          }
        }

        stats[type] = {
          filesCount: files.length,
          size: dirSize,
          sizeFormatted: formatBytes(dirSize),
        };

        totalSize += dirSize;
        totalFiles += files.length;
      } catch {
        stats[type] = {
          filesCount: 0,
          size: 0,
          sizeFormatted: '0 B',
        };
      }
    }

    res.json({
      success: true,
      data: {
        byType: stats,
        total: {
          filesCount: totalFiles,
          size: totalSize,
          sizeFormatted: formatBytes(totalSize),
        },
      },
    });
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// دالة مساعدة لتنسيق حجم الملف
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
