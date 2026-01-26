/**
 * Document Routes
 * مسارات إدارة المستندات
 */

const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  downloadDocument,
  shareDocument,
  revokeAccess,
  deleteDocument,
  restoreDocument,
  getDocumentStats,
  searchDocuments,
  getFolders,
} = require('../controllers/documentController');
const { upload, handleUploadError } = require('../middleware/uploadMiddleware');

// 📤 تحميل مستند
router.post('/upload', upload, handleUploadError, uploadDocument);

// 📋 الحصول على جميع المستندات
router.get('/', getAllDocuments);

// 📁 الحصول على المجلدات
router.get('/folders', getFolders);

// 📊 الحصول على الإحصائيات
router.get('/stats', getDocumentStats);

// 🔍 البحث المتقدم
router.get('/search', searchDocuments);

// 📄 الحصول على مستند واحد
router.get('/:id', getDocumentById);

// ✏️ تحديث المستند
router.put('/:id', updateDocument);

// 📥 تنزيل المستند
router.get('/:id/download', downloadDocument);

// 🔗 مشاركة المستند
router.post('/:id/share', shareDocument);

// 🚫 إزالة الوصول
router.delete('/:id/share/:shareId', revokeAccess);

// 🗑️ حذف المستند
router.delete('/:id', deleteDocument);

// ♻️ استرجاع المستند
router.post('/:id/restore', restoreDocument);

module.exports = router;

