/**
 * TraineeRecord Model — نموذج سجل المتدرب
 *
 * يمثل سجل متدرب فردي في برنامج تدريب ميداني
 * مع الكفاءات، ساعات التدريب، التقييمات، ملاحظات الإشراف
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const traineeRecordSchema = new Schema(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    programId: { type: Schema.Types.ObjectId, ref: 'TrainingProgram', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },

    // Enrollment
    status: {
      type: String,
      enum: ['enrolled', 'active', 'on_leave', 'completed', 'failed', 'withdrawn', 'terminated'],
      default: 'enrolled',
      index: true,
    },
    enrolledAt: { type: Date, default: Date.now },
    startedAt: Date,
    completedAt: Date,
    expectedCompletionDate: Date,

    // Hours tracking
    hours: {
      totalLogged: { type: Number, default: 0 },
      directPatientContact: { type: Number, default: 0 },
      observation: { type: Number, default: 0 },
      supervision: { type: Number, default: 0 },
      documentation: { type: Number, default: 0 },
      training: { type: Number, default: 0 },
      research: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    hourLogs: [
      {
        date: { type: Date, required: true },
        hours: { type: Number, required: true },
        category: {
          type: String,
          enum: [
            'direct_patient',
            'observation',
            'supervision',
            'documentation',
            'training',
            'research',
            'other',
          ],
        },
        description: String,
        verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: Date,
      },
    ],

    // Caseload
    caseload: [
      {
        beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        assignedDate: Date,
        endDate: Date,
        role: { type: String, enum: ['primary', 'co_therapist', 'observer'] },
        sessionsCompleted: { type: Number, default: 0 },
      },
    ],

    // Competency tracking
    competencyProgress: [
      {
        competencyName: String,
        currentLevel: {
          type: String,
          enum: [
            'not_started',
            'awareness',
            'beginner',
            'intermediate',
            'competent',
            'proficient',
            'expert',
          ],
        },
        assessments: [
          {
            date: Date,
            assessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            level: String,
            score: Number,
            feedback: String,
            evidence: [String],
          },
        ],
        achievedDate: Date,
      },
    ],

    // Evaluations
    evaluations: [
      {
        type: {
          type: String,
          enum: [
            'formative',
            'summative',
            'midterm',
            'final',
            'competency_check',
            'self_assessment',
            'peer_review',
          ],
        },
        date: Date,
        evaluatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        overallScore: Number,
        overallRating: {
          type: String,
          enum: [
            'unsatisfactory',
            'needs_improvement',
            'satisfactory',
            'good',
            'excellent',
            'outstanding',
          ],
        },
        strengths: [String],
        areasForImprovement: [String],
        goals: [String],
        feedback: String,
        traineeResponse: String,
        scores: [{ area: String, score: Number, weight: Number, comments: String }],
        actionPlan: String,
      },
    ],

    // Supervision sessions
    supervisionSessions: [
      {
        date: Date,
        supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
        type: {
          type: String,
          enum: ['individual', 'group', 'live_observation', 'video_review', 'case_presentation'],
        },
        durationMinutes: Number,
        topics: [String],
        feedback: String,
        actionItems: [String],
        traineeReflection: String,
      },
    ],

    // Direct observation
    observations: [
      {
        date: Date,
        observedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
        sessionType: String,
        ratings: [{ skill: String, rating: Number, notes: String }],
        overallFeedback: String,
        strengths: [String],
        improvements: [String],
      },
    ],

    // Goals & action plan
    currentGoals: [
      {
        goal: String,
        setDate: Date,
        targetDate: Date,
        status: { type: String, enum: ['active', 'achieved', 'modified', 'deferred'] },
        progress: String,
      },
    ],

    notes: String,
    attachments: [{ name: String, url: String, type: { type: String } }],
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'trainee_records',
  }
);

traineeRecordSchema.index({ traineeId: 1, programId: 1 }, { unique: true });
traineeRecordSchema.index({ 'caseload.beneficiaryId': 1 });

module.exports =
  mongoose.models.TraineeRecord || mongoose.model('TraineeRecord', traineeRecordSchema);
