/**
 * AttendanceService.js - Beneficiary Attendance Management Service
 * Handles attendance tracking, reporting, and alert generation
 *
 * @module services/AttendanceService
 * @requires mongoose
 */

const EventEmitter = require('events');

class AttendanceService extends EventEmitter {
  /**
   * Initialize AttendanceService with database connection
   * @param {Object} db - Database connection
   */
  constructor(db) {
    super();
    this.db = db;
    this.attendanceCollection = 'attendanceRecords';
    this.alertThreshold = 0.75; // 75% attendance threshold
  }

  /**
   * Record attendance for a beneficiary
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} attendanceData - Attendance data
   * @param {string} attendanceData.date - Attendance date
   * @param {string} attendanceData.status - 'present', 'absent', 'late', 'excused'
   * @param {string} attendanceData.courseId - Course ID
   * @param {string} attendanceData.notes - Additional notes
   * @returns {Promise<Object>} Created attendance record
   */
  async recordAttendance(beneficiaryId, attendanceData) {
    try {
      // Validation
      if (!beneficiaryId || !attendanceData) {
        throw new Error('beneficiaryId and attendanceData are required');
      }

      const validStatuses = ['present', 'absent', 'late', 'excused'];
      if (!validStatuses.includes(attendanceData.status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Prepare record
      const record = {
        beneficiaryId,
        date: new Date(attendanceData.date),
        status: attendanceData.status,
        courseId: attendanceData.courseId,
        notes: attendanceData.notes || '',
        recordedBy: attendanceData.recordedBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        auditLog: [
          {
            action: 'RECORD_CREATED',
            user: attendanceData.recordedBy || 'system',
            timestamp: new Date(),
            changes: 'Attendance record created'
          }
        ]
      };

      // Save to database
      const saved = await this.db.collection(this.attendanceCollection).insertOne(record);

      // Emit event
      this.emit('attendance:recorded', {
        beneficiaryId,
        status: attendanceData.status,
        date: attendanceData.date,
        recordId: saved.insertedId
      });

      // Check if alert needed
      if (attendanceData.status === 'absent' || attendanceData.status === 'late') {
        this.emit('attendance:alert', {
          beneficiaryId,
          alertType: attendanceData.status.toUpperCase(),
          date: attendanceData.date,
          message: `Attendance alert: ${attendanceData.status} on ${attendanceData.date}`
        });
      }

      return {
        status: 'success',
        message: 'Attendance recorded successfully',
        data: { recordId: saved.insertedId, ...record },
        timestamp: new Date()
      };

    } catch (error) {
      this.emit('attendance:error', {
        action: 'recordAttendance',
        error: error.message,
        beneficiaryId
      });

      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get attendance report for a beneficiary
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Report options
   * @param {string} options.startDate - Start date
   * @param {string} options.endDate - End date
   * @param {string} options.courseId - Optional course ID
   * @returns {Promise<Object>} Attendance report
   */
  async getAttendanceReport(beneficiaryId, options = {}) {
    try {
      if (!beneficiaryId) {
        throw new Error('beneficiaryId is required');
      }

      // Build query
      const query = { beneficiaryId };

      if (options.startDate || options.endDate) {
        query.date = {};
        if (options.startDate) {
          query.date.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
          query.date.$lte = new Date(options.endDate);
        }
      }

      if (options.courseId) {
        query.courseId = options.courseId;
      }

      // Get records
      const records = await this.db.collection(this.attendanceCollection)
        .find(query)
        .sort({ date: -1 })
        .toArray();

      // Calculate statistics
      const stats = this.calculateAttendanceStatistics(records);

      return {
        status: 'success',
        message: 'Attendance report retrieved',
        data: {
          beneficiaryId,
          totalRecords: records.length,
          statistics: stats,
          records: records.slice(0, 100), // Limit to last 100 records
          reportDate: new Date(),
          periodFrom: options.startDate,
          periodTo: options.endDate
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check attendance threshold and generate alerts
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Options
   * @param {string} options.period - 'semester' or 'year'
   * @returns {Promise<Object>} Alert report
   */
  async checkAttendanceThreshold(beneficiaryId, options = {}) {
    try {
      if (!beneficiaryId) {
        throw new Error('beneficiaryId is required');
      }

      const period = options.period || 'semester';

      // Get attendance records for period
      const records = await this.db.collection(this.attendanceCollection)
        .find({ beneficiaryId })
        .toArray();

      if (records.length === 0) {
        return {
          status: 'success',
          message: 'No attendance records found',
          data: {
            beneficiaryId,
            statusOk: true,
            alerts: []
          },
          timestamp: new Date()
        };
      }

      // Calculate attendance rate
      const presentCount = records.filter(r => r.status === 'present').length;
      const validCount = records.filter(r => r.status !== 'excused').length;
      const attendanceRate = validCount > 0 ? presentCount / validCount : 0;

      const alerts = [];

      // Check thresholds
      if (attendanceRate < this.alertThreshold) {
        alerts.push({
          severity: 'HIGH',
          type: 'LOW_ATTENDANCE',
          message: `Attendance rate (${(attendanceRate * 100).toFixed(2)}%) is below threshold (${(this.alertThreshold * 100)}%)`,
          attendanceRate,
          threshold: this.alertThreshold,
          recordCount: records.length,
          presentDays: presentCount
        });

        this.emit('attendance:threshold-alert', {
          beneficiaryId,
          attendanceRate,
          threshold: this.alertThreshold,
          severity: 'HIGH'
        });
      }

      // Check for consecutive absences
      const consecutiveAbsences = this.findConsecutiveAbsences(records);
      if (consecutiveAbsences.length > 0) {
        alerts.push({
          severity: 'MEDIUM',
          type: 'CONSECUTIVE_ABSENCES',
          message: `${consecutiveAbsences.length} consecutive absence(s) detected`,
          consecutiveAbsences
        });
      }

      return {
        status: 'success',
        message: alerts.length > 0 ? 'Alerts generated' : 'No alerts - attendance is acceptable',
        data: {
          beneficiaryId,
          statusOk: alerts.length === 0,
          attendanceRate: (attendanceRate * 100).toFixed(2) + '%',
          presentDays: presentCount,
          totalRecords: records.length,
          alerts,
          period
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Bulk upload attendance records
   * @async
   * @param {Array<Object>} records - Array of attendance records
   * @returns {Promise<Object>} Upload result
   */
  async bulkUploadAttendance(records) {
    try {
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Records must be non-empty array');
      }

      // Validate records
      const validRecords = [];
      const errors = [];

      records.forEach((record, index) => {
        try {
          if (!record.beneficiaryId || !record.date || !record.status) {
            errors.push(`Record ${index + 1}: Missing required fields`);
            return;
          }

          validRecords.push({
            ...record,
            createdAt: new Date(),
            updatedAt: new Date(),
            auditLog: [{
              action: 'BULK_UPLOAD',
              timestamp: new Date()
            }]
          });
        } catch (e) {
          errors.push(`Record ${index + 1}: ${e.message}`);
        }
      });

      if (validRecords.length === 0) {
        throw new Error(`No valid records to upload. Errors: ${errors.join('; ')}`);
      }

      // Insert all records
      const result = await this.db.collection(this.attendanceCollection)
        .insertMany(validRecords);

      this.emit('attendance:bulk-upload', {
        uploadedCount: validRecords.length,
        totalCount: records.length,
        errors: errors.length > 0 ? errors : null
      });

      return {
        status: 'success',
        message: `${validRecords.length} attendance records uploaded successfully`,
        data: {
          uploadedCount: validRecords.length,
          totalCount: records.length,
          failedCount: records.length - validRecords.length,
          errors: errors.length > 0 ? errors.slice(0, 10) : []
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate attendance statistics
   * @private
   * @param {Array<Object>} records - Attendance records
   * @returns {Object} Statistics
   */
  calculateAttendanceStatistics(records) {
    if (records.length === 0) {
      return {
        totalSessions: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: '0%',
        absenceRate: '0%'
      };
    }

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;
    const validRecords = records.filter(r => r.status !== 'excused');

    const attendanceRate = validRecords.length > 0
      ? ((present / validRecords.length) * 100).toFixed(2)
      : 0;

    const absenceRate = validRecords.length > 0
      ? ((absent / validRecords.length) * 100).toFixed(2)
      : 0;

    return {
      totalSessions: records.length,
      present,
      absent,
      late,
      excused,
      attendanceRate: attendanceRate + '%',
      absenceRate: absenceRate + '%',
      averageAttendance: attendanceRate
    };
  }

  /**
   * Find consecutive absences in records
   * @private
   * @param {Array<Object>} records - Sorted attendance records
   * @returns {Array<Array<Object>>} Groups of consecutive absences
   */
  findConsecutiveAbsences(records) {
    const sorted = records.sort((a, b) => new Date(a.date) - new Date(b.date));
    const absences = [];
    let consecutiveGroup = [];

    sorted.forEach((record, index) => {
      if (record.status === 'absent') {
        if (consecutiveGroup.length === 0 ||
            this.areDatesConsecutive(consecutiveGroup[consecutiveGroup.length - 1].date, record.date)) {
          consecutiveGroup.push(record);
        } else {
          if (consecutiveGroup.length >= 2) {
            absences.push(consecutiveGroup);
          }
          consecutiveGroup = [record];
        }
      } else {
        if (consecutiveGroup.length >= 2) {
          absences.push(consecutiveGroup);
        }
        consecutiveGroup = [];
      }
    });

    if (consecutiveGroup.length >= 2) {
      absences.push(consecutiveGroup);
    }

    return absences;
  }

  /**
   * Check if dates are consecutive (within 1-2 school days)
   * @private
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} True if dates are consecutive
   */
  areDatesConsecutive(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Consider school days (skip weekends)
    return diffDays <= 2;
  }

  /**
   * Export attendance data to CSV format
   * @async
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} CSV formatted data
   */
  async exportAttendanceData(beneficiaryId, options = {}) {
    try {
      const report = await this.getAttendanceReport(beneficiaryId, options);

      if (report.status !== 'success') {
        throw new Error('Failed to generate attendance report');
      }

      const records = report.data.records;
      const csvHeader = 'Date,Status,Course ID,Notes\n';
      const csvRows = records.map(r =>
        `${r.date.toISOString().split('T')[0]},${r.status},${r.courseId || 'N/A'},${r.notes || ''}`
      ).join('\n');

      return {
        status: 'success',
        message: 'Attendance data exported to CSV',
        data: {
          csv: csvHeader + csvRows,
          recordCount: records.length
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        data: null,
        timestamp: new Date()
      };
    }
  }
}

module.exports = AttendanceService;
