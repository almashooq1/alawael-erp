/**
 * Media Model — نموذج الوسائط
 *
 * Comprehensive media library supporting images, videos, audio,
 * documents, and other files with albums, tags, metadata, and analytics.
 */

const mongoose = require('mongoose');

// ─── Sub-Schemas ─────────────────────────────────────────────────────────────

const thumbnailSchema = new mongoose.Schema(
  {
    size: { type: String, enum: ['small', 'medium', 'large'], required: true },
    path: { type: String, required: true },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const activityEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'upload',
        'view',
        'download',
        'edit',
        'delete',
        'restore',
        'share',
        'move',
        'tag',
        'favorite',
      ],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    details: String,
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Main Schema ─────────────────────────────────────────────────────────────

const mediaSchema = new mongoose.Schema(
  {
    // ── File Info ──────────────────────────────────────────────────────────
    fileName: { type: String, required: [true, 'اسم الملف مطلوب'], trim: true },
    originalName: { type: String, required: true, trim: true },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, default: '' },

    // ── File Storage ──────────────────────────────────────────────────────
    filePath: { type: String, required: [true, 'مسار الملف مطلوب'] },
    url: { type: String, default: '' },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 0 },
    extension: { type: String, lowercase: true },

    // ── Media Type Classification ─────────────────────────────────────────
    mediaType: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
      required: true,
      index: true,
    },

    // ── Dimensions & Duration (for images/video/audio) ────────────────────
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    duration: { type: Number, default: null }, // seconds (video/audio)
    aspectRatio: { type: String, default: '' },

    // ── Thumbnails ────────────────────────────────────────────────────────
    thumbnails: [thumbnailSchema],

    // ── Organization ──────────────────────────────────────────────────────
    album: { type: mongoose.Schema.Types.ObjectId, ref: 'MediaAlbum', default: null },
    folder: { type: String, default: '/', trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    category: {
      type: String,
      enum: [
        'عام',
        'صور المؤسسة',
        'صور الفعاليات',
        'صور الموظفين',
        'فيديوهات تعليمية',
        'فيديوهات توعوية',
        'تسجيلات صوتية',
        'مستندات رسمية',
        'عروض تقديمية',
        'تصاميم',
        'شعارات',
        'أخرى',
      ],
      default: 'عام',
    },

    // ── Ownership & Access ────────────────────────────────────────────────
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visibility: {
      type: String,
      enum: ['public', 'private', 'restricted'],
      default: 'public',
    },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['نشط', 'مؤرشف', 'محذوف', 'قيد المراجعة'],
      default: 'نشط',
    },
    isFavorite: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },

    // ── Analytics ─────────────────────────────────────────────────────────
    viewCount: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },

    // ── Metadata ──────────────────────────────────────────────────────────
    metadata: {
      camera: String,
      location: String,
      takenAt: Date,
      codec: String,
      bitrate: Number,
      sampleRate: Number,
      colorSpace: String,
      dpi: Number,
    },

    // ── Relations ─────────────────────────────────────────────────────────
    linkedTo: {
      model: { type: String, default: null }, // e.g. 'User', 'Document', 'Report'
      itemId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    // ── Activity ──────────────────────────────────────────────────────────
    activityLog: [activityEntrySchema],
  },
  {
    timestamps: true,
    collection: 'media',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ mediaType: 1, status: 1 });
mediaSchema.index({ album: 1, createdAt: -1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ category: 1 });
mediaSchema.index({ title: 'text', description: 'text', tags: 'text', originalName: 'text' });
mediaSchema.index({ status: 1, visibility: 1, createdAt: -1 });

// ─── Virtuals ────────────────────────────────────────────────────────────────
mediaSchema.virtual('formattedSize').get(function () {
  const bytes = this.fileSize;
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
});

mediaSchema.virtual('isImage').get(function () {
  return this.mediaType === 'image';
});

mediaSchema.virtual('isVideo').get(function () {
  return this.mediaType === 'video';
});

// ─── Statics ─────────────────────────────────────────────────────────────────

mediaSchema.statics.getStorageStats = async function (userId) {
  const match = userId
    ? { uploadedBy: userId, status: { $ne: 'محذوف' } }
    : { status: { $ne: 'محذوف' } };
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$mediaType',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
      },
    },
  ]);
  const total = result.reduce(
    (s, r) => ({ count: s.count + r.count, size: s.size + r.totalSize }),
    { count: 0, size: 0 }
  );
  return { byType: result, total };
};

mediaSchema.statics.getRecentMedia = function (limit = 20) {
  return this.find({ status: 'نشط' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'name email avatar')
    .lean();
};

// ─── Pre-save ────────────────────────────────────────────────────────────────
mediaSchema.pre('save', async function () {
  // Set media type from mime if not set
  if (!this.mediaType && this.mimeType) {
    const mime = this.mimeType.toLowerCase();
    if (mime.startsWith('image/')) this.mediaType = 'image';
    else if (mime.startsWith('video/')) this.mediaType = 'video';
    else if (mime.startsWith('audio/')) this.mediaType = 'audio';
    else if (
      mime.includes('pdf') ||
      mime.includes('document') ||
      mime.includes('spreadsheet') ||
      mime.includes('presentation') ||
      mime.includes('text')
    )
      this.mediaType = 'document';
    else if (
      mime.includes('zip') ||
      mime.includes('rar') ||
      mime.includes('7z') ||
      mime.includes('tar') ||
      mime.includes('gzip')
    )
      this.mediaType = 'archive';
    else this.mediaType = 'other';
  }
  // Set extension from fileName
  if (!this.extension && this.fileName) {
    const parts = this.fileName.split('.');
    if (parts.length > 1) this.extension = parts.pop().toLowerCase();
  }
});

module.exports = mongoose.models.Media || mongoose.model('Media', mediaSchema);
