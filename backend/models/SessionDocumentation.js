const mongoose = require('mongoose');

// SOAP Note Structure (Subjective, Objective, Assessment, Plan)
const soapNoteSchema = new mongoose.Schema({
  subjective: {
    patientReports: String, // What patient reported
    complaints: [String],
    mood: String, // "Happy", "Anxious", "Depressed", etc.
    cooperation: String, // "Excellent", "Good", "Fair", "Poor"
  },

  objective: {
    observations: String, // Behavioral observations
    performanceMetrics: {
      accuracy: Number, // percentage
      responseTime: Number, // milliseconds or seconds
      repetitionsCompleted: Number,
      assistanceRequired: String, // "None", "Minimal", "Moderate", "Maximum"
    },
    equipment: [String], // Equipment used
    modifications: String, // Modifications made to activity
  },

  assessment: {
    progressSummary: String,
    comparison: String, // vs previous session, baseline, goals
    strengths: [String],
    challenges: [String],
    recommendations: [String],
  },

  plan: {
    nextStepsActivities: [String],
    homeProgram: String, // Exercises for home
    frequency: String, // "3x per week", "Daily", etc.
    recommendations: [String],
    referrals: [String], // Other professionals to refer to
  },
});

const sessionDocumentationSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapySession',
      required: true,
      index: true,
    },

    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryFile',
      required: true,
    },

    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapeuticPlan',
    },

    // SOAP Note Structure
    soapNote: soapNoteSchema,

    // Additional documentation
    documentation: {
      type: String, // Free text notes
      default: '',
    },

    // Goals addressed in this session
    goalsAddressed: [
      {
        goal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
        progressMade: Number, // percentage increase
        status: { type: String, enum: ['NOT_ADDRESSED', 'PARTIAL', 'FULL'], default: 'PARTIAL' },
      },
    ],

    // Media attachments
    attachments: [
      {
        type: String, // File path/URL
        mediaType: String, // "image", "video", "audio", "document"
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Outcome measures (if applicable)
    outcomeMeasures: [
      {
        measureName: String, // e.g., "FIM Score", "GMFM"
        score: Number,
        date: Date,
      },
    ],

    // Session compliance/certification
    documentedAt: { type: Date, default: Date.now },
    documentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    }, // May be different from therapist (supervisor)

    // Risk assessment (if needed)
    riskFlags: [
      {
        riskType: String, // "Safety", "Compliance", "Medical"
        description: String,
        escalated: Boolean,
        escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      },
    ],

    // Quality metrics
    quality: {
      isComplete: { type: Boolean, default: false },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      reviewedAt: Date,
      qualityScore: Number, // 1-5
      issuesIdentified: [String],
    },

    // Audit trail
    edits: [
      {
        editedAt: Date,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        changesSummary: String,
      },
    ],
  },
  { timestamps: true },
);

sessionDocumentationSchema.index({ session: 1 });
sessionDocumentationSchema.index({ beneficiary: 1, therapist: 1, createdAt: -1 });
sessionDocumentationSchema.index({ 'quality.isComplete': 1 });

module.exports = mongoose.model('SessionDocumentation', sessionDocumentationSchema);
