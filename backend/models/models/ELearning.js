const mongoose = require('mongoose');

// ============================================
// نموذج الدورة التدريبية - Course Schema
// ============================================
const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان الدورة مطلوب'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'وصف الدورة مطلوب']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['technical', 'management', 'soft-skills', 'compliance', 'accessibility', 'rehabilitation'],
    default: 'technical'
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    hours: { type: Number, default: 0 },
    minutes: { type: Number, default: 0 }
  },

  // دعم ذوي الإعاقة - Accessibility Support
  accessibility: {
    hasSubtitles: { type: Boolean, default: false },
    hasSignLanguage: { type: Boolean, default: false },
    hasAudioDescription: { type: Boolean, default: false },
    hasScreenReaderSupport: { type: Boolean, default: true },
    hasHighContrast: { type: Boolean, default: false }
  },

  thumbnail: { type: String },
  price: { type: Number, default: 0 },
  isPremium: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },

  enrollmentCount: { type: Number, default: 0 },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  tags: [{ type: String }],

  lessons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],

  certificateTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CertificateTemplate'
  },

  settings: {
    allowComments: { type: Boolean, default: true },
    requireQuizPass: { type: Boolean, default: true },
    passingScore: { type: Number, default: 70 },
    allowDownload: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 3 }
  }
}, {
  timestamps: true
});

// Indexes
CourseSchema.index({ title: 'text', description: 'text', tags: 'text' });
CourseSchema.index({ category: 1, isPublished: 1 });
CourseSchema.index({ 'rating.average': -1 });

// ============================================
// نموذج الدرس - Lesson Schema
// ============================================
const LessonSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: [true, 'عنوان الدرس مطلوب'],
    trim: true
  },
  description: { type: String },
  order: { type: Number, required: true, default: 0 },

  type: {
    type: String,
    enum: ['video', 'text', 'quiz', 'interactive', 'document', 'audio'],
    required: true
  },

  content: {
    videoUrl: { type: String },
    textContent: { type: String },
    audioUrl: { type: String },
    documentUrl: { type: String },
    interactiveContent: { type: mongoose.Schema.Types.Mixed }
  },

  // مواد الدعم لذوي الإعاقة - Accessibility Materials
  accessibilityMaterials: {
    subtitlesUrl: { type: String },
    signLanguageVideoUrl: { type: String },
    audioDescriptionUrl: { type: String },
    transcriptUrl: { type: String },
    brailleDocUrl: { type: String }
  },

  duration: {
    minutes: { type: Number, default: 0 }
  },

  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'document', 'audio']
    }
  }],

  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },

  isPreview: { type: Boolean, default: false },
  isMandatory: { type: Boolean, default: true }
}, {
  timestamps: true
});

LessonSchema.index({ course: 1, order: 1 });

// ============================================
// نموذج الاختبار - Quiz Schema
// ============================================
const QuizSchema = new mongoose.Schema({
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  title: {
    type: String,
    required: [true, 'عنوان الاختبار مطلوب']
  },
  description: { type: String },

  type: {
    type: String,
    enum: ['practice', 'assessment', 'final'],
    default: 'practice'
  },

  duration: {
    minutes: { type: Number, default: 30 }
  },

  passingScore: { type: Number, default: 70 },
  maxAttempts: { type: Number, default: 3 },

  questions: [{
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ['multiple-choice', 'true-false', 'short-answer', 'essay', 'matching'],
      required: true
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: { type: String },
    points: { type: Number, default: 1 },
    explanation: { type: String },

    // دعم إمكانية الوصول للأسئلة
    audioUrl: { type: String },
    imageUrl: { type: String },
    imageAlt: { type: String }
  }],

  settings: {
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showCorrectAnswers: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },
    showResults: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// ============================================
// نموذج تسجيل الطالب - Enrollment Schema
// ============================================
const EnrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },

  status: {
    type: String,
    enum: ['enrolled', 'in-progress', 'completed', 'dropped'],
    default: 'enrolled'
  },

  progress: {
    completedLessons: [{
      lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
      completedAt: { type: Date }
    }],
    percentage: { type: Number, default: 0, min: 0, max: 100 }
  },

  quizResults: [{
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    attempts: [{
      score: { type: Number },
      totalPoints: { type: Number },
      percentage: { type: Number },
      answers: [{
        question: { type: String },
        answer: { type: mongoose.Schema.Types.Mixed },
        isCorrect: { type: Boolean }
      }],
      completedAt: { type: Date, default: Date.now }
    }],
    bestScore: { type: Number, default: 0 },
    passed: { type: Boolean, default: false }
  }],

  certificate: {
    issued: { type: Boolean, default: false },
    issuedAt: { type: Date },
    certificateId: { type: String }
  },

  rating: {
    stars: { type: Number, min: 1, max: 5 },
    review: { type: String },
    ratedAt: { type: Date }
  },

  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  lastAccessedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ status: 1, 'progress.percentage': -1 });

