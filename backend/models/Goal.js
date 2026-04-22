const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    // Core
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['physical', 'cognitive', 'emotional', 'social', 'behavioral'],
      index: true,
    },

    // Relationships
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisabilityProgram',
      required: true,
      index: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Goal Definition
    measurableOutcome: String,
    baselineValue: String,
    targetValue: String,
    unit: String,
    successCriteria: [String],

    // Status Tracking
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'achieved', 'failed', 'on-hold'],
      default: 'not-started',
      index: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },

    // Progress
    startDate: Date,
    targetDate: Date,
    completionDate: Date,
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    progressUpdates: [
      {
        date: Date,
        value: String,
        notes: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Resources and Interventions
    interventions: [String],
    resources: [String],
    expectedOutcome: String,
    actualOutcome: String,

    // ─── SMART decomposition (Phase 9 Commit 7) ──────────────────────
    // Optional fields — extend existing baselineValue/targetValue/unit
    // with the metric kind, mastery rule, dosing, and back-references
    // to the rehab-disciplines registry. All new fields are optional
    // so legacy records stay valid; the IRP builder populates them
    // when a goal is drafted from a registry template.
    measurableMetric: {
      type: String,
      enum: ['PERCENTAGE', 'FREQUENCY', 'DURATION', 'LATENCY', 'RATE', 'RUBRIC', 'COMPOSITE'],
    },
    masteryCriteria: String,
    frequencyPerWeek: {
      type: Number,
      min: 0,
      max: 14,
    },
    promptingLevel: {
      type: String,
      enum: ['INDEPENDENT', 'GESTURAL', 'VERBAL', 'MODEL', 'PARTIAL_PHYSICAL', 'FULL_PHYSICAL'],
    },
    disciplineId: {
      type: String,
      // Free-form so any future registry additions work without
      // schema migrations. Validation lives in the service layer
      // (rehabDisciplineService.get(id) should resolve).
      index: true,
    },
    templateCode: {
      type: String,
      // Back-reference to the goalTemplates[].code in the registry
      // so we can trace which template seeded this goal.
      index: true,
    },
    progressTrend: {
      type: String,
      enum: ['IMPROVING', 'STABLE', 'DECLINING', 'STALLED'],
    },
    lastProgressAt: Date,
    sessionsToDate: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
      index: -1,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
goalSchema.index({ programId: 1, participantId: 1 });
goalSchema.index({ status: 1, priority: 1 });
goalSchema.index({ participantId: 1, status: 1 });
goalSchema.index({ createdBy: 1, createdAt: -1 });

// Pre-save middleware
goalSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
