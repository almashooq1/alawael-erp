const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['DONE', 'PARTIAL', 'SKIPPED'], required: true },
  parentNote: String,
  mediaUrl: String, // Video/Photo proof
  feedbackFromTherapist: String,
});

const homeAssignmentSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Therapist

    title: { type: String, required: true }, // e.g., "Daily Stretching"
    description: { type: String, required: true }, // Instructions
    videoUrl: String, // Tutorial link

    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'ALTERNATE_DAYS'], default: 'DAILY' },

    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },

    submissions: [submissionSchema],

    status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
homeAssignmentSchema.index({ beneficiary: 1, status: 1 });
homeAssignmentSchema.index({ assignedBy: 1, status: 1 });
homeAssignmentSchema.index({ status: 1, startDate: -1 });

// W1003 — surface home-program lifecycle on the unified-core timeline (shared
// `home_program` domain; companion to FamilyHomeProgram). assigned on create /
// completed on status→COMPLETED. Native pre-compile W954-safe hooks (post(doc) /
// 0-param); guarded + fire-and-forget. This model uses the `beneficiary` field.
homeAssignmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
homeAssignmentSchema.pre('save', function () {
  this.$__wasNew = this.isNew;
});
homeAssignmentSchema.post('save', function (doc) {
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    const beneficiaryId = doc.beneficiary || doc.beneficiaryId;
    if (!beneficiaryId) return;
    const base = {
      programId: String(doc._id),
      beneficiaryId: String(beneficiaryId),
      programType: 'assignment',
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
  mongoose.models.HomeAssignment || mongoose.model('HomeAssignment', homeAssignmentSchema);
