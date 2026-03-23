/**
 * نموذج المنهج الدراسي
 * Curriculum Model
 */
const mongoose = require('mongoose');

// ── Lesson Plan Schema ───────────────────────────────────────
const LessonPlanSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true },
    title: { type: String, required: [true, 'عنوان الدرس مطلوب'] },
    titleEn: { type: String },
    objectives: [{ type: String }],
    content: { type: String },
    activities: [{ type: String }],
    teachingMethods: [
      {
        type: String,
        enum: [
          'lecture',
          'discussion',
          'group_work',
          'project_based',
          'hands_on',
          'demonstration',
          'role_play',
          'game_based',
          'peer_teaching',
          'individualized',
          'multisensory',
          'aba_therapy',
          'pecs',
          'social_stories',
        ],
      },
    ],
    resources: [{ title: String, type: String, url: String }],
    assessment: { type: String },
    duration: { type: Number, default: 45 }, // minutes
    homework: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'skipped'],
      default: 'planned',
    },
    completedDate: { type: Date },
  },
  { _id: true }
);

// ── Unit Schema ──────────────────────────────────────────────
const UnitSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: [true, 'عنوان الوحدة مطلوب'] },
    titleEn: { type: String },
    description: { type: String },
    objectives: [{ type: String }],
    learningOutcomes: [{ type: String }],
    estimatedWeeks: { type: Number, default: 2 },
    lessons: [LessonPlanSchema],
    assessmentType: {
      type: String,
      enum: ['quiz', 'test', 'project', 'presentation', 'portfolio', 'observation', 'none'],
      default: 'quiz',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: true }
);

// ── Curriculum Schema ────────────────────────────────────────
const CurriculumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان المنهج مطلوب'],
      trim: true,
    },
    titleEn: { type: String, trim: true },
    description: { type: String },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'المادة الدراسية مطلوبة'],
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'العام الدراسي مطلوب'],
    },
    semester: { type: String },
    grade: {
      type: String,
      enum: [
        'kg1',
        'kg2',
        'grade_1',
        'grade_2',
        'grade_3',
        'grade_4',
        'grade_5',
        'grade_6',
        'grade_7',
        'grade_8',
        'grade_9',
        'grade_10',
        'grade_11',
        'grade_12',
        'special_ed',
        'vocational',
        'mixed',
      ],
      required: [true, 'المرحلة الدراسية مطلوبة'],
    },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    units: [UnitSchema],
    totalWeeks: { type: Number, default: 0 },
    completedWeeks: { type: Number, default: 0 },

    // ── Adaptations for Special Needs ──
    adaptations: {
      difficultyLevel: {
        type: String,
        enum: ['simplified', 'standard', 'advanced'],
        default: 'standard',
      },
      targetDisabilities: [{ type: String }],
      accommodations: [{ type: String }],
      modifications: [{ type: String }],
      assistiveTech: [{ type: String }],
    },

    // ── Metadata ──
    status: {
      type: String,
      enum: ['draft', 'under_review', 'approved', 'active', 'archived'],
      default: 'draft',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedDate: { type: Date },
    version: { type: Number, default: 1 },
    tags: [{ type: String }],
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        type: { type: String },
        size: { type: Number },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

CurriculumSchema.index({ title: 'text', titleEn: 'text', tags: 'text' });
CurriculumSchema.index({ subject: 1, academicYear: 1, grade: 1 });
CurriculumSchema.index({ teacher: 1 });
CurriculumSchema.index({ status: 1 });

module.exports = {
  Curriculum: mongoose.models.Curriculum || mongoose.model('Curriculum', CurriculumSchema),
  CurriculumSchema,
  UnitSchema,
  LessonPlanSchema,
};
