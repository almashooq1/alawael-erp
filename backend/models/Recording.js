/**
 * Recording Model - نموذج التسجيلات
 * إدارة ملفات الفيديو المسجلة
 */

const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema(
  {
    // المعرفات
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camera',
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },

    // معلومات الملف
    filename: {
      type: String,
      required: true,
    },
    originalName: String,
    size: {
      type: Number, // بـ بايت
      required: true,
    },
    duration: {
      type: Number, // بـ ثانية
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'video/mp4',
    },

    // مسار التخزين
    storage: {
      type: {
        type: String,
        enum: ['local', 'aws-s3', 'google-cloud', 'azure'],
        required: true,
      },
      bucket: String,
      key: String, // مسار الملف في السحابة
      url: String, // رابط الوصول
      localPath: String, // المسار المحلي
      uploadedAt: Date,
      uploadStatus: {
        type: String,
        enum: ['pending', 'uploading', 'completed', 'failed'],
        default: 'pending',
      },
    },

    // معلومات الفيديو
    video: {
      resolution: String, // 1920x1080
      frameRate: Number,
      bitrate: Number,
      codec: String, // h264, h265
      startTime: {
        type: Date,
        required: true,
      },
      endTime: {
        type: Date,
        required: true,
      },
    },

    // الأحداث والعلامات
    events: [
      {
        type: {
          type: String,
          enum: ['motion', 'error', 'manual', 'scheduled'],
        },
        timestamp: Date,
        description: String,
      },
    ],

    // معلومات المعالجة
    processing: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      thumbnailGenerated: {
        type: Boolean,
        default: false,
      },
      thumbnailUrl: String,
      indexGenerated: {
        type: Boolean,
        default: false,
      },
      transcoded: {
        type: Boolean,
        default: false,
      },
      errorMessage: String,
      processedAt: Date,
    },

    // معلومات الوصول والمراقبة
    access: {
      viewedBy: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          viewedAt: Date,
          duration: Number, // مدة المشاهدة بـ ثانية
        },
      ],
      downloadedBy: [
        {
          userId: mongoose.Schema.Types.ObjectId,
          downloadedAt: Date,
        },
      ],
      publiclyAccessible: {
        type: Boolean,
        default: false,
      },
      publicToken: String,
      expiresAt: Date,
    },

    // الحفظ والاحتفاظ
    retention: {
      policy: {
        type: String,
        enum: ['permanent', 'auto-delete', 'archive'],
        default: 'auto-delete',
      },
      deleteAfterDays: {
        type: Number,
        default: 30,
      },
      archived: {
        type: Boolean,
        default: false,
      },
      archivedAt: Date,
      scheduleDeleteAt: Date,
    },

    // البيانات الوصفية المخصصة
    metadata: {
      cameraName: String,
      branchName: String,
      tags: [String],
      notes: String,
      customFields: mongoose.Schema.Types.Mixed,
    },

    // الإحصائيات
    statistics: {
      views: {
        type: Number,
        default: 0,
      },
      downloads: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
      flaggedTimes: {
        type: Number,
        default: 0,
      },
    },

    // التدقيق
    createdBy: mongoose.Schema.Types.ObjectId,
    deletedBy: mongoose.Schema.Types.ObjectId,
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'recordings',
  },
);

// الفهارس
recordingSchema.index({ cameraId: 1, createdAt: -1 });
recordingSchema.index({ branchId: 1, createdAt: -1 });
recordingSchema.index({ 'video.startTime': 1, 'video.endTime': 1 });
recordingSchema.index({ 'storage.uploadStatus': 1 });
recordingSchema.index({ 'processing.status': 1 });
recordingSchema.index({ 'retention.scheduleDeleteAt': 1 });
recordingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // TTL index - 30 يوم

// الطرق المخصصة
recordingSchema.methods.toJSON = function () {
  const { __v, ...recording } = this.toObject();
  return recording;
};

recordingSchema.methods.recordView = function (userId) {
  const existingView = this.access.viewedBy.find(v => v.userId.toString() === userId.toString());
  if (existingView) {
    existingView.viewedAt = new Date();
  } else {
    this.access.viewedBy.push({ userId, viewedAt: new Date() });
  }
  this.statistics.views = this.access.viewedBy.length;
  return this.save();
};

recordingSchema.methods.recordDownload = function (userId) {
  this.access.downloadedBy.push({ userId, downloadedAt: new Date() });
  this.statistics.downloads = this.access.downloadedBy.length;
  return this.save();
};

recordingSchema.methods.makePublic = function (expiresInDays = 7) {
  this.access.publiclyAccessible = true;
  this.access.publicToken = require('crypto').randomBytes(32).toString('hex');
  this.access.expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return this.save();
};

recordingSchema.methods.makePrivate = function () {
  this.access.publiclyAccessible = false;
  this.access.publicToken = null;
  this.access.expiresAt = null;
  return this.save();
};

recordingSchema.methods.scheduleDelete = function (daysFromNow = 7) {
  this.retention.policy = 'auto-delete';
  this.retention.deleteAfterDays = daysFromNow;
  this.retention.scheduleDeleteAt = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return this.save();
};

recordingSchema.methods.archive = function () {
  this.retention.policy = 'archive';
  this.retention.archived = true;
  this.retention.archivedAt = new Date();
  return this.save();
};

recordingSchema.methods.getDuration = function () {
  if (this.video.startTime && this.video.endTime) {
    return Math.floor((this.video.endTime - this.video.startTime) / 1000); // بـ ثانية
  }
  return this.duration;
};

recordingSchema.methods.getFileSize = function (unit = 'MB') {
  const bytes = this.size;
  const divisor = unit === 'GB' ? 1024 * 1024 * 1024 : unit === 'MB' ? 1024 * 1024 : 1024;
  return (bytes / divisor).toFixed(2);
};

// الاستعلامات الثابتة
recordingSchema.statics.findByCamera = function (cameraId, limit = 100) {
  return this.find({ cameraId, deletedAt: null }).sort({ 'video.startTime': -1 }).limit(limit);
};

recordingSchema.statics.findByTimeRange = function (cameraId, startTime, endTime) {
  return this.find({
    cameraId,
    deletedAt: null,
    'video.startTime': { $gte: startTime },
    'video.endTime': { $lte: endTime },
  });
};

recordingSchema.statics.findPendingUploads = function () {
  return this.find({
    'storage.uploadStatus': 'pending',
    deletedAt: null,
  });
};

recordingSchema.statics.findScheduledForDeletion = function () {
  return this.find({
    'retention.scheduleDeleteAt': { $lte: new Date() },
    deletedAt: null,
  });
};

recordingSchema.statics.findByBranch = function (branchId, limit = 500) {
  return this.find({ branchId, deletedAt: null }).sort({ 'video.startTime': -1 }).limit(limit);
};

module.exports = mongoose.model('Recording', recordingSchema);
