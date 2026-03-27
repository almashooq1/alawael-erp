/**
 * Therapist Portal Service — خدمة بوابة المعالج الشاملة
 *
 * Orchestrates all therapist-facing operations:
 * ─── لوحة المعلومات والإحصائيات
 * ─── إدارة المرضى / المستفيدين
 * ─── الجدول والمواعيد
 * ─── الجلسات والتوثيق السريري (SOAP)
 * ─── الخطط العلاجية والأهداف
 * ─── الحالات
 * ─── المستندات
 * ─── التقارير والأداء
 * ─── التواصل والرسائل
 * ─── التوفر والجدول الأسبوعي
 *
 * Uses lazy model loading for test safety.
 * @version 1.0.0
 */

// ─── Lazy model loaders ──────────────────────────────────────────────────────
let _TherapySession, _TherapistAvailability, _TherapeuticPlan, _TherapyProgram;
let _SessionDocumentation, _CaseManagement, _Document, _Message, _Beneficiary;

const getTherapySession = () => {
  if (!_TherapySession) _TherapySession = require('../models/TherapySession');
  return _TherapySession;
};
const getAvailability = () => {
  if (!_TherapistAvailability) _TherapistAvailability = require('../models/TherapistAvailability');
  return _TherapistAvailability;
};
const getPlan = () => {
  if (!_TherapeuticPlan) _TherapeuticPlan = require('../models/TherapeuticPlan');
  return _TherapeuticPlan;
};
const _getProgram = () => {
  if (!_TherapyProgram) _TherapyProgram = require('../models/TherapyProgram');
  return _TherapyProgram;
};
const getDocumentation = () => {
  if (!_SessionDocumentation) _SessionDocumentation = require('../models/SessionDocumentation');
  return _SessionDocumentation;
};
const getCaseManagement = () => {
  if (!_CaseManagement) _CaseManagement = require('../models/CaseManagement');
  return _CaseManagement;
};
const getDocument = () => {
  if (!_Document) _Document = require('../models/Document');
  return _Document;
};
const getMessage = () => {
  if (!_Message) _Message = require('../models/message.model');
  return _Message;
};
const { escapeRegex } = require('../utils/sanitize');
const getBeneficiary = () => {
  if (!_Beneficiary) _Beneficiary = require('../models/Beneficiary');
  return _Beneficiary;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const startOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfDay = (d = new Date()) => {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt;
};
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek = (d = new Date()) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() - dt.getDay());
  dt.setHours(0, 0, 0, 0);
  return dt;
};
const endOfWeek = (d = new Date()) => {
  const dt = startOfWeek(d);
  dt.setDate(dt.getDate() + 6);
  dt.setHours(23, 59, 59, 999);
  return dt;
};