// ============================================
// نموذج الشهادة - Certificate Schema
// ============================================
const CertificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },

  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },

  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'Pass'],
    default: 'Pass'
  },

  score: { type: Number },

  verificationCode: {
    type: String,
    required: true,
    unique: true
  },

  pdfUrl: { type: String },

  metadata: {
    instructorName: { type: String },
    courseDuration: { type: Number },
    completionDate: { type: Date }
  }
}, {
  timestamps: true
});

// ============================================
// نموذج مكتبة الوسائط - Media Library Schema
// ============================================
const MediaLibrarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'عنوان الوسائط مطلوب'],
    trim: true
  },
  description: { type: String },

  type: {
    type: String,
    enum: ['video', 'audio', 'document', 'image', 'presentation', 'interactive'],
    required: true
  },

  fileUrl: {
    type: String,
    required: true
  },

  fileSize: { type: Number }, // in bytes
  duration: { type: Number }, // in seconds

  thumbnail: { type: String },

  category: {
    type: String,
    enum: ['educational', 'training', 'tutorial', 'reference', 'accessibility', 'rehabilitation']
  },

  // دعم إمكانية الوصول للوسائط
  accessibilityFeatures: {
    hasSubtitles: { type: Boolean, default: false },
    hasTranscript: { type: Boolean, default: false },
    hasAudioDescription: { type: Boolean, default: false },
    hasSignLanguage: { type: Boolean, default: false },
    isAccessible: { type: Boolean, default: false }
  },

  tags: [{ type: String }],

  relatedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  isPublic: { type: Boolean, default: true },

  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },

  metadata: {
    format: { type: String },
    resolution: { type: String },
    codec: { type: String }
  }
}, {
  timestamps: true
});

MediaLibrarySchema.index({ title: 'text', description: 'text', tags: 'text' });
MediaLibrarySchema.index({ type: 1, category: 1 });

// ============================================
// Methods & Statics
// ============================================

// Course Methods
CourseSchema.methods.updateRating = function (newRating) {
  const totalRating = this.rating.average * this.rating.count + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  return this.save();
};

// Enrollment Methods
EnrollmentSchema.methods.updateProgress = function () {
  // حساب نسبة الإنجاز
  this.progress.percentage = Math.round(
    (this.progress.completedLessons.length / this.course.lessons.length) * 100
  );

  if (this.progress.percentage === 100) {
    this.status = 'completed';
    this.completedAt = new Date();
  } else if (this.progress.percentage > 0) {
    this.status = 'in-progress';
  }

  return this.save();
};

EnrollmentSchema.methods.markLessonComplete = function (lessonId) {
  const alreadyCompleted = this.progress.completedLessons.some(
    cl => cl.lesson.toString() === lessonId.toString()
  );

  if (!alreadyCompleted) {
    this.progress.completedLessons.push({
      lesson: lessonId,
      completedAt: new Date()
    });
  }

  this.lastAccessedAt = new Date();
  return this.updateProgress();
};

// Certificate Methods
CertificateSchema.statics.generateCertificateId = function () {
  return `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

CertificateSchema.statics.generateVerificationCode = function () {
  return Math.random().toString(36).substr(2, 16).toUpperCase();
};

// ============================================
// Models Export
// ============================================
const Course = mongoose.model('Course', CourseSchema);
const Lesson = mongoose.model('Lesson', LessonSchema);
const Quiz = mongoose.model('Quiz', QuizSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
const Certificate = mongoose.model('Certificate', CertificateSchema);
const MediaLibrary = mongoose.model('MediaLibrary', MediaLibrarySchema);

module.exports = {
  Course,
  Lesson,
  Quiz,
  Enrollment,
  Certificate,
  MediaLibrary
};
