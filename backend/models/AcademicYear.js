/**
 * نموذج العام الدراسي والفصول الدراسية
 * Academic Year & Semester Model
 */
const mongoose = require('mongoose');

// ── Semester Schema ──────────────────────────────────────────
const SemesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الفصل الدراسي مطلوب'],
      trim: true,
    },
    nameEn: { type: String, trim: true },
    order: { type: Number, required: true },
    startDate: { type: Date, required: [true, 'تاريخ بداية الفصل مطلوب'] },
    endDate: { type: Date, required: [true, 'تاريخ نهاية الفصل مطلوب'] },
    registrationStart: { type: Date },
    registrationEnd: { type: Date },
    examStart: { type: Date },
    examEnd: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'registration', 'active', 'exams', 'grading', 'completed'],
      default: 'planned',
    },
    holidays: [
      {
        name: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        type: {
          type: String,
          enum: ['national', 'religious', 'school', 'emergency'],
          default: 'school',
        },
      },
    ],
    workingDays: { type: Number, default: 0 },
    notes: { type: String },
  },
  { _id: true }
);

// ── Academic Year Schema ─────────────────────────────────────
const AcademicYearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم العام الدراسي مطلوب'],
      trim: true,
      unique: true,
    },
    nameEn: { type: String, trim: true },
    startDate: { type: Date, required: [true, 'تاريخ بداية العام مطلوب'] },
    endDate: { type: Date, required: [true, 'تاريخ نهاية العام مطلوب'] },
    hijriStartDate: { type: String },
    hijriEndDate: { type: String },
    isCurrent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'planned', 'active', 'completed', 'archived'],
      default: 'draft',
    },
    semesters: [SemesterSchema],
    settings: {
      gradingSystem: {
        type: String,
        enum: ['percentage', 'gpa', 'letter', 'descriptive'],
        default: 'percentage',
      },
      passingGrade: { type: Number, default: 50 },
      maxAbsenceDays: { type: Number, default: 15 },
      attendanceWarningThreshold: { type: Number, default: 10 },
      allowLateRegistration: { type: Boolean, default: false },
      lateRegistrationDeadlineDays: { type: Number, default: 7 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

AcademicYearSchema.index({ isCurrent: 1 });
AcademicYearSchema.index({ status: 1 });
AcademicYearSchema.index({ startDate: 1, endDate: 1 });

// Ensure only one current academic year
AcademicYearSchema.pre('save', async function (next) {
  if (this.isCurrent && this.isModified('isCurrent')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isCurrent: true },
      { isCurrent: false }
    );
  }
  next();
});

module.exports = {
  AcademicYear: mongoose.models.AcademicYear || mongoose.model('AcademicYear', AcademicYearSchema),
  AcademicYearSchema,
  SemesterSchema,
};
