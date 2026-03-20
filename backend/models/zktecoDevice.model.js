/**
 * ZKTeco Device Model - نموذج أجهزة ZKTeco للحضور والانصراف
 * إدارة أجهزة البصمة والتعريف البيومتري
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ─── سجل المزامنة (Sync Log) ────────────────────────────────────────────────
const syncLogSchema = new Schema(
  {
    syncType: {
      type: String,
      enum: ['manual', 'auto', 'scheduled'],
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      required: true,
    },
    recordsFetched: { type: Number, default: 0 },
    recordsSynced: { type: Number, default: 0 },
    recordsSkipped: { type: Number, default: 0 },
    recordsFailed: { type: Number, default: 0 },
    errorMessage: String,
    startedAt: { type: Date, required: true },
    completedAt: Date,
    duration: Number, // milliseconds
    triggeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { _id: true }
);

// ─── مستخدم الجهاز (Device User Mapping) ────────────────────────────────────
const deviceUserSchema = new Schema(
  {
    zktecoUserId: {
      type: Number,
      required: [true, 'معرف المستخدم في الجهاز مطلوب'],
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    employeeName: String,
    employeeNumber: String,
    fingerprintCount: { type: Number, default: 0 },
    faceRegistered: { type: Boolean, default: false },
    cardNumber: String,
    enrolledAt: Date,
    lastVerification: Date,
  },
  { _id: true }
);

// ─── نموذج الجهاز الرئيسي (Main Device Schema) ─────────────────────────────
const zktecoDeviceSchema = new Schema(
  {
    // معلومات الجهاز الأساسية
    deviceName: {
      type: String,
      required: [true, 'اسم الجهاز مطلوب'],
      trim: true,
    },

    serialNumber: {
      type: String,
      trim: true,
      sparse: true,
    },

    model: {
      type: String,
      trim: true,
      default: 'ZKTeco',
    },

    // إعدادات الشبكة
    ipAddress: {
      type: String,
      required: [true, 'عنوان IP مطلوب'],
      match: [/^(\d{1,3}\.){3}\d{1,3}$/, 'عنوان IP غير صالح'],
    },

    port: {
      type: Number,
      default: 4370,
      min: [1, 'رقم المنفذ غير صالح'],
      max: [65535, 'رقم المنفذ غير صالح'],
    },

    connectionTimeout: {
      type: Number,
      default: 5000, // ms
    },

    // الموقع والفرع
    location: {
      branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
      },
      branchName: String,
      floor: String,
      area: String,
      description: String,
    },

    // حالة الجهاز
    status: {
      type: String,
      enum: ['online', 'offline', 'error', 'maintenance', 'disabled'],
      default: 'offline',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // معلومات الاتصال
    lastConnected: Date,
    lastDisconnected: Date,
    connectionErrors: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },

    // معلومات الجهاز (يتم جلبها من الجهاز)
    deviceInfo: {
      firmwareVersion: String,
      platformVersion: String,
      macAddress: String,
      deviceType: String,
      userCapacity: Number,
      fingerCapacity: Number,
      faceCapacity: Number,
      logCapacity: Number,
      currentUsers: Number,
      currentFingerprints: Number,
      currentFaces: Number,
      currentLogs: Number,
    },

    // إعدادات المزامنة
    syncSettings: {
      autoSync: {
        type: Boolean,
        default: false,
      },
      syncInterval: {
        type: Number,
        default: 15, // minutes
        min: 1,
        max: 1440,
      },
      lastSync: Date,
      nextSync: Date,
      syncOnConnect: {
        type: Boolean,
        default: true,
      },
      clearLogsAfterSync: {
        type: Boolean,
        default: false,
      },
    },

    // سجلات المزامنة
    syncLogs: [syncLogSchema],

    // خريطة المستخدمين (ربط مستخدمي الجهاز بالموظفين)
    userMappings: [deviceUserSchema],

    // إعدادات نوع التحقق
    verificationModes: {
      fingerprint: { type: Boolean, default: true },
      face: { type: Boolean, default: false },
      card: { type: Boolean, default: false },
      password: { type: Boolean, default: false },
    },

    // ملاحظات
    notes: String,

    // من أضاف الجهاز
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'zkteco_devices',
  }
);

// ─── الفهارس ─────────────────────────────────────────────────────────────────
zktecoDeviceSchema.index({ ipAddress: 1, port: 1 }, { unique: true });
// serialNumber already has sparse:true on the field → implicit sparse index
zktecoDeviceSchema.index({ status: 1, isActive: 1 });
zktecoDeviceSchema.index({ 'location.branch': 1 });
zktecoDeviceSchema.index({ 'syncSettings.autoSync': 1, 'syncSettings.nextSync': 1 });

// ─── الأساليب الثابتة (Static Methods) ───────────────────────────────────────

/**
 * الحصول على جميع الأجهزة النشطة
 */