class TherapistPortalService {
  // ═══════════════════════════════════════════════════════════════════════════
  //  لوحة المعلومات — Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * لوحة معلومات شاملة للمعالج
   */
  async getDashboard(therapistId) {
    const Session = getTherapySession();
    const Case = getCaseManagement();
    const today = startOfDay();
    const monthStart = startOfMonth();
    const weekStart = startOfWeek();
    const weekEnd = endOfWeek();

    const [
      patientIds,
      todaySessions,
      weekSessions,
      completedMonth,
      totalMonth,
      cancelledMonth,
      noShowMonth,
      ratings,
      urgentCases,
      upcomingSessions,
      pendingDocs,
    ] = await Promise.all([
      Session.distinct('beneficiary', { therapist: therapistId }),
      Session.find({ therapist: therapistId, date: { $gte: today, $lte: endOfDay() } })
        .populate('beneficiary', 'name mrn')
        .sort({ startTime: 1 })
        .lean(),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: weekStart, $lte: weekEnd },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        date: { $gte: monthStart },
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: monthStart },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
        date: { $gte: monthStart },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'NO_SHOW',
        date: { $gte: monthStart },
      }),
      Session.aggregate([
        { $match: { therapist: therapistId, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Case.find({
        'team.member': therapistId,
        'team.active': true,
        priority: { $in: ['عالية', 'عاجلة', 'critical', 'high'] },
        status: { $in: ['جديدة', 'نشطة', 'قيد الدراسة', 'active'] },
      })
        .select('caseNumber beneficiary priority status')
        .limit(5)
        .lean(),
      Session.find({
        therapist: therapistId,
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
        date: { $gte: today },
      })
        .populate('beneficiary', 'name')
        .sort({ date: 1, startTime: 1 })
        .limit(10)
        .lean(),
      Session.countDocuments({
        therapist: therapistId,
        status: 'COMPLETED',
        'notes.subjective': { $in: [null, '', undefined] },
      }),
    ]);

    const completionRate = totalMonth > 0 ? Math.round((completedMonth / totalMonth) * 100) : 0;

    return {
      therapistId,
      stats: {
        totalPatients: patientIds.length,
        activePatients: patientIds.length,
        weeklySessions: weekSessions,
        completedSessions: completedMonth,
        completionRate,
        averageRating: ratings[0]?.avg ? Math.round(ratings[0].avg * 10) / 10 : 0,
        totalRatings: ratings[0]?.count || 0,
        pendingReports: pendingDocs,
      },
      todaySessions,
      upcomingSessions,
      urgentCases,
      monthlyStats: {
        totalSessions: totalMonth,
        completedSessions: completedMonth,
        cancelledSessions: cancelledMonth,
        noShowSessions: noShowMonth,
        attendanceRate: completionRate,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  المرضى / المستفيدين — Patients
  // ═══════════════════════════════════════════════════════════════════════════

  async getPatients(therapistId, query = {}) {
    const Session = getTherapySession();
    const Beneficiary = getBeneficiary();
    const beneficiaryIds = await Session.distinct('beneficiary', { therapist: therapistId });

    const filter = { _id: { $in: beneficiaryIds } };
    if (query.search) {
      filter.$or = [
        { name: { $regex: escapeRegex(query.search), $options: 'i' } },
        { mrn: { $regex: escapeRegex(query.search), $options: 'i' } },
      ];
    }
    if (query.status) filter.status = query.status;

    const patients = await Beneficiary.find(filter)
      .select('name mrn dob status gender phone diagnosis')
      .sort({ name: 1 })
      .lean();

    // Enrich with session count
    const enriched = await Promise.all(
      patients.map(async p => {
        const sessionCount = await Session.countDocuments({
          therapist: therapistId,
          beneficiary: p._id,
        });
        const lastSession = await Session.findOne({
          therapist: therapistId,
          beneficiary: p._id,
          status: 'COMPLETED',
        })
          .sort({ date: -1 })
          .select('date')
          .lean();
        return { ...p, sessionCount, lastSessionDate: lastSession?.date || null };
      })
    );
    return enriched;
  }

  async getPatientById(therapistId, patientId) {
    const Session = getTherapySession();
    const Beneficiary = getBeneficiary();
    const Plan = getPlan();

    const patient = await Beneficiary.findById(patientId).lean();
    if (!patient) return null;

    const [sessions, plans, totalSessions, completedSessions] = await Promise.all([
      Session.find({ therapist: therapistId, beneficiary: patientId })
        .sort({ date: -1 })
        .limit(10)
        .lean(),
      Plan.find({
        beneficiary: patientId,
        assignedTherapists: therapistId,
        status: 'ACTIVE',
      })
        .populate('program', 'name')
        .lean(),
      Session.countDocuments({ therapist: therapistId, beneficiary: patientId }),
      Session.countDocuments({
        therapist: therapistId,
        beneficiary: patientId,
        status: 'COMPLETED',
      }),
    ]);

    return {
      ...patient,
      recentSessions: sessions,
      activePlans: plans,
      stats: { totalSessions, completedSessions },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الجدول والمواعيد — Schedule & Availability
  // ═══════════════════════════════════════════════════════════════════════════

  async getSchedule(therapistId, query = {}) {
    const Session = getTherapySession();
    const filter = {
      therapist: therapistId,
      status: { $in: ['SCHEDULED', 'CONFIRMED'] },
    };
    if (query.from) filter.date = { $gte: new Date(query.from) };
    else filter.date = { $gte: new Date() };
    if (query.to) filter.date = { ...filter.date, $lte: new Date(query.to) };

    return Session.find(filter)
      .populate('beneficiary', 'name mrn')
      .populate('plan', 'goals')
      .sort({ date: 1, startTime: 1 })
      .lean();
  }

  async addScheduleSession(therapistId, data) {
    const Session = getTherapySession();
    const { beneficiary, date, startTime, endTime, plan, notes, sessionType, title } = data;
    if (!beneficiary || !date || !startTime || !endTime) {
      throw Object.assign(new Error('المستفيد والتاريخ والوقت مطلوبون'), { status: 400 });
    }

    // Conflict check
    const conflict = await Session.findOne({
      therapist: therapistId,
      date: new Date(date),
      startTime,
      status: { $in: ['SCHEDULED', 'CONFIRMED'] },
    });
    if (conflict) {
      throw Object.assign(new Error('يوجد تعارض في الموعد'), { status: 409 });
    }

    return Session.create({
      therapist: therapistId,
      beneficiary,
      plan: plan || undefined,
      date: new Date(date),
      startTime,
      endTime,
      title: title || '',
      sessionType: sessionType || 'علاج طبيعي',
      notes: notes ? { plan: notes } : undefined,
      status: 'SCHEDULED',
    });
  }

  async updateScheduleSession(therapistId, sessionId, data) {
    const Session = getTherapySession();
    const session = await Session.findOne({ _id: sessionId, therapist: therapistId });
    if (!session) return null;

    // If date/time changed, re-check conflict
    if (data.date || data.startTime) {
      const newDate = data.date ? new Date(data.date) : session.date;
      const newStart = data.startTime || session.startTime;
      const conflict = await Session.findOne({
        _id: { $ne: sessionId },
        therapist: therapistId,
        date: newDate,
        startTime: newStart,
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      });
      if (conflict) {
        throw Object.assign(new Error('يوجد تعارض في الموعد الجديد'), { status: 409 });
      }
    }

    const allowed = [
      'date',
      'startTime',
      'endTime',
      'title',
      'sessionType',
      'notes',
      'status',
      'beneficiary',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === 'date') session.date = new Date(data[key]);
        else session[key] = data[key];
      }
    }
    await session.save();
    return session;
  }

  async deleteScheduleSession(therapistId, sessionId) {
    const Session = getTherapySession();
    const result = await Session.findOneAndDelete({ _id: sessionId, therapist: therapistId });
    return !!result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التوفر الأسبوعي — Weekly Availability
  // ═══════════════════════════════════════════════════════════════════════════

  async getAvailability(therapistId) {
    const Availability = getAvailability();
    let avail = await Availability.findOne({ therapist: therapistId }).lean();
    if (!avail) {
      // Return default template
      avail = {
        therapist: therapistId,
        recurringSchedule: [],
        exceptions: [],
        preferences: {
          maxSessionsPerDay: 8,
          minBreakBetweenSessions: 15,
          preferredSessionDuration: 60,
          specializations: [],
          languages: ['العربية'],
        },
        metrics: {},
      };
    }
    return avail;
  }

  async updateAvailability(therapistId, data) {
    const Availability = getAvailability();
    const avail = await Availability.findOneAndUpdate(
      { therapist: therapistId },
      {
        $set: {
          ...(data.recurringSchedule && { recurringSchedule: data.recurringSchedule }),
          ...(data.exceptions && { exceptions: data.exceptions }),
          ...(data.preferences && { preferences: data.preferences }),
        },
      },
      { new: true, upsert: true }
    );
    return avail;
  }

  async addException(therapistId, exception) {
    const Availability = getAvailability();
    const avail = await Availability.findOneAndUpdate(
      { therapist: therapistId },
      { $push: { exceptions: exception } },
      { new: true, upsert: true }
    );
    return avail;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الجلسات العلاجية — Sessions
  // ═══════════════════════════════════════════════════════════════════════════

  async getSessions(therapistId, query = {}) {
    const Session = getTherapySession();
    const filter = { therapist: therapistId };
    if (query.status) filter.status = query.status;
    if (query.sessionType) filter.sessionType = query.sessionType;
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) filter.date.$lte = new Date(query.to);
    }
    if (query.beneficiary) filter.beneficiary = query.beneficiary;

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

    const [sessions, total] = await Promise.all([
      Session.find(filter)
        .populate('beneficiary', 'name mrn')
        .populate('plan', 'goals')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Session.countDocuments(filter),
    ]);
    return { sessions, total, page, limit };
  }

  async getSessionById(therapistId, sessionId) {
    const Session = getTherapySession();
    const Doc = getDocumentation();

    const session = await Session.findOne({ _id: sessionId, therapist: therapistId })
      .populate('beneficiary', 'name mrn dob')
      .populate('plan', 'goals status')
      .lean();
    if (!session) return null;

    const documentation = await Doc.findOne({ session: sessionId }).lean();
    return { ...session, documentation };
  }

  async saveSessionReport(therapistId, data) {
    const Session = getTherapySession();
    const { sessionId, subjective, objective, assessment, plan, rating } = data;
    if (!sessionId) throw Object.assign(new Error('معرّف الجلسة مطلوب'), { status: 400 });

    const session = await Session.findOneAndUpdate(
      { _id: sessionId, therapist: therapistId },
      {
        status: 'COMPLETED',
        'attendance.isPresent': true,
        notes: { subjective, objective, assessment, plan },
        ...(rating && { rating }),
      },
      { new: true }
    );
    if (!session) return null;

    // Create/update SessionDocumentation
    const Doc = getDocumentation();
    await Doc.findOneAndUpdate(
      { session: sessionId },
      {
        session: sessionId,
        beneficiary: session.beneficiary,
        therapist: therapistId,
        plan: session.plan || undefined,
        soapNote: {
          subjective: { patientReports: subjective },
          objective: { observations: objective },
          assessment: { progressSummary: assessment },
          plan: { homeProgram: plan },
        },
        documentedBy: therapistId,
        documentedAt: new Date(),
        'quality.isComplete': !!(subjective && objective && assessment && plan),
      },
      { upsert: true, new: true }
    );

    return session;
  }

  async updateSession(therapistId, sessionId, data) {
    const Session = getTherapySession();
    const session = await Session.findOne({ _id: sessionId, therapist: therapistId });
    if (!session) return null;

    const allowed = [
      'title',
      'sessionType',
      'date',
      'startTime',
      'endTime',
      'status',
      'notes',
      'rating',
      'cancellationReason',
      'noShowReason',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        if (key === 'date') session.date = new Date(data[key]);
        else session[key] = data[key];
      }
    }
    await session.save();
    return session;
  }

  async deleteSession(therapistId, sessionId) {
    const Session = getTherapySession();
    const result = await Session.findOneAndDelete({ _id: sessionId, therapist: therapistId });
    return !!result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التوثيق السريري — Session Documentation (SOAP)
  // ═══════════════════════════════════════════════════════════════════════════

  async getSessionDocumentation(therapistId, sessionId) {
    const Doc = getDocumentation();
    return Doc.findOne({ session: sessionId, therapist: therapistId })
      .populate('session', 'date startTime endTime status')
      .populate('beneficiary', 'name mrn')
      .lean();
  }

  async createSessionDocumentation(therapistId, sessionId, data) {
    const Session = getTherapySession();
    const Doc = getDocumentation();

    const session = await Session.findOne({ _id: sessionId, therapist: therapistId });
    if (!session) throw Object.assign(new Error('الجلسة غير موجودة'), { status: 404 });

    const doc = await Doc.findOneAndUpdate(
      { session: sessionId },
      {
        session: sessionId,
        beneficiary: session.beneficiary,
        therapist: therapistId,
        plan: session.plan || undefined,
        soapNote: data.soapNote || {},
        documentation: data.documentation || '',
        goalsAddressed: Array.isArray(data.goalsAddressed)
          ? data.goalsAddressed.map(g => (typeof g === 'string' ? { status: 'PARTIAL' } : g))
          : [],
        attachments: data.attachments || [],
        outcomeMeasures: data.outcomeMeasures || [],
        riskFlags: data.riskFlags || [],
        documentedBy: therapistId,
        documentedAt: new Date(),
        'quality.isComplete': data.isComplete || false,
      },
      { upsert: true, new: true }
    );
    return doc;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الخطط العلاجية — Therapeutic Plans
  // ═══════════════════════════════════════════════════════════════════════════

  async getTherapeuticPlans(therapistId, query = {}) {
    const Plan = getPlan();
    const filter = { assignedTherapists: therapistId };
    if (query.status) filter.status = query.status;
    if (query.beneficiary) filter.beneficiary = query.beneficiary;

    return Plan.find(filter)
      .populate('beneficiary', 'name mrn')
      .populate('program', 'name')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getPlanById(therapistId, planId) {
    const Plan = getPlan();
    return Plan.findOne({ _id: planId, assignedTherapists: therapistId })
      .populate('beneficiary', 'name mrn dob')
      .populate('program', 'name description')
      .lean();
  }

  async updateGoalProgress(therapistId, planId, goalId, data) {
    const Plan = getPlan();
    const plan = await Plan.findOne({ _id: planId, assignedTherapists: therapistId });
    if (!plan) return null;

    const goal = plan.goals.id(goalId);
    if (!goal) return null;

    if (data.status) goal.status = data.status;
    if (data.progress !== undefined) goal.progress = Math.min(100, Math.max(0, data.progress));
    if (data.targetDate) goal.targetDate = new Date(data.targetDate);

    await plan.save();
    return plan;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  الحالات — Cases
  // ═══════════════════════════════════════════════════════════════════════════

  async getCases(therapistId, query = {}) {
    const Case = getCaseManagement();
    const filter = { 'team.member': therapistId, 'team.active': true };
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    return Case.find(filter)
      .select('caseNumber beneficiary status priority createdAt description')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getCaseById(therapistId, caseId) {
    const Case = getCaseManagement();
    return Case.findOne({ _id: caseId, 'team.member': therapistId })
      .populate('beneficiary', 'name mrn')
      .lean();
  }

  async updateCase(therapistId, caseId, data) {
    const Case = getCaseManagement();
    const cs = await Case.findOne({ _id: caseId, 'team.member': therapistId });
    if (!cs) return null;

    const allowed = ['status', 'description', 'notes', 'priority'];
    for (const key of allowed) {
      if (data[key] !== undefined) cs[key] = data[key];
    }
    await cs.save();
    return cs;
  }

  async updateCaseGoal(therapistId, caseId, goalId, status) {
    const Case = getCaseManagement();
    const cs = await Case.findOne({ _id: caseId, 'team.member': therapistId });
    if (!cs) return null;

    // Try goals array if exists
    if (cs.goals && cs.goals.id) {
      const goal = cs.goals.id(goalId);
      if (goal) {
        goal.status = status;
        await cs.save();
        return cs;
      }
    }
    // Fallback: direct update
    await Case.updateOne(
      { _id: caseId, 'goals._id': goalId },
      { $set: { 'goals.$.status': status } }
    );
    return Case.findById(caseId).lean();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  المستندات — Documents
  // ═══════════════════════════════════════════════════════════════════════════

  async getDocuments(therapistId, query = {}) {
    const Doc = getDocument();
    const filter = { uploadedBy: therapistId };
    if (query.category) filter.category = query.category;

    return Doc.find(filter)
      .select('title fileName fileType fileSize category createdAt description')
      .sort({ createdAt: -1 })
      .lean();
  }

  async uploadDocument(therapistId, data) {
    const Doc = getDocument();
    return Doc.create({
      ...data,
      uploadedBy: therapistId,
    });
  }

  async deleteDocument(therapistId, docId) {
    const Doc = getDocument();
    const result = await Doc.findOneAndDelete({ _id: docId, uploadedBy: therapistId });
    return !!result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التقارير والأداء — Reports & Performance
  // ═══════════════════════════════════════════════════════════════════════════

  async getReports(therapistId, query = {}) {
    const Session = getTherapySession();
    const monthStart = query.from ? new Date(query.from) : startOfMonth();
    const monthEnd = query.to ? new Date(query.to) : new Date();

    const [total, completed, cancelled, noShow, ratings, byType, byWeekday] = await Promise.all([
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: monthStart, $lte: monthEnd },
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: monthStart, $lte: monthEnd },
        status: 'COMPLETED',
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: monthStart, $lte: monthEnd },
        status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: monthStart, $lte: monthEnd },
        status: 'NO_SHOW',
      }),
      Session.aggregate([
        {
          $match: {
            therapist: therapistId,
            rating: { $exists: true, $ne: null },
            date: { $gte: monthStart, $lte: monthEnd },
          },
        },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Session.aggregate([
        { $match: { therapist: therapistId, date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Session.aggregate([
        { $match: { therapist: therapistId, date: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: { $dayOfWeek: '$date' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      summary: {
        totalSessions: total,
        completedSessions: completed,
        cancelledSessions: cancelled,
        noShowSessions: noShow,
        averageRating: ratings[0]?.avg ? Math.round(ratings[0].avg * 10) / 10 : 0,
        totalRatings: ratings[0]?.count || 0,
        attendanceRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      bySessionType: byType.map(t => ({ type: t._id, count: t.count })),
      byWeekday: byWeekday.map(w => ({ dayOfWeek: w._id, count: w.count })),
      period: { from: monthStart, to: monthEnd },
    };
  }

  async getPerformanceKPIs(therapistId) {
    const Session = getTherapySession();
    const Availability = getAvailability();
    const Doc = getDocumentation();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      month30,
      completed30,
      cancelled30,
      noShow30,
      month90,
      completed90,
      docsComplete,
      docsTotal,
      ratings,
      availability,
    ] = await Promise.all([
      Session.countDocuments({ therapist: therapistId, date: { $gte: thirtyDaysAgo } }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: thirtyDaysAgo },
        status: 'COMPLETED',
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: thirtyDaysAgo },
        status: { $in: ['CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER'] },
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: thirtyDaysAgo },
        status: 'NO_SHOW',
      }),
      Session.countDocuments({ therapist: therapistId, date: { $gte: ninetyDaysAgo } }),
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: ninetyDaysAgo },
        status: 'COMPLETED',
      }),
      Doc.countDocuments({ therapist: therapistId, 'quality.isComplete': true }),
      Doc.countDocuments({ therapist: therapistId }),
      Session.aggregate([
        { $match: { therapist: therapistId, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Availability.findOne({ therapist: therapistId }).lean(),
    ]);

    return {
      last30Days: {
        totalSessions: month30,
        completed: completed30,
        cancelled: cancelled30,
        noShow: noShow30,
        completionRate: month30 > 0 ? Math.round((completed30 / month30) * 100) : 0,
        cancellationRate: month30 > 0 ? Math.round((cancelled30 / month30) * 100) : 0,
        noShowRate: month30 > 0 ? Math.round((noShow30 / month30) * 100) : 0,
      },
      last90Days: {
        totalSessions: month90,
        completed: completed90,
        completionRate: month90 > 0 ? Math.round((completed90 / month90) * 100) : 0,
      },
      documentation: {
        complete: docsComplete,
        total: docsTotal,
        completionRate: docsTotal > 0 ? Math.round((docsComplete / docsTotal) * 100) : 0,
      },
      rating: {
        average: ratings[0]?.avg ? Math.round(ratings[0].avg * 10) / 10 : 0,
        totalRatings: ratings[0]?.count || 0,
      },
      utilization: availability?.metrics?.utilization || 0,
      maxSessionsPerDay: availability?.preferences?.maxSessionsPerDay || 8,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  التواصل والرسائل — Communications & Messages
  // ═══════════════════════════════════════════════════════════════════════════

  async getMessages(therapistId, query = {}) {
    const Msg = getMessage();
    const filter = {
      $or: [{ sender: therapistId }, { recipient: therapistId }],
    };
    if (query.conversationId) filter.conversationId = query.conversationId;

    const limit = Math.min(100, Number(query.limit) || 50);
    return Msg.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async sendMessage(therapistId, data) {
    const Msg = getMessage();
    const { conversationId, text, recipient, messageType } = data;
    if (!text) throw Object.assign(new Error('نص الرسالة مطلوب'), { status: 400 });

    return Msg.create({
      conversationId: conversationId || undefined,
      sender: therapistId,
      recipient: recipient || undefined,
      content: { text, type: messageType || 'text' },
    });
  }

  async getCommunications(therapistId) {
    const Msg = getMessage();
    return Msg.find({ sender: therapistId }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async sendCommunication(therapistId, data) {
    return this.sendMessage(therapistId, data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  تتبع تقدم المستفيد — Patient Progress Tracking
  // ═══════════════════════════════════════════════════════════════════════════

  async getPatientProgress(therapistId, beneficiaryId) {
    const Session = getTherapySession();
    const Plan = getPlan();
    const Doc = getDocumentation();

    const [sessions, plans, docs] = await Promise.all([
      Session.find({
        therapist: therapistId,
        beneficiary: beneficiaryId,
        status: 'COMPLETED',
      })
        .sort({ date: 1 })
        .select('date rating notes.assessment sessionType')
        .lean(),
      Plan.find({
        beneficiary: beneficiaryId,
        assignedTherapists: therapistId,
      })
        .select('goals status startDate endDate')
        .lean(),
      Doc.find({
        therapist: therapistId,
        beneficiary: beneficiaryId,
      })
        .select('soapNote.assessment outcomeMeasures createdAt')
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    // Calculate goal progress
    const allGoals = plans.flatMap(p =>
      (p.goals || []).map(g => ({ ...(g.toJSON?.() || g), planId: p._id }))
    );
    const goalsAchieved = allGoals.filter(g => g.status === 'ACHIEVED').length;
    const goalsInProgress = allGoals.filter(g => g.status === 'IN_PROGRESS').length;

    // Rating trend
    const ratingTrend = sessions
      .filter(s => s.rating)
      .map(s => ({ date: s.date, rating: s.rating }));

    // Outcome measures over time
    const outcomes = docs
      .filter(d => d.outcomeMeasures && d.outcomeMeasures.length > 0)
      .map(d => ({
        date: d.createdAt,
        measures: d.outcomeMeasures,
      }));

    return {
      totalSessions: sessions.length,
      goals: {
        total: allGoals.length,
        achieved: goalsAchieved,
        inProgress: goalsInProgress,
        pending: allGoals.length - goalsAchieved - goalsInProgress,
      },
      ratingTrend,
      outcomeTrend: outcomes,
      sessions: sessions.slice(-10), // Last 10
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  إحصائيات حسب الحالة والفترة — Workload Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getWorkloadAnalytics(therapistId) {
    const Session = getTherapySession();
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const [thisWeek, nextWeek, byHour, patientCount] = await Promise.all([
      Session.countDocuments({
        therapist: therapistId,
        date: { $gte: weekStart, $lte: weekEnd },
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] },
      }),
      Session.countDocuments({
        therapist: therapistId,
        date: {
          $gte: new Date(weekEnd.getTime() + 1),
          $lte: new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { $in: ['SCHEDULED', 'CONFIRMED'] },
      }),
      Session.aggregate([
        {
          $match: {
            therapist: therapistId,
            date: { $gte: weekStart, $lte: weekEnd },
          },
        },
        { $group: { _id: '$startTime', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Session.distinct('beneficiary', {
        therapist: therapistId,
        date: { $gte: startOfMonth() },
      }),
    ]);

    return {
      currentWeekSessions: thisWeek,
      nextWeekSessions: nextWeek,
      activePatients: patientCount.length,
      peakHours: byHour.map(h => ({ time: h._id, count: h.count })),
    };
  }
}

module.exports = new TherapistPortalService();
