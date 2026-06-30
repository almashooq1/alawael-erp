const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { bodyScopedBeneficiaryGuard, enforceBeneficiaryBranch } = require('../middleware/assertBranchMatch');

const safeError = require('../utils/safeError');
const documentUploadService = require('../services/documents/documentUpload.service');
const storageService = require('../services/storage/storage.service');
const Document = require('../models/Document');

/** Safely parse JSON — returns fallback on invalid input */
const safeJsonParse = (str, fallback = []) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// إعداد مجلدات التخزين (للتوافق مع الملفات المرفوعة سابقًا)
const UPLOAD_DIRS = {
  أشعة: 'radiology',
  تحاليل: 'lab-results',
  'تقرير طبي': 'medical-reports',
  'وصفة طبية': 'prescriptions',
  صورة: 'images',
  مستند: 'documents',
  أخرى: 'other',
};

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

// إعداد Multer باستخدام memory storage (يتم التخزين عبر DocumentUploadService)
const memStorage = multer.memoryStorage();
const upload = multer({
  storage: memStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

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
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 10,
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
    return safeError(res, err, 'medicalFiles');
  }

  next();
};

// ============= Routes =============

// رفع ملف واحد
router.post(
  '/single',
  authenticate,
  requireBranchAccess,
  bodyScopedBeneficiaryGuard, // W441: enforce branch on req.body.beneficiaryId
  upload.single('file'),
  handleMulterError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'لم يتم رفع أي ملف',
        });
      }

      const fileType = req.body.fileType || 'أخرى';
      const entityType = req.body.caseId ? 'CaseManagement' : 'Beneficiary';
      const entityId = req.body.caseId || req.body.beneficiaryId;

      const doc = await documentUploadService.createDocumentRecord(req.file, req.user, {
        title: req.file.originalname,
        description: req.body.description || '',
        category: 'تقارير',
        tags: [fileType, ...safeJsonParse(req.body.tags, [])],
        sourceModule: 'medical',
        entityType,
        entityId,
        folder: 'medical-files',
      });

      const fileInfo = {
        documentId: doc._id,
        originalName: doc.originalFileName,
        fileName: doc.fileName,
        fileType,
        mimeType: doc.mimeType,
        size: doc.fileSize,
        path: doc.filePath,
        url: `/api/v1/documents/${doc._id}/download`,
        uploadDate: doc.createdAt,
        uploadedBy: doc.uploadedBy,
        description: doc.description,
        tags: doc.tags,
      };

      res.json({
        success: true,
        message: 'تم رفع الملف بنجاح',
        data: fileInfo,
      });
    } catch (error) {
      safeError(res, error, 'medicalFiles');
    }
  }
);

// رفع عدة ملفات
router.post(
  '/multiple',
  authenticate,
  requireBranchAccess,
  bodyScopedBeneficiaryGuard, // W441: enforce branch on req.body.beneficiaryId
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

      const parsedFileTypes = safeJsonParse(req.body.fileTypes, []);
      const parsedDescriptions = safeJsonParse(req.body.descriptions, []);
      const parsedTags = safeJsonParse(req.body.tags, []);
      const entityType = req.body.caseId ? 'CaseManagement' : 'Beneficiary';
      const entityId = req.body.caseId || req.body.beneficiaryId;

      const filesInfo = [];
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const fileType = parsedFileTypes[i] || 'أخرى';
        const doc = await documentUploadService.createDocumentRecord(file, req.user, {
          title: file.originalname,
          description: parsedDescriptions[i] || '',
          category: 'تقارير',
          tags: [fileType, ...parsedTags],
          sourceModule: 'medical',
          entityType,
          entityId,
          folder: 'medical-files',
        });

        filesInfo.push({
          documentId: doc._id,
          originalName: doc.originalFileName,
          fileName: doc.fileName,
          fileType,
          mimeType: doc.mimeType,
          size: doc.fileSize,
          path: doc.filePath,
          url: `/api/v1/documents/${doc._id}/download`,
          uploadDate: doc.createdAt,
          uploadedBy: doc.uploadedBy,
          description: doc.description,
          tags: doc.tags,
        });
      }

      res.json({
        success: true,
        message: `تم رفع ${filesInfo.length} ملف بنجاح`,
        data: filesInfo,
      });
    } catch (error) {
      safeError(res, error, 'medicalFiles');
    }
  }
);

