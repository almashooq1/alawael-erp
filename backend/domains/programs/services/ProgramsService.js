/**
 * ProgramsService — خدمة إدارة البرامج التأهيلية
 *
 * تتضمن:
 *  - CRUD للبرامج
 *  - تسجيل/إلغاء المستفيدين
 *  - متابعة التقدم وتسجيل الجلسات
 *  - التوصيات (matching مستفيد → برنامج)
 *  - لوحة تحكم البرامج
 *
 * @module domains/programs/services/ProgramsService
 */

const mongoose = require('mongoose');
const logger = require('../../../utils/logger');

class ProgramsService {
  // ═══════════════════════════════════════════════════════════════════
  //  Program CRUD
  // ═══════════════════════════════════════════════════════════════════

  async createProgram(data) {
    const Program = mongoose.model('Program');
    const program = await Program.create(data);
    logger.info(`[Programs] Created program: ${program.code} — ${program.name_ar}`);
    return program;
  }

  async updateProgram(programId, data) {
    const Program = mongoose.model('Program');
    const program = await Program.findByIdAndUpdate(programId, data, {
      new: true,
      runValidators: true,
    });
    if (!program) throw this._notFound('البرنامج غير موجود');
    return program;
  }

  async getProgram(programId) {
    const Program = mongoose.model('Program');
    const program = await Program.findById(programId)
      .populate('linkedMeasures.measureId', 'name name_ar code category')
      .lean({ virtuals: true });
    if (!program) throw this._notFound('البرنامج غير موجود');
    return program;
  }

