/**
 * Noor Integration Service — خدمة التكامل مع نظام نور
 *
 * Business logic for Ministry of Education Noor system integration:
 * - Student enrollment sync
 * - IEP management (create / submit / track)
 * - Academic progress reports
 * - Attendance reporting
 * - Configuration management
 */
const { NoorStudent, NoorIEP, NoorProgressReport, NoorConfig } = require('../models/noor.models');

class NoorService {
  /* ═══════════════════════════════════════════
   * Configuration
   * ═══════════════════════════════════════════ */
  async getConfig(organizationId) {
    let config = await NoorConfig.findOne({ organization: organizationId });
    if (!config) {
      config = await NoorConfig.create({ organization: organizationId });
    }
    // Strip credentials before returning
    const obj = config.toObject();
    if (obj.credentials) {
      delete obj.credentials.encryptedApiKey;
    }
    return obj;
  }

  async updateConfig(organizationId, data, userId) {
    const config = await NoorConfig.findOneAndUpdate(
      { organization: organizationId },
      { ...data, updatedBy: userId },
      { new: true, upsert: true, runValidators: true }
    );
    const obj = config.toObject();
    if (obj.credentials) delete obj.credentials.encryptedApiKey;
    return obj;
  }

  /* ═══════════════════════════════════════════
   * Students — الطلاب
   * ═══════════════════════════════════════════ */
  async getStudents(filters = {}) {
    const query = {};
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.enrollmentStatus) query.enrollmentStatus = filters.enrollmentStatus;
    if (filters.disabilityType) query.disabilityType = filters.disabilityType;
    if (filters.educationalPlacement) query.educationalPlacement = filters.educationalPlacement;
    if (filters.syncStatus) query.syncStatus = filters.syncStatus;

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 25;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      NoorStudent.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      NoorStudent.countDocuments(query),
    ]);

    return { students, total, page, pages: Math.ceil(total / limit) };
  }

  async createStudent(data, userId) {
    const student = await NoorStudent.create({
      ...data,
      createdBy: userId,
      updatedBy: userId,
    });
    return student;
  }

  async getStudentById(id) {
    return NoorStudent.findById(id).populate('beneficiary', 'name fileNumber').lean();
  }

  async updateStudent(id, data, userId) {
    return NoorStudent.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true, runValidators: true }
    );
  }

  async syncStudent(id) {
    const student = await NoorStudent.findById(id);
    if (!student) throw new Error('الطالب غير موجود');

    // Simulate Noor sync — in production this calls the Noor API
    student.syncStatus = 'synced';
    student.lastSyncAt = new Date();
    student.syncErrors = [];
    await student.save();
    return student;
  }

  async bulkSync(academicYear) {
    const students = await NoorStudent.find({
      academicYear,
      enrollmentStatus: 'active',
      syncStatus: { $ne: 'synced' },
    });

    const results = { synced: 0, failed: 0, errors: [] };
    for (const student of students) {
      try {
        student.syncStatus = 'synced';
        student.lastSyncAt = new Date();
        student.syncErrors = [];
        await student.save();
        results.synced++;
      } catch (err) {
        results.failed++;
        results.errors.push({
          studentId: student._id,
          noorId: student.noorId,
          error: err.message,
        });
      }
    }
    return results;
  }

  /* ═══════════════════════════════════════════
   * IEPs — الخطط التربوية الفردية
   * ═══════════════════════════════════════════ */
  async getIEPs(filters = {}) {
    const query = {};
    if (filters.student) query.student = filters.student;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.semester) query.semester = filters.semester;
    if (filters.status) query.status = filters.status;

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;

    const [ieps, total] = await Promise.all([
      NoorIEP.find(query)
        .populate('student', 'studentName noorId disabilityType')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NoorIEP.countDocuments(query),
    ]);

    return { ieps, total, page, pages: Math.ceil(total / limit) };
  }

  async createIEP(data, userId) {
    // Auto-generate plan number
    const count = await NoorIEP.countDocuments();
    const planNumber = `IEP-${data.academicYear}-${String(count + 1).padStart(4, '0')}`;

    const iep = await NoorIEP.create({
      ...data,
      planNumber,
      createdBy: userId,
      updatedBy: userId,
    });
    return iep;
  }

  async getIEPById(id) {
    return NoorIEP.findById(id)
      .populate('student', 'studentName noorId disabilityType educationalPlacement')
      .lean();
  }

  async updateIEP(id, data, userId) {
    return NoorIEP.findByIdAndUpdate(
      id,
      { ...data, updatedBy: userId },
      { new: true, runValidators: true }
    );
  }

  async submitIEPToNoor(id, userId) {
    const iep = await NoorIEP.findById(id);
    if (!iep) throw new Error('الخطة التربوية غير موجودة');
    if (iep.status !== 'active') throw new Error('يجب أن تكون الخطة نشطة قبل الإرسال');

    // Simulate Noor submission
    iep.noorSubmissionStatus = 'submitted';
    iep.noorSubmissionDate = new Date();
    iep.updatedBy = userId;
    await iep.save();
    return iep;
  }

  async updateGoalProgress(iepId, goalIndex, progressData, userId) {
    const iep = await NoorIEP.findById(iepId);
    if (!iep) throw new Error('الخطة التربوية غير موجودة');
    if (!iep.goals[goalIndex]) throw new Error('الهدف غير موجود');

    iep.goals[goalIndex].progressPercent = progressData.progressPercent;
    iep.goals[goalIndex].status = progressData.status;
    if (progressData.objectives) {
      iep.goals[goalIndex].objectives = progressData.objectives;
    }
    iep.updatedBy = userId;
    await iep.save();
    return iep;
  }

  /* ═══════════════════════════════════════════
   * Progress Reports — تقارير الأداء
   * ═══════════════════════════════════════════ */
  async getProgressReports(filters = {}) {
    const query = {};
    if (filters.student) query.student = filters.student;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.semester) query.semester = filters.semester;
    if (filters.reportPeriod) query.reportPeriod = filters.reportPeriod;

    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 20;

    const [reports, total] = await Promise.all([
      NoorProgressReport.find(query)
        .populate('student', 'studentName noorId')
        .sort({ reportDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      NoorProgressReport.countDocuments(query),
    ]);

    return { reports, total, page, pages: Math.ceil(total / limit) };
  }

  async createProgressReport(data, userId) {
    // Calculate attendance rate
    if (data.attendance && data.attendance.totalDays > 0) {
      data.attendance.attendanceRate = Math.round(
        (data.attendance.presentDays / data.attendance.totalDays) * 100
      );
    }
    const report = await NoorProgressReport.create({
      ...data,
      createdBy: userId,
    });
    return report;
  }

  async submitReportToNoor(id) {
    const report = await NoorProgressReport.findById(id);
    if (!report) throw new Error('التقرير غير موجود');

    report.noorSubmitted = true;
    report.noorSubmissionDate = new Date();
    await report.save();
    return report;
  }

  /* ═══════════════════════════════════════════
   * Dashboard — لوحة المعلومات
   * ═══════════════════════════════════════════ */
  async getDashboard(academicYear) {
    const currentYear =
      academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const [
      totalStudents,
      activeStudents,
      syncedStudents,
      pendingSyncStudents,
      studentsByDisability,
      studentsByPlacement,
      totalIEPs,
      activeIEPs,
      submittedIEPs,
      totalReports,
    ] = await Promise.all([
      NoorStudent.countDocuments({ academicYear: currentYear }),
      NoorStudent.countDocuments({
        academicYear: currentYear,
        enrollmentStatus: 'active',
      }),
      NoorStudent.countDocuments({
        academicYear: currentYear,
        syncStatus: 'synced',
      }),
      NoorStudent.countDocuments({
        academicYear: currentYear,
        syncStatus: { $in: ['pending', 'not_synced'] },
      }),
      NoorStudent.aggregate([
        { $match: { academicYear: currentYear, enrollmentStatus: 'active' } },
        { $group: { _id: '$disabilityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      NoorStudent.aggregate([
        { $match: { academicYear: currentYear, enrollmentStatus: 'active' } },
        { $group: { _id: '$educationalPlacement', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      NoorIEP.countDocuments({ academicYear: currentYear }),
      NoorIEP.countDocuments({
        academicYear: currentYear,
        status: 'active',
      }),
      NoorIEP.countDocuments({
        academicYear: currentYear,
        noorSubmissionStatus: 'submitted',
      }),
      NoorProgressReport.countDocuments({ academicYear: currentYear }),
    ]);

    return {
      academicYear: currentYear,
      students: {
        total: totalStudents,
        active: activeStudents,
        synced: syncedStudents,
        pendingSync: pendingSyncStudents,
        byDisability: studentsByDisability,
        byPlacement: studentsByPlacement,
      },
      ieps: {
        total: totalIEPs,
        active: activeIEPs,
        submitted: submittedIEPs,
      },
      reports: {
        total: totalReports,
      },
    };
  }
}

module.exports = new NoorService();
