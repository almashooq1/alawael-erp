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

familyHomeProgramSchema.pre('validate', function validateInvariants(next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'endDate must be greater than or equal to startDate');
    return next();
  }
  return next();
});

// W1003 — surface home-program lifecycle on the unified-core timeline (shared
// `home_program` domain across FamilyHomeProgram + HomeAssignment): a program
// ASSIGNED (parent-administered home exercises — care extends home) and COMPLETED.
// Fills the long-declared-but-producerless `home_program_assigned` CareTimeline
// enum + a new `home_program_completed`. Native pre-compile hooks per the W970
// pattern (modelEventBridge-is-dead workaround); guarded + fire-and-forget.
// W954-SAFE signatures (post(doc) / 0-param) — the global legacy-hook shim only
// wraps a sole param literally named `next`; the existing pre('validate', next)
// is a different event + a genuine legacy callback, so no conflict. Reads
// `beneficiary` OR `beneficiaryId` so the same hook works on both models.
familyHomeProgramSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
familyHomeProgramSchema.pre('save', function () {
  this.$__wasNew = this.isNew;
});
familyHomeProgramSchema.post('save', function (doc) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    const beneficiaryId = doc.beneficiary || doc.beneficiaryId;
    if (!beneficiaryId) return;
    const base = {
      programId: String(doc._id),
      beneficiaryId: String(beneficiaryId),
      programType: 'family',
      title: doc.title || '',
    };
    if (doc.$__wasNew) {
      Promise.resolve(integrationBus.publish('home_program', 'home_program.assigned', base)).catch(
        () => {}
      );
    } else if (doc.status === 'COMPLETED' && doc.$__prevStatus !== 'COMPLETED') {
      Promise.resolve(integrationBus.publish('home_program', 'home_program.completed', base)).catch(
        () => {}
      );
    }
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports =
  mongoose.models.FamilyHomeProgram || mongoose.model('FamilyHomeProgram', familyHomeProgramSchema);
