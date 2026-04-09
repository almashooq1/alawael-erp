/**
 * BehaviorRecord Model — نموذج سجل السلوك
 *
 * يمثل حادثة/ملاحظة سلوكية واحدة مع تحليل ABC
 * (Antecedent-Behavior-Consequence) والتدخل المطبّق
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const behaviorRecordSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    behaviorPlanId: { type: Schema.Types.ObjectId, ref: 'BehaviorPlan', index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // When & where
    occurredAt: { type: Date, required: true, index: true },
    duration: { minutes: Number, seconds: Number },
    setting: {
      type: String,
      enum: [
        'classroom',
        'therapy_room',
        'playground',
        'home',
        'community',
        'cafeteria',
        'transport',
        'hallway',
        'other',
      ],
    },
    settingDetails: String,

    // ABC Analysis
    antecedent: {
      description: { type: String, required: true },
      category: {
        type: String,
        enum: [
          'demand_placed',
          'transition',
          'denied_access',
          'attention_removed',
          'sensory_trigger',
          'social_interaction',
          'unstructured_time',
          'change_in_routine',
          'physical_discomfort',
          'unknown',
          'other',
        ],
      },
      triggers: [String],
    },
    behavior: {
      description: { type: String, required: true },
      topography: {
        type: String,
        enum: [
          'aggression',
          'self_injury',
          'property_destruction',
          'elopement',
          'tantrums',
          'stereotypy',
          'non_compliance',
          'verbal_outburst',
          'withdrawal',
          'crying',
          'biting',
          'hitting',
          'kicking',
          'throwing',
          'screaming',
          'other',
        ],
      },
      severity: { type: String, enum: ['mild', 'moderate', 'severe', 'crisis'], required: true },
      frequency: { type: String, enum: ['isolated', 'occasional', 'frequent', 'constant'] },
      intensity: { type: Number, min: 1, max: 10 },
      bodyPartInvolved: [String],
    },
    consequence: {
      description: String,
      type: {
        type: String,
        enum: [
          'attention_given',
          'demand_removed',
          'access_provided',
          'natural',
          'planned_ignoring',
          'redirection',
          'verbal_prompt',
          'physical_prompt',
          'time_out',
          'loss_of_privilege',
          'reinforcement',
          'other',
        ],
      },
      effectiveness: { type: String, enum: ['effective', 'partially_effective', 'ineffective'] },
    },

    // Hypothesized function
    hypothesizedFunction: {
      type: String,
      enum: ['attention', 'escape', 'tangible', 'sensory', 'multiple', 'unknown'],
    },

    // Intervention applied
    intervention: {
      applied: { type: Boolean, default: false },
      type: {
        type: String,
        enum: [
          'verbal_de_escalation',
          'redirection',
          'positive_reinforcement',
          'token_economy',
          'social_story',
          'visual_support',
          'sensory_break',
          'physical_restraint',
          'seclusion',
          'crisis_intervention',
          'environmental_modification',
          'other',
        ],
      },
      description: String,
      effectiveness: {
        type: String,
        enum: ['highly_effective', 'effective', 'partially_effective', 'ineffective'],
      },
      duration: { minutes: Number },
    },

    // Physical restraint log (if used)
    restraintLog: {
      used: { type: Boolean, default: false },
      type: { type: String, enum: ['physical_hold', 'mechanical', 'seclusion'] },
      startTime: Date,
      endTime: Date,
      durationMinutes: Number,
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      monitoringChecks: [
        { time: Date, status: String, checkedBy: { type: Schema.Types.ObjectId, ref: 'User' } },
      ],
      debriefCompleted: { type: Boolean, default: false },
      debriefNotes: String,
      injuryOccurred: { type: Boolean, default: false },
      injuryDetails: String,
    },

    // Impact
    impact: {
      onBeneficiary: String,
      onOthers: String,
      injuryToSelf: { type: Boolean, default: false },
      injuryToOthers: { type: Boolean, default: false },
      propertyDamage: { type: Boolean, default: false },
      injuryDetails: String,
    },

    // Follow-up
    followUp: {
      required: { type: Boolean, default: false },
      actions: [String],
      parentNotified: { type: Boolean, default: false },
      parentNotifiedAt: Date,
      supervisorNotified: { type: Boolean, default: false },
      reviewNeeded: { type: Boolean, default: false },
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'archived'],
      default: 'submitted',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,

    notes: String,
    attachments: [{ name: String, url: String, type: { type: String } }],
    tags: [String],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'behavior_records',
  }
);

behaviorRecordSchema.index({ beneficiaryId: 1, occurredAt: -1 });
behaviorRecordSchema.index({ 'behavior.topography': 1 });
behaviorRecordSchema.index({ 'behavior.severity': 1, occurredAt: -1 });

module.exports =
  mongoose.models.BehaviorRecord || mongoose.model('BehaviorRecord', behaviorRecordSchema);
