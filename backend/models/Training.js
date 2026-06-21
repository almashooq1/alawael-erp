/**
 * Training & Development Models — نظام التدريب والتطوير
 *
 * Restored to support the LIVE, mounted `routes/training.routes.js`, which
 * does `require('../models/Training')[name]` for TrainingCourse / TrainingSession
 * / TrainingPlan. The model had been archived, orphaning its live route (every
 * /api/(v1/)training request threw at the require). This is the missing
 * dependency, not dead code. Registration-guarded → no duplicate-model conflict.
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
      enum: [
        'technical',
        'leadership',
        'soft_skills',
        'compliance',
        'safety',
        'professional',
        'language',
        'other',
      ],
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
        attendance: {
          type: String,
          enum: ['registered', 'attended', 'absent', 'cancelled'],
          default: 'registered',
        },
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

const TrainingCourse =
  mongoose.models.TrainingCourse || mongoose.model('TrainingCourse', trainingCourseSchema);
const TrainingSession =
  mongoose.models.TrainingSession || mongoose.model('TrainingSession', trainingSessionSchema);
// TrainingPlan is canonical in models/HR/TrainingPlan.js — re-export it so the
// route's require('../models/Training').TrainingPlan keeps working, WITHOUT a
// second mongoose.model('TrainingPlan', …) registration (W340 duplicate guard).
const TrainingPlan = require('./HR/TrainingPlan');

module.exports = { TrainingCourse, TrainingSession, TrainingPlan };
