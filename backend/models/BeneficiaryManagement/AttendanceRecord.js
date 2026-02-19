/**
 * AttendanceRecord.js - Attendance Tracking Model
 * Records daily attendance with alerts and analytics
 * 
 * @module models/BeneficiaryManagement/AttendanceRecord
 */

const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: [true, 'Beneficiary ID is required'],
    index: true
  },

  // Attendance Details
  attendanceDate: {
    type: Date,
    required: [true, 'Attendance date is required'],
    index: true
  },

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: [true, 'Status is required']
  },

  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },

  courseCode: String,
  courseName: String,

  // Time Details
  checkInTime: Date,
  checkOutTime: Date,
  expectedCheckInTime: Date,

  // Additional Information
  notes: {
    type: String,
    maxlength: 500
  },

  recordedBy: {
    type: String,
    required: [true, 'Recorded by is required'],
    default: 'system'
  },

  // Alerts & Flags
  attendanceAlert: {
    type: Boolean,
    default: false
  },

  alertReason: {
    type: String,
    enum: ['low_attendance', 'consecutive_absences', 'threshold_breach', 'none'],
    default: 'none'
  },

  // Consecutive Absence Tracking
  consecutiveAbsences: {
    count: {
      type: Number,
      default: 0
    },
    startDate: Date,
    notified: {
      type: Boolean,
      default: false
    }
  },

  // Audit
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
    timestamp: { type: Date, default: Date.now },
    changedBy: String,
    details: String
  }]
}, {
  timestamps: true,
  collection: 'attendanceRecords'
});

// Indexes
attendanceRecordSchema.index({ beneficiaryId: 1, attendanceDate: -1 });
attendanceRecordSchema.index({ courseId: 1 });
attendanceRecordSchema.index({ status: 1 });
attendanceRecordSchema.index({ attendanceDate: 1 });
attendanceRecordSchema.index({ attendanceAlert: 1 });
attendanceRecordSchema.index({ 'consecutiveAbsences.count': 1 });

// Pre-save middleware
attendanceRecordSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
attendanceRecordSchema.methods.markPresent = function(checkInTime, checkOutTime) {
  this.status = 'present';
  this.checkInTime = checkInTime;
  this.checkOutTime = checkOutTime;
  this.consecutiveAbsences.count = 0;
  this.attendanceAlert = false;
  this.alertReason = 'none';
  return this.save();
};

attendanceRecordSchema.methods.markAbsent = function(reason = '') {
  this.status = 'absent';
  this.notes = reason;
  
  // Increment consecutive absences
  if (!this.consecutiveAbsences.startDate) {
    this.consecutiveAbsences.startDate = new Date();
  }
  this.consecutiveAbsences.count += 1;

  // Alert if 2 or more consecutive
  if (this.consecutiveAbsences.count >= 2) {
    this.attendanceAlert = true;
    this.alertReason = 'consecutive_absences';
  }

  return this.save();
};

attendanceRecordSchema.methods.markLate = function(checkInTime) {
  this.status = 'late';
  this.checkInTime = checkInTime;
  return this.save();
};

attendanceRecordSchema.methods.markExcused = function(excuseReason) {
  this.status = 'excused';
  this.notes = excuseReason;
  this.consecutiveAbsences.count = 0;
  this.attendanceAlert = false;
  this.alertReason = 'none';
  return this.save();
};

// Statics
attendanceRecordSchema.statics.findByBeneficiary = function(beneficiaryId) {
  return this.find({ beneficiaryId }).sort({ attendanceDate: -1 });
};

attendanceRecordSchema.statics.getAttendanceRate = function(beneficiaryId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        beneficiaryId: mongoose.Types.ObjectId(beneficiaryId),
        attendanceDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        excused: {
          $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        present: 1,
        absent: 1,
        late: 1,
        excused: 1,
        attendanceRate: { $multiply: [{ $divide: ['$present', '$total'] }, 100] }
      }
    }
  ]);
};

attendanceRecordSchema.statics.findAbsencesInPeriod = function(beneficiaryId, startDate, endDate) {
  return this.find({
    beneficiaryId,
    attendanceDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['absent', 'late'] }
  }).sort({ attendanceDate: -1 });
};

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

module.exports = AttendanceRecord;
