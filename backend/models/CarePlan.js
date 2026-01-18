const mongoose = require('mongoose');

// --- SHARED SCHEMAS ---

const goalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['ACADEMIC', 'BEHAVIORAL', 'COMMUNICATION', 'MOTOR', 'SPEECH', 'SOCIAL', 'LIFE_SKILL', 'OTHER'],
    required: true,
  },
  baseline: String, // Description of current level
  target: String, // Annual or long-term target
  criteria: String, // e.g. "80% accuracy"
  startDate: Date,
  targetDate: Date,
  status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'ACHIEVED', 'DISCONTINUED'], default: 'PENDING' },
  progress: { type: Number, default: 0 }, // Percentage
});

const sectionSchema = new mongoose.Schema({
  assessments: [String], // List of assessments used
  specialist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Responsible staff
  goals: [goalSchema],
  frequency: String, // e.g. "3 sessions per week"
  notes: String,
});

// --- MAIN SCHEMA ---

const carePlanSchema = new mongoose.Schema(
  {
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Meta
    planNumber: { type: String, unique: true },
    startDate: { type: Date, required: true },
    reviewDate: Date,
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'DRAFT' },

    // 1. Educational Plan (IEP)
    educational: {
      enabled: { type: Boolean, default: false },
      domains: {
        academic: sectionSchema,
        classroom: sectionSchema,
        communication: sectionSchema,
      },
    },

    // 2. Therapeutic Plan
    therapeutic: {
      enabled: { type: Boolean, default: false },
      domains: {
        speech: sectionSchema,
        occupational: sectionSchema,
        physical: sectionSchema,
        behavioral: sectionSchema,
        psychological: sectionSchema,
      },
    },

    // 3. Life Skills Plan
    lifeSkills: {
      enabled: { type: Boolean, default: false },
      domains: {
        selfCare: sectionSchema,
        homeSkills: sectionSchema,
        social: sectionSchema,
        transport: sectionSchema,
        financial: sectionSchema,
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('CarePlan', carePlanSchema);