  async listPrograms(filters = {}) {
    const Program = mongoose.model('Program');
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.branchId) query.$or = [{ branchId: filters.branchId }, { isGlobal: true }];
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { name_ar: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [programs, total] = await Promise.all([
      Program.find(query)
        .sort({ name_ar: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      Program.countDocuments(query),
    ]);

    return { programs, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async publishProgram(programId, userId) {
    const Program = mongoose.model('Program');
    const program = await Program.findById(programId);
    if (!program) throw this._notFound('البرنامج غير موجود');

    program.status = 'active';
    program.publishedAt = new Date();
    program.publishedBy = userId;
    await program.save();

    logger.info(`[Programs] Published: ${program.code}`);
    return program;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Enrollment
  // ═══════════════════════════════════════════════════════════════════

  async enrollBeneficiary({
    beneficiaryId,
    programId,
    episodeId,
    leadTherapistId,
    team,
    notes,
    userId,
    branchId,
    organizationId,
  }) {
    const Program = mongoose.model('Program');
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');

    const program = await Program.findById(programId);
    if (!program) throw this._notFound('البرنامج غير موجود');
    if (program.status !== 'active') {
      const err = new Error('البرنامج غير نشط');
      err.statusCode = 400;
      throw err;
    }

    // Check for existing active enrollment in same program
    const existing = await ProgramEnrollment.findOne({
      beneficiaryId,
      programId,
      status: { $in: ['pending', 'approved', 'active'] },
    });
    if (existing) {
      const err = new Error('المستفيد مسجل بالفعل في هذا البرنامج');
      err.statusCode = 409;
      throw err;
    }

    // Build module progress from program template
    const moduleProgress = (program.modules || []).map(mod => ({
      moduleId: mod._id,
      moduleName: mod.name_ar || mod.name,
      status: 'not_started',
      sessionsTotal: mod.sessions?.length || 0,
    }));

    const enrollment = await ProgramEnrollment.create({
      beneficiaryId,
      programId,
      episodeId,
      leadTherapistId,
      team: team || [],
      notes,
      enrolledBy: userId,
      sessionsTotal: program.totalSessions || program.durationWeeks * program.sessionsPerWeek,
      moduleProgress,
      expectedStartDate: new Date(),
      expectedEndDate: new Date(Date.now() + program.durationWeeks * 7 * 24 * 60 * 60 * 1000),
      statusHistory: [{ status: 'pending', changedBy: userId }],
      branchId,
      organizationId,
    });

    // Record timeline
    await this._recordTimeline({
      beneficiaryId,
      episodeId,
      eventType: 'program_enrolled',
      title: `تسجيل في برنامج: ${program.name_ar || program.name}`,
      description: `كود البرنامج: ${program.code}`,
      userId,
      metadata: { programId, enrollmentId: enrollment._id, programCode: program.code },
    });

    logger.info(`[Programs] Enrolled beneficiary ${beneficiaryId} in ${program.code}`);
    return enrollment;
  }

  async approveEnrollment(enrollmentId, userId) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw this._notFound('التسجيل غير موجود');

    enrollment.approvedBy = userId;
    enrollment.approvedAt = new Date();
    await enrollment.changeStatus('approved', userId, 'الموافقة على التسجيل');
    return enrollment;
  }

  async activateEnrollment(enrollmentId, userId) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw this._notFound('التسجيل غير موجود');

    await enrollment.changeStatus('active', userId, 'بدء البرنامج');
    return enrollment;
  }

  async withdrawEnrollment(enrollmentId, userId, reason) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw this._notFound('التسجيل غير موجود');

    await enrollment.changeStatus('withdrawn', userId, reason);

    await this._recordTimeline({
      beneficiaryId: enrollment.beneficiaryId,
      episodeId: enrollment.episodeId,
      eventType: 'program_withdrawn',
      title: 'انسحاب من برنامج',
      description: reason,
      userId,
      metadata: { enrollmentId, programId: enrollment.programId },
    });

    return enrollment;
  }

  async completeEnrollment(
    enrollmentId,
    userId,
    { completionStatus, completionReport, completionScore, satisfaction }
  ) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw this._notFound('التسجيل غير موجود');

    enrollment.completionStatus = completionStatus;
    enrollment.completionReport = completionReport;
    enrollment.completionScore = completionScore;
    if (satisfaction) enrollment.satisfaction = satisfaction;
    await enrollment.changeStatus('completed', userId, 'إتمام البرنامج');

    await this._recordTimeline({
      beneficiaryId: enrollment.beneficiaryId,
      episodeId: enrollment.episodeId,
      eventType: 'program_completed',
      title: 'إتمام برنامج تأهيلي',
      description: `الحالة: ${completionStatus} — النتيجة: ${completionScore || 'N/A'}`,
      userId,
      metadata: { enrollmentId, completionStatus, completionScore },
    });

    return enrollment;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Session Tracking
  // ═══════════════════════════════════════════════════════════════════

  async logSession(enrollmentId, sessionData) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    const enrollment = await ProgramEnrollment.findById(enrollmentId);
    if (!enrollment) throw this._notFound('التسجيل غير موجود');

    return enrollment.logSession(sessionData);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Queries
  // ═══════════════════════════════════════════════════════════════════

  async getBeneficiaryEnrollments(beneficiaryId) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    return ProgramEnrollment.find({ beneficiaryId })
      .populate('programId', 'name name_ar code type category durationWeeks')
      .populate('leadTherapistId', 'name firstName lastName')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
  }

  async getEnrollmentDetails(enrollmentId) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    return ProgramEnrollment.findById(enrollmentId)
      .populate('beneficiaryId', 'name fileNumber personalInfo')
      .populate('programId')
      .populate('leadTherapistId', 'name firstName lastName')
      .populate('team.userId', 'name firstName lastName role')
      .populate('linkedGoals')
      .populate('outcomes.measureId', 'name name_ar code')
      .lean({ virtuals: true });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Recommendations
  // ═══════════════════════════════════════════════════════════════════

  async recommendPrograms(beneficiaryId) {
    const Beneficiary = mongoose.model('Beneficiary');
    const Program = mongoose.model('Program');
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');

    const beneficiary = await Beneficiary.findById(beneficiaryId).lean({ virtuals: true });
    if (!beneficiary) return [];

    const ageInMonths =
      beneficiary.ageInMonths ||
      (beneficiary.personalInfo?.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(beneficiary.personalInfo.dateOfBirth)) /
              (1000 * 60 * 60 * 24 * 30.44)
          )
        : null);
    const disabilityType = beneficiary.disability?.type;
    const severity = beneficiary.disability?.severity;

    const applicable = await Program.findApplicable(ageInMonths, disabilityType, severity);

    // Get already enrolled programs
    const enrollments = await ProgramEnrollment.find({
      beneficiaryId,
      status: { $in: ['pending', 'approved', 'active', 'completed'] },
    })
      .select('programId status')
      .lean();