// عرض/تحميل ملف بواسطة documentId
router.get('/download/:documentId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.documentId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    // W1561 — Document has no branchId of its own; these medical files are
    // entityType:'Beneficiary' (upload is already bodyScopedBeneficiaryGuard'd).
    // Enforce branch ownership via the linked beneficiary so a user from another
    // branch cannot download a beneficiary's medical file by enumerating ids.
    // (enforceBeneficiaryBranch throws err.status 403/404/503; safeError only maps
    // err.statusCode, so map the status here explicitly.)
    if (doc.entityType === 'Beneficiary' && doc.entityId) {
      try {
        await enforceBeneficiaryBranch(req, doc.entityId);
      } catch (e) {
        return res
          .status(e && e.status ? e.status : 403)
          .json({ success: false, message: 'غير مصرح بالوصول إلى هذا الملف' });
      }
    }

    const fileExists = await storageService
      .exists(doc.filePath, doc.storageProvider || 'local')
      .catch(() => false);
    if (!fileExists) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    const buffer = await storageService.download(doc.filePath, doc.storageProvider || 'local');
    res.set('Content-Type', doc.mimeType || 'application/octet-stream');
    res.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.originalFileName || doc.fileName)}"`
    );
    res.send(buffer);
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// Legacy: عرض ملف (path-based)
router.get('/view/:fileType/:fileName', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const safeName = path.basename(fileName);
    const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
    const filePath = path.join(baseDir, safeName);
    if (!path.resolve(filePath).startsWith(path.resolve(baseDir) + path.sep)) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    res.sendFile(filePath);
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// Legacy: تحميل ملف (path-based)
router.get('/download/:fileType/:fileName', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const safeName = path.basename(fileName);
    const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
    const filePath = path.join(baseDir, safeName);
    if (!path.resolve(filePath).startsWith(path.resolve(baseDir) + path.sep)) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    res.download(filePath, fileName);
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// Legacy: حذف ملف (path-based)
router.delete(
  '/:fileType/:fileName',
  authenticate,
  requireBranchAccess,
  authorize(['admin', 'doctor', 'case_manager']),
  async (req, res) => {
    try {
      const { fileType, fileName } = req.params;
      const subDir = UPLOAD_DIRS[fileType] || 'other';
      const safeName = path.basename(fileName);
      const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
      const filePath = path.join(baseDir, safeName);
      if (!path.resolve(filePath).startsWith(path.resolve(baseDir) + path.sep)) {
        return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
      }

      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ success: false, message: 'الملف غير موجود' });
      }

      await fs.unlink(filePath);
      res.json({ success: true, message: 'تم حذف الملف بنجاح' });
    } catch (error) {
      safeError(res, error, 'medicalFiles');
    }
  }
);

// Legacy: معلومات ملف (path-based)
router.get('/info/:fileType/:fileName', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { fileType, fileName } = req.params;
    const subDir = UPLOAD_DIRS[fileType] || 'other';
    const safeName = path.basename(fileName);
    const baseDir = path.join(__dirname, '../uploads/medical-files', subDir);
    const filePath = path.join(baseDir, safeName);
    if (!path.resolve(filePath).startsWith(path.resolve(baseDir) + path.sep)) {
      return res.status(400).json({ success: false, message: 'اسم ملف غير صالح' });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' });
    }

    const stats = await fs.stat(filePath);
    const fileInfo = {
      fileName,
      fileType,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      path: filePath,
      url: `/uploads/medical-files/${subDir}/${fileName}`,
    };

    res.json({ success: true, data: fileInfo });
  } catch (error) {
    safeError(res, error, 'medicalFiles');
  }
});

// إحصائيات المساحة المستخدمة
router.get(
  '/storage/statistics',
  authenticate,
  requireBranchAccess,
  authorize(['admin']),
  async (req, res) => {
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
          stats[type] = { filesCount: 0, size: 0, sizeFormatted: '0 B' };
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
  }
);

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
