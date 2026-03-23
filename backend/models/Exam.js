/**
 * نموذج الاختبارات والتقويم
 * Exam / Assessment Model
 */
const mongoose = require('mongoose');

// ── Question Schema ──────────────────────────────────────────
const QuestionSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    text: { type: String, required: [true, 'نص السؤال مطلوب'] },
    type: {
      type: String,
      enum: [
        'multiple_choice',
        'true_false',
        'short_answer',
        'essay',
        'matching',
        'fill_blank',
        'ordering',
        'practical',
      ],
      required: true,
    },
    options: [
      {
        text: { type: String },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    correctAnswer: { type: String },
    matchingPairs: [{ left: String, right: String }],
    points: { type: Number, required: true, min: 0 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    bloomLevel: {
      type: String,
      enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
      default: 'remember',
    },
    hint: { type: String },
    explanation: { type: String },
    imageUrl: { type: String },
    audioUrl: { type: String },
    adaptations: {
      simplifiedVersion: { type: String },
      hasAudioRead: { type: Boolean, default: false },
      extraTime: { type: Boolean, default: false },
      largeFont: { type: Boolean, default: false },
    },
    tags: [{ type: String }],
  },
  { _id: true }
);

// ── Exam Schema ──────────────────────────────────────────────
const ExamSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'عنوان الاختبار مطلوب'],
      trim: true,
    },
    titleEn: { type: String, trim: true },
    description: { type: String },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'المادة مطلوبة'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'المعلم مطلوب'],
    },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    semester: { type: String },
    grade: { type: String },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom' },
    curriculum: { type: mongoose.Schema.Types.ObjectId, ref: 'Curriculum' },
    type: {
      type: String,
      enum: [
        'quiz',
        'midterm',
        'final',
        'diagnostic',
        'formative',
        'summative',
        'practical',
        'oral',
        'project',
      ],
      required: [true, 'نوع الاختبار مطلوب'],
    },
    questions: [QuestionSchema],
    totalPoints: { type: Number, default: 0 },
    passingScore: { type: Number, default: 50 },
    duration: { type: Number, default: 60 }, // minutes
    scheduledDate: { type: Date },
    scheduledStartTime: { type: String },
    scheduledEndTime: { type: String },

    // ── Settings ──
    settings: {
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      showResults: { type: Boolean, default: true },
      showCorrectAnswers: { type: Boolean, default: false },
      allowRetake: { type: Boolean, default: false },
      maxRetakes: { type: Number, default: 0 },
      isOnline: { type: Boolean, default: false },
      requireProctoring: { type: Boolean, default: false },
      autoGrade: { type: Boolean, default: true },
    },

    // ── Accommodations ──
    accommodations: {
      extraTimePercentage: { type: Number, default: 0 },
      allowCalculator: { type: Boolean, default: false },
      allowDictionary: { type: Boolean, default: false },
      largeFont: { type: Boolean, default: false },
      audioInstructions: { type: Boolean, default: false },
      scribe: { type: Boolean, default: false },
      separateRoom: { type: Boolean, default: false },
      breakAllowed: { type: Boolean, default: false },
    },

    status: {
      type: String,
      enum: ['draft', 'ready', 'scheduled', 'in_progress', 'completed', 'graded', 'archived'],
      default: 'draft',
    },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

// ── Exam Submission Schema ───────────────────────────────────
const ExamSubmissionSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId },
        answer: { type: mongoose.Schema.Types.Mixed },
        isCorrect: { type: Boolean },
        pointsAwarded: { type: Number, default: 0 },
        feedback: { type: String },
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        gradedAt: { type: Date },
      },
    ],
    totalScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    grade: { type: String },
    isPassed: { type: Boolean, default: false },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    timeSpent: { type: Number, default: 0 }, // seconds
    attemptNumber: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'graded', 'returned'],
      default: 'not_started',
    },
    teacherComments: { type: String },
    accommodationsUsed: [{ type: String }],
  },
  { timestamps: true }
);

ExamSchema.index({ title: 'text', titleEn: 'text', tags: 'text' });
ExamSchema.index({ subject: 1, academicYear: 1, type: 1 });
ExamSchema.index({ teacher: 1, status: 1 });
ExamSchema.index({ scheduledDate: 1 });

ExamSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });
ExamSubmissionSchema.index({ student: 1, status: 1 });

// Auto-calculate totalPoints
ExamSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }
  next();
});

module.exports = {
  Exam: mongoose.models.Exam || mongoose.model('Exam', ExamSchema),
  ExamSubmission: mongoose.models.ExamSubmission || mongoose.model('ExamSubmission', ExamSubmissionSchema),
  ExamSchema,
  ExamSubmissionSchema,
  QuestionSchema,
};
