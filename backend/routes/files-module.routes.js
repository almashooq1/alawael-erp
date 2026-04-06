/**
 * Files Module Routes — مسارات وحدة إدارة الملفات والوثائق
 * prompt_08
 * Base: /api/files-module
 *
 * Endpoints:
 *   Folders: GET /folders | POST /folders | GET /folders/:id | PUT /folders/:id | DELETE /folders/:id | GET /folders/:id/contents
 *   Files:   GET /files | POST /files | GET /files/:id | PUT /files/:id | DELETE /files/:id
 *            GET /files/:id/download | POST /files/:id/new-version | POST /files/:id/archive
 *            GET /files/reference/:type/:id | GET /files/expiring
 */

const express = require('express');
const safeError = require('../utils/safeError');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const FileRecord = require('../models/documents/FileRecord');
const FileFolder = require('../models/documents/FileFolder');

router.use(authenticate);

// ══════════════════════════════════════════════════════════════
// FOLDERS — المجلدات
// ══════════════════════════════════════════════════════════════

// GET /folders — الجذور أو محتويات مجلد
router.get('/folders', async (req, res) => {
  try {
    const { parent_folder_id } = req.query;
    const filter = { deleted_at: null, is_active: true };
    if (parent_folder_id) filter.parent_folder_id = parent_folder_id;
    else filter.parent_folder_id = null; // المجلدات الجذرية

    const folders = await FileFolder.find(filter).sort({ name_ar: 1 });
    res.json({ success: true, data: folders });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /folders
router.post('/folders', async (req, res) => {
  try {
    const folder = await FileFolder.create({
      ...req.body,
      created_by: req.user._id,
      branch_id: req.user.branch_id,
    });
    res.status(201).json({ success: true, data: folder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /folders/:id
router.get('/folders/:id', async (req, res) => {
  try {
    const folder = await FileFolder.findOne({ _id: req.params.id, deleted_at: null }).populate(
      'parent_folder_id',
      'name_ar'
    );
    if (!folder) return res.status(404).json({ success: false, error: 'المجلد غير موجود' });
    res.json({ success: true, data: folder });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /folders/:id/contents — محتويات مجلد (ملفات + مجلدات فرعية)
router.get('/folders/:id/contents', async (req, res) => {
  try {
    const [subfolders, files] = await Promise.all([
      FileFolder.find({ parent_folder_id: req.params.id, deleted_at: null }).sort({ name_ar: 1 }),
      FileRecord.find({ deleted_at: null }).sort({ createdAt: -1 }),
    ]);
    res.json({ success: true, data: { subfolders, files } });
  } catch (err) {
    safeError(res, err);
  }
});

// PUT /folders/:id
router.put('/folders/:id', async (req, res) => {
  try {
    const folder = await FileFolder.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, is_system: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    );
    if (!folder) return res.status(404).json({ success: false, error: 'المجلد غير موجود أو محمي' });
    res.json({ success: true, data: folder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /folders/:id
router.delete('/folders/:id', async (req, res) => {
  try {
    const folder = await FileFolder.findOne({ _id: req.params.id, is_system: { $ne: true } });
    if (!folder) return res.status(404).json({ success: false, error: 'المجلد غير موجود أو محمي' });
    await FileFolder.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.json({ success: true, message: 'تم حذف المجلد' });
  } catch (err) {
    safeError(res, err);
  }
});

// ══════════════════════════════════════════════════════════════
// FILES — الملفات
// ══════════════════════════════════════════════════════════════

// GET /files
router.get('/files', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      category,
      reference_type,
      reference_id,
      is_archived,
      search,
    } = req.query;
    const filter = { deleted_at: null };
    if (category) filter.category = category;
    if (reference_type) filter.reference_type = reference_type;
    if (reference_id) filter.reference_id = reference_id;
    if (is_archived !== undefined) filter.is_archived = is_archived === 'true';
    if (search) filter.$text = { $search: search };

    const [files, total] = await Promise.all([
      FileRecord.find(filter)
        .populate('uploaded_by', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      FileRecord.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: files,
      pagination: { page: Number(page), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /files — رفع ملف جديد
router.post('/files', async (req, res) => {
  try {
    const file = await FileRecord.create({
      ...req.body,
      uploaded_by: req.user._id,
      created_by: req.user._id,
      branch_id: req.user.branch_id,
    });
    res.status(201).json({ success: true, data: file });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /files/expiring — الملفات قريبة الانتهاء
router.get('/files/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const expirySoon = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const files = await FileRecord.find({
      deleted_at: null,
      expiry_date: { $lte: expirySoon, $gte: new Date() },
    })
      .populate('uploaded_by', 'name')
      .sort({ expiry_date: 1 });
    res.json({ success: true, data: files, count: files.length });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /files/reference/:type/:id — ملفات كيان معين
router.get('/files/reference/:type/:id', async (req, res) => {
  try {
    const files = await FileRecord.find({
      deleted_at: null,
      reference_type: req.params.type,
      reference_id: req.params.id,
    })
      .populate('uploaded_by', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: files, count: files.length });
  } catch (err) {
    safeError(res, err);
  }
});

// GET /files/:id
router.get('/files/:id', async (req, res) => {
  try {
    const file = await FileRecord.findOne({ _id: req.params.id, deleted_at: null })
      .populate('uploaded_by', 'name')
      .populate('signed_by', 'name');
    if (!file) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    // تحديث إحصاءات الوصول
    await FileRecord.findByIdAndUpdate(req.params.id, {
      $inc: { view_count: 1 },
      last_accessed_at: new Date(),
      last_accessed_by: req.user._id,
    });
    res.json({ success: true, data: file });
  } catch (err) {
    safeError(res, err);
  }
});

// PUT /files/:id
router.put('/files/:id', async (req, res) => {
  try {
    const file = await FileRecord.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!file) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    res.json({ success: true, data: file });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /files/:id/download — تسجيل تحميل
router.get('/files/:id/download', async (req, res) => {
  try {
    const file = await FileRecord.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { $inc: { download_count: 1 }, last_accessed_at: new Date() },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, error: 'الملف غير موجود' });
    // في الإنتاج: يُعيد مسار الملف أو رابط مؤقت
    res.json({ success: true, data: { file_path: file.file_path, file_name: file.original_name } });
  } catch (err) {
    safeError(res, err);
  }
});

// POST /files/:id/new-version — إضافة إصدار جديد
router.post('/files/:id/new-version', async (req, res) => {
  try {
    const file = await FileRecord.findOne({ _id: req.params.id, deleted_at: null });
    if (!file) return res.status(404).json({ success: false, error: 'الملف غير موجود' });

    // حفظ الإصدار القديم في التاريخ
    file.version_history.push({
      version: file.version,
      file_path: file.file_path,
      file_size: file.file_size,
      uploaded_by: req.user._id,
      uploaded_at: new Date(),
      change_notes: req.body.change_notes,
    });

    file.version += 1;
    file.file_path = req.body.file_path;
    file.file_size = req.body.file_size;
    file.original_name = req.body.original_name || file.original_name;
    await file.save();

    res.json({ success: true, data: file, message: `تم رفع الإصدار ${file.version}` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /files/:id/archive — أرشفة ملف
router.post('/files/:id/archive', async (req, res) => {
  try {
    const file = await FileRecord.findByIdAndUpdate(
      req.params.id,
      { is_archived: true, archived_at: new Date(), archived_by: req.user._id },
      { new: true }
    );
    res.json({ success: true, data: file, message: 'تم أرشفة الملف' });
  } catch (err) {
    safeError(res, err);
  }
});

// DELETE /files/:id
router.delete('/files/:id', async (req, res) => {
  try {
    await FileRecord.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });
    res.json({ success: true, message: 'تم حذف الملف' });
  } catch (err) {
    safeError(res, err);
  }
});

module.exports = router;
