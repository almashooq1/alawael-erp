'use strict';

const mongoose = require('mongoose');

const taskLogSchema = new mongoose.Schema(
  {
    completedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 500 },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

const programTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    instructions: { type: String, trim: true, maxlength: 2000 },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'weekly',
    },
    targetPerWeek: { type: Number, min: 1, max: 21, default: 3 },
    isActive: { type: Boolean, default: true },
    logs: [taskLogSchema],
  },
  { _id: true }
);

const familyHomeProgramSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    tasks: [programTaskSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'family_home_programs',
  }
);

familyHomeProgramSchema.index({ beneficiaryId: 1, status: 1 });
familyHomeProgramSchema.index({ branchId: 1, createdAt: -1 });

familyHomeProgramSchema.pre('validate', function validateInvariants() {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'endDate must be greater than or equal to startDate');
  }
});

// ── W1047: unified-core producer — family home program completed ──
// When a FamilyHomeProgram reaches status 'COMPLETED', publish a domain event
// so the cross-module subscriber records a family milestone on the
// beneficiary's longitudinal CareTimeline. Non-callback hook style (W483-safe).
familyHomeProgramSchema.pre('save', function () {
  this.$__familyHomeProgramCompletedNow =
    this.status === 'COMPLETED' && (this.isNew || this.isModified('status'));
});

familyHomeProgramSchema.post('save', function emitFamilyHomeProgramCompleted(doc) {
  if (!doc || !doc.$__familyHomeProgramCompletedNow) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    Promise.resolve(
      integrationBus.publish('family-home-program', 'family_home_program.completed', {
        programId: String(doc._id),
        beneficiaryId: doc.beneficiaryId ? String(doc.beneficiaryId) : null,
        ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
        title: doc.title || null,
        endDate: doc.endDate || doc.updatedAt || new Date(),
        completedAt: doc.updatedAt || new Date(),
      })
    ).catch(() => {});
  } catch (_e) {
    /* bus optional — never block persistence */
  }
});

module.exports =
  mongoose.models.FamilyHomeProgram || mongoose.model('FamilyHomeProgram', familyHomeProgramSchema);
