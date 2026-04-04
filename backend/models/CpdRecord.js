/**
 * CpdRecord Model — نموذج سجلات التطوير المهني المستمر CPD
 * البرومبت 33: نظام التعلم الإلكتروني والتدريب
 */
const mongoose = require('mongoose');

const cpdRecordSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: {
      type: String,
      enum: ['course', 'workshop', 'conference', 'publication', 'training'],
      required: true,
    },
    title: { type: String, required: true, maxlength: 255 },
    provider: { type: String, maxlength: 255 },
    activityDate: { type: Date, required: true },
    cpdHours: { type: Number, required: true, min: 0 },
    certificateNumber: { type: String, maxlength: 100 },
    certificatePath: { type: String },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    notes: { type: String },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseEnrollment' },
    year: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

cpdRecordSchema.index({ branchId: 1, userId: 1, year: 1, status: 1 });
cpdRecordSchema.index({ activityDate: -1 });

cpdRecordSchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('CpdRecord', cpdRecordSchema);
