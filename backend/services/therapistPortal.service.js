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
      { returnDocument: 'after', upsert: true }
    );
    return avail;
  }

  async addException(therapistId, exception) {
    const Availability = getAvailability();
    const avail = await Availability.findOneAndUpdate(
      { therapist: therapistId },
      { $push: { exceptions: { $each: [exception], $slice: -200 } } },
      { returnDocument: 'after', upsert: true }
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
      { returnDocument: 'after' }
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
      { upsert: true, returnDocument: 'after' }
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
      { upsert: true, returnDocument: 'after' }
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

  // ─── Telehealth (consumed by routes/therapistElite.routes.js) ────────────
  // Backed by `models/Telehealth.js` Teleconsultation model. Implements the
  // CRUD surface the route already wires up. UUID + consultationNumber are
  // generated on create when missing.

  async getTelehealthSessions(query = {}) {
    const { Teleconsultation } = require('../models/Telehealth');
    const filter = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.provider) filter.provider = query.provider;
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.from || query.to) {
      filter.scheduledAt = {};
      if (query.from) filter.scheduledAt.$gte = new Date(query.from);
      if (query.to) filter.scheduledAt.$lte = new Date(query.to);
    }
    return Teleconsultation.find(filter)
      .populate('beneficiary', 'name nationalId phone')
      .populate('provider', 'name')
      .sort({ scheduledAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createTelehealthSession(data) {
    const { Teleconsultation } = require('../models/Telehealth');
    const year = new Date().getFullYear();
    const count = await Teleconsultation.countDocuments({
      consultationNumber: { $regex: `^TC-${year}` },
    });
    const consultationNumber = `TC-${year}-${String(count + 1).padStart(5, '0')}`;
    const uuid = data.uuid || `tc-${require('crypto').randomUUID()}`;
    return Teleconsultation.create({
      ...data,
      uuid,
      consultationNumber,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
    });
  }

  async updateTelehealthSession(id, patch) {
    const { Teleconsultation } = require('../models/Telehealth');
    return Teleconsultation.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async updateTelehealthStatus(id, status) {
    const { Teleconsultation } = require('../models/Telehealth');
    const update = { status };
    if (status === 'in_progress') update.startedAt = new Date();
    if (status === 'completed') {
      update.endedAt = new Date();
      const doc = await Teleconsultation.findById(id, { startedAt: 1 });
      if (doc?.startedAt) {
        update.durationMinutes = Math.round((Date.now() - doc.startedAt.getTime()) / 60000);
      }
    }
    return Teleconsultation.findByIdAndUpdate(id, update, { returnDocument: 'after' });
  }

  async deleteTelehealthSession(id) {
    const { Teleconsultation } = require('../models/Telehealth');
    return Teleconsultation.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Consent Management (consumed by routes/therapistElite.routes.js) ────
  // Backed by `models/Consent.js`. The model is append-only by convention:
  // revoke sets `revokedAt` instead of mutating; sign attaches signature
  // metadata. Both keep the audit trail intact.

  async getConsents(query = {}) {
    const { Consent } = require('../models/Consent');
    const filter = {};
    if (query.beneficiaryId) filter.beneficiaryId = query.beneficiaryId;
    if (query.type) filter.type = query.type;
    if (query.active === 'true' || query.active === true) {
      filter.revokedAt = null;
    }
    return Consent.find(filter)
      .sort({ grantedAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createConsent(data) {
    const { Consent } = require('../models/Consent');
    return Consent.create({
      ...data,
      grantedAt: data.grantedAt ? new Date(data.grantedAt) : new Date(),
    });
  }

  async updateConsent(id, patch) {
    const { Consent } = require('../models/Consent');
    return Consent.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async signConsent(id, payload = {}) {
    const { Consent } = require('../models/Consent');
    const update = {
      grantedAt: new Date(),
      ...(payload.signatureRef ? { signatureRef: payload.signatureRef } : {}),
      ...(payload.documentRef ? { documentRef: payload.documentRef } : {}),
      ...(payload.grantedBy ? { grantedBy: payload.grantedBy } : {}),
      ...(payload.expiresAt ? { expiresAt: new Date(payload.expiresAt) } : {}),
    };
    return Consent.findByIdAndUpdate(id, update, { returnDocument: 'after' });
  }

  async revokeConsent(id, reason = null) {
    const { Consent } = require('../models/Consent');
    return Consent.findByIdAndUpdate(
      id,
      { revokedAt: new Date(), revokedReason: reason },
      { returnDocument: 'after' }
    );
  }

  async deleteConsent(id) {
    const { Consent } = require('../models/Consent');
    return Consent.findByIdAndDelete(id);
  }

  // ─── Waiting List (consumed by routes/therapistElite.routes.js) ──────────
  // Backed by `models/WaitingListEntry.js`. State machine:
  // waiting → offered → enrolled (or withdrawn / lapsed).

  async getWaitingList(query = {}) {
    const WaitingListEntry = require('../models/WaitingListEntry');
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.serviceType) filter.serviceType = query.serviceType;
    if (query.branchId) filter.branchId = query.branchId;
    return WaitingListEntry.find(filter)
      .sort({ createdAt: 1 }) // FIFO
      .limit(Number(query.limit) || 200);
  }

  async addToWaitingList(data) {
    const WaitingListEntry = require('../models/WaitingListEntry');
    return WaitingListEntry.create({ ...data, status: data.status || 'waiting' });
  }

  async updateWaitingListItem(id, patch) {
    const WaitingListEntry = require('../models/WaitingListEntry');
    return WaitingListEntry.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async updateWaitingStatus(id, status) {
    const WaitingListEntry = require('../models/WaitingListEntry');
    const update = { status };
    if (status === 'offered') update.offeredAt = new Date();
    if (status === 'enrolled') update.enrolledAt = new Date();
    return WaitingListEntry.findByIdAndUpdate(id, update, { returnDocument: 'after' });
  }

  async removeFromWaitingList(id) {
    const WaitingListEntry = require('../models/WaitingListEntry');
    return WaitingListEntry.findByIdAndDelete(id);
  }

  // ─── Field Training (consumed by routes/therapistElite.routes.js) ────────
  // Backed by `models/FieldTraining.js`. Tracks supervised practice,
  // workshops, certification prep with append-only hours log + evaluations.

  async getFieldTraining(query = {}) {
    const FieldTraining = require('../models/FieldTraining');
    const filter = { deletedAt: null };
    if (query.therapist) filter.therapist = query.therapist;
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.branch) filter.branch = query.branch;
    return FieldTraining.find(filter)
      .populate('therapist', 'name')
      .populate('supervisor', 'name')
      .sort({ startDate: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createFieldTraining(data) {
    const FieldTraining = require('../models/FieldTraining');
    return FieldTraining.create({
      ...data,
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
    });
  }

  async updateFieldTraining(id, patch) {
    const FieldTraining = require('../models/FieldTraining');
    return FieldTraining.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async addTrainingEvaluation(id, evaluation) {
    const FieldTraining = require('../models/FieldTraining');
    return FieldTraining.findByIdAndUpdate(
      id,
      {
        $push: {
          evaluations: { ...evaluation, date: evaluation?.date || new Date() },
        },
      },
      { returnDocument: 'after' }
    );
  }

  async logTrainingHours(id, payload = {}) {
    const FieldTraining = require('../models/FieldTraining');
    const hours = Number(payload.hours) || 0;
    if (hours <= 0) throw Object.assign(new Error('hours must be > 0'), { status: 400 });
    return FieldTraining.findByIdAndUpdate(
      id,
      {
        $push: {
          hoursLog: {
            date: payload.date ? new Date(payload.date) : new Date(),
            hours,
            activity: payload.activity || null,
            verified: !!payload.verified,
          },
        },
        $inc: { completedHours: hours },
      },
      { returnDocument: 'after' }
    );
  }

  async deleteFieldTraining(id) {
    const FieldTraining = require('../models/FieldTraining');
    return FieldTraining.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Quality Reports (therapist-portal scope) ────────────────────────────
  // Backed by `models/TherapyQualityReport.js`. Distinct from formal CBAHI
  // audits in `services/quality/*` — this is the lighter therapist-side log
  // (peer reviews, near-misses, satisfaction snapshots).

  async getQualityReports(query = {}) {
    const TherapyQualityReport = require('../models/TherapyQualityReport');
    const filter = { deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.author) filter.author = query.author;
    if (query.branch) filter.branch = query.branch;
    return TherapyQualityReport.find(filter)
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createQualityReport(data) {
    const TherapyQualityReport = require('../models/TherapyQualityReport');
    const year = new Date().getFullYear();
    const count = await TherapyQualityReport.countDocuments({
      reportNumber: { $regex: `^QR-${year}` },
    });
    const reportNumber = `QR-${year}-${String(count + 1).padStart(4, '0')}`;
    return TherapyQualityReport.create({ ...data, reportNumber });
  }

  async updateQualityReport(id, patch) {
    const TherapyQualityReport = require('../models/TherapyQualityReport');
    return TherapyQualityReport.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async addFinding(id, finding) {
    const TherapyQualityReport = require('../models/TherapyQualityReport');
    if (!finding || !finding.description) {
      throw Object.assign(new Error('finding.description is required'), { status: 400 });
    }
    return TherapyQualityReport.findByIdAndUpdate(
      id,
      { $push: { findings: { ...finding, raisedAt: finding.raisedAt || new Date() } } },
      { returnDocument: 'after' }
    );
  }

  async deleteQualityReport(id) {
    const TherapyQualityReport = require('../models/TherapyQualityReport');
    return TherapyQualityReport.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Achievements (therapist recognition feed) ───────────────────────────
  // Backed by `models/TherapistAchievement.js`. Lightweight kudos / awards /
  // publications log — distinct from formal CPE credits + HR credentials.

  async getAchievements(query = {}) {
    const TherapistAchievement = require('../models/TherapistAchievement');
    const filter = { deletedAt: null };
    if (query.therapist) filter.therapist = query.therapist;
    if (query.type) filter.type = query.type;
    if (query.branch) filter.branch = query.branch;
    if (query.verified === 'true' || query.verified === true) filter.verified = true;
    return TherapistAchievement.find(filter)
      .populate('therapist', 'name')
      .sort({ date: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createAchievement(data) {
    const TherapistAchievement = require('../models/TherapistAchievement');
    return TherapistAchievement.create({
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    });
  }

  async updateAchievement(id, patch) {
    const TherapistAchievement = require('../models/TherapistAchievement');
    return TherapistAchievement.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async deleteAchievement(id) {
    const TherapistAchievement = require('../models/TherapistAchievement');
    return TherapistAchievement.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Treatment Plans (consumed by routes/therapistExtended.routes.js) ────
  // Aliases over the existing TherapeuticPlan model. The route uses
  // "Treatment Plan" terminology; service used "Therapeutic Plan" — same
  // entity. Aliases keep both names working without renaming the model.

  async getTreatmentPlans(therapistId, query = {}) {
    return this.getTherapeuticPlans(therapistId, query);
  }

  async getTreatmentPlanDetail(therapistId, planId) {
    return this.getPlanById(therapistId, planId);
  }

  async createTreatmentPlan(therapistId, data) {
    const TherapeuticPlan = getPlan();
    return TherapeuticPlan.create({
      ...data,
      assignedTherapists: data.assignedTherapists?.length ? data.assignedTherapists : [therapistId],
    });
  }

  async updateTreatmentPlan(therapistId, planId, patch) {
    const TherapeuticPlan = getPlan();
    return TherapeuticPlan.findOneAndUpdate(
      { _id: planId, assignedTherapists: therapistId },
      patch,
      { returnDocument: 'after' }
    );
  }

  // ─── Assessments (therapist-scope) ───────────────────────────────────────
  // Backed by `models/TherapyAssessment.js`.

  async getAssessments(therapistId, query = {}) {
    const TherapyAssessment = require('../models/TherapyAssessment');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.type) filter.type = query.type;
    return TherapyAssessment.find(filter)
      .sort({ conductedAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createAssessment(therapistId, data) {
    const TherapyAssessment = require('../models/TherapyAssessment');
    const year = new Date().getFullYear();
    const count = await TherapyAssessment.countDocuments({
      assessmentNumber: { $regex: `^AS-${year}` },
    });
    const assessmentNumber = `AS-${year}-${String(count + 1).padStart(5, '0')}`;
    return TherapyAssessment.create({ ...data, therapist: therapistId, assessmentNumber });
  }

  async getAssessmentDetail(therapistId, assessmentId) {
    const TherapyAssessment = require('../models/TherapyAssessment');
    return TherapyAssessment.findOne({
      _id: assessmentId,
      therapist: therapistId,
      deletedAt: null,
    });
  }

  async deleteAssessment(therapistId, assessmentId) {
    const TherapyAssessment = require('../models/TherapyAssessment');
    return TherapyAssessment.findOneAndUpdate(
      { _id: assessmentId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Prescriptions (therapist-scope, non-pharmacological) ────────────────
  // Backed by `models/TherapyPrescription.js`.

  async getPrescriptions(therapistId, query = {}) {
    const TherapyPrescription = require('../models/TherapyPrescription');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.status) filter.status = query.status;
    return TherapyPrescription.find(filter)
      .sort({ issuedAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createPrescription(therapistId, data) {
    const TherapyPrescription = require('../models/TherapyPrescription');
    const year = new Date().getFullYear();
    const count = await TherapyPrescription.countDocuments({
      prescriptionNumber: { $regex: `^TP-${year}` },
    });
    const prescriptionNumber = `TP-${year}-${String(count + 1).padStart(5, '0')}`;
    return TherapyPrescription.create({
      ...data,
      therapist: therapistId,
      prescriptionNumber,
    });
  }

  async updatePrescription(therapistId, prescriptionId, patch) {
    const TherapyPrescription = require('../models/TherapyPrescription');
    return TherapyPrescription.findOneAndUpdate(
      { _id: prescriptionId, therapist: therapistId },
      patch,
      { returnDocument: 'after' }
    );
  }

  async deletePrescription(therapistId, prescriptionId) {
    const TherapyPrescription = require('../models/TherapyPrescription');
    return TherapyPrescription.findOneAndUpdate(
      { _id: prescriptionId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Professional Development ────────────────────────────────────────────
  // Backed by `models/ProfessionalDevActivity.js`.

  async getProfessionalDev(therapistId, query = {}) {
    const ProfessionalDevActivity = require('../models/ProfessionalDevActivity');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.type) filter.type = query.type;
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) filter.date.$lte = new Date(query.to);
    }
    return ProfessionalDevActivity.find(filter)
      .sort({ date: -1 })
      .limit(Number(query.limit) || 100);
  }

  async addProfessionalDev(therapistId, data) {
    const ProfessionalDevActivity = require('../models/ProfessionalDevActivity');
    return ProfessionalDevActivity.create({
      ...data,
      therapist: therapistId,
      ...(data.date ? { date: new Date(data.date) } : {}),
    });
  }

  async updateProfessionalDev(therapistId, activityId, patch) {
    const ProfessionalDevActivity = require('../models/ProfessionalDevActivity');
    return ProfessionalDevActivity.findOneAndUpdate(
      { _id: activityId, therapist: therapistId },
      patch,
      { returnDocument: 'after' }
    );
  }

  async deleteProfessionalDev(therapistId, activityId) {
    const ProfessionalDevActivity = require('../models/ProfessionalDevActivity');
    return ProfessionalDevActivity.findOneAndUpdate(
      { _id: activityId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Advanced Analytics + Productivity ───────────────────────────────────
  // Aggregations on existing TherapySession data — no new model required.

  async getAdvancedAnalytics(therapistId, query = {}) {
    const Session = getTherapySession();
    const since = query.from ? new Date(query.from) : new Date(Date.now() - 90 * 86400000);
    const until = query.to ? new Date(query.to) : new Date();

    const [byStatus, byType, byMonth] = await Promise.all([
      Session.aggregate([
        { $match: { therapist: therapistId, date: { $gte: since, $lte: until } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Session.aggregate([
        { $match: { therapist: therapistId, date: { $gte: since, $lte: until } } },
        { $group: { _id: '$sessionType', count: { $sum: 1 } } },
      ]),
      Session.aggregate([
        { $match: { therapist: therapistId, date: { $gte: since, $lte: until } } },
        {
          $group: {
            _id: { y: { $year: '$date' }, m: { $month: '$date' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ]);

    return {
      window: { from: since, to: until },
      byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r._id || 'unknown']: r.count }), {}),
      byType: byType.reduce((acc, r) => ({ ...acc, [r._id || 'unknown']: r.count }), {}),
      byMonth: byMonth.map(r => ({ year: r._id.y, month: r._id.m, count: r.count })),
    };
  }

  async getProductivityReport(therapistId) {
    const Session = getTherapySession();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const [completed, cancelled, noShow, total] = await Promise.all([
      Session.countDocuments({
        therapist: therapistId,
        status: 'completed',
        date: { $gte: start },
      }),
      Session.countDocuments({
        therapist: therapistId,
        status: 'cancelled',
        date: { $gte: start },
      }),
      Session.countDocuments({ therapist: therapistId, status: 'no_show', date: { $gte: start } }),
      Session.countDocuments({ therapist: therapistId, date: { $gte: start } }),
    ]);

    return {
      windowDays: 30,
      total,
      completed,
      cancelled,
      noShow,
      completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 1000) / 10 : 0,
    };
  }

  // ─── Consultations (provider-to-provider) ────────────────────────────────
  // Backed by `models/TherapistConsultation.js`.

  async getConsultations(therapistId, query = {}) {
    const TherapistConsultation = require('../models/TherapistConsultation');
    const filter = { deletedAt: null };
    // Show consultations where the therapist is either requester or consultant.
    filter.$or = [{ requester: therapistId }, { consultant: therapistId }];
    if (query.status) filter.status = query.status;
    return TherapistConsultation.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createConsultation(therapistId, data) {
    const TherapistConsultation = require('../models/TherapistConsultation');
    return TherapistConsultation.create({
      ...data,
      requester: therapistId,
      status: data.consultant ? 'awaiting_response' : 'open',
    });
  }

  async respondToConsultation(therapistId, consultationId, payload) {
    const TherapistConsultation = require('../models/TherapistConsultation');
    if (!payload?.content) {
      throw Object.assign(new Error('response content required'), { status: 400 });
    }
    return TherapistConsultation.findByIdAndUpdate(
      consultationId,
      {
        $push: {
          responses: {
            respondedBy: therapistId,
            content: payload.content,
            attachments: payload.attachments || [],
          },
        },
        status: 'answered',
      },
      { returnDocument: 'after' }
    );
  }

  async updateConsultationStatus(therapistId, consultationId, body) {
    const TherapistConsultation = require('../models/TherapistConsultation');
    const status = body?.status;
    if (!status) throw Object.assign(new Error('status required'), { status: 400 });
    const update = { status };
    if (status === 'closed') update.closedAt = new Date();
    return TherapistConsultation.findOneAndUpdate(
      {
        _id: consultationId,
        $or: [{ requester: therapistId }, { consultant: therapistId }],
      },
      update,
      { returnDocument: 'after' }
    );
  }

  async deleteConsultation(therapistId, consultationId) {
    const TherapistConsultation = require('../models/TherapistConsultation');
    return TherapistConsultation.findOneAndUpdate(
      { _id: consultationId, requester: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Daily Tasks (consumed by routes/therapistPro.routes.js) ─────────────

  async getDailyTasks(therapistId, query = {}) {
    const DailyTask = require('../models/DailyTask');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.dueDate = {};
      if (query.from) filter.dueDate.$gte = new Date(query.from);
      if (query.to) filter.dueDate.$lte = new Date(query.to);
    }
    return DailyTask.find(filter)
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(Number(query.limit) || 200);
  }

  async createTask(therapistId, data) {
    const DailyTask = require('../models/DailyTask');
    return DailyTask.create({
      ...data,
      therapist: therapistId,
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
    });
  }

  async updateTask(therapistId, taskId, patch) {
    const DailyTask = require('../models/DailyTask');
    const update = { ...patch };
    if (patch.status === 'completed' && !patch.completedAt) update.completedAt = new Date();
    return DailyTask.findOneAndUpdate({ _id: taskId, therapist: therapistId }, update, {
      returnDocument: 'after',
    });
  }

  async deleteTask(therapistId, taskId) {
    const DailyTask = require('../models/DailyTask');
    return DailyTask.findOneAndUpdate(
      { _id: taskId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Progress Records ────────────────────────────────────────────────────

  async getProgressRecords(therapistId, query = {}) {
    const TherapistProgressRecord = require('../models/TherapistProgressRecord');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.domain) filter.domain = query.domain;
    return TherapistProgressRecord.find(filter)
      .sort({ recordedAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async addProgressRecord(therapistId, data) {
    const TherapistProgressRecord = require('../models/TherapistProgressRecord');
    return TherapistProgressRecord.create({ ...data, therapist: therapistId });
  }

  async deleteProgressRecord(therapistId, recordId) {
    const TherapistProgressRecord = require('../models/TherapistProgressRecord');
    return TherapistProgressRecord.findOneAndUpdate(
      { _id: recordId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Library Items ───────────────────────────────────────────────────────

  async getLibraryItems(query = {}) {
    const TherapistLibraryItem = require('../models/TherapistLibraryItem');
    const filter = { deletedAt: null };
    if (query.therapist) filter.therapist = query.therapist;
    if (query.kind) filter.kind = query.kind;
    if (query.tag) filter.tags = query.tag;
    return TherapistLibraryItem.find(filter)
      .sort({ addedAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async getLibraryItem(itemId) {
    const TherapistLibraryItem = require('../models/TherapistLibraryItem');
    return TherapistLibraryItem.findOne({ _id: itemId, deletedAt: null });
  }

  async addLibraryItem(therapistId, data) {
    const TherapistLibraryItem = require('../models/TherapistLibraryItem');
    return TherapistLibraryItem.create({ ...data, therapist: therapistId });
  }

  async deleteLibraryItem(itemId) {
    const TherapistLibraryItem = require('../models/TherapistLibraryItem');
    return TherapistLibraryItem.findByIdAndUpdate(
      itemId,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  async getTemplates(query = {}) {
    const TherapistTemplate = require('../models/TherapistTemplate');
    const filter = { deletedAt: null };
    if (query.therapist) filter.therapist = query.therapist;
    if (query.kind) filter.kind = query.kind;
    return TherapistTemplate.find(filter)
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async getTemplateById(templateId) {
    const TherapistTemplate = require('../models/TherapistTemplate');
    return TherapistTemplate.findOne({ _id: templateId, deletedAt: null });
  }

  async createTemplate(therapistId, data) {
    const TherapistTemplate = require('../models/TherapistTemplate');
    return TherapistTemplate.create({ ...data, therapist: therapistId });
  }

  async updateTemplate(therapistId, templateId, patch) {
    const TherapistTemplate = require('../models/TherapistTemplate');
    return TherapistTemplate.findOneAndUpdate({ _id: templateId, therapist: therapistId }, patch, {
      returnDocument: 'after',
    });
  }

  async useTemplate(templateId) {
    const TherapistTemplate = require('../models/TherapistTemplate');
    return TherapistTemplate.findByIdAndUpdate(
      templateId,
      { $inc: { usageCount: 1 }, lastUsedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  async deleteTemplate(templateId) {
    const TherapistTemplate = require('../models/TherapistTemplate');
    return TherapistTemplate.findByIdAndUpdate(
      templateId,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Parent Messages ─────────────────────────────────────────────────────

  async getParentMessages(therapistId, query = {}) {
    const ParentMessage = require('../models/ParentMessage');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.guardian) filter.guardian = query.guardian;
    if (query.unread === 'true' || query.unread === true) filter.readAt = null;
    return ParentMessage.find(filter)
      .sort({ sentAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async sendParentMessage(therapistId, data) {
    const ParentMessage = require('../models/ParentMessage');
    return ParentMessage.create({
      ...data,
      therapist: therapistId,
      direction: data.direction || 'to_parent',
      sentAt: new Date(),
    });
  }

  async markMessageRead(therapistId, messageId) {
    const ParentMessage = require('../models/ParentMessage');
    return ParentMessage.findOneAndUpdate(
      { _id: messageId, therapist: therapistId },
      { readAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  async deleteParentMessage(therapistId, messageId) {
    const ParentMessage = require('../models/ParentMessage');
    return ParentMessage.findOneAndUpdate(
      { _id: messageId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Smart Goals ─────────────────────────────────────────────────────────

  async getSmartGoals(therapistId, query = {}) {
    const SmartGoal = require('../models/SmartGoal');
    const filter = { therapist: therapistId, deletedAt: null };
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.status) filter.status = query.status;
    return SmartGoal.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(query.limit) || 100);
  }

  async createSmartGoal(therapistId, data) {
    const SmartGoal = require('../models/SmartGoal');
    return SmartGoal.create({
      ...data,
      therapist: therapistId,
      ...(data.timeBoundDate ? { timeBoundDate: new Date(data.timeBoundDate) } : {}),
    });
  }

  async updateSmartGoal(therapistId, goalId, patch) {
    const SmartGoal = require('../models/SmartGoal');
    return SmartGoal.findOneAndUpdate({ _id: goalId, therapist: therapistId }, patch, {
      returnDocument: 'after',
    });
  }

  /**
   * Update one milestone within a SmartGoal. Recomputes overallProgress
   * as the average of milestone progress values so the parent goal stays
   * in sync without a separate save call.
   */
  async updateMilestone(therapistId, goalId, milestoneId, patch) {
    const SmartGoal = require('../models/SmartGoal');
    const goal = await SmartGoal.findOne({ _id: goalId, therapist: therapistId });
    if (!goal) return null;
    const milestone = goal.milestones.id(milestoneId);
    if (!milestone) return null;
    if (patch.title !== undefined) milestone.title = patch.title;
    if (patch.targetDate !== undefined)
      milestone.targetDate = patch.targetDate ? new Date(patch.targetDate) : null;
    if (patch.progress !== undefined) milestone.progress = patch.progress;
    if (patch.notes !== undefined) milestone.notes = patch.notes;
    if (patch.completedAt !== undefined)
      milestone.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
    if (patch.progress === 100 && !milestone.completedAt) milestone.completedAt = new Date();
    if (goal.milestones.length > 0) {
      const sum = goal.milestones.reduce((acc, m) => acc + (m.progress || 0), 0);
      goal.overallProgress = Math.round(sum / goal.milestones.length);
    }
    await goal.save();
    return goal;
  }

  async deleteSmartGoal(therapistId, goalId) {
    const SmartGoal = require('../models/SmartGoal');
    return SmartGoal.findOneAndUpdate(
      { _id: goalId, therapist: therapistId },
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Referrals (consumed by routes/therapistUltra.routes.js) ─────────────

  async getReferrals(therapistId) {
    const TherapyReferral = require('../models/TherapyReferral');
    return TherapyReferral.find({
      $or: [{ referrer: therapistId }, { referredTo: therapistId }],
      deletedAt: null,
    }).sort({ createdAt: -1 });
  }

  async createReferral(data, therapistId) {
    const TherapyReferral = require('../models/TherapyReferral');
    const year = new Date().getFullYear();
    const count = await TherapyReferral.countDocuments({
      referralNumber: { $regex: `^REF-${year}` },
    });
    const referralNumber = `REF-${year}-${String(count + 1).padStart(5, '0')}`;
    return TherapyReferral.create({ ...data, referrer: therapistId, referralNumber });
  }

  async updateReferral(id, patch) {
    const TherapyReferral = require('../models/TherapyReferral');
    return TherapyReferral.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async updateReferralStatus(id, status) {
    const TherapyReferral = require('../models/TherapyReferral');
    const update = { status };
    if (status === 'accepted' || status === 'declined') update.respondedAt = new Date();
    if (status === 'completed') update.completedAt = new Date();
    return TherapyReferral.findByIdAndUpdate(id, update, { returnDocument: 'after' });
  }

  async deleteReferral(id) {
    const TherapyReferral = require('../models/TherapyReferral');
    return TherapyReferral.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Groups (group therapy) ──────────────────────────────────────────────

  async getGroups(therapistId) {
    const TherapyGroup = require('../models/TherapyGroup');
    return TherapyGroup.find({
      $or: [{ facilitator: therapistId }, { coFacilitators: therapistId }],
      deletedAt: null,
    }).sort({ createdAt: -1 });
  }

  async createGroup(data, therapistId) {
    const TherapyGroup = require('../models/TherapyGroup');
    // W930 — the web-admin form posts `name` (no `nameAr`) and no `type`, but the
    // model requires both → every create threw a ValidationError (500, "data not
    // saved"). Map name↔nameAr and derive a valid `type` (from the form's `focus`
    // when it matches the enum, else 'mixed') so the group actually saves.
    const TYPE_ENUM = new Set([
      'social_skills', 'language_group', 'motor_group', 'sensory_group',
      'behavioral_group', 'life_skills', 'academic_readiness', 'parent_training',
      'sibling_support', 'transition_group', 'recreation', 'art_therapy',
      'music_therapy', 'mixed',
    ]);
    const payload = { ...data, facilitator: data.facilitator || therapistId };
    if (!payload.nameAr && payload.name) payload.nameAr = payload.name;
    if (!payload.name && payload.nameAr) payload.name = payload.nameAr;
    if (!payload.type || !TYPE_ENUM.has(payload.type)) {
      payload.type = TYPE_ENUM.has(payload.focus) ? payload.focus : 'mixed';
    }
    return TherapyGroup.create(payload);
  }

  async updateGroup(id, patch) {
    const TherapyGroup = require('../models/TherapyGroup');
    return TherapyGroup.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async addParticipant(groupId, payload) {
    const TherapyGroup = require('../models/TherapyGroup');
    if (!payload?.beneficiary) {
      throw Object.assign(new Error('beneficiary required'), { status: 400 });
    }
    const group = await TherapyGroup.findById(groupId);
    if (!group) return null;
    if (group.participants.some(p => String(p.beneficiary) === String(payload.beneficiary))) {
      throw Object.assign(new Error('beneficiary already in group'), { status: 400 });
    }
    if (group.participants.length >= group.maxParticipants) {
      throw Object.assign(new Error('group at capacity'), { status: 400 });
    }
    group.participants.push({ beneficiary: payload.beneficiary });
    await group.save();
    return group;
  }

  async removeParticipant(groupId, participantId) {
    const TherapyGroup = require('../models/TherapyGroup');
    return TherapyGroup.findByIdAndUpdate(
      groupId,
      { $pull: { participants: { beneficiary: participantId } } },
      { returnDocument: 'after' }
    );
  }

  async deleteGroup(id) {
    const TherapyGroup = require('../models/TherapyGroup');
    return TherapyGroup.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Equipment (booking) ─────────────────────────────────────────────────

  async getEquipment(_therapistId) {
    const TherapyEquipment = require('../models/TherapyEquipment');
    return TherapyEquipment.find({ deletedAt: null }).sort({ name: 1 });
  }

  async createEquipment(data) {
    const TherapyEquipment = require('../models/TherapyEquipment');
    return TherapyEquipment.create(data);
  }

  async updateEquipment(id, patch) {
    const TherapyEquipment = require('../models/TherapyEquipment');
    return TherapyEquipment.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async bookEquipment(id, bookedBy, until) {
    const TherapyEquipment = require('../models/TherapyEquipment');
    const eq = await TherapyEquipment.findById(id);
    if (!eq) return null;
    if (eq.status !== 'available') {
      throw Object.assign(new Error('equipment not available'), { status: 400 });
    }
    eq.status = 'in_use';
    eq.currentHolder = bookedBy;
    eq.bookings.push({
      bookedBy,
      from: new Date(),
      to: until ? new Date(until) : new Date(Date.now() + 24 * 3600 * 1000),
      purpose: null,
    });
    await eq.save();
    return eq;
  }

  async returnEquipment(id) {
    const TherapyEquipment = require('../models/TherapyEquipment');
    const eq = await TherapyEquipment.findById(id);
    if (!eq) return null;
    const open = eq.bookings.find(b => !b.returnedAt);
    if (open) open.returnedAt = new Date();
    eq.status = 'available';
    eq.currentHolder = null;
    await eq.save();
    return eq;
  }

  async deleteEquipment(id) {
    const TherapyEquipment = require('../models/TherapyEquipment');
    return TherapyEquipment.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Custom KPIs ─────────────────────────────────────────────────────────

  async getKPIs(therapistId) {
    const TherapyCustomKPI = require('../models/TherapyCustomKPI');
    return TherapyCustomKPI.find({ therapist: therapistId, deletedAt: null }).sort({ name: 1 });
  }

  async createCustomKPI(data, therapistId) {
    const TherapyCustomKPI = require('../models/TherapyCustomKPI');
    return TherapyCustomKPI.create({ ...data, therapist: therapistId });
  }

  async updateKPI(id, patch) {
    const TherapyCustomKPI = require('../models/TherapyCustomKPI');
    // Treat measurement add as a special case so the parent currentValue
    // stays in sync without forcing the caller to pass both fields.
    if (patch.measurement) {
      const kpi = await TherapyCustomKPI.findById(id);
      if (!kpi) return null;
      kpi.measurements.push({
        date: patch.measurement.date ? new Date(patch.measurement.date) : new Date(),
        value: patch.measurement.value,
        notes: patch.measurement.notes || null,
      });
      kpi.currentValue = patch.measurement.value;
      await kpi.save();
      return kpi;
    }
    return TherapyCustomKPI.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async deleteKPI(id) {
    const TherapyCustomKPI = require('../models/TherapyCustomKPI');
    return TherapyCustomKPI.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Safety Protocols ────────────────────────────────────────────────────

  async getSafetyProtocols(_therapistId) {
    const SafetyProtocol = require('../models/SafetyProtocol');
    return SafetyProtocol.find({ deletedAt: null, status: { $ne: 'archived' } }).sort({
      createdAt: -1,
    });
  }

  async createSafetyProtocol(data) {
    const SafetyProtocol = require('../models/SafetyProtocol');
    const year = new Date().getFullYear();
    const count = await SafetyProtocol.countDocuments({
      protocolNumber: { $regex: `^SP-${year}` },
    });
    const protocolNumber = `SP-${year}-${String(count + 1).padStart(4, '0')}`;
    return SafetyProtocol.create({ ...data, protocolNumber });
  }

  async updateSafetyProtocol(id, patch) {
    const SafetyProtocol = require('../models/SafetyProtocol');
    return SafetyProtocol.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async reportIncident(protocolId, incident) {
    const SafetyProtocol = require('../models/SafetyProtocol');
    if (!incident?.description) {
      throw Object.assign(new Error('incident.description required'), { status: 400 });
    }
    return SafetyProtocol.findByIdAndUpdate(
      protocolId,
      { $push: { incidents: { ...incident, reportedAt: new Date() } } },
      { returnDocument: 'after' }
    );
  }

  async resolveIncident(protocolId, incidentId) {
    const SafetyProtocol = require('../models/SafetyProtocol');
    const protocol = await SafetyProtocol.findById(protocolId);
    if (!protocol) return null;
    const inc = protocol.incidents.id(incidentId);
    if (!inc) return null;
    inc.resolved = true;
    inc.resolvedAt = new Date();
    await protocol.save();
    return protocol;
  }

  async deleteSafetyProtocol(id) {
    const SafetyProtocol = require('../models/SafetyProtocol');
    return SafetyProtocol.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }

  // ─── Research ────────────────────────────────────────────────────────────

  async getResearch(therapistId) {
    const TherapyResearch = require('../models/TherapyResearch');
    return TherapyResearch.find({
      $or: [{ principalInvestigator: therapistId }, { coInvestigators: therapistId }],
      deletedAt: null,
    }).sort({ createdAt: -1 });
  }

  async createResearch(data, therapistId) {
    const TherapyResearch = require('../models/TherapyResearch');
    return TherapyResearch.create({
      ...data,
      principalInvestigator: data.principalInvestigator || therapistId,
    });
  }

  async updateResearch(id, patch) {
    const TherapyResearch = require('../models/TherapyResearch');
    return TherapyResearch.findByIdAndUpdate(id, patch, { returnDocument: 'after' });
  }

  async addPublication(researchId, publication) {
    const TherapyResearch = require('../models/TherapyResearch');
    if (!publication?.title) {
      throw Object.assign(new Error('publication.title required'), { status: 400 });
    }
    return TherapyResearch.findByIdAndUpdate(
      researchId,
      {
        $push: {
          publications: {
            ...publication,
            ...(publication.publishedAt ? { publishedAt: new Date(publication.publishedAt) } : {}),
          },
        },
      },
      { returnDocument: 'after' }
    );
  }

  async deleteResearch(id) {
    const TherapyResearch = require('../models/TherapyResearch');
    return TherapyResearch.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new TherapistPortalService();
