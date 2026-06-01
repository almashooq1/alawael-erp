'use strict';

/**
 * Beneficiary Core Service — خدمة نواة المستفيد الموحدة
 * ══════════════════════════════════════════════════════════════════
 * Facade يجمع كل بيانات المستفيد في واجهة موحدة — الملف الطولي
 * المتكامل الذي يربط كل وحدات المنصة بالمستفيد والحلقة العلاجية.
 *
 * النقاط المحورية:
 *  - الملف الشامل 360° (profile, demographics, medical, contacts)
 *  - السجل الزمني (timeline) — كل حدث مرتبط بالمستفيد
 *  - حلقات الرعاية (Episodes of Care)
 *  - خطط الرعاية النشطة (Care Plans + Goals)
 *  - الجلسات العلاجية (Therapy Sessions)
 *  - التقييمات السريرية (Clinical Assessments)
 *  - التقدم والمقاييس (Progress + Outcome Measures)
 *  - التواصل الأسري (Family Engagement)
 *  - الوثائق المرتبطة (Documents)
 *  - التنبيهات والمخاطر (Alerts + Red Flags)
 * ══════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Lazy model loaders ────────────────────────────────────────────
const M = {
  Beneficiary: () => {
    try {
      return mongoose.model('Beneficiary');
    } catch {
      return null;
    }
  },
  Episode: () => {
    try {
      return mongoose.model('EpisodeOfCare');
    } catch {
      return null;
    }
  },
  CarePlan: () => {
    try {
      return mongoose.model('CarePlan');
    } catch {
      return null;
    }
  },
  Session: () => {
    try {
      return mongoose.model('TherapySession');
    } catch {
      return null;
    }
  },
  Assessment: () => {
    try {
      return mongoose.model('ClinicalAssessment');
    } catch {
      return null;
    }
  },
  Document: () => {
    try {
      return mongoose.model('Document');
    } catch {
      return null;
    }
  },
  Attendance: () => {
    try {
      return mongoose.model('AttendanceRecord');
    } catch {
      return null;
    }
  },
  AcademicRec: () => {
    try {
      return mongoose.model('AcademicRecord');
    } catch {
      return null;
    }
  },
  SupportPlan: () => {
    try {
      return mongoose.model('SupportPlan');
    } catch {
      return null;
    }
  },
  Achievement: () => {
    try {
      return mongoose.model('Achievement');
    } catch {
      return null;
    }
  },
  User: () => {
    try {
      return mongoose.model('User');
    } catch {
      return null;
    }
  },
};

// ── Sub-services (best-effort, graceful fallback) ─────────────────
function loadSvc(rel) {
  try {
    return require(rel);
  } catch {
    return null;
  }
}

const beneficiarySvc = loadSvc('./BeneficiaryService');
const _progressSvc = loadSvc('./beneficiaryProgressService');
// R4 (2026-05-30): removed dead `analyticsService` require — the loaded
// class was never instantiated, and it is DORMANT + tenant-unsafe (raw
// driver, no branch scope). Re-add only with branch threading. See the
// header warning in services/BeneficiaryManagement/AnalyticsService.js.

// ── Shared helpers ─────────────────────────────────────────────────
const _safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

async function safeQuery(modelFn, queryFn, fallback = []) {
  const Model = modelFn();
  if (!Model) return fallback;
  try {
    return await queryFn(Model);
  } catch (err) {
    logger.warn('[BeneficiaryCore] query failed: %s', err.message);
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════
// BeneficiaryCoreSvc
// ══════════════════════════════════════════════════════════════════
class BeneficiaryCoreSvc {
  // ───────────────────────────────────────────────────────────────
  // 1. DASHBOARD — لوحة التحكم الشاملة
  // ───────────────────────────────────────────────────────────────

  /**
   * GET /beneficiary-core/dashboard
   * إحصاءات عامة: أعداد، توزيعات، تنبيهات نشطة
   */
  async getDashboard(_query = {}) {
    const Beneficiary = M.Beneficiary();
    const Episode = M.Episode();

    const [
      totalBeneficiaries,
      activeEpisodes,
      newThisMonth,
      disabilityBreakdown,
      statusBreakdown,
      recentAlerts,
    ] = await Promise.all([
      Beneficiary ? Beneficiary.countDocuments({ isDeleted: { $ne: true } }).catch(() => 0) : 0,
      Episode ? Episode.countDocuments({ status: 'active' }).catch(() => 0) : 0,
      Beneficiary
        ? Beneficiary.countDocuments({
            createdAt: { $gte: new Date(new Date().setDate(1)) },
            isDeleted: { $ne: true },
          }).catch(() => 0)
        : 0,
      Beneficiary
        ? Beneficiary.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: '$disability.type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
          ]).catch(() => [])
        : [],
      Beneficiary
        ? Beneficiary.aggregate([
            { $match: { isDeleted: { $ne: true } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ]).catch(() => [])
        : [],
      this._getSystemAlerts(),
    ]);

    return {
      stats: {
        totalBeneficiaries,
        activeEpisodes,
        newThisMonth,
      },
      disabilityBreakdown: disabilityBreakdown.map(d => ({
        type: d._id || 'غير محدد',
        count: d.count,
      })),
      statusBreakdown: statusBreakdown.map(s => ({
        status: s._id || 'غير محدد',
        count: s.count,
      })),
      alerts: recentAlerts,
      generatedAt: new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 2. LIST — قائمة المستفيدين
  // ───────────────────────────────────────────────────────────────

  async list({
    page = 1,
    limit = 20,
    search = '',
    status = '',
    disabilityType = '',
    branchId = '',
    sort = '-createdAt',
  } = {}) {
    const Beneficiary = M.Beneficiary();
    if (!Beneficiary) return { items: [], total: 0, page, limit };

    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (disabilityType) filter['disability.type'] = disabilityType;
    if (branchId) filter.branchId = branchId;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { firstNameEn: { $regex: search, $options: 'i' } },
        { lastNameEn: { $regex: search, $options: 'i' } },
        { fileNumber: { $regex: search, $options: 'i' } },
        { nationalId: { $regex: search, $options: 'i' } },
        { mrn: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Beneficiary.find(filter)
        .select(
          'firstName lastName firstNameEn lastNameEn fileNumber mrn nationalId dateOfBirth gender disability.type disability.severity status photo profilePhoto branchId createdAt'
        )
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .catch(() => []),
      Beneficiary.countDocuments(filter).catch(() => 0),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ───────────────────────────────────────────────────────────────
  // 3. GET 360° PROFILE — الملف الشامل
  // ───────────────────────────────────────────────────────────────

  /**
   * GET /beneficiary-core/:id/360
   * يستدعي 9 مصادر بشكل متوازٍ ويجمع الملف الشامل
   */
  async get360Profile(beneficiaryId) {
    const Beneficiary = M.Beneficiary();
    if (!Beneficiary) throw new Error('Beneficiary model unavailable');

    const beneficiary = await Beneficiary.findById(beneficiaryId)
      .lean()
      .catch(() => null);
    if (!beneficiary) return null;

    const [
      episodes,
      activeCarePlan,
      recentSessions,
      recentAssessments,
      documents,
      attendance,
      achievements,
      alerts,
      progress,
    ] = await Promise.all([
      this._getEpisodes(beneficiaryId),
      this._getActiveCarePlan(beneficiaryId),
      this._getRecentSessions(beneficiaryId),
      this._getRecentAssessments(beneficiaryId),
      this._getDocuments(beneficiaryId),
      this._getAttendanceSummary(beneficiaryId),
      this._getAchievements(beneficiaryId),
      this._getAlerts(beneficiaryId),
      this._getProgressData(beneficiaryId),
    ]);

    const activeEpisode = episodes.find(e => e.status === 'active') || episodes[0] || null;

    return {
      beneficiary: this._sanitizeProfile(beneficiary),
      summary: this._buildSummary(beneficiary, episodes, activeCarePlan),
      activeEpisode,
      episodes: { items: episodes, total: episodes.length },
      carePlan: activeCarePlan,
      sessions: recentSessions,
      assessments: recentAssessments,
      documents,
      attendance,
      achievements,
      alerts,
      progress,
      journey: this._buildJourney(beneficiary, episodes, recentSessions, recentAssessments),
      generatedAt: new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 4. PROFILE UPDATE — تحديث الملف
  // ───────────────────────────────────────────────────────────────

  async updateProfile(beneficiaryId, data, actorId) {
    const Beneficiary = M.Beneficiary();
    if (!Beneficiary) throw new Error('Beneficiary model unavailable');

    const ALLOWED = [
      'firstName',
      'lastName',
      'firstNameEn',
      'lastNameEn',
      'dateOfBirth',
      'gender',
      'nationality',
      'bloodType',
      'phone',
      'email',
      'address',
      'disability',
      'medicalHistory',
      'allergies',
      'emergencyContacts',
      'familyMembers',
      'guardians',
      'education',
      'notes',
    ];

    const update = {};
    ALLOWED.forEach(k => {
      if (data[k] !== undefined) update[k] = data[k];
    });
    update.updatedBy = actorId;
    update.updatedAt = new Date();

    const updated = await Beneficiary.findByIdAndUpdate(
      beneficiaryId,
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    ).lean();

    return updated;
  }

  // ───────────────────────────────────────────────────────────────
  // 5. TIMELINE — السجل الزمني
  // ───────────────────────────────────────────────────────────────

  async getTimeline(beneficiaryId, { limit = 50, page = 1 } = {}) {
    const [episodes, sessions, assessments] = await Promise.all([
      this._getEpisodes(beneficiaryId),
      safeQuery(M.Session, m =>
        m
          .find({ beneficiary: beneficiaryId })
          .select('date sessionType status therapist')
          .sort('-date')
          .limit(30)
          .lean()
      ),
      safeQuery(M.Assessment, m =>
        m
          .find({ beneficiary: beneficiaryId })
          .select('createdAt category tool score')
          .sort('-createdAt')
          .limit(20)
          .lean()
      ),
    ]);

    const events = [];

    // إضافة الحلقات كأحداث
    episodes.forEach(ep => {
      events.push({
        type: 'episode',
        date: ep.startDate,
        label: `بدء حلقة رعاية — ${ep.type}`,
        status: ep.status,
        ref: ep._id,
        icon: 'medical_services',
        color: ep.status === 'active' ? '#4caf50' : '#9e9e9e',
      });
      if (ep.actualEndDate) {
        events.push({
          type: 'episode_end',
          date: ep.actualEndDate,
          label: `انتهاء حلقة رعاية — ${ep.type}`,
          status: ep.status,
          ref: ep._id,
          icon: 'check_circle',
          color: '#607d8b',
        });
      }
    });

    // إضافة الجلسات كأحداث
    sessions.forEach(s => {
      events.push({
        type: 'session',
        date: s.date,
        label: `جلسة ${s.sessionType || 'علاجية'}`,
        status: s.status,
        ref: s._id,
        icon: 'event',
        color: '#2196f3',
      });
    });

    // إضافة التقييمات كأحداث
    assessments.forEach(a => {
      events.push({
        type: 'assessment',
        date: a.createdAt,
        label: `تقييم ${a.tool || a.category || 'سريري'}`,
        score: a.score,
        ref: a._id,
        icon: 'assessment',
        color: '#9c27b0',
      });
    });

    // ترتيب زمني تنازلي
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = events.length;
    const skip = (page - 1) * limit;
    return {
      events: events.slice(skip, skip + limit),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 6. STATS — إحصاءات تحليلية
  // ───────────────────────────────────────────────────────────────

  async getStats(beneficiaryId) {
    const [episodes, sessions, assessments] = await Promise.all([
      this._getEpisodes(beneficiaryId),
      safeQuery(M.Session, m =>
        m.find({ beneficiary: beneficiaryId }).select('date status sessionType duration').lean()
      ),
      safeQuery(M.Assessment, m =>
        m.find({ beneficiary: beneficiaryId }).select('createdAt score category').lean()
      ),
    ]);

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const avgScore =
      assessments.length > 0
        ? Math.round(assessments.reduce((s, a) => s + (a.score || 0), 0) / assessments.length)
        : null;

    const sessionsByType = {};
    sessions.forEach(s => {
      const t = s.sessionType || 'أخرى';
      sessionsByType[t] = (sessionsByType[t] || 0) + 1;
    });

    return {
      episodes: {
        total: episodes.length,
        active: episodes.filter(e => e.status === 'active').length,
      },
      sessions: {
        total: sessions.length,
        completed: completedSessions.length,
        attendanceRate:
          sessions.length > 0
            ? Math.round((completedSessions.length / sessions.length) * 100)
            : null,
        byType: sessionsByType,
      },
      assessments: { total: assessments.length, avgScore },
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 7. CREATE BENEFICIARY — تسجيل مستفيد جديد
  // ───────────────────────────────────────────────────────────────

  async create(data, actorId) {
    if (beneficiarySvc && typeof beneficiarySvc.prototype?.create === 'function') {
      const svc = new beneficiarySvc();
      return svc.create(data, actorId);
    }

    const Beneficiary = M.Beneficiary();
    if (!Beneficiary) throw new Error('Beneficiary model unavailable');

    const doc = new Beneficiary({ ...data, createdBy: actorId });
    await doc.save();
    return doc.toObject();
  }

  // ───────────────────────────────────────────────────────────────
  // Private helpers
  // ───────────────────────────────────────────────────────────────

  async _getEpisodes(beneficiaryId) {
    return safeQuery(M.Episode, m =>
      m
        .find({ beneficiaryId, isDeleted: { $ne: true } })
        .select(
          'episodeNumber type status priority startDate expectedEndDate actualEndDate currentPhase teamMembers diagnoses'
        )
        .sort('-startDate')
        .limit(20)
        .lean()
    );
  }

  async _getActiveCarePlan(beneficiaryId) {
    const CarePlan = M.CarePlan();
    if (!CarePlan) return null;
    return CarePlan.findOne({ beneficiary: beneficiaryId, status: 'ACTIVE' })
      .select('planNumber startDate reviewDate goals educational therapeutic behavioral social')
      .lean()
      .catch(() => null);
  }

  async _getRecentSessions(beneficiaryId) {
    return safeQuery(M.Session, m =>
      m
        .find({ beneficiary: beneficiaryId })
        .select('date sessionType status therapist duration room notes.subjective')
        .sort('-date')
        .limit(10)
        .lean()
    );
  }

  async _getRecentAssessments(beneficiaryId) {
    return safeQuery(M.Assessment, m =>
      m
        .find({ beneficiary: beneficiaryId })
        .select('createdAt tool category score rawScore interpretation therapist')
        .sort('-createdAt')
        .limit(10)
        .lean()
    );
  }

  async _getDocuments(beneficiaryId) {
    return safeQuery(M.Document, m =>
      m
        .find({ 'metadata.beneficiaryId': beneficiaryId, isDeleted: { $ne: true } })
        .select('title category type status fileSize createdAt')
        .sort('-createdAt')
        .limit(15)
        .lean()
    );
  }

  async _getAttendanceSummary(beneficiaryId) {
    const records = await safeQuery(M.Attendance, m =>
      m
        .find({ beneficiaryId, date: { $gte: new Date(Date.now() - 90 * 86400000) } })
        .select('date status')
        .lean()
    );
    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'حاضر').length;
    return {
      last90Days: total,
      present,
      absent: total - present,
      rate: total > 0 ? Math.round((present / total) * 100) : null,
    };
  }

  async _getAchievements(beneficiaryId) {
    return safeQuery(M.Achievement, m =>
      m.find({ beneficiaryId }).select('title date type description').sort('-date').limit(10).lean()
    );
  }

  async _getAlerts(beneficiaryId) {
    const Episode = M.Episode();
    const alerts = [];
    if (Episode) {
      const episodes = await Episode.find({ beneficiaryId, status: 'active' })
        .select('expectedEndDate priority')
        .lean()
        .catch(() => []);
      episodes.forEach(ep => {
        if (ep.priority === 'emergency') {
          alerts.push({
            level: 'error',
            message: 'حلقة رعاية طارئة نشطة',
            ref: ep._id,
            type: 'episode_priority',
          });
        }
        if (
          ep.expectedEndDate &&
          new Date(ep.expectedEndDate) < new Date(Date.now() + 7 * 86400000)
        ) {
          alerts.push({
            level: 'warning',
            message: 'حلقة الرعاية تنتهي خلال 7 أيام',
            ref: ep._id,
            type: 'episode_expiry',
          });
        }
      });
    }
    return alerts;
  }

  async _getProgressData(beneficiaryId) {
    const assessments = await safeQuery(M.Assessment, m =>
      m
        .find({ beneficiary: beneficiaryId })
        .select('createdAt score category')
        .sort('createdAt')
        .lean()
    );
    const trend = assessments.map(a => ({
      date: a.createdAt,
      score: a.score,
      category: a.category,
    }));
    return { trend };
  }

  async _getSystemAlerts() {
    const Episode = M.Episode();
    if (!Episode) return [];
    try {
      const expiring = await Episode.countDocuments({
        status: 'active',
        expectedEndDate: { $lte: new Date(Date.now() + 7 * 86400000) },
      });
      const alerts = [];
      if (expiring > 0) {
        alerts.push({
          level: 'warning',
          message: `${expiring} حلقة رعاية تنتهي خلال 7 أيام`,
          type: 'expiring_episodes',
          count: expiring,
        });
      }
      return alerts;
    } catch {
      return [];
    }
  }

  _sanitizeProfile(beneficiary) {
    const { password: _p, portalLogin: _pl, ...clean } = beneficiary;
    return clean;
  }

  _buildSummary(beneficiary, episodes, carePlan) {
    const activeEpisode = episodes.find(e => e.status === 'active');
    const goalsDone = carePlan?.goals?.filter(g => g.status === 'ACHIEVED')?.length || 0;
    const goalsTotal = carePlan?.goals?.length || 0;

    return {
      name: `${beneficiary.firstName || ''} ${beneficiary.lastName || ''}`.trim(),
      fileNumber: beneficiary.fileNumber || beneficiary.mrn,
      age: beneficiary.dateOfBirth
        ? Math.floor((Date.now() - new Date(beneficiary.dateOfBirth)) / (365.25 * 86400000))
        : null,
      status: beneficiary.status,
      disabilityType: beneficiary.disability?.type,
      disabilitySeverity: beneficiary.disability?.severity,
      episodeStatus: activeEpisode?.status,
      currentPhase: activeEpisode?.currentPhase,
      goalsProgress: goalsTotal > 0 ? Math.round((goalsDone / goalsTotal) * 100) : null,
      enrolledPrograms: beneficiary.education?.enrolledPrograms?.length || 0,
    };
  }

  _buildJourney(beneficiary, episodes, sessions, assessments) {
    const milestones = [];

    // تسجيل المستفيد
    milestones.push({
      type: 'registration',
      date: beneficiary.createdAt,
      label: 'تسجيل المستفيد',
      icon: 'person_add',
    });

    // حلقات الرعاية
    episodes.slice(0, 5).forEach(ep => {
      milestones.push({
        type: 'episode_start',
        date: ep.startDate,
        label: `بدء حلقة: ${ep.type}`,
        phase: ep.currentPhase,
        icon: 'medical_services',
      });
    });

    // آخر تقييم
    if (assessments.length > 0) {
      const latest = assessments[0];
      milestones.push({
        type: 'assessment',
        date: latest.createdAt,
        label: `تقييم: ${latest.tool || latest.category}`,
        score: latest.score,
        icon: 'assessment',
      });
    }

    milestones.sort((a, b) => new Date(b.date) - new Date(a.date));
    return milestones.slice(0, 20);
  }
}

module.exports = new BeneficiaryCoreSvc();
