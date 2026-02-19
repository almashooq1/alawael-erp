/**
 * Comprehensive Services Module
 *
 * خدمات شاملة للأنظمة 3-7
 * - Therapy Sessions Service
 * - Progress Tracking Service
 * - Family Communication Service
 * - Medical Records Service
 * - Attendance Service
 */

const {
  TherapySession,
  ProgressTracking,
  FamilyCommunication,
  MedicalRecords,
  Attendance,
} = require('../models/comprehensive.models');

// ============================================
// THERAPY SESSIONS SERVICE
// ============================================

class TherapySessionService {
  static async createSession(sessionData, userId) {
    const session = new TherapySession({
      ...sessionData,
      therapist: userId,
    });
    return await session.save();
  }

  static async getSessions(caseId, filters = {}) {
    const query = { caseId };
    if (filters.status) query.status = filters.status;
    if (filters.therapist) query.therapist = filters.therapist;
    return await TherapySession.find(query)
      .populate('caseId')
      .populate('beneficiaryId')
      .populate('therapist', 'name')
      .sort({ scheduledDate: -1 });
  }

  static async updateSession(sessionId, updateData) {
    return await TherapySession.findByIdAndUpdate(sessionId, updateData, { new: true });
  }

  static async getSessionStats(caseId) {
    const sessions = await TherapySession.find({ caseId });
    return {
      total: sessions.length,
      completed: sessions.filter(s => s.status === 'completed').length,
      scheduled: sessions.filter(s => s.status === 'scheduled').length,
      canceled: sessions.filter(s => s.status === 'canceled').length,
      noShow: sessions.filter(s => s.status === 'no-show').length,
    };
  }
}

// ============================================
// PROGRESS TRACKING SERVICE
// ============================================

class ProgressTrackingService {
  static async createTracking(trackingData) {
    const tracking = new ProgressTracking(trackingData);
    return await tracking.save();
  }

  static async updateGoalProgress(caseId, goalId, progressData) {
    return await ProgressTracking.findOneAndUpdate(
      { caseId, 'goals.goalId': goalId },
      {
        $set: {
          'goals.$.progressPercentage': progressData.percentage,
          'goals.$.status': progressData.status,
        },
        $push: {
          'goals.$.metrics': {
            date: new Date(),
            value: progressData.value,
            notes: progressData.notes,
          },
        },
      },
      { new: true }
    );
  }

  static async getProgressReport(caseId) {
    return await ProgressTracking.findOne({ caseId }).populate('caseId').populate('beneficiaryId');
  }

  static async calculateStatistics(caseId) {
    const tracking = await ProgressTracking.findOne({ caseId });
    if (!tracking) return null;

    const goals = tracking.goals || [];
    const overallProgress =
      goals.length > 0
        ? Math.round(goals.reduce((sum, g) => sum + (g.progressPercentage || 0), 0) / goals.length)
        : 0;

    return {
      overallProgress,
      goalsAchieved: goals.filter(g => g.status === 'achieved').length,
      goalsInProgress: goals.filter(g => g.status === 'in_progress').length,
      totalGoals: goals.length,
    };
  }
}

// ============================================
// FAMILY COMMUNICATION SERVICE
// ============================================

class FamilyCommunicationService {
  static async sendMessage(beneficiaryId, messageData) {
    return await FamilyCommunication.findOneAndUpdate(
      { beneficiaryId },
      { $push: { messages: { ...messageData, sentDate: new Date() } } },
      { new: true, upsert: true }
    );
  }

  static async getMessages(beneficiaryId) {
    const communication = await FamilyCommunication.findOne({ beneficiaryId });
    return communication?.messages || [];
  }

  static async sendFamilyReport(beneficiaryId, reportData) {
    return await FamilyCommunication.findOneAndUpdate(
      { beneficiaryId },
      { $push: { familyReports: { ...reportData, createdDate: new Date() } } },
      { new: true, upsert: true }
    );
  }

  static async recordMeeting(beneficiaryId, meetingData) {
    return await FamilyCommunication.findOneAndUpdate(
      { beneficiaryId },
      { $push: { meetings: { ...meetingData, date: new Date() } } },
      { new: true, upsert: true }
    );
  }

