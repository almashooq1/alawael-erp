/**
 * TrainingProgram Model — نموذج برنامج التدريب الميداني
 *
 * يمثل برنامج تدريب ميداني للمتدربين (طلاب، أخصائيين جدد)
 * مع تتبع الكفاءات، الإشراف، التقييمات، ساعات التدريب
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const trainingProgramSchema = new Schema(
  {
    // Program info
    title: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },
    type: {
      type: String,
      enum: [
        'internship',
        'residency',
        'practicum',
        'fellowship',
        'onboarding',
        'continuing_education',
        'specialized',
        'clinical_rotation',
      ],
      required: true,
    },
    specialty: {
      type: String,
      enum: [
        'speech_therapy',
        'occupational_therapy',
        'physical_therapy',
        'psychology',
        'behavioral_therapy',
        'social_work',
        'special_education',
        'nursing',
        'other',
      ],
    },
    status: {
      type: String,
      enum: ['planning', 'open', 'active', 'completed', 'suspended', 'archived'],
      default: 'planning',
      index: true,
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Duration
    startDate: { type: Date, required: true },
    endDate: Date,
    totalHoursRequired: { type: Number, required: true },
    weeksRequired: Number,

    // Supervisor
    primarySupervisor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supervisors: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['primary', 'secondary', 'guest', 'mentor'] },
        specialty: String,
      },
    ],
    affiliatedInstitution: String,

    // Competency framework
    competencies: [
      {
        name: { type: String, required: true },
        category: {
          type: String,
          enum: [
            'clinical_skills',
            'assessment',
            'treatment',
            'documentation',
            'communication',
            'professionalism',
            'ethics',
            'teamwork',
            'research',
            'cultural_competence',
          ],
        },
        description: String,
        requiredLevel: {
          type: String,
          enum: ['awareness', 'beginner', 'intermediate', 'competent', 'proficient', 'expert'],
          default: 'competent',
        },
        assessmentCriteria: [String],
        weight: { type: Number, default: 1 },
      },
    ],

    // Learning objectives
    learningObjectives: [
      {
        objective: String,
        category: String,
        assessmentMethod: String,
      },
    ],

    // Requirements
    requirements: {
      minClinicalHours: Number,
      minDirectObservation: Number,
      minCaseLoad: Number,
      requiredRotations: [{ area: String, hours: Number }],
      requiredAssessments: [{ name: String, minimumScore: Number }],
    },

    // Settings
    settings: {
      maxTrainees: { type: Number, default: 10 },
      supervisorToTraineeRatio: String,
      evaluationFrequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'midterm_final'],
      },
      allowDirectPatientContact: { type: Boolean, default: true },
      requiresBackgroundCheck: { type: Boolean, default: true },
    },

    description: String,
    tags: [String],
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'training_programs',
  }
);

trainingProgramSchema.index({ primarySupervisor: 1, status: 1 });

module.exports =
  mongoose.models.TrainingProgram || mongoose.model('TrainingProgram', trainingProgramSchema);
