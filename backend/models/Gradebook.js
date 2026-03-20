/**
 * نموذج سجل الدرجات
 * Gradebook Model
 */
const mongoose = require('mongoose');

// ── Grade Entry Schema ───────────────────────────────────────
const GradeEntrySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'exam',
        'quiz',
        'assignment',
        'project',
        'participation',
        'attendance',
        'practical',
        'homework',
        'other',
      ],
      required: true,
    },
    title: { type: String, required: [true, 'عنوان الدرجة مطلوب'] },
    maxScore: { type: Number, required: true },
    score: { type: Number, required: true, min: 0 },
    weight: { type: Number, default: 1 },
    date: { type: Date, default: Date.now },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    notes: { type: String },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true }
);

// ── Student Gradebook Schema ─────────────────────────────────
const GradebookSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'الطالب مطلوب'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'المادة مطلوبة'],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: [true, 'العام الدراسي مطلوب'],
    },
    semester: { type: String },
    grade: { type: String },
    section: { type: String },

    // ── Grades ──
    entries: [GradeEntrySchema],

    // ── Calculated Scores ──
    midtermScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    assignmentsScore: { type: Number, default: 0 },
    participationScore: { type: Number, default: 0 },
    practicalScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    letterGrade: {
      type: String,
      enum: [
        'A+',
        'A',
        'A-',
        'B+',
        'B',
        'B-',
        'C+',
        'C',
        'C-',
        'D+',
        'D',
        'F',
        'IP',
        'W',
        'I',
        'N/A',
      ],
      default: 'N/A',
    },
    gpa: { type: Number, default: 0, min: 0, max: 5 },
    descriptiveGrade: {
      type: String,
      enum: ['excellent', 'very_good', 'good', 'acceptable', 'weak', 'fail', 'N/A'],
      default: 'N/A',
    },
    isPassed: { type: Boolean, default: false },

    // ── Attendance ──
    attendance: {
      totalDays: { type: Number, default: 0 },
      presentDays: { type: Number, default: 0 },
      absentDays: { type: Number, default: 0 },
      lateDays: { type: Number, default: 0 },
      excusedAbsences: { type: Number, default: 0 },
      attendanceRate: { type: Number, default: 0 },
    },

    // ── Comments & Behavior ──
    teacherComments: [
      {
        comment: { type: String },
        date: { type: Date, default: Date.now },
        teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: {
          type: String,
          enum: ['academic', 'behavior', 'progress', 'general'],
          default: 'general',
        },
      },
    ],
    behaviorNotes: { type: String },
    strengths: [{ type: String }],
    areasForImprovement: [{ type: String }],
    recommendations: [{ type: String }],

    // ── IEP Reference ──
    iepGoals: [
      {
        goal: { type: String },
        targetScore: { type: Number },
        actualScore: { type: Number },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'achieved', 'not_achieved'],
          default: 'not_started',
        },
      },
    ],

    status: {
      type: String,
      enum: ['active', 'finalized', 'archived'],
      default: 'active',
    },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalizedDate: { type: Date },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

GradebookSchema.index({ student: 1, subject: 1, academicYear: 1, semester: 1 }, { unique: true });
GradebookSchema.index({ teacher: 1, subject: 1, academicYear: 1 });
GradebookSchema.index({ grade: 1, section: 1, academicYear: 1 });
GradebookSchema.index({ letterGrade: 1, isPassed: 1 });

// Auto-calculate scores
GradebookSchema.methods.calculateTotals = function () {
  const entries = this.entries || [];
  if (entries.length === 0) return;

  let weightedSum = 0;
  let totalWeight = 0;

  entries.forEach(entry => {
    const pct = (entry.score / entry.maxScore) * 100;
    weightedSum += pct * entry.weight;
    totalWeight += entry.weight;
  });

  this.percentage = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
  this.totalScore = entries.reduce((s, e) => s + e.score, 0);

  // Letter grade mapping
  const p = this.percentage;
  if (p >= 95) this.letterGrade = 'A+';
  else if (p >= 90) this.letterGrade = 'A';
  else if (p >= 85) this.letterGrade = 'A-';
  else if (p >= 80) this.letterGrade = 'B+';
  else if (p >= 75) this.letterGrade = 'B';
  else if (p >= 70) this.letterGrade = 'B-';
  else if (p >= 65) this.letterGrade = 'C+';
  else if (p >= 60) this.letterGrade = 'C';
  else if (p >= 55) this.letterGrade = 'C-';
  else if (p >= 50) this.letterGrade = 'D+';
  else if (p >= 45) this.letterGrade = 'D';
  else this.letterGrade = 'F';

  // GPA (5-point scale)
  const gpaMap = {
    'A+': 5.0,
    A: 4.75,
    'A-': 4.5,
    'B+': 4.0,
    B: 3.5,
    'B-': 3.0,
    'C+': 2.5,
    C: 2.0,
    'C-': 1.5,
    'D+': 1.0,
    D: 0.5,
    F: 0,
  };
  this.gpa = gpaMap[this.letterGrade] || 0;

  // Descriptive grade
  if (p >= 90) this.descriptiveGrade = 'excellent';
  else if (p >= 80) this.descriptiveGrade = 'very_good';
  else if (p >= 70) this.descriptiveGrade = 'good';
  else if (p >= 60) this.descriptiveGrade = 'acceptable';
  else if (p >= 50) this.descriptiveGrade = 'weak';
  else this.descriptiveGrade = 'fail';

  this.isPassed = p >= 50;
};

// ── Semester Report Model ────────────────────────────────────
const SemesterReportSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    semester: { type: String, required: true },
    grade: { type: String },
    section: { type: String },
    subjects: [
      {
        subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        gradebook: { type: mongoose.Schema.Types.ObjectId, ref: 'Gradebook' },
        percentage: { type: Number },
        letterGrade: { type: String },
        gpa: { type: Number },
        isPassed: { type: Boolean },
      },
    ],
    overallGPA: { type: Number, default: 0 },
    overallPercentage: { type: Number, default: 0 },
    rank: { type: Number },
    totalStudents: { type: Number },
    totalAbsences: { type: Number, default: 0 },
    behaviorGrade: { type: String },
    principalComments: { type: String },
    counselorComments: { type: String },
    parentSignature: { type: Boolean, default: false },
    parentSignatureDate: { type: Date },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'sent', 'acknowledged'],
      default: 'draft',
    },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

SemesterReportSchema.index({ student: 1, academicYear: 1, semester: 1 }, { unique: true });

module.exports = {
  Gradebook: mongoose.model('Gradebook', GradebookSchema),
  SemesterReport: mongoose.model('SemesterReport', SemesterReportSchema),
  GradebookSchema,
  SemesterReportSchema,
  GradeEntrySchema,
};
