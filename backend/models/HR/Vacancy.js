'use strict';

/**
 * Vacancy.js — Phase 30 Recruitment / ATS.
 *
 * A vacancy is the job opening. Candidates apply to a vacancy. When
 * a candidate is hired, the route layer can `hireCandidate(c)` which
 * creates an Employee record + closes the vacancy + writes audit.
 *
 * No reliance on a separate ATS service — the candidate pipeline is
 * persisted directly on Vacancy.applicants[] as a sub-document to
 * keep cross-collection joins minimal at the cost of harder analytics.
 */

const mongoose = require('mongoose');

const ApplicantSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, trim: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 50 },
    nationality: { type: String, trim: true, maxlength: 100 },
    yearsExperience: { type: Number, min: 0, default: 0 },
    cvUrl: { type: String, trim: true, maxlength: 1000 },
    coverLetter: { type: String, maxlength: 5000 },
    source: { type: String, maxlength: 100 }, // referral, LinkedIn, ...
    stage: {
      type: String,
      enum: [
        'new',
        'screening',
        'phone_interview',
        'onsite_interview',
        'reference_check',
        'offer_extended',
        'hired',
        'rejected',
        'withdrawn',
      ],
      default: 'new',
      index: true,
    },
    appliedAt: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5 },
    notes: { type: String, maxlength: 2000 },
    interviewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hiredEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    rejectedReason: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

const VacancySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    titleAr: { type: String, trim: true, maxlength: 200 },
    department: { type: String, trim: true, maxlength: 100, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    headcount: { type: Number, min: 1, default: 1 },
    description: { type: String, maxlength: 5000 },
    requirements: { type: [String], default: [] },
    salaryRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: { type: String, default: 'SAR', maxlength: 5 },
    },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'temporary', 'internship'],
      default: 'full_time',
    },
    nationalityPreference: {
      type: String,
      enum: ['saudi_only', 'open', 'priority_saudi'],
      default: 'priority_saudi',
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'on_hold', 'filled', 'cancelled'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    targetFillDate: { type: Date, default: null },
    hiringManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    applicants: { type: [ApplicantSchema], default: [] },
  },
  { timestamps: true, collection: 'hr_vacancies' }
);

VacancySchema.virtual('hiredCount').get(function () {
  return (this.applicants || []).filter(a => a.stage === 'hired').length;
});

VacancySchema.virtual('isFilled').get(function () {
  return this.hiredCount >= (this.headcount || 1);
});

VacancySchema.set('toJSON', { virtuals: true });
VacancySchema.set('toObject', { virtuals: true });

module.exports = mongoose.models.Vacancy || mongoose.model('Vacancy', VacancySchema);
