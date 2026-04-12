'use strict';
/**
 * DddLearningManagement — Mongoose Models & Constants
 * Auto-extracted from services/dddLearningManagement.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const COURSE_CATEGORIES = [
  'physical_therapy',
  'occupational_therapy',
  'speech_therapy',
  'psychology',
  'nursing',
  'medical',
  'administrative',
  'safety_compliance',
  'technology',
  'leadership',
  'patient_communication',
  'cultural_competency',
  'research_methods',
  'ethics',
  'disability_awareness',
  'assistive_technology',
];

const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert', 'all_levels'];

const COURSE_STATUSES = [
  'draft',
  'under_review',
  'published',
  'archived',
  'suspended',
  'updated',
  'retired',
];

const CONTENT_TYPES = [
  'video',
  'document',
  'presentation',
  'interactive',
  'audio',
  'simulation',
  'case_study',
  'live_session',
  'quiz',
  'assignment',
  'discussion',
  'external_link',
  'scorm',
  'vr_module',
];

const ENROLLMENT_STATUSES = [
  'enrolled',
  'in_progress',
  'completed',
  'failed',
  'withdrawn',
  'expired',
  'suspended',
  'waitlisted',
];

const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
  'essay',
  'matching',
  'fill_blank',
  'ordering',
  'case_scenario',
  'image_based',
  'video_based',
];

const DELIVERY_MODES = [
  'self_paced',
  'instructor_led',
  'blended',
  'live_virtual',
  'on_demand',
  'cohort_based',
  'mentored',
  'simulation',
];

const CERTIFICATE_TYPES = [
  'completion',
  'competency',
  'specialization',
  'accredited',
  'micro_credential',
  'professional',
];

/* ── Built-in courses ───────────────────────────────────────────────────── */
const BUILTIN_COURSES = [
  {
    code: 'CRS-ORIENT',
    title: 'Platform Orientation',
    titleAr: 'التهيئة للمنصة',
    category: 'administrative',
    level: 'beginner',
    deliveryMode: 'self_paced',
    durationHours: 2,
  },
  {
    code: 'CRS-PT-FUND',
    title: 'Physical Therapy Fundamentals',
    titleAr: 'أساسيات العلاج الطبيعي',
    category: 'physical_therapy',
    level: 'beginner',
    deliveryMode: 'blended',
    durationHours: 40,
  },
  {
    code: 'CRS-OT-FUND',
    title: 'Occupational Therapy Fundamentals',
    titleAr: 'أساسيات العلاج الوظيفي',
    category: 'occupational_therapy',
    level: 'beginner',
    deliveryMode: 'blended',
    durationHours: 40,
  },
  {
    code: 'CRS-SLP-FUND',
    title: 'Speech-Language Pathology Basics',
    titleAr: 'أساسيات أمراض النطق واللغة',
    category: 'speech_therapy',
    level: 'beginner',
    deliveryMode: 'blended',
    durationHours: 40,
  },
  {
    code: 'CRS-ASSESS',
    title: 'Clinical Assessment Techniques',
    titleAr: 'تقنيات التقييم السريري',
    category: 'medical',
    level: 'intermediate',
    deliveryMode: 'instructor_led',
    durationHours: 24,
  },
  {
    code: 'CRS-ETHICS',
    title: 'Healthcare Ethics & Compliance',
    titleAr: 'أخلاقيات الرعاية الصحية والامتثال',
    category: 'ethics',
    level: 'all_levels',
    deliveryMode: 'self_paced',
    durationHours: 8,
  },
  {
    code: 'CRS-SAFETY',
    title: 'Patient Safety & Infection Control',
    titleAr: 'سلامة المريض ومكافحة العدوى',
    category: 'safety_compliance',
    level: 'all_levels',
    deliveryMode: 'self_paced',
    durationHours: 6,
  },
  {
    code: 'CRS-TELE',
    title: 'Tele-Rehabilitation Best Practices',
    titleAr: 'أفضل ممارسات التأهيل عن بعد',
    category: 'technology',
    level: 'intermediate',
    deliveryMode: 'self_paced',
    durationHours: 12,
  },
  {
    code: 'CRS-ARVR',
    title: 'AR/VR in Rehabilitation',
    titleAr: 'الواقع المعزز والافتراضي في التأهيل',
    category: 'assistive_technology',
    level: 'advanced',
    deliveryMode: 'blended',
    durationHours: 16,
  },
  {
    code: 'CRS-DISAB',
    title: 'Disability Awareness & Advocacy',
    titleAr: 'التوعية بالإعاقة والمناصرة',
    category: 'disability_awareness',
    level: 'all_levels',
    deliveryMode: 'self_paced',
    durationHours: 10,
  },
  {
    code: 'CRS-LEAD',
    title: 'Clinical Leadership',
    titleAr: 'القيادة السريرية',
    category: 'leadership',
    level: 'advanced',
    deliveryMode: 'cohort_based',
    durationHours: 30,
  },
  {
    code: 'CRS-RESEARCH',
    title: 'Evidence-Based Practice',
    titleAr: 'الممارسة المبنية على الأدلة',
    category: 'research_methods',
    level: 'intermediate',
    deliveryMode: 'blended',
    durationHours: 20,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Course ────────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const moduleContentSchema = new Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    contentType: { type: String, enum: CONTENT_TYPES, required: true },
    duration: { type: Number, default: 0 },
    url: { type: String },
    content: { type: String },
    isRequired: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: true }
);

