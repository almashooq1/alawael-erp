/**
 * نموذج المادة الدراسية
 * Subject / Course Model
 */
const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم المادة مطلوب'],
      trim: true,
    },
    nameEn: { type: String, trim: true },
    code: {
      type: String,
      required: [true, 'رمز المادة مطلوب'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String },
    department: {
      type: String,
      enum: [
        'islamic_studies',
        'arabic',
        'english',
        'math',
        'science',
        'social_studies',
        'computer_science',
        'physical_education',
        'art',
        'life_skills',
        'special_education',
        'rehabilitation',
        'vocational',
        'montessori',
        'other',
      ],
      required: [true, 'القسم مطلوب'],
    },
    type: {
      type: String,
      enum: ['core', 'elective', 'remedial', 'enrichment', 'vocational', 'therapy'],
      default: 'core',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
      default: 'mixed',
    },
    creditHours: { type: Number, default: 0 },
    weeklyPeriods: { type: Number, default: 0, min: 0, max: 20 },
    periodDuration: { type: Number, default: 45 }, // minutes
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    objectives: [{ type: String }],
    learningOutcomes: [{ type: String }],
    assessmentCriteria: {
      midtermWeight: { type: Number, default: 20 },
      finalWeight: { type: Number, default: 40 },
      assignmentsWeight: { type: Number, default: 20 },
      participationWeight: { type: Number, default: 10 },
      practicalWeight: { type: Number, default: 10 },
    },
    targetDisabilities: [
      {
        type: String,
        enum: [
          'intellectual',
          'autism',
          'down_syndrome',
          'cerebral_palsy',
          'learning_disability',
          'speech_impairment',
          'hearing_impairment',
          'visual_impairment',
          'physical_disability',
          'multiple_disabilities',
          'all',
        ],
      },
    ],
    adaptations: {
      hasSimplifiedVersion: { type: Boolean, default: false },
      hasAudioVersion: { type: Boolean, default: false },
      hasBrailleVersion: { type: Boolean, default: false },
      hasSignLanguage: { type: Boolean, default: false },
      hasVisualAids: { type: Boolean, default: true },
      maxGroupSize: { type: Number, default: 15 },
    },
    resources: [
      {
        title: { type: String },
        type: {
          type: String,
          enum: ['textbook', 'workbook', 'video', 'audio', 'interactive', 'tool', 'other'],
        },
        url: { type: String },
        isRequired: { type: Boolean, default: false },
      },
    ],
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#1976d2' },
    icon: { type: String, default: 'book' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

SubjectSchema.index({ name: 'text', nameEn: 'text', code: 'text' });
SubjectSchema.index({ department: 1, isActive: 1 });
SubjectSchema.index({ type: 1 });

module.exports = mongoose.model('Subject', SubjectSchema);