    const enrolledMap = {};
    enrollments.forEach(e => {
      enrolledMap[e.programId.toString()] = e.status;
    });

    return applicable.map(p => ({
      programId: p._id,
      code: p.code,
      name: p.name,
      name_ar: p.name_ar,
      type: p.type,
      category: p.category,
      durationWeeks: p.durationWeeks,
      sessionsPerWeek: p.sessionsPerWeek,
      enrollmentStatus: enrolledMap[p._id.toString()] || null,
      isEnrolled: !!enrolledMap[p._id.toString()],
      isCompleted: enrolledMap[p._id.toString()] === 'completed',
      reason: enrolledMap[p._id.toString()]
        ? `مسجل حالياً (${enrolledMap[p._id.toString()]})`
        : 'برنامج مناسب — غير مسجل',
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Dashboard
  // ═══════════════════════════════════════════════════════════════════

  async getProgramDashboard(programId) {
    const Program = mongoose.model('Program');
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');

    const [program, stats, activeEnrollments, overdue] = await Promise.all([
      Program.findById(programId).lean({ virtuals: true }),
      ProgramEnrollment.getProgramStats(programId),
      ProgramEnrollment.getActiveEnrollments(programId),
      ProgramEnrollment.getOverdueEnrollments(),
    ]);

    if (!program) throw this._notFound('البرنامج غير موجود');

    const statusMap = {};
    let totalProgress = 0;
    let totalAttendance = 0;
    let countWithProgress = 0;

    stats.forEach(s => {
      statusMap[s._id] = {
        count: s.count,
        avgProgress: s.avgProgress,
        avgAttendance: s.avgAttendance,
      };
      if (s.avgProgress != null) {
        totalProgress += s.avgProgress * s.count;
        countWithProgress += s.count;
      }
      if (s.avgAttendance != null) totalAttendance += s.avgAttendance * s.count;
    });

    return {
      program: {
        id: program._id,
        code: program.code,
        name: program.name,
        name_ar: program.name_ar,
        type: program.type,
        category: program.category,
        durationWeeks: program.durationWeeks,
        totalSessions: program.totalSessions,
        status: program.status,
      },
      statistics: {
        byStatus: statusMap,
        totalActive: statusMap.active?.count || 0,
        totalCompleted: statusMap.completed?.count || 0,
        avgProgress: countWithProgress > 0 ? Math.round(totalProgress / countWithProgress) : 0,
        avgAttendance: countWithProgress > 0 ? Math.round(totalAttendance / countWithProgress) : 0,
      },
      activeEnrollments: activeEnrollments.map(e => ({
        id: e._id,
        beneficiary: e.beneficiaryId,
        progress: e.progressPercentage,
        attendance: e.attendanceRate,
        sessionsCompleted: e.sessionsCompleted,
        sessionsTotal: e.sessionsTotal,
        expectedEndDate: e.expectedEndDate,
        leadTherapist: e.leadTherapistId,
      })),
      overdueCount: overdue.filter(o => o.programId?.toString() === programId.toString()).length,
    };
  }

  async getTherapistProgramDashboard(therapistId) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    return ProgramEnrollment.getTherapistDashboard(therapistId);
  }

  async getOverdueEnrollments(branchId) {
    const ProgramEnrollment = mongoose.model('ProgramEnrollment');
    return ProgramEnrollment.getOverdueEnrollments(branchId);
  }

  async getProgramStatistics(branchId) {
    const Program = mongoose.model('Program');
    return Program.getStatistics(branchId);
  }

  // ─── Private ─────────────────────────────────────────────────────

  _notFound(message) {
    const err = new Error(message);
    err.statusCode = 404;
    return err;
  }

  async _recordTimeline({
    beneficiaryId,
    episodeId,
    eventType,
    title,
    description,
    userId,
    metadata,
  }) {
    try {
      const CareTimeline = mongoose.model('CareTimeline');
      await CareTimeline.create({
        beneficiaryId,
        episodeId,
        eventType,
        title,
        description,
        performedBy: userId,
        metadata,
        category: 'clinical',
      });
    } catch (err) {
      logger.error(`[Programs] Timeline recording failed: ${err.message}`);
    }
  }
}

const programsService = new ProgramsService();

module.exports = { ProgramsService, programsService };
