/**
 * Volunteer Model — System 41
 * نموذج المتطوعين - نظام إدارة المتطوعين
 */
const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema(
  {
    uuid: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // البيانات الشخصية
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, required: true, trim: true, maxlength: 100 },
    nationalId: { type: String, unique: true, sparse: true, maxlength: 20 },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, maxlength: 20 },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female'], required: true },
    nationality: { type: String, default: 'SA' },
    address: { type: String },
    city: { type: String },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String, maxlength: 20 },

    // الحالة والتصنيف
    status: {
      type: String,
      enum: ['pending', 'screening', 'active', 'inactive', 'suspended', 'rejected'],
      default: 'pending',
    },
    category: {
      type: String,
      enum: ['youth', 'student', 'senior', 'corporate', 'professional', 'family'],
      default: null,
    },
    activeSince: { type: Date },
    inactiveSince: { type: Date },
    bio: { type: String },
    photo: { type: String },
    interests: [{ type: String }],
    languages: [{ type: String }],

    // التوافر
    availableDays: [
      {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      },
    ],
    availableTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'flexible'],
      default: 'flexible',
    },
    hoursPerWeek: { type: Number, default: 0, min: 0, max: 168 },

    // المؤهلات
    educationLevel: { type: String },
    occupation: { type: String },
    skills: [{ type: String }],
    certifications: [{ type: String }],

    // منصة منصتي الوطنية
    mntasatiId: { type: String, unique: true, sparse: true },
    mntasatiProfileUrl: { type: String },
    mntasatiSyncedAt: { type: Date },

    // الإحصائيات
    totalHours: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksCancelled: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: null },
    points: { type: Number, default: 0 },

    // التحقق والملاحظات
    screeningNotes: { type: String },
    adminNotes: { type: String },
    referralSource: { type: String },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // التتبع
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// الفهارس
volunteerSchema.index({ branchId: 1, status: 1 });
volunteerSchema.index({ nationalId: 1 });
volunteerSchema.index({ email: 1 });
volunteerSchema.index({ mntasatiId: 1 });
volunteerSchema.index({ deletedAt: 1 });

// الخاصية الافتراضية: الاسم الكامل
volunteerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Soft delete
volunteerSchema.pre(/^find/, function () {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

module.exports = mongoose.model('Volunteer', volunteerSchema);
