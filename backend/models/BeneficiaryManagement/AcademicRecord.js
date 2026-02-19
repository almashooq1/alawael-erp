/**
 * AcademicRecord.js - Academic History & Enrollment Model
 * Tracks academic progress, courses, and enrollment information
 *
 * @module models/BeneficiaryManagement/AcademicRecord
 */

const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Enrollment Information
  enrollmentStatus: {
    type: String,
    enum: ['enrolled', 'completed', 'deferred', 'withdrawn', 'graduated'],
    default: 'enrolled'
  },
  enrollmentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  completionDate: Date,

  // Program Details
  programName: {
    type: String,
    required: [true, 'Program name is required']
  },
  degree: {
    type: String,
    required: [true, 'Degree type is required'],
    enum: ['Certificate', 'Diploma', 'Bachelor', 'Master', 'Professional']
  },
  major: String,
  specialization: String,

  // GPA & Academic Standing
  cumulativeGPA: {
    type: Number,
    min: 0,
    max: 4.0,
    default: 0
  },
  academicStanding: {
    type: String,
    enum: ['Excellent', 'Good', 'Satisfactory', 'Below Standards'],
    default: 'Satisfactory'
  },

  // Course Management
  completedCourses: [{
    courseId: mongoose.Schema.Types.ObjectId,
    courseCode: String,
    courseName: String,
    credits: Number,
    grade: String,
    gradePoint: Number,
    completedDate: Date
  }],

  currentCoursesEnrolled: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    courseCode: String,
    courseName: String,
    credits: Number,
    enrollmentDate: Date,
    status: {
      type: String,
      enum: ['enrolled', 'completed', 'dropped'],
      default: 'enrolled'
    }
  }],

  remainingCoursesRequired: {
    type: Number,
    default: 0
  },

  totalCreditsEarned: {
    type: Number,
    default: 0
  },

  totalCreditsRequired: {
    type: Number,
    required: true,
    default: 120
  },

  // Academic Progress
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Semester History
  semesterId: {
    type: String,
    required: [true, 'Semester ID is required']
  },

  // Transcript Information
  transcriptAvailable: {
    type: Boolean,
    default: false
  },
  transcriptURL: String,

  // Academic Probation & Warnings
  academicProbation: {
    status: {
      type: Boolean,
      default: false
    },
    reason: String,
    startDate: Date,
    endDate: Date
  },

  // Dean's List / Honors
  deansListQualifier: {
    type: Boolean,
    default: false
  },
  honarRoll: {
    type: Boolean,
    default: false
  },

  // Audit Trail
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  auditLog: [{
    action: String,
    performedBy: String,
    timestamp: { type: Date, default: Date.now },
    details: String
  }]
}, {
  timestamps: true,
  collection: 'academicRecords'
});

// Indexes
academicRecordSchema.index({ beneficiaryId: 1 });
academicRecordSchema.index({ enrollmentStatus: 1 });
academicRecordSchema.index({ cumulativeGPA: -1 });
academicRecordSchema.index({ academicStanding: 1 });
academicRecordSchema.index({ semesterId: 1 });
academicRecordSchema.index({ enrollmentDate: -1 });

// Pre-save middleware
academicRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.progressPercentage = (this.totalCreditsEarned / this.totalCreditsRequired) * 100;
  next();
});

// Methods
academicRecordSchema.methods.addCourse = function(courseData) {
  this.currentCoursesEnrolled.push({
    courseId: courseData.courseId,
    courseCode: courseData.courseCode,
    courseName: courseData.courseName,
    credits: courseData.credits,
    enrollmentDate: new Date(),
    status: 'enrolled'
  });
  return this.save();
};

academicRecordSchema.methods.completeCourse = function(courseId, grade, gradePoint) {
  const courseIndex = this.currentCoursesEnrolled.findIndex(c => c.courseId.toString() === courseId.toString());

  if (courseIndex === -1) {
    throw new Error('Course not found in enrolled courses');
  }

  const course = this.currentCoursesEnrolled[courseIndex];

  this.completedCourses.push({
    courseId: course.courseId,
    courseCode: course.courseCode,
    courseName: course.courseName,
    credits: course.credits,
    grade,
    gradePoint,
    completedDate: new Date()
  });

  this.currentCoursesEnrolled.splice(courseIndex, 1);
  this.totalCreditsEarned += course.credits;

  return this.save();
};

academicRecordSchema.methods.updateAcademicStanding = function() {
  if (this.cumulativeGPA >= 3.5) {
    this.academicStanding = 'Excellent';
    this.deansListQualifier = true;
  } else if (this.cumulativeGPA >= 3.0) {
    this.academicStanding = 'Good';
  } else if (this.cumulativeGPA >= 2.0) {
    this.academicStanding = 'Satisfactory';
    this.academicProbation.status = false;
  } else {
    this.academicStanding = 'Below Standards';
    this.academicProbation.status = true;
    this.academicProbation.reason = 'GPA below 2.0';
    this.academicProbation.startDate = new Date();
  }

  return this.save();
};

// Statics
academicRecordSchema.statics.findByBeneficiaryId = function(beneficiaryId) {
  return this.findOne({ beneficiaryId });
};

academicRecordSchema.statics.findGraduates = function() {
  return this.find({ enrollmentStatus: 'graduated' });
};

const AcademicRecord = mongoose.model('AcademicRecord', academicRecordSchema);

module.exports = AcademicRecord;
