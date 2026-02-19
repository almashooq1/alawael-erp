/**
 * SMART ATTENDANCE & PUNCTUALITY SYSTEM
 * نظام الحضور والانصراف الذكي والمتكامل للطلاب
 *
 * Features:
 * - Real-time attendance tracking (حضور فوري)
 * - Biometric integration (بصمات، وجوه)
 * - Smart notifications & alerts (تنبيهات ذكية)
 * - Predictive analytics (تنبؤات)
 * - Parent/Guardian notifications (تنبيهات الأولياء)
 * - Advanced reporting & insights
 * - Integration with academic system
 * - Behavioral patterns analysis
 * - Automated interventions
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');

class SmartAttendanceService extends EventEmitter {
  constructor() {
    super();
    this.attendanceRecords = new Map();
    this.studentProfiles = new Map();
    this.attendancePatterns = new Map();
    this.alerts = [];
    this.parentNotifications = [];
    this.anomalies = [];
  }

  /**
   * 1. REAL-TIME CHECK-IN/CHECK-OUT
   * تسجيل دخول وخروج الطلاب فوراً
   */
  async recordAttendance(attendanceData) {
    try {
      const {
        studentId,
        checkInTime = new Date(),
        checkOutTime = null,
        method = 'biometric', // biometric, rfid, mobile, manual, face_recognition
        location = 'MAIN_GATE',
        geoLocation = null,
        ipAddress,
        deviceId,
        photoEvidence,
        temperature, // للصحة
        notes,
      } = attendanceData;

      if (!studentId) {
        throw new Error('Student ID is required');
      }

      const recordId = `ATT-${studentId}-${Date.now()}`;
      const record = {
        recordId,
        studentId,
        date: new Date(checkInTime).toDateString(),
        checkInTime,
        checkOutTime,
        duration: null,
        method,
        location,
        geoLocation,
        ipAddress,
        deviceId,
        photoEvidence,
        temperature,
        notes,
        status: 'CHECKED_IN',
        lateFlag: this.isLate(checkInTime),
        earlyCheckOutFlag: false,
        verificationStatus: 'PENDING',
        createdAt: new Date(),
      };

      // Calculate duration if check-out exists
      if (checkOutTime) {
        record.duration = Math.round((new Date(checkOutTime) - new Date(checkInTime)) / 1000 / 60); // minutes
        record.status = 'CHECKED_OUT';
        record.earlyCheckOutFlag = this.isEarlyCheckOut(checkOutTime);
      }

      // Store in database
      this.attendanceRecords.set(recordId, record);

      // Emit event for real-time tracking
      this.emit('attendance-recorded', record);

      // Trigger smart notifications
      await this.triggerSmartNotifications(record);

      // Detect anomalies
      this.detectAnomalies(record);

      return record;
    } catch (error) {
      throw new Error(`Attendance Recording Error: ${error.message}`);
    }
  }

  /**
   * 2. LATE ARRIVAL & EARLY DEPARTURE DETECTION
   */
  isLate(checkInTime) {
    const standardCheckInTime = new Date(checkInTime);
    standardCheckInTime.setHours(8, 0, 0, 0);

    return new Date(checkInTime) > standardCheckInTime;
  }

  isEarlyCheckOut(checkOutTime) {
    const standardCheckOutTime = new Date(checkOutTime);
    standardCheckOutTime.setHours(14, 0, 0, 0);

    return new Date(checkOutTime) < standardCheckOutTime;
  }

  getLateDuration(checkInTime) {
    const standard = new Date(checkInTime);
    standard.setHours(8, 0, 0, 0);

    const checkInDate = new Date(checkInTime);
    if (checkInDate > standard) {
      return Math.round((checkInDate - standard) / 1000 / 60); // minutes
    }
    return 0;
  }

  /**
   * 3. PREDICTIVE ANALYTICS & BEHAVIORAL PATTERNS
   * التنبؤ بسلوك الطلاب والغياب الممكن
   */
  async analyzeAttendancePatterns(studentId, days = 30) {
    try {
      const records = Array.from(this.attendanceRecords.values()).filter(
        r => r.studentId === studentId
      );

      const recentRecords = records.filter(r => {
        const recordDate = new Date(r.date);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return recordDate >= cutoffDate;
      });

      if (recentRecords.length === 0) {
        return { status: 'NO_DATA', message: 'Insufficient attendance data' };
      }

      const analysis = {
        studentId,
        periodDays: days,
        totalDays: recentRecords.length,
        presentDays: recentRecords.filter(r => r.status === 'CHECKED_OUT').length,
        absentDays: 0, // Calculate from academic system
        lateDays: recentRecords.filter(r => r.lateFlag).length,
        earlyDepartures: recentRecords.filter(r => r.earlyCheckOutFlag).length,
        attendanceRate: null,
        patterns: {},
        alerts: [],
        predictions: {},
      };

      // Calculate attendance rate
      analysis.attendanceRate = ((analysis.presentDays / analysis.totalDays) * 100).toFixed(2);

      // Detect patterns
      analysis.patterns = this.detectPatterns(recentRecords);

      // Generate predictions
      analysis.predictions = this.generatePredictions(recentRecords, studentId);

      // Generate alerts based on patterns
      analysis.alerts = this.generateAttendanceAlerts(studentId, analysis);

      return analysis;
    } catch (error) {
      throw new Error(`Pattern Analysis Error: ${error.message}`);
    }
  }

  detectPatterns(records) {
    const patterns = {
      mondayAbsencePattern: false,
      fridayAbsencePattern: false,
      weeklyPattern: {},
      monthlyTrend: 'stable',
      lateArrivalTrend: 'improving',
      consecutiveAbsences: 0,
      cyclicalPattern: null,
    };

    // Group by day of week
    const dayGroups = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    records.forEach(r => {
      const date = new Date(r.checkInTime);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayGroups[day].push(r);
    });

    // Analyze trends
    const mondayPresent = dayGroups.Monday.filter(r => r.status === 'CHECKED_OUT').length;
    const fridayPresent = dayGroups.Friday.filter(r => r.status === 'CHECKED_OUT').length;

    patterns.mondayAbsencePattern = mondayPresent < dayGroups.Monday.length * 0.7;
    patterns.fridayAbsencePattern = fridayPresent < dayGroups.Friday.length * 0.7;

    // Weekly pattern
    Object.keys(dayGroups).forEach(day => {
      const presentCount = dayGroups[day].filter(r => r.status === 'CHECKED_OUT').length;
      patterns.weeklyPattern[day] = {
        total: dayGroups[day].length,
        present: presentCount,
        rate: ((presentCount / (dayGroups[day].length || 1)) * 100).toFixed(2),
      };
    });

    return patterns;
  }

  generatePredictions(records, studentId) {
    const predictions = {
      willeBeAbsentToday: false,
      nextWeekAttendancePrediction: '85%',
      riskOfDropout: 'LOW',
      riskScore: 0,
      confidenceLevel: 0.85,
      recommendedInterventions: [],
    };

    const recentLateDays = records.slice(-5).filter(r => r.lateFlag).length;
    const recentAbsences = records.slice(-5).filter(r => r.status !== 'CHECKED_OUT').length;

    // Calculate risk score
    predictions.riskScore =
      recentAbsences * 0.4 + recentLateDays * 0.2 + (records.length > 0 ? 0 : 0.4);

    if (predictions.riskScore > 2) {
      predictions.riskOfDropout = 'HIGH';
      predictions.recommendedInterventions = [
        'IMMEDIATE_PARENT_CONTACT',
        'COUNSELOR_MEETING',
        'ACADEMIC_SUPPORT',
      ];
    } else if (predictions.riskScore > 1) {
      predictions.riskOfDropout = 'MEDIUM';
      predictions.recommendedInterventions = ['PARENT_NOTIFICATION', 'TEACHER_DISCUSSION'];
    }

    return predictions;
  }

  /**
   * 4. SMART NOTIFICATIONS & ALERTS
   * التنبيهات الذكية والتنبيهات الآلية
   */
  async triggerSmartNotifications(attendanceRecord) {
    try {
      // 1. Late Arrival Notification
      if (attendanceRecord.lateFlag) {
        const lateDuration = this.getLateDuration(attendanceRecord.checkInTime);
        await this.sendNotification({
          type: 'LATE_ARRIVAL',
          studentId: attendanceRecord.studentId,
          title: `تاخر عن الحضور - ${lateDuration} دقيقة`,
          message: `الطالب وصل متأخراً بمدة ${lateDuration} دقيقة`,
          recipients: ['parent', 'teacher', 'admin'],
          priority: 'HIGH',
          timestamp: new Date(),
        });
      }

      // 2. Early Departure Notification
      if (attendanceRecord.earlyCheckOutFlag) {
        await this.sendNotification({
          type: 'EARLY_DEPARTURE',
          studentId: attendanceRecord.studentId,
          title: 'الطالب غادر مبكراً',
          message: 'تنويه: الطالب غادر المدرسة قبل الوقت المحدد',
          recipients: ['parent', 'admin'],
          priority: 'MEDIUM',
          timestamp: new Date(),
        });
      }

      // 3. Health Alert
      if (attendanceRecord.temperature && attendanceRecord.temperature > 37.5) {
        await this.sendNotification({
          type: 'HEALTH_ALERT',
          studentId: attendanceRecord.studentId,
          title: 'تنويه صحي - درجة حرارة مرتفعة',
          message: `درجة الحرارة: ${attendanceRecord.temperature}°`,
          recipients: ['nurse', 'parent', 'admin'],
          priority: 'CRITICAL',
          timestamp: new Date(),
        });
      }

      // 4. Anomaly Detection
      const anomaly = this.detectAnomalies(attendanceRecord);
      if (anomaly.detected) {
        await this.sendNotification({
          type: 'ANOMALY_DETECTED',
          studentId: attendanceRecord.studentId,
          title: 'تنويه نظام: سلوك معاكس',
          message: anomaly.description,
          recipients: ['admin', 'security'],
          priority: 'HIGH',
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('Notification Error:', error.message);
    }
  }

  async sendNotification(notificationData) {
    const notification = {
      id: `NOTIF-${Date.now()}`,
      ...notificationData,
      read: false,
      sentAt: new Date(),
    };

    this.parentNotifications.push(notification);
    this.emit('notification-sent', notification);

    return notification;
  }

  /**
   * 5. ANOMALY DETECTION
   * تحديد السلوكيات المشبوهة أو غير الطبيعية
   */
  detectAnomalies(record) {
    const anomaly = {
      detected: false,
      type: null,
      severity: 'LOW',
      description: null,
    };

    // 1. Same device, multiple students
    const sameDeviceRecords = Array.from(this.attendanceRecords.values()).filter(
      r =>
        r.deviceId === record.deviceId && r.studentId !== record.studentId && r.date === record.date
    );

    if (sameDeviceRecords.length > 2) {
      anomaly.detected = true;
      anomaly.type = 'DEVICE_MISUSE';
      anomaly.severity = 'HIGH';
      anomaly.description = 'تحذير: نفس الجهاز يستخدم من قبل عدة طلاب';
    }

    // 2. Impossible travel time
    if (record.geoLocation) {
      const previousRecords = Array.from(this.attendanceRecords.values()).filter(
        r => r.studentId === record.studentId && new Date(r.date) < new Date(record.date)
      );

      if (previousRecords.length > 0) {
        const lastRecord = previousRecords[previousRecords.length - 1];
        if (lastRecord.geoLocation) {
          const distance = this.calculateDistance(lastRecord.geoLocation, record.geoLocation);
          const timeDiff =
            (new Date(record.checkInTime) - new Date(lastRecord.checkOutTime)) / 1000 / 60;
          const requiredMinutes = (distance / 80) * 60; // 80 km/h max

          if (timeDiff < requiredMinutes) {
            anomaly.detected = true;
            anomaly.type = 'IMPOSSIBLE_TRAVEL';
            anomaly.severity = 'CRITICAL';
            anomaly.description = 'تحذير: سفر مستحيل زمنياً بناءً على المسافة';
          }
        }
      }
    }

    // 3. Repeated late arrivals
    const recentLateCount = Array.from(this.attendanceRecords.values()).filter(
      r =>
        r.studentId === record.studentId &&
        r.lateFlag &&
        new Date(r.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    if (recentLateCount >= 5) {
      anomaly.detected = true;
      anomaly.type = 'REPEATED_TARDINESS';
      anomaly.severity = 'MEDIUM';
      anomaly.description = 'تحذير: تأخر متكرر - قد يشير إلى مشكلة';
    }

    if (anomaly.detected) {
      this.anomalies.push(anomaly);
    }

    return anomaly;
  }

  calculateDistance(coords1, coords2) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth radius in km
    const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
    const dLon = ((coords2.lon - coords1.lon) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords1.lat * Math.PI) / 180) *
        Math.cos((coords2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 6. ATTENDANCE SUMMARY & REPORTS
   * تقارير شاملة عن حضور الطلاب
   */
  async generateAttendanceReport(studentId, startDate, endDate) {
    try {
      const records = Array.from(this.attendanceRecords.values()).filter(r => {
        const recordDate = new Date(r.date);
        return (
          r.studentId === studentId &&
          recordDate >= new Date(startDate) &&
          recordDate <= new Date(endDate)
        );
      });

      const report = {
        studentId,
        period: { startDate, endDate },
        summary: {
          totalDays: records.length,
          presentDays: records.filter(r => r.status === 'CHECKED_OUT').length,
          absentDays: 0,
          lateDays: records.filter(r => r.lateFlag).length,
          earlyDepartures: records.filter(r => r.earlyCheckOutFlag).length,
          attendanceRate: null,
          averageLateMinutes: 0,
          averagePresentDuration: 0,
        },
        details: records,
        recommendations: [],
        generatedAt: new Date(),
      };

      // Calculate percentages
      report.summary.attendanceRate =
        ((report.summary.presentDays / (report.summary.totalDays || 1)) * 100).toFixed(2) + '%';

      // Calculate average late minutes
      const lateDays = records.filter(r => r.lateFlag);
      if (lateDays.length > 0) {
        const totalLateMinutes = lateDays.reduce(
          (sum, r) => sum + this.getLateDuration(r.checkInTime),
          0
        );
        report.summary.averageLateMinutes = (totalLateMinutes / lateDays.length).toFixed(2);
      }

      // Calculate average present duration
      const presentDays = records.filter(r => r.status === 'CHECKED_OUT' && r.duration);
      if (presentDays.length > 0) {
        const totalDuration = presentDays.reduce((sum, r) => sum + r.duration, 0);
        report.summary.averagePresentDuration = (totalDuration / presentDays.length).toFixed(2);
      }

      // Generate recommendations
      const attendancePercentage = parseFloat(report.summary.attendanceRate);
      if (attendancePercentage < 75) {
        report.recommendations.push('تحسين الالتزام بالحضور المنتظم - يحتاج إجراء فوري');
      }
      if (report.summary.lateDays > report.summary.totalDays * 0.2) {
        report.recommendations.push('تقليل التأخر في الحضور - توجيه واستشارة');
      }

      return report;
    } catch (error) {
      throw new Error(`Report Generation Error: ${error.message}`);
    }
  }

  /**
   * 7. GENERATE ATTENDANCE ALERTS
   */
  generateAttendanceAlerts(studentId, analysis) {
    const alerts = [];

    if (parseFloat(analysis.attendanceRate) < 75) {
      alerts.push({
        level: 'CRITICAL',
        message: 'نسبة حضور منخفضة جداً - يتطلب تدخل فوري',
        action: 'PARENT_CONTACT_REQUIRED',
      });
    } else if (parseFloat(analysis.attendanceRate) < 85) {
      alerts.push({
        level: 'WARNING',
        message: 'نسبة حضور تحتاج تحسين',
        action: 'TEACHER_NOTIFICATION',
      });
    }

    if (analysis.patterns.mondayAbsencePattern) {
      alerts.push({
        level: 'MEDIUM',
        message: 'نمط غياب الإثنين - يحتاج مراقبة',
        action: 'COUNSELOR_CONSULTATION',
      });
    }

    if (analysis.patterns.fridayAbsencePattern) {
      alerts.push({
        level: 'MEDIUM',
        message: 'نمط غياب الجمعة - يحتاج مراقبة',
        action: 'PARENT_DISCUSSION',
      });
    }

    if (analysis.lateDays > analysis.totalDays * 0.3) {
      alerts.push({
        level: 'HIGH',
        message: 'نسبة تأخر عالية جداً',
        action: 'BEHAVIOR_INTERVENTION',
      });
    }

    return alerts;
  }

  /**
   * 8. BIOMETRIC INTEGRATION
   * تكامل البيومترية
   */
  async validateBiometric(studentId, biometricData) {
    try {
      const { type = 'fingerprint', data, template } = biometricData; // face, fingerprint, iris

      if (!template) {
        throw new Error('Biometric template required');
      }

      const similarity = this.calculateBiometricSimilarity(data, template);

      return {
        studentId,
        type,
        verified: similarity > 0.95,
        matchScore: (similarity * 100).toFixed(2),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(`Biometric Validation Error: ${error.message}`);
    }
  }

  calculateBiometricSimilarity(data1, data2) {
    // Mock similarity calculation
    // In real implementation, use proper biometric libraries
    return Math.random() * 0.3 + 0.7; // 70-100% similarity
  }

  /**
   * 9. PARENT/GUARDIAN NOTIFICATIONS VIA MOBILE
   * تنبيهات الأولياء عبر التطبيق المحمول
   */
  async createParentNotificationPreferences(studentId, preferences) {
    return {
      studentId,
      notificationChannels: preferences.channels || ['push', 'sms', 'email'],
      alertTypes: {
        lateArrival: { enabled: true, threshold: 'any' },
        absence: { enabled: true, threshold: 'immediate' },
        earlyDeparture: { enabled: true, threshold: 'any' },
        healthAlert: { enabled: true, threshold: 'immediate' },
        anomaly: { enabled: true, threshold: 'immediate' },
        academicAlert: { enabled: true, threshold: 'any' },
      },
      quietHours: { startTime: '22:00', endTime: '06:00' },
      recipients: preferences.recipients || [],
      createdAt: new Date(),
    };
  }

  /**
   * 10. ATTENDANCE CORRECTION & APPEAL
   * آلية الاستئناف والتصحيح
   */
  async submitAttendanceAppeal(appealData) {
    try {
      const {
        studentId,
        attendanceRecordId,
        reason,
        supportingDocuments = [],
        requestedAction = 'MARK_PRESENT',
      } = appealData;

      const appeal = {
        appealId: `APPEAL-${Date.now()}`,
        studentId,
        attendanceRecordId,
        reason,
        supportingDocuments,
        requestedAction,
        status: 'PENDING',
        submittedAt: new Date(),
        reviewedBy: null,
        reviewedAt: null,
        decision: null,
        notes: null,
      };

      // Emit for admin review
      this.emit('appeal-submitted', appeal);

      return appeal;
    } catch (error) {
      throw new Error(`Appeal Submission Error: ${error.message}`);
    }
  }

  /**
   * 11. ATTENDANCE SYNC WITH ACADEMIC SYSTEM
   */
  async syncWithAcademicSystem(studentId) {
    try {
      const attendanceReport = await this.generateAttendanceReport(
        studentId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      const syncData = {
        studentId,
        attendanceRate: parseFloat(attendanceReport.summary.attendanceRate),
        status: parseFloat(attendanceReport.summary.attendanceRate) >= 75 ? 'ELIGIBLE' : 'AT_RISK',
        affectsPromotion: parseFloat(attendanceReport.summary.attendanceRate) < 75,
        academicImpact: this.calculateAcademicImpact(attendanceReport),
        syncedAt: new Date(),
      };

      this.emit('attendance-synced', syncData);

      return syncData;
    } catch (error) {
      throw new Error(`Sync Error: ${error.message}`);
    }
  }

  calculateAcademicImpact(attendanceReport) {
    const rate = parseFloat(attendanceReport.summary.attendanceRate);

    if (rate >= 90) return 'NO_IMPACT';
    if (rate >= 80) return 'MINOR_IMPACT';
    if (rate >= 75) return 'MODERATE_IMPACT';
    return 'CRITICAL_IMPACT';
  }

  /**
   * 12. ATTENDANCE STATISTICS BY CLASS/GRADE
   */
  async getClassAttendanceStatistics(classId, date) {
    try {
      const records = Array.from(this.attendanceRecords.values()).filter(
        r => r.date === new Date(date).toDateString()
      );

      const stats = {
        classId,
        date,
        totalStudents: 0,
        presentStudents: records.filter(r => r.status === 'CHECKED_OUT').length,
        absentStudents: 0,
        lateStudents: records.filter(r => r.lateFlag).length,
        presentPercentage: null,
        lateCount: records.filter(r => r.lateFlag).length,
        averageArrivalTime: this.calculateAverageArrivalTime(records),
        issues: [],
      };

      return stats;
    } catch (error) {
      throw new Error(`Class Statistics Error: ${error.message}`);
    }
  }

  calculateAverageArrivalTime(records) {
    if (records.length === 0) return null;

    const totalMinutes = records.reduce((sum, r) => {
      const checkInDate = new Date(r.checkInTime);
      const standard = new Date(r.checkInTime);
      standard.setHours(8, 0, 0, 0);

      return sum + (checkInDate - standard) / 1000 / 60;
    }, 0);

    return (totalMinutes / records.length).toFixed(2);
  }
}

module.exports = SmartAttendanceService;
