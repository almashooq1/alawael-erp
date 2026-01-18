/**
 * Branch Model - نموذج الفروع
 * إدارة معلومات الفروع المختلفة
 */

const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    // معلومات الفرع الأساسية
    name: {
      type: String,
      required: [true, 'اسم الفرع مطلوب'],
      trim: true,
      maxlength: [100, 'اسم الفرع يجب ألا يتجاوز 100 حرف'],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },

    // الموقع
    location: {
      address: String,
      city: String,
      region: String,
      country: { type: String, default: 'Saudi Arabia' },
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },

    // معلومات الاتصال
    contact: {
      phone: String,
      email: String,
      manager: String,
      managerPhone: String,
    },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },

    // الإعدادات
    settings: {
      recordingStorageLimit: {
        type: Number, // بـ GB
        default: 500,
      },
      retentionDays: {
        type: Number, // عدد أيام الحفظ
        default: 30,
      },
      timezone: {
        type: String,
        default: 'Asia/Riyadh',
      },
      motionDetectionEnabled: {
        type: Boolean,
        default: true,
      },
    },

    // إحصائيات
    statistics: {
      totalCameras: {
        type: Number,
        default: 0,
      },
      activeCameras: {
        type: Number,
        default: 0,
      },
      recordingSpace: {
        used: { type: Number, default: 0 }, // بـ GB
        available: { type: Number, default: 500 },
      },
      lastUpdate: Date,
    },

    // الملفات والوثائق
    images: {
      logo: String,
      thumbnail: String,
    },

    // الأذونات والمستخدمون
    assignedUsers: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        role: {
          type: String,
          enum: ['admin', 'supervisor', 'viewer'],
          default: 'viewer',
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    // التدقيق
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId,
    deletedAt: Date,
  },
  {
    timestamps: true,
    collection: 'branches',
  },
);

// الفهارس
branchSchema.index({ code: 1 });
branchSchema.index({ status: 1 });
branchSchema.index({ 'location.city': 1 });
branchSchema.index({ createdAt: -1 });

// الوسائط (Middleware)
branchSchema.pre('save', function (next) {
  if (!this.code && this.name) {
    this.code = this.name.substring(0, 3).toUpperCase();
  }
  next();
});

// الطرق المخصصة
branchSchema.methods.toJSON = function () {
  const { __v, deletedAt, ...branch } = this.toObject();
  return branch;
};

branchSchema.methods.updateStatistics = async function () {
  const Camera = require('./Camera');
  const cameras = await Camera.find({ branchId: this._id });
  this.statistics.totalCameras = cameras.length;
  this.statistics.activeCameras = cameras.filter(c => c.status === 'online').length;
  this.statistics.lastUpdate = new Date();
  return this.save();
};

branchSchema.methods.addUser = function (userId, role = 'viewer') {
  const exists = this.assignedUsers.some(u => u.userId.toString() === userId.toString());
  if (!exists) {
    this.assignedUsers.push({ userId, role });
  }
  return this.save();
};

branchSchema.methods.removeUser = function (userId) {
  this.assignedUsers = this.assignedUsers.filter(u => u.userId.toString() !== userId.toString());
  return this.save();
};

// الاستعلامات الثابتة
branchSchema.statics.findActive = function () {
  return this.find({ status: 'active', deletedAt: null });
};

branchSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase(), deletedAt: null });
};

module.exports = mongoose.model('Branch', branchSchema);
