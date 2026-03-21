/**
 * Recruitment & Talent Acquisition Model — نماذج التوظيف والاستقطاب
 *
 * Schemas:
 *   JobPosting      — إعلان وظيفي
 *   JobApplication  — طلب توظيف
 *   Interview       — مقابلة
 *
 * Legacy alias: Employee model is also re-exported for backward compatibility.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Re-export Employee for backward compatibility
let Employee;
try {
  Employee = require('./Employee');
} catch (_e) {
  Employee = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Job Posting — إعلان وظيفي
// ═══════════════════════════════════════════════════════════════════════════

const jobPostingSchema = new Schema(
  {
    jobNumber: { type: String, unique: true },
    title: {
      ar: { type: String, required: true },
      en: String,
    },
    department: { type: String, required: true },
    center: { type: Schema.Types.ObjectId, ref: 'Center' },
    type: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'temporary', 'internship'],
      default: 'full_time',
    },
    level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'manager', 'director', 'executive'],
    },
    description: { type: String, required: true },
    requirements: [String],
    preferredQualifications: [String],
    skills: [String],
    experience: { min: Number, max: Number },
    education: String,
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'SAR' },
      negotiable: { type: Boolean, default: false },
    },
    benefits: [String],
    location: { city: String, remote: { type: Boolean, default: false } },
    positions: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'open', 'on_hold', 'closed', 'filled', 'cancelled'],
      default: 'draft',
    },
    publishDate: Date,
    closingDate: Date,
    hiringManager: { type: Schema.Types.ObjectId, ref: 'User' },
    recruiter: { type: Schema.Types.ObjectId, ref: 'User' },
    applicationsCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobPostingSchema.index({ status: 1, department: 1 });
jobPostingSchema.index({ closingDate: 1 });

jobPostingSchema.pre('save', async function (next) {
  if (!this.jobNumber) {
    const count = await mongoose.model('JobPosting').countDocuments();
    this.jobNumber = `JOB-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Job Application — طلب توظيف
// ═══════════════════════════════════════════════════════════════════════════

const jobApplicationSchema = new Schema(
  {
    applicationNumber: { type: String, unique: true },
    jobPosting: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true },
    applicant: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      nationalId: String,
      dateOfBirth: Date,
      gender: { type: String, enum: ['male', 'female'] },
      nationality: String,
      city: String,
    },
    education: [
      {
        degree: String,
        field: String,
        institution: String,
        year: Number,
        gpa: Number,
      },
    ],
    experience: [
      {
        company: String,
        title: String,
        startDate: Date,
        endDate: Date,
        current: { type: Boolean, default: false },
        description: String,
      },
    ],
    skills: [String],
    languages: [{ language: String, level: String }],
    resumeUrl: String,
    coverLetter: String,
    source: {
      type: String,
      enum: ['website', 'linkedin', 'referral', 'job_board', 'social_media', 'walk_in', 'other'],
      default: 'website',
    },
    referredBy: String,
    stage: {
      type: String,
      enum: [
        'new',
        'screening',
        'phone_interview',
        'technical_test',
        'interview',
        'final_interview',
        'offer',
        'hired',
        'rejected',
        'withdrawn',
      ],
      default: 'new',
    },
    stageHistory: [
      {
        stage: String,
        enteredAt: { type: Date, default: Date.now },
        notes: String,
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    rating: { type: Number, min: 1, max: 5 },
    evaluationNotes: String,
    rejectionReason: String,
    offerDetails: {
      salary: Number,
      startDate: Date,
      offerDate: Date,
      expiryDate: Date,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired'],
      },
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobApplicationSchema.index({ jobPosting: 1, stage: 1 });
jobApplicationSchema.index({ 'applicant.email': 1 });
jobApplicationSchema.index({ createdAt: -1 });

jobApplicationSchema.pre('save', async function (next) {
  if (!this.applicationNumber) {
    const count = await mongoose.model('JobApplication').countDocuments();
    this.applicationNumber = `APP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// ═══════════════════════════════════════════════════════════════════════════
// Interview — مقابلة
// ═══════════════════════════════════════════════════════════════════════════

const interviewSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true },
    jobPosting: { type: Schema.Types.ObjectId, ref: 'JobPosting' },
    type: {
      type: String,
      enum: ['phone', 'video', 'in_person', 'panel', 'technical', 'hr'],
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    duration: { type: Number, default: 60 },
    location: String,
    meetingLink: String,
    interviewers: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        role: String,
      },
    ],
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'scheduled',
    },
    evaluation: {
      technicalSkills: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      cultureFit: { type: Number, min: 1, max: 5 },
      leadership: { type: Number, min: 1, max: 5 },
      overallRating: { type: Number, min: 1, max: 5 },
      strengths: [String],
      weaknesses: [String],
      recommendation: {
        type: String,
        enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'],
      },
      comments: String,
    },
    questions: [
      {
        question: String,
        expectedAnswer: String,
        candidateAnswer: String,
        score: Number,
      },
    ],
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

interviewSchema.index({ application: 1, scheduledDate: 1 });
interviewSchema.index({ status: 1, scheduledDate: 1 });

const JobPosting = mongoose.models.JobPosting || mongoose.model('JobPosting', jobPostingSchema);
const JobApplication =
  mongoose.models.JobApplication || mongoose.model('JobApplication', jobApplicationSchema);
const Interview = mongoose.models.Interview || mongoose.model('Interview', interviewSchema);

module.exports = { JobPosting, JobApplication, Interview, Employee };
