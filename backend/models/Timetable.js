/**
 * نموذج الجدول الدراسي
 * Timetable / Class Schedule Model
 */
const mongoose = require('mongoose');

// ── Time Slot Schema ─────────────────────────────────────────
const TimeSlotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    },
    periodNumber: { type: Number, required: true, min: 1, max: 12 },
    startTime: { type: String, required: [true, 'وقت البداية مطلوب'] }, // HH:mm
    endTime: { type: String, required: [true, 'وقت النهاية مطلوب'] },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    type: {
      type: String,
      enum: ['class', 'break', 'prayer', 'activity', 'assembly', 'free', 'exam'],
      default: 'class',
    },
    isRecurring: { type: Boolean, default: true },
    specificDate: { type: Date }, // for non-recurring events
    notes: { type: String },
    color: { type: String },
  },
  { _id: true }
);

// ── Period Template Schema ───────────────────────────────────
const PeriodTemplateSchema = new mongoose.Schema(
  {
    periodNumber: { type: Number, required: true },
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    duration: { type: Number, required: true }, // minutes
    type: {
      type: String,
      enum: ['class', 'break', 'prayer', 'activity', 'assembly'],
      default: 'class',
    },
  },
  { _id: true }
);

// ── Timetable Schema ────────────────────────────────────────
const TimetableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الجدول مطلوب'],
      trim: true,
    },
    nameEn: { type: String, trim: true },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'العام الدراسي مطلوب'],
    },
    semester: { type: String },
    grade: { type: String },
    section: { type: String },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    type: {
      type: String,
      enum: ['class', 'teacher', 'room', 'master'],
      default: 'class',
    },

    // ── Working Days Config ──
    workingDays: {
      type: [String],
      default: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    },
    periodTemplate: [PeriodTemplateSchema],
    slots: [TimeSlotSchema],

    // ── Constraints ──
    constraints: {
      maxConsecutivePeriods: { type: Number, default: 3 },
      minBreakBetweenClasses: { type: Number, default: 0 }, // minutes
      preferMorningForCore: { type: Boolean, default: true },
      avoidLastPeriodExams: { type: Boolean, default: true },
    },

    // ── Substitutions ──
    substitutions: [
      {
        date: { type: Date, required: true },
        originalSlot: { type: mongoose.Schema.Types.ObjectId },
        substituteTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
        reason: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'completed'], default: 'pending' },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'published', 'active', 'archived'],
      default: 'draft',
    },
    effectiveFrom: { type: Date },
    effectiveUntil: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

TimetableSchema.index({ academicYear: 1, grade: 1, section: 1 });
TimetableSchema.index({ status: 1, type: 1 });
TimetableSchema.index({ 'slots.teacher': 1, 'slots.day': 1 });
TimetableSchema.index({ 'slots.classroom': 1, 'slots.day': 1 });

// Check for scheduling conflicts
TimetableSchema.methods.hasConflict = function (newSlot) {
  return this.slots.some(
    slot =>
      slot.day === newSlot.day &&
      slot.periodNumber === newSlot.periodNumber &&
      slot._id.toString() !== (newSlot._id || '').toString()
  );
};

module.exports = {
  Timetable: mongoose.model('Timetable', TimetableSchema),
  TimetableSchema,
  TimeSlotSchema,
  PeriodTemplateSchema,
};
