/**
 * Driver Model - نموذج السائق
 *
 * إدارة بيانات السائقين والترخيص والنقاط
 * ✅ Driver Management
 * ✅ License Management
 * ✅ Violation Tracking
 * ✅ Performance Metrics
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DriverSchema = new Schema(
  {
    // بيانات شخصية
    personalInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      nationalId: { type: String, unique: true, required: true },
      dateOfBirth: Date,
      nationality: String,
      gender: {
        type: String,
        enum: ['ذكر', 'أنثى'],
      },
      phone: { type: String, required: true },
      email: String,
      address: String,
    },

    // بيانات الترخيص
    license: {
      licenseNumber: { type: String, unique: true, required: true },
      licenseClass: {
        type: String,
        enum: ['خصوصي', 'ركوب', 'نقل', 'حافلة', 'هندسية'],
        required: true,
      },
      issueDate: { type: Date, required: true },
      expiryDate: { type: Date, required: true },
      issueOffice: String,
      status: {
        type: String,
        enum: ['نشطة', 'معلقة', 'ملغاة', 'منتهية'],
        default: 'نشطة',
      },
      categories: [String], // فئات إضافية
      restrictions: [String], // قيود
      endorsements: [String], // مميزات
    },

    // نقاط المخالفات
    violationPoints: {
      currentPoints: { type: Number, default: 0 },
      maxPoints: { type: Number, default: 24 },
      lastViolationDate: Date,
      status: {
        type: String,
        enum: ['آمن', 'تحذير', 'خطر', 'ممنوع'],
        default: 'آمن',
      },
      resetDate: Date,
    },

    // سجل المخالفات
    violations: [
      {
        date: Date,
        type: String,
        description: String,
        location: String,
        fine: Number,
        points: Number,
        status: {
          type: String,
          enum: ['مسجلة', 'مدفوعة', 'مطعون بها'],
        },
        evidence: String,
      },
    ],

    // الحوادث
    accidents: [
      {
        date: Date,
        location: String,
        description: String,
        severity: {
          type: String,
          enum: ['بسيطة', 'متوسطة', 'خطيرة'],
        },
        injuries: Number,
        vehicles: [String],
        reportNumber: String,
      },
    ],

    // التدريب والشهادات
    training: {
      defensiveDriving: {
        completed: { type: Boolean, default: false },
        certificateDate: Date,
        expiryDate: Date,
      },
      safetyTraining: {
        completed: { type: Boolean, default: false },
        certificateDate: Date,
      },
      firstAid: {
        completed: { type: Boolean, default: false },
        certificateDate: Date,
        expiryDate: Date,
      },
      otherCertificates: [
        {
          name: String,
          issueDate: Date,
          expiryDate: Date,
        },
      ],
    },

    // تقييم الأداء
    performance: {
      rating: { type: Number, min: 0, max: 5, default: 3 },
      totalTrips: { type: Number, default: 0 },
      onTimePercentage: { type: Number, default: 100 },
      safetyScore: { type: Number, default: 100 },
      customerRating: { type: Number, min: 0, max: 5, default: 3 },
      reviews: [
        {
          date: Date,
          reviewer: String,
          rating: Number,
          comment: String,
        },
      ],
    },

    // تاريخ التوظيف
    employment: {
      hireDate: Date,
      employer: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
      },
      position: String,
      status: {
        type: String,
        enum: ['نشط', 'عطلة', 'إجازة', 'مُسرح'],
        default: 'نشط',
      },
      salary: Number,
      department: String,
    },

    // المركبات المسندة
    assignedVehicles: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],
    currentVehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },

    // الوثائق والملفات
    documents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],

    // النشاط والسجلات
    activityLog: [
      {
        date: Date,
        activity: String,
        details: String,
      },
    ],

    // الصورة الشخصية
    profileImage: String,

    // ملاحظات
    notes: String,
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// الفهارس (nationalId and licenseNumber already have unique:true index)
DriverSchema.index({ 'license.expiryDate': 1 });
DriverSchema.index({ 'employment.status': 1 });
DriverSchema.index({ isActive: 1 });

// الدوال المساعدة
DriverSchema.methods.addViolation = function (violation) {
  this.violations.push(violation);
  this.violationPoints.currentPoints += violation.points || 0;
  this.violationPoints.lastViolationDate = new Date();

  // تحديث حالة النقاط
  if (this.violationPoints.currentPoints >= 24) {
    this.violationPoints.status = 'ممنوع';
  } else if (this.violationPoints.currentPoints >= 18) {
    this.violationPoints.status = 'خطر';
  } else if (this.violationPoints.currentPoints >= 12) {
    this.violationPoints.status = 'تحذير';
  } else {
    this.violationPoints.status = 'آمن';
  }

  return this.save();
};

DriverSchema.methods.recordAccident = function (accident) {
  this.accidents.push(accident);
  return this.save();
};

DriverSchema.methods.getLicenseStatus = function () {
  const now = new Date();
  if (this.license.status !== 'نشطة') {
    return 'غير نشطة';
  }
  if (now > this.license.expiryDate) {
    return 'منتهية الصلاحية';
  }
  const daysLeft = Math.floor((this.license.expiryDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 60) {
    return 'قريبة الانتهاء';
  }
  return 'صحيحة';
};

module.exports = mongoose.model('Driver', DriverSchema);
