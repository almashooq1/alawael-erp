/**
 * Camera Model - نموذج الكاميرات
 * إدارة كاميرات Hikvision والبث والتسجيل
 */

const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema(
  {
    // معلومات الكاميرا الأساسية
    name: {
      type: String,
      required: [true, 'اسم الكاميرا مطلوب'],
      trim: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: [true, 'معرف الفرع مطلوب'],
    },
    location: {
      type: String,
      description: {
        type: String, // مثل: "مدخل الفرع"، "غرفة الخزينة"
      },
    },

    // بيانات Hikvision
    hikvision: {
      ipAddress: {
        type: String,
        required: true,
        unique: true,
      },
      port: {
        type: Number,
        default: 8000,
      },
      username: {
        type: String,
        required: true,
      },
      password: {
        type: String,
        required: true,
        // يجب تشفير كلمة المرور قبل الحفظ
      },
      deviceId: String, // معرف الجهاز من Hikvision
      serialNumber: String,
      model: String,
      cameraIndex: {
        type: Number,
        default: 1,
      },
      // بروتوكول البث
      streamingProtocol: {
        type: String,
        enum: ['rtsp', 'http', 'wss'],
        default: 'rtsp',
      },
      // جودة الفيديو
      resolution: {
        type: String,
        enum: ['480p', '720p', '1080p', '2K', '4K'],
        default: '1080p',
      },
      frameRate: {
        type: Number,
        default: 25, // إطار في الثانية
      },
      bitrate: {
        type: Number,
        default: 2048, // كيلوبت في الثانية
      },
    },

    // الحالة
    status: {
      type: String,
      enum: ['online', 'offline', 'error', 'maintenance'],
      default: 'offline',
    },
    lastOnline: Date,
    lastConnectionError: String,

    // إعدادات التسجيل
    recording: {
      enabled: {
        type: Boolean,
        default: true,
      },
      schedule: {
        // جدول التسجيل (من-إلى)
        monday: { from: '00:00', to: '23:59' },
        tuesday: { from: '00:00', to: '23:59' },
        wednesday: { from: '00:00', to: '23:59' },
        thursday: { from: '00:00', to: '23:59' },
        friday: { from: '00:00', to: '23:59' },
        saturday: { from: '00:00', to: '23:59' },
        sunday: { from: '00:00', to: '23:59' },
      },
      quality: {
        type: String,
        enum: ['low', 'medium', 'high', 'ultra'],
        default: 'high',
      },
    },

    // الكشف عن الحركة
    motionDetection: {
      enabled: {
        type: Boolean,
        default: true,
      },
      sensitivity: {
        type: Number,
        min: 1,
        max: 100,
        default: 50,
      },
      area: {
        // مناطق الكشف
        enabled: { type: Boolean, default: false },
        zones: [
          {
            name: String,
            coordinates: [[Number]], // [x, y] مصفوفة الإحداثيات
          },
        ],
      },
      alertEnabled: {
        type: Boolean,
        default: true,
      },
    },

    // إعدادات الصوت
    audio: {
      enabled: {
        type: Boolean,
        default: false,
      },
      volume: {
        type: Number,
        min: 0,
        max: 100,
        default: 50,
      },
    },

    // إعدادات المراقبة
    monitoring: {
      liveStream: {
        enabled: { type: Boolean, default: true },
        maxConnections: { type: Number, default: 50 },
      },
      playback: {
        enabled: { type: Boolean, default: true },
      },
      events: {
        trackMotion: { type: Boolean, default: true },
        trackConnection: { type: Boolean, default: true },
        trackErrors: { type: Boolean, default: true },
      },
    },

    // السحابة والنسخ الاحتياطي
    cloudSettings: {
      uploadEnabled: {
        type: Boolean,
        default: true,
      },
      uploadSchedule: {
        type: String,
        enum: ['continuous', 'hourly', 'daily', 'on-motion'],
        default: 'continuous',
      },
      cloudProvider: {
        type: String,
        enum: ['aws-s3', 'google-cloud', 'azure', 'local'],
        default: 'aws-s3',
      },
      bucketName: String,
      uploadedBytes: {
        type: Number,
        default: 0,
      },
      lastUpload: Date,
    },

    // الإحصائيات
    statistics: {
      totalRecordingHours: {
        type: Number,
        default: 0,
      },
      totalUploadedGb: {
        type: Number,
        default: 0,
      },
      connectionAttempts: {
        type: Number,
        default: 0,
      },
      failedAttempts: {
        type: Number,
        default: 0,
      },
      uptime: {
        type: Number,
        default: 100, // نسبة التشغيل %
      },
      motionEvents: {
        type: Number,
        default: 0,
      },
      lastMotionDetected: Date,
    },

    // التكوين المتقدم
    advanced: {
      rtspUrl: String, // رابط البث المباشر
      httpUrl: String,
      wssUrl: String,
      autoReconnect: {
        type: Boolean,
        default: true,
      },
      reconnectInterval: {
        type: Number,
        default: 30000, // ميلي ثانية
      },
      timeout: {
        type: Number,
        default: 10000,
      },
    },

    // الأذونات
    sharedWith: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        permission: {
          type: String,
          enum: ['view', 'download', 'edit', 'delete'],
          default: 'view',
        },
      },
    ],

    // العلامات والتصنيفات
    tags: [String],
    notes: String,

    // التدقيق
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId,
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'cameras',
  },
);

// الفهارس
cameraSchema.index({ branchId: 1 });
cameraSchema.index({ 'hikvision.ipAddress': 1 });
cameraSchema.index({ status: 1 });
cameraSchema.index({ createdAt: -1 });
cameraSchema.index({ 'statistics.motionEvents': -1 });

// الطرق المخصصة
cameraSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.hikvision.password; // إخفاء كلمة المرور
  delete obj.__v;
  return obj;
};

cameraSchema.methods.getStreamUrl = function () {
  const { ipAddress, port, username, password, cameraIndex } = this.hikvision;
  return `rtsp://${username}:${password}@${ipAddress}:${port}/Streaming/Channels/${cameraIndex}/`;
};

cameraSchema.methods.updateStatus = function (status, errorMessage = null) {
  this.status = status;
  if (status === 'online') {
    this.lastOnline = new Date();
    this.lastConnectionError = null;
  } else if (status === 'error' && errorMessage) {
    this.lastConnectionError = errorMessage;
  }
  return this.save();
};

cameraSchema.methods.incrementMotionEvent = function () {
  this.statistics.motionEvents += 1;
  this.statistics.lastMotionDetected = new Date();
  return this.save();
};

cameraSchema.methods.recordUpload = function (bytes) {
  this.cloudSettings.lastUpload = new Date();
  this.cloudSettings.uploadedBytes += bytes;
  this.statistics.totalUploadedGb = (this.cloudSettings.uploadedBytes / (1024 * 1024 * 1024)).toFixed(2);
  return this.save();
};

cameraSchema.methods.shareWith = function (userId, permission = 'view') {
  const exists = this.sharedWith.some(s => s.userId.toString() === userId.toString());
  if (!exists) {
    this.sharedWith.push({ userId, permission });
  }
  return this.save();
};

// الاستعلامات الثابتة
cameraSchema.statics.findByBranch = function (branchId) {
  return this.find({ branchId, deletedAt: null });
};

cameraSchema.statics.findOnline = function () {
  return this.find({ status: 'online', deletedAt: null });
};

cameraSchema.statics.findByIp = function (ipAddress) {
  return this.findOne({ 'hikvision.ipAddress': ipAddress, deletedAt: null });
};

module.exports = mongoose.model('Camera', cameraSchema);
