const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');

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

initUploadDirs().catch(console.error);

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
const handleMulterError = (err, req, res, next) => {
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
      message: err.message,
    });
  }

  if (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

// ============= Routes =============

// رفع ملف واحد
router.post('/single', authenticate, upload.single('file'), handleMulterError, async (req, res) => {
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
      uploadedBy: req.user._id,
      description: req.body.description || '',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
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
        console.error('خطأ في حذف الملف:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الملف',
      error: error.message,
    });
  }
});

// رفع عدة ملفات
router.post(
  '/multiple',
  authenticate,
  upload.array('files', 10),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع أي ملفات',
        });
      }

      const filesInfo = req.files.map((file, index) => ({
        originalName: file.originalname,
        fileName: file.filename,
        fileType: req.body.fileTypes ? JSON.parse(req.body.fileTypes)[index] : 'أخرى',
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: `/uploads/medical-files/${file.path.split('medical-files')[1].replace(/\\/g, '/')}`,
        uploadDate: new Date(),
        uploadedBy: req.user._id,
        description: req.body.descriptions ? JSON.parse(req.body.descriptions)[index] : '',
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
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
            console.error('خطأ في حذف الملف:', unlinkError);
          }
        }
      }

      res.status(500).json({
        success: false,
        message: 'خطأ في رفع الملفات',
        error: error.message,
      });
    }
  }
);

// عرض ملف
router.get('/view/:fileType/:fileName', authenticate, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const filePath = path.join(__dirname, '../uploads/medical-files', subDir, fileName);

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
    res.status(500).json({
      success: false,
      message: 'خطأ في عرض الملف',
      error: error.message,
    });
  }
});

// تحميل ملف
router.get('/download/:fileType/:fileName', authenticate, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const filePath = path.join(__dirname, '../uploads/medical-files', subDir, fileName);

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

    // تحميل الملف
    res.download(filePath, fileName, err => {
      if (err) {
        console.error('خطأ في تحميل الملف:', err);
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في تحميل الملف',
      error: error.message,
    });
  }
});

// حذف ملف
router.delete(
  '/:fileType/:fileName',
  authenticate,
  authorize(['admin', 'doctor', 'case_manager']),
  async (req, res) => {
    try {
      const { fileType, fileName } = req.params;
      const subDir = UPLOAD_DIRS[fileType] || 'other';
      const filePath = path.join(__dirname, '../uploads/medical-files', subDir, fileName);

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
      res.status(500).json({
        success: false,
        message: 'خطأ في حذف الملف',
        error: error.message,
      });
    }
  }
);

// الحصول على معلومات ملف
router.get('/info/:fileType/:fileName', authenticate, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const filePath = path.join(__dirname, '../uploads/medical-files', subDir, fileName);

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
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على معلومات الملف',
      error: error.message,
    });
  }
});

// إحصائيات المساحة المستخدمة
router.get('/storage/statistics', authenticate, authorize(['admin']), async (req, res) => {
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
    res.status(500).json({
      success: false,
      message: 'خطأ في الحصول على الإحصائيات',
      error: error.message,
    });
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