const courseModuleSchema = new Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    contents: [moduleContentSchema],
    quizId: { type: Schema.Types.ObjectId, ref: 'DDDQuiz' },
    passingScore: { type: Number },
    isRequired: { type: Boolean, default: true },
  },
  { _id: true }
);

const courseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    category: { type: String, enum: COURSE_CATEGORIES, required: true },
    level: { type: String, enum: COURSE_LEVELS, default: 'all_levels' },
    status: { type: String, enum: COURSE_STATUSES, default: 'draft' },
    deliveryMode: { type: String, enum: DELIVERY_MODES, default: 'self_paced' },
    durationHours: { type: Number, default: 0 },
    modules: [courseModuleSchema],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'DDDCourse' }],
    tags: [{ type: String }],
    thumbnail: { type: String },
    instructor: { type: Schema.Types.ObjectId, ref: 'User' },
    maxEnrollments: { type: Number },
    enrollmentCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    certificateType: { type: String, enum: CERTIFICATE_TYPES },
    ceuCredits: { type: Number, default: 0 },
    publishedAt: { type: Date },
    retiredAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

courseSchema.index({ category: 1, level: 1, status: 1 });
courseSchema.index({ code: 1 });

const learningPathSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    category: { type: String, enum: COURSE_CATEGORIES },
    level: { type: String, enum: COURSE_LEVELS, default: 'all_levels' },
    status: { type: String, enum: ['draft', 'active', 'archived', 'retired'], default: 'draft' },
    courses: [
      {
        courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse', required: true },
        order: { type: Number, required: true },
        isRequired: { type: Boolean, default: true },
      },
    ],
    totalDurationHours: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },
    targetRoles: [{ type: String }],
    certificateType: { type: String, enum: CERTIFICATE_TYPES },
    ceuCredits: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDLearningPath =
  mongoose.models.DDDLearningPath || mongoose.model('DDDLearningPath', learningPathSchema);

/* ── Enrollment ────────────────────────────────────────────────────────── */
const moduleProgressSchema = new Schema(
  {
    moduleId: { type: Schema.Types.ObjectId },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'skipped'],
      default: 'not_started',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    quizScore: { type: Number },
    quizPassed: { type: Boolean },
    timeSpent: { type: Number, default: 0 },
  },
  { _id: true }
);

const enrollmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse', required: true, index: true },
    learningPathId: { type: Schema.Types.ObjectId, ref: 'DDDLearningPath' },
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'enrolled' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    moduleProgress: [moduleProgressSchema],
    startedAt: { type: Date },
    completedAt: { type: Date },
    expiresAt: { type: Date },
    finalScore: { type: Number },
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: { type: String },
    certificateIssuedAt: { type: Date },
    totalTimeSpent: { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

enrollmentSchema.index({ status: 1, userId: 1 });
enrollmentSchema.index({ courseId: 1, status: 1 });

const DDDEnrollment =
  mongoose.models.DDDEnrollment || mongoose.model('DDDEnrollment', enrollmentSchema);

/* ── Quiz ──────────────────────────────────────────────────────────────── */
const questionSchema = new Schema(
  {
    order: { type: Number, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    text: { type: String, required: true },
    textAr: { type: String },
    options: [
      {
        label: { type: String },
        labelAr: { type: String },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    correctAnswer: { type: String },
    explanation: { type: String },
    explanationAr: { type: String },
    points: { type: Number, default: 1 },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    imageUrl: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String },
    courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse', index: true },
    moduleIndex: { type: Number },
    questions: [questionSchema],
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 70 },
    timeLimit: { type: Number },
    maxAttempts: { type: Number, default: 3 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);


/* ═══════════════════ Models ═══════════════════ */

const DDDCourse = mongoose.models.DDDCourse || mongoose.model('DDDCourse', courseSchema);

/* ── Learning Path ─────────────────────────────────────────────────────── */
const DDDQuiz = mongoose.models.DDDQuiz || mongoose.model('DDDQuiz', quizSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  COURSE_STATUSES,
  CONTENT_TYPES,
  ENROLLMENT_STATUSES,
  QUESTION_TYPES,
  DELIVERY_MODES,
  CERTIFICATE_TYPES,
  BUILTIN_COURSES,
  DDDCourse,
  DDDLearningPath,
  DDDEnrollment,
  DDDQuiz,
};
