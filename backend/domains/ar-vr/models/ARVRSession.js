/**
 * ARVRSession Model — نموذج جلسة تأهيل الواقع الافتراضي / المعزز
 *
 * يمثل جلسة تأهيلية تستخدم تقنيات الواقع الافتراضي أو المعزز
 * مع تتبع السيناريوهات، أداء المستفيد، بيانات الاستشعار
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const arvrSessionSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true, index: true },
    episodeId: { type: Schema.Types.ObjectId, ref: 'EpisodeOfCare', index: true },
    therapistId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Session type
    technologyType: { type: String, enum: ['vr', 'ar', 'mr', 'xr'], required: true },
    specialty: {
      type: String,
      enum: [
        'motor_rehab',
        'cognitive_rehab',
        'balance_training',
        'pain_management',
        'phobia_therapy',
        'social_skills',
        'sensory_integration',
        'daily_living',
        'other',
      ],
    },

    // Device & hardware
    device: {
      name: String,
      model: {
        type: String,
        enum: [
          'meta_quest_3',
          'meta_quest_pro',
          'htc_vive',
          'pico_4',
          'apple_vision_pro',
          'hololens_2',
          'custom',
          'other',
        ],
      },
      serialNumber: String,
      firmwareVersion: String,
      controllers: [{ type: { type: String }, serialNumber: String }],
      sensors: [{ type: { type: String }, model: String, location: String }],
    },

    // Scenario / environment
    scenario: {
      scenarioId: String,
      name: { type: String, required: true },
      category: {
        type: String,
        enum: [
          'therapeutic_game',
          'simulation',
          'exercise',
          'training',
          'assessment',
          'social_scenario',
          'daily_activity',
          'relaxation',
        ],
      },
      difficultyLevel: { type: Number, min: 1, max: 10 },
      environment: String,
      objectives: [String],
      version: String,
    },

    // Timing
    scheduledAt: Date,
    startedAt: Date,
    endedAt: Date,
    activeDurationSeconds: Number,
    pauseDurationSeconds: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: [
        'scheduled',
        'preparing',
        'in_progress',
        'paused',
        'completed',
        'cancelled',
        'aborted',
        'technical_failure',
      ],
      default: 'scheduled',
      index: true,
    },
    abortReason: {
      type: String,
      enum: [
        'discomfort',
        'nausea',
        'equipment_failure',
        'patient_request',
        'therapist_decision',
        'other',
      ],
    },

    // Performance metrics
    performance: {
      overallScore: { type: Number, min: 0, max: 100 },
      accuracy: { type: Number, min: 0, max: 100 },
      reactionTimeMs: Number,
      completionRate: { type: Number, min: 0, max: 100 },
      tasksCompleted: Number,
      tasksTotal: Number,
      errorsCount: Number,
      level: Number,
      maxLevelReached: Number,
      pointsEarned: Number,
      badges: [String],
      milestones: [
        {
          name: String,
          achievedAt: Date,
          value: Number,
        },
      ],
    },

    // Motion / sensor data summary
    motionData: {
      rangeOfMotion: [
        {
          joint: String,
          axis: String,
          minDegrees: Number,
          maxDegrees: Number,
          averageDegrees: Number,
        },
      ],
      balanceMetrics: {
        stabilityScore: Number,
        swayArea: Number,
        weightDistribution: { left: Number, right: Number },
      },
      gaitMetrics: {
        stepCount: Number,
        cadence: Number,
        strideLength: Number,
        symmetryIndex: Number,
      },
      handTracking: {
        gripStrength: { left: Number, right: Number },
        precision: Number,
        dexterity: Number,
      },
      rawDataFileUrl: String,
    },

    // Physiological monitoring
    physiological: {
      heartRate: { avg: Number, min: Number, max: Number },
      oxygenSaturation: Number,
      stressLevel: { type: String, enum: ['low', 'moderate', 'high'] },
      fatigueLevel: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
    },

    // Safety & comfort
    safety: {
      cybersicknessLevel: { type: String, enum: ['none', 'mild', 'moderate', 'severe'] },
      cybersicknessSymptoms: [
        {
          type: String,
          enum: ['nausea', 'dizziness', 'eye_strain', 'headache', 'disorientation', 'sweating'],
        },
      ],
      discomfortReported: { type: Boolean, default: false },
      discomfortDetails: String,
      safetyIncidents: [
        {
          type: { type: String },
          description: String,
          severity: { type: String, enum: ['minor', 'moderate', 'serious'] },
          timestamp: Date,
        },
      ],
    },

    // Clinical notes
    clinicalNotes: {
      observation: String,
      assessment: String,
      response: String,
      plan: String,
      recommendations: [String],
    },

    // Goals addressed
    goalsAddressed: [
      {
        goalId: { type: Schema.Types.ObjectId, ref: 'TherapeuticGoal' },
        progress: { type: String, enum: ['improved', 'maintained', 'declined', 'not_assessed'] },
        notes: String,
      },
    ],

    // Comparison to previous
    comparisonToPrevious: {
      scoreChange: Number,
      accuracyChange: Number,
      reactionTimeChange: Number,
      trend: { type: String, enum: ['improving', 'stable', 'declining'] },
    },

    tags: [String],
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'arvr_sessions',
  }
);

arvrSessionSchema.index({ beneficiaryId: 1, startedAt: -1 });
arvrSessionSchema.index({ therapistId: 1, startedAt: -1 });
arvrSessionSchema.index({ 'scenario.scenarioId': 1 });

module.exports = mongoose.models.ARVRSession || mongoose.model('ARVRSession', arvrSessionSchema);
