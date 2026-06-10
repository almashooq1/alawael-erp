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
      ref: 'Beneficiary',
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

    // ─── W452 — ICF code linkage ────────────────────────────────────────
    // Each Goal may carry one or more ICF codes that describe what the
    // goal targets in WHO standardized terms. Enables ICF-coded outcome
    // reporting + international benchmarking. Per Phase A of the v3
    // lifecycle architecture (docs/blueprint/beneficiary-lifecycle-v3.md).
    //
    // Validity: code must match /^[bsde]\d+$/ + reference an active
    // ICFCodeReference (enforced via async validator on save).
    //
    // Invariants (enforced in pre('save') hook):
    //   - At most ONE entry may have isPrimary: true.
    //   - If targetQualifier is set, baselineQualifier must also be set.
    icfMapping: {
      type: [
        new mongoose.Schema(
          {
            icfCode: {
              type: String,
              required: true,
              match: /^[bsde]\d+$/,
            },
            isPrimary: { type: Boolean, default: false },
            targetQualifier: { type: Number, min: 0, max: 4 },
            baselineQualifier: { type: Number, min: 0, max: 4 },
            addedAt: { type: Date, default: Date.now },
            addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    // ─── R1 (W1090) — Goal ↔ Measure linkage (golden thread gap #1) ─────
    // @deprecated (ADR-040, W1133): tactical stopgap. The canonical
    // goal↔measure↔outcome linkage lives on `TherapeuticGoal` (the hub of the
    // outcomes/GAS/forecast services). New care-plan goals should reference a
    // canonical TherapeuticGoal via `therapeuticGoalId` (below) rather than
    // re-implement linkage here. Frozen pending the ADR-040 migration.
    // Links a goal to the standardized measure(s) that prove its progress,
    // closing the "goal has no measure" gap so every SMART goal is backed
    // by a quantifiable instrument. This is the data foundation for honest
    // outcome dashboards (MCID/GAS) and the CDSS Next-Best-Action engine.
    // Per docs/blueprint/43-beneficiary-journey-operating-system.md
    // §III gap #1 + §XVI.1 data contract. Mirrors the W452 icfMapping
    // pattern (sub-schema + refs + invariants in pre('save')).
    //
    // All fields optional/defaulted so legacy Goal records stay valid;
    // the care-plan builder populates them when a goal is drafted.
    //
    // Invariants (enforced in pre('save') hook below):
    //   - At most ONE entry may have role: 'primary'.
    //   - No duplicate measureId within the array.
    //   - If targetScore is set, targetDirection must also be set.
    linkedMeasures: {
      type: [
        new mongoose.Schema(
          {
            measureId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'MeasurementMaster',
              required: true,
            },
            role: {
              type: String,
              enum: ['primary', 'secondary'],
              default: 'primary',
            },
            // Optional back-reference to the baseline MeasurementResult so
            // progress applications can be compared to their origin point
            // (partially serves golden-thread gap #5).
            baselineResultId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'MeasurementResult',
              default: null,
            },
            targetScore: { type: Number, default: null },
            targetDirection: {
              type: String,
              enum: ['increase', 'decrease', 'maintain'],
            },
            addedAt: { type: Date, default: Date.now },
            addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },

    // ─── ADR-040 (W1133) — bridge to the canonical goal model ──────────
    // Optional reference to the canonical `TherapeuticGoal` (the model that
    // anchors the goal↔measure↔outcome golden thread across ~20 services). The
    // additive Option-C bridge: a CarePlan-embedded Goal keeps its IEP structure
    // but points at the canonical goal so outcome/GAS/forecast logic resolves
    // through ONE model. Optional + defaulted (legacy goals stay valid); the
    // destructive consolidation (migrate callers + retire SmartGoal) stays gated
    // on owner sign-off per ADR-040.
    therapeuticGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapeuticGoal',
      default: null,
      index: true,
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
// W452 — fast lookup of goals by primary ICF code (used by aggregate reports)
goalSchema.index({ 'icfMapping.icfCode': 1 });
// R1 (W1090) — fast lookup of goals by linked measure (outcome dashboards)
goalSchema.index({ 'linkedMeasures.measureId': 1 });
// gap #4 (plan↔goal) — fast lookup of IEP goals bridging to a canonical
// TherapeuticGoal (W1133 ADR-040 Option-C bridge). Enables "which IEP goals
// reference this canonical goal?" — needed when converging plan goals to refs.
goalSchema.index({ therapeuticGoalId: 1 });

// W452 + R1 (W1090) — pre-save invariants. ASYNC style (no `next` callback):
// this codebase runs Mongoose 9, which silently breaks pure callback-style
// pre('save', function(next)) hooks — `next` is not passed, so every .save()
// threw "next is not a function" (caught by the W1090 behavioral test; the
// pre-existing icfMapping block had the same latent bug, never exercised by a
// real .save()). Throwing aborts the save with the thrown error, exactly as
// the old `return next(err)` did. See feedback_mongoose_9_pre_save_callback_
// silent_break + the W483/W954 hook-style lessons.
goalSchema.pre('save', async function () {
  this.updatedAt = new Date();

  if (Array.isArray(this.icfMapping) && this.icfMapping.length > 0) {
    // Invariant 1: at most one primary
    const primaries = this.icfMapping.filter(m => m.isPrimary === true);
    if (primaries.length > 1) {
      throw new Error('Goal.icfMapping: at most one entry may have isPrimary: true');
    }

    // Invariant 2: targetQualifier requires baselineQualifier
    for (const m of this.icfMapping) {
      if (typeof m.targetQualifier === 'number' && typeof m.baselineQualifier !== 'number') {
        throw new Error(
          `Goal.icfMapping[${m.icfCode}]: targetQualifier set without baselineQualifier`
        );
      }
    }

    // Invariant 3: no duplicate icfCode entries within the array
    const seen = new Set();
    for (const m of this.icfMapping) {
      if (seen.has(m.icfCode)) {
        throw new Error(`Goal.icfMapping: duplicate icfCode '${m.icfCode}'`);
      }
      seen.add(m.icfCode);
    }
  }

  // ─── R1 (W1090) — linkedMeasures invariants (golden-thread gap #1) ──
  if (Array.isArray(this.linkedMeasures) && this.linkedMeasures.length > 0) {
    // Invariant 1: at most one primary measure per goal
    const primaryMeasures = this.linkedMeasures.filter(m => m.role === 'primary');
    if (primaryMeasures.length > 1) {
      throw new Error('Goal.linkedMeasures: at most one entry may have role: primary');
    }

    // Invariant 2: no duplicate measureId within the array
    const seenMeasures = new Set();
    for (const m of this.linkedMeasures) {
      const key = String(m.measureId);
      if (seenMeasures.has(key)) {
        throw new Error(`Goal.linkedMeasures: duplicate measureId '${key}'`);
      }
      seenMeasures.add(key);
    }

    // Invariant 3: a targetScore requires a targetDirection (else it is ambiguous)
    for (const m of this.linkedMeasures) {
      if (typeof m.targetScore === 'number' && !m.targetDirection) {
        throw new Error('Goal.linkedMeasures: targetScore set without targetDirection');
      }
    }
  }
});

module.exports = mongoose.models.Goal || mongoose.model('Goal', goalSchema);
