/**
 * Training & Development Models — نظام التدريب والتطوير
 */
const mongoose = require('mongoose');

/* ── Training Course ─────────────────────────────────────── */
const trainingCourseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    titleEn: { type: String },
    category: {
      type: String,
      enum: ['technical', 'leadership', 'soft_skills', 'compliance', 'safety', 'professional', 'language', 'other'],
      default: 'technical',
    },
    type: {
      type: String,
      enum: ['classroom', 'online', 'blended', 'workshop', 'seminar', 'on_the_job'],
      default: 'classroom',
    },
    description: String,
    objectives: [String],
    duration: { hours: { type: Number, default: 0 }, days: { type: Number, default: 0 } },
    provider: { name: String, contact: String, isInternal: { type: Boolean, default: true } },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxParticipants: { type: Number, default: 30 },
    cost: { amount: { type: Number, default: 0 }, currency: { type: String, default: 'SAR' } },
    prerequisites: [String],
    materials: [{ name: String, url: String }],
    status: {
      type: String,
      enum: ['draft', 'approved', 'active', 'completed', 'cancelled'],
      default: 'draft',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ── Training Session ────────────────────────────────────── */
const trainingSessionSchema = new mongoose.Schema(
  {
    sessionCode: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingCourse', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: String,
    instructor: { name: String, email: String },
    participants: [
      {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        department: String,
        attendance: { type: String, enum: ['registered', 'attended', 'absent', 'cancelled'], default: 'registered' },
        score: Number,
        certificateIssued: { type: Boolean, default: false },
        feedback: { rating: Number, comment: String },
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* ── Training Plan ───────────────────────────────────────── */
const trainingPlanSchema = new mongoose.Schema(
  {
    planCode: { type: String, required: true, unique: true },
    titleAr: { type: String, required: true },
    year: { type: Number, required: true },
    department: String,
    courses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingCourse' },
        quarter: { type: Number, enum: [1, 2, 3, 4] },
        targetParticipants: Number,
        budget: Number,
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
      },
    ],
    totalBudget: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'in_progress', 'completed'],
      default: 'draft',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const TrainingCourse = mongoose.models.TrainingCourse || mongoose.model('TrainingCourse', trainingCourseSchema);
const TrainingSession = mongoose.models.TrainingSession || mongoose.model('TrainingSession', trainingSessionSchema);
const TrainingPlan = mongoose.models.TrainingPlan || mongoose.model('TrainingPlan', trainingPlanSchema);

module.exports = { TrainingCourse, TrainingSession, TrainingPlan };