zktecoDeviceSchema.statics.getActiveDevices = function () {
  return this.find({ isActive: true }).sort({ deviceName: 1 });
};

/**
 * الحصول على الأجهزة التي تحتاج مزامنة
 */
zktecoDeviceSchema.statics.getDevicesDueForSync = function () {
  return this.find({
    isActive: true,
    'syncSettings.autoSync': true,
    'syncSettings.nextSync': { $lte: new Date() },
  });
};

/**
 * البحث عن جهاز بعنوان IP
 */
zktecoDeviceSchema.statics.findByIP = function (ip, port = 4370) {
  return this.findOne({ ipAddress: ip, port });
};

// ─── أساليب النسخة (Instance Methods) ────────────────────────────────────────

/**
 * تسجيل نجاح الاتصال
 */
zktecoDeviceSchema.methods.markOnline = function () {
  this.status = 'online';
  this.lastConnected = new Date();
  this.consecutiveFailures = 0;
  return this.save();
};

/**
 * تسجيل فشل الاتصال
 */
zktecoDeviceSchema.methods.markOffline = function (error) {
  this.status = 'offline';
  this.lastDisconnected = new Date();
  this.connectionErrors += 1;
  this.consecutiveFailures += 1;
  if (error) {
    this.notes = `آخر خطأ: ${error.message || error} - ${new Date().toISOString()}`;
  }
  return this.save();
};

/**
 * إضافة سجل مزامنة
 */
zktecoDeviceSchema.methods.addSyncLog = function (logData) {
  this.syncLogs.unshift(logData);
  // الاحتفاظ بآخر 100 سجل فقط
  if (this.syncLogs.length > 100) {
    this.syncLogs = this.syncLogs.slice(0, 100);
  }
  this.syncSettings.lastSync = logData.completedAt || new Date();
  if (this.syncSettings.autoSync) {
    const nextSync = new Date();
    nextSync.setMinutes(nextSync.getMinutes() + this.syncSettings.syncInterval);
    this.syncSettings.nextSync = nextSync;
  }
  return this.save();
};

/**
 * تحديث ربط المستخدمين
 */
zktecoDeviceSchema.methods.updateUserMapping = function (zktecoUserId, employeeData) {
  const existing = this.userMappings.find(m => m.zktecoUserId === zktecoUserId);
  if (existing) {
    Object.assign(existing, employeeData);
  } else {
    this.userMappings.push({ zktecoUserId, ...employeeData, enrolledAt: new Date() });
  }
  return this.save();
};

// ─── Virtual ─────────────────────────────────────────────────────────────────
zktecoDeviceSchema.virtual('isOnline').get(function () {
  return this.status === 'online';
});

zktecoDeviceSchema.virtual('connectionString').get(function () {
  return `${this.ipAddress}:${this.port}`;
});

zktecoDeviceSchema.set('toJSON', { virtuals: true });
zktecoDeviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ZKTecoDevice', zktecoDeviceSchema);