  static async getLastContact(beneficiaryId) {
    const communication = await FamilyCommunication.findOne({ beneficiaryId });
    return communication?.lastContactDate || null;
  }
}

// ============================================
// MEDICAL RECORDS SERVICE
// ============================================

class MedicalRecordsService {
  static async addMedicalVisit(beneficiaryId, visitData) {
    return await MedicalRecords.findOneAndUpdate(
      { beneficiaryId },
      { $push: { medicalVisits: { ...visitData, date: new Date() } } },
      { new: true, upsert: true }
    );
  }

  static async addPrescription(beneficiaryId, prescriptionData) {
    return await MedicalRecords.findOneAndUpdate(
      { beneficiaryId },
      { $push: { prescriptions: { ...prescriptionData, startDate: new Date() } } },
      { new: true, upsert: true }
    );
  }

  static async addLabResult(beneficiaryId, resultData) {
    return await MedicalRecords.findOneAndUpdate(
      { beneficiaryId },
      { $push: { labResults: { ...resultData, date: new Date() } } },
      { new: true, upsert: true }
    );
  }

  static async getMedicalHistory(beneficiaryId) {
    return await MedicalRecords.findOne({ beneficiaryId })
      .populate('beneficiaryId')
      .populate('caseId');
  }

  static async getActivePrescriptions(beneficiaryId) {
    const records = await MedicalRecords.findOne({ beneficiaryId });
    const today = new Date();
    return records?.prescriptions.filter(p => !p.endDate || new Date(p.endDate) > today) || [];
  }

  static async getAllergies(beneficiaryId) {
    const records = await MedicalRecords.findOne({ beneficiaryId });
    return records?.allergies || [];
  }
}

// ============================================
// ATTENDANCE SERVICE
// ============================================

class AttendanceService {
  static async recordAttendance(beneficiaryId, attendanceData) {
    const record = {
      date: new Date(attendanceData.date),
      status: attendanceData.status,
      timeIn: attendanceData.timeIn,
      timeOut: attendanceData.timeOut,
      behavior: attendanceData.behavior,
    };

    return await Attendance.findOneAndUpdate(
      { beneficiaryId },
      { $push: { dailyRecords: record } },
      { new: true, upsert: true }
    );
  }

  static async recordLeave(beneficiaryId, leaveData) {
    return await Attendance.findOneAndUpdate(
      { beneficiaryId },
      { $push: { leaves: { ...leaveData, startDate: new Date(leaveData.startDate) } } },
      { new: true, upsert: true }
    );
  }

  static async getAttendanceStats(beneficiaryId, month = null) {
    const attendance = await Attendance.findOne({ beneficiaryId });
    if (!attendance) return null;

    let records = attendance.dailyRecords;
    if (month) {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      records = records.filter(r => r.date >= startOfMonth && r.date <= endOfMonth);
    }

    const present = records.filter(r => r.status === 'present').length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      totalDays: total,
      presentDays: present,
      absentDays: records.filter(r => r.status === 'absent').length,
      lateDays: records.filter(r => r.status === 'late').length,
      attendancePercentage: percentage,
    };
  }

  static async getMonthlyReport(beneficiaryId, month) {
    const attendance = await Attendance.findOne({ beneficiaryId });
    const monthDate = new Date(month.getFullYear(), month.getMonth(), 1);
    return attendance?.monthlyReports.find(r => {
      const reportMonth = new Date(r.month);
      return (
        reportMonth.getFullYear() === monthDate.getFullYear() &&
        reportMonth.getMonth() === monthDate.getMonth()
      );
    });
  }

  static async recordBehavior(beneficiaryId, date, behaviorData) {
    return await Attendance.updateOne(
      { beneficiaryId, 'dailyRecords.date': new Date(date) },
      { $set: { 'dailyRecords.$.behavior': behaviorData } }
    );
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  TherapySessionService,
  ProgressTrackingService,
  FamilyCommunicationService,
  MedicalRecordsService,
  AttendanceService,
};
