'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const autismProfileSchema = new Schema(
  {
    profile_id: {
      type: String,
      unique: true,
      default: () => `AUT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    },
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // معلومات التشخيص
    diagnosis_info: {
      diagnosis_date: Date,
      diagnosing_professional: {
        name: String,
        specialization: String,
        license: String,
      },
      diagnosis_criteria: {
        dsm5_level: { type: String, enum: ['level1', 'level2', 'level3'] },
        severity: String,
      },
      diagnostic_tools_used: [String],
      age_at_diagnosis: Number,
      co_occurring_conditions: [String],
    },

    // ملف التواصل
    communication_profile: {
      verbal_ability: {
        type: String,
        enum: ['non_verbal', 'minimally_verbal', 'verbal_with_difficulties', 'fluent'],
      },
      receptive_language: {
        level: String,
        notes: String,
      },
      expressive_language: {
        level: String,
        notes: String,
      },
      communication_methods: [String], // verbal, PECS, sign, AAC, etc.
      pragmatics: {
        eye_contact: String,
        joint_attention: String,
        turn_taking: String,
        social_reciprocity: String,
      },
      augmentative_devices: [
        {
          device_type: String,
          proficiency: String,
        },
      ],
    },

    // ملف الحسية
    sensory_profile: {
      hypersensitivities: [
        {
          sense: {
            type: String,
            enum: [
              'visual',
              'auditory',
              'tactile',
              'olfactory',
              'gustatory',
              'vestibular',
              'proprioceptive',
            ],
          },
          triggers: [String],
          responses: [String],
          accommodations: [String],
        },
      ],
      hyposensitivities: [
        {
          sense: String,
          seeking_behaviors: [String],
          interventions: [String],
        },
      ],
      sensory_diet: [
        {
          activity: String,
          purpose: String,
          frequency: String,
          duration: Number,
        },
      ],
    },

    // السلوكيات النمطية
    stereotypic_behaviors: [
      {
        behavior: String,
        frequency: String,
        intensity: String,
        triggers: [String],
        management_strategies: [String],
        interfering_with_learning: { type: Boolean, default: false },
      },
    ],

    // الاهتمامات الخاصة
    special_interests: [
      {
        interest: String,
        intensity: { type: String, enum: ['mild', 'moderate', 'intense', 'obsessive'] },
        use_in_teaching: { type: Boolean, default: false },
        notes: String,
      },
    ],

    // المهارات المعرفية
    cognitive_profile: {
      iq_score: Number,
      iq_test_used: String,
      verbal_iq: Number,
      non_verbal_iq: Number,
      adaptive_functioning: {
        composite_score: Number,
        communication: Number,
        daily_living: Number,
        socialization: Number,
      },
      executive_function: {
        attention: String,
        flexibility: String,
        planning: String,
        working_memory: String,
      },
      theory_of_mind: String,
      central_coherence: String,
    },

    // برنامج التدخل
    intervention_program: {
      primary_approach: {
        type: String,
        enum: ['ABA', 'TEACCH', 'DIR_Floortime', 'PECS', 'ESDM', 'SCERTS', 'eclectic'],
      },
      secondary_approaches: [String],
      hours_per_week: Number,
      settings: [String],
    },

    // التقدم والنتائج
    outcomes_tracking: {
      vineland_scores: [
        {
          date: Date,
          composite: Number,
          communication: Number,
          daily_living: Number,
          socialization: Number,
          motor: Number,
        },
      ],
      goal_achievement: [
        {
          period: String,
          goals_set: Number,
          goals_achieved: Number,
          goals_partially_achieved: Number,
          percentage: Number,
        },
      ],
    },

    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

autismProfileSchema.index({ beneficiary_id: 1 });

const AutismProfile =
  mongoose.models.AutismProfile || mongoose.model('AutismProfile', autismProfileSchema);

module.exports = AutismProfile;
