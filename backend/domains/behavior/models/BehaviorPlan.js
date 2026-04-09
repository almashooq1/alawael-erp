/**
 * BehaviorPlan Model — نموذج خطة إدارة السلوك
 *
 * خطة منظمة لإدارة وتعديل سلوك المستفيد
 * تتضمن سلوكيات مستهدفة، استراتيجيات تدخل، أهداف قابلة للقياس
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const behaviorPlanSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    // Plan info
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'discontinued'],
      default: 'draft',
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: Date,
    reviewDate: Date,
    version: { type: Number, default: 1 },

    // Background assessment
    backgroundAssessment: {
      functionalAnalysis: String,
      medicalConsiderations: String,
      environmentalFactors: [String],
      previousInterventions: [{ name: String, effectiveness: String, dates: String }],
      strengths: [String],
      preferences: [String],
    },

    // Target behaviors
    targetBehaviors: [
      {
        name: { type: String, required: true },
        operationalDefinition: { type: String, required: true },
        topography: String,
        hypothesizedFunction: {
          type: String,
          enum: ['attention', 'escape', 'tangible', 'sensory', 'multiple', 'unknown'],
        },
        baselineFrequency: String,
        baselineSeverity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        measurementMethod: {
          type: String,
          enum: ['frequency', 'duration', 'interval', 'latency', 'abc_recording', 'rating_scale'],
        },
        goal: String,
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
      },
    ],

    // Replacement behaviors
    replacementBehaviors: [
      {
        name: String,
        description: String,
        teachingStrategy: String,
        reinforcementSchedule: String,
      },
    ],

    // Prevention strategies
    preventionStrategies: [
      {
        name: String,
        description: String,
        category: {
          type: String,
          enum: ['environmental', 'instructional', 'social', 'sensory', 'schedule', 'other'],
        },
        implementedBy: [String],
      },
    ],

    // Intervention strategies
    interventionStrategies: [
      {
        name: String,
        description: String,
        category: {
          type: String,
          enum: [
            'reinforcement',
            'extinction',
            'differential_reinforcement',
            'token_economy',
            'social_skills_training',
            'self_management',
            'crisis_intervention',
            'other',
          ],
        },
        steps: [String],
        materials: [String],
        implementedBy: [String],
      },
    ],

    // Crisis plan
    crisisPlan: {
      triggers: [String],
      warningSignsSequence: [String],
      deEscalationSteps: [String],
      crisisSteps: [String],
      restraintProtocol: String,
      emergencyContacts: [{ name: String, role: String, phone: String }],
      postCrisisProtocol: String,
    },

    // Data collection plan
    dataCollection: {
      methods: [String],
      frequency: { type: String, enum: ['every_occurrence', 'daily', 'weekly', 'per_session'] },
      responsiblePersons: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, role: String }],
      tools: [String],
    },

    // Reviews
    reviews: [
      {
        date: Date,
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        findings: String,
        progressSummary: String,
        modifications: [String],
        nextReviewDate: Date,
      },
    ],

    // Parent/family involvement
    familyInvolvement: {
      trainingProvided: { type: Boolean, default: false },
      trainingDetails: String,
      homeStrategies: [String],
      communicationPlan: String,
      consentObtained: { type: Boolean, default: false },
      consentDate: Date,
    },

    notes: String,
    attachments: [{ name: String, url: String, type: { type: String } }],
    tags: [String],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'behavior_plans',
  }
);

behaviorPlanSchema.index({ beneficiaryId: 1, status: 1 });

module.exports = mongoose.models.BehaviorPlan || mongoose.model('BehaviorPlan', behaviorPlanSchema);
