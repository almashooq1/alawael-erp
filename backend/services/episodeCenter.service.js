'use strict';

/**
 * Episode Center Service — خدمة مركز الحلقة العلاجية الموحدة
 * ══════════════════════════════════════════════════════════════════
 * Facade يجمع كل عمليات الحلقة العلاجية في واجهة موحدة.
 *
 * الحلقة العلاجية (Episode of Care) هي النقطة المحورية التي تربط:
 *  - ملف المستفيد
 *  - التقييمات السريرية
 *  - خطط الرعاية والأهداف
 *  - الجلسات العلاجية
 *  - فريق العلاج (MDT)
 *  - المراحل السريرية (12 مرحلة)
 *  - مقاييس النتائج
 * ══════════════════════════════════════════════════════════════════
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Lazy model loaders ────────────────────────────────────────────
const M = {
  Episode: () => {
    try {
      return mongoose.model('EpisodeOfCare');
    } catch {
      return null;
    }
  },
  Beneficiary: () => {
    try {
      return mongoose.model('Beneficiary');
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
  User: () => {
    try {
      return mongoose.model('User');
    } catch {
      return null;
    }
  },
};

async function safeQuery(modelFn, queryFn, fallback = []) {
  const Model = modelFn();
  if (!Model) return fallback;
  try {
    return await queryFn(Model);
  } catch (err) {
    logger.warn('[EpisodeCenter] query failed: %s', err.message);
    return fallback;
  }
}

// ══════════════════════════════════════════════════════════════════
// Phase configuration (aligned with backend enum)
// ══════════════════════════════════════════════════════════════════
const PHASE_ORDER = [
  'referral',
  'intake',
  'triage',
  'initial_assessment',
  'mdt_review',
  'care_plan_approval',
  'active_treatment',
  'reassessment',
  'outcome_review',
  'discharge_planning',
  'discharge',
  'post_discharge_followup',
];

const PHASE_LABELS = {
  referral: 'الإحالة',
  intake: 'القبول',
  triage: 'الفرز',
  initial_assessment: 'التقييم الأولي',
  mdt_review: 'مراجعة الفريق MDT',
  care_plan_approval: 'اعتماد خطة الرعاية',
  active_treatment: 'العلاج النشط',
  reassessment: 'إعادة التقييم',
  outcome_review: 'مراجعة النتائج',
  discharge_planning: 'تخطيط الخروج',
  discharge: 'الخروج',
  post_discharge_followup: 'المتابعة البعدية',
};

// ══════════════════════════════════════════════════════════════════
// EpisodeCenterSvc
// ══════════════════════════════════════════════════════════════════
class EpisodeCenterSvc {
  // ───────────────────────────────────────────────────────────────
  // 1. DASHBOARD — لوحة التحكم
  // ───────────────────────────────────────────────────────────────

  async getDashboard(query = {}) {
    const Episode = M.Episode();
    if (!Episode) return this._emptyDashboard();

    const filter = { isDeleted: { $ne: true } };
    if (query.branchId) filter.branchId = query.branchId;

    const [
      totalActive,
      totalPlanned,
      totalCompleted,
      phaseDistribution,
      typeDistribution,
      priorityBreakdown,
      recentEpisodes,
      expiringEpisodes,
    ] = await Promise.all([
      Episode.countDocuments({ ...filter, status: 'active' }).catch(() => 0),
      Episode.countDocuments({ ...filter, status: 'planned' }).catch(() => 0),
      Episode.countDocuments({ ...filter, status: 'completed' }).catch(() => 0),
      Episode.aggregate([
        { $match: { ...filter, status: 'active' } },
        { $group: { _id: '$currentPhase', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
      Episode.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).catch(() => []),
      Episode.aggregate([
        { $match: { ...filter, status: 'active' } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]).catch(() => []),
      Episode.find({ ...filter, status: 'active' })
        .select(
          'episodeNumber beneficiaryId type status priority currentPhase startDate expectedEndDate'
        )
        .sort('-createdAt')
        .limit(10)
        .populate('beneficiaryId', 'firstName lastName fileNumber')
        .lean()
        .catch(() => []),
      Episode.find({
        ...filter,
        status: 'active',
        expectedEndDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 14 * 86400000),
        },
      })
        .select('episodeNumber beneficiaryId expectedEndDate priority')
        .populate('beneficiaryId', 'firstName lastName fileNumber')
        .lean()
        .catch(() => []),
    ]);

    return {
      stats: {
        active: totalActive,
        planned: totalPlanned,
        completed: totalCompleted,
        total: totalActive + totalPlanned + totalCompleted,
      },
      phaseDistribution: phaseDistribution.map(p => ({
        phase: p._id || 'unknown',
        label: PHASE_LABELS[p._id] || p._id,
        count: p.count,
      })),
      typeDistribution: typeDistribution.map(t => ({
        type: t._id || 'غير محدد',
        count: t.count,
      })),
      priorityBreakdown: priorityBreakdown.map(p => ({
        priority: p._id || 'routine',
        count: p.count,
      })),
      recentEpisodes,
      expiringEpisodes,
      phaseOrder: PHASE_ORDER,
      phaseLabels: PHASE_LABELS,
      generatedAt: new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 2. LIST — قائمة الحلقات
  // ───────────────────────────────────────────────────────────────

  async list({
    page = 1,
    limit = 20,
    status = '',
    type = '',
    priority = '',
    phase = '',
    beneficiaryId = '',
    branchId = '',
    sort = '-startDate',
  } = {}) {
    const Episode = M.Episode();
    if (!Episode) return { items: [], total: 0, page, limit };

    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (phase) filter.currentPhase = phase;
    if (beneficiaryId) filter.beneficiaryId = beneficiaryId;
    if (branchId) filter.branchId = branchId;

    const [items, total] = await Promise.all([
      Episode.find(filter)
        .populate(
          'beneficiaryId',
          'firstName lastName firstNameEn lastNameEn fileNumber mrn disability.type'
        )
        .select(
          'episodeNumber type status priority currentPhase startDate expectedEndDate actualEndDate teamMembers diagnoses'
        )
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .catch(() => []),
      Episode.countDocuments(filter).catch(() => 0),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ───────────────────────────────────────────────────────────────
  // 3. GET SINGLE — الحلقة الكاملة مع كل البيانات
  // ───────────────────────────────────────────────────────────────

  async getFullEpisode(episodeId) {
    const Episode = M.Episode();
    if (!Episode) throw new Error('Episode model unavailable');

    const episode = await Episode.findById(episodeId)
      .populate(
        'beneficiaryId',
        'firstName lastName firstNameEn lastNameEn fileNumber mrn dateOfBirth gender disability photo'
      )
      .lean()
      .catch(() => null);
    if (!episode) return null;

    const beneficiaryId = episode.beneficiaryId?._id || episode.beneficiaryId;

    const [carePlan, sessions, assessments] = await Promise.all([
      safeQuery(
        M.CarePlan,
        m =>
          m
            .findOne({ beneficiary: beneficiaryId, episodeOfCare: episodeId, status: 'ACTIVE' })
            .select(
              'planNumber startDate reviewDate status goals educational therapeutic behavioral social'
            )
            .lean()
            .catch(() =>
              m
                .findOne({ beneficiary: beneficiaryId, status: 'ACTIVE' })
                .select('planNumber startDate reviewDate status goals')
                .lean()
            ),
        null
      ),
      safeQuery(M.Session, m =>
        m
          .find({ episodeOfCare: episodeId })
          .select('date sessionType status therapist duration room notes.subjective attendance')
          .sort('-date')
          .limit(20)
          .lean()
      ),
      safeQuery(M.Assessment, m =>
        m
          .find({ episodeOfCare: episodeId })
          .select('createdAt tool category score rawScore interpretation therapist')
          .sort('-createdAt')
          .limit(15)
          .lean()
      ),
    ]);

    const phaseIndex = PHASE_ORDER.indexOf(episode.currentPhase);

    return {
      episode,
      beneficiary: episode.beneficiaryId,
      carePlan,
      sessions: { items: sessions, total: sessions.length },
      assessments: { items: assessments, total: assessments.length },
      phaseProgress: {
        current: episode.currentPhase,
        currentLabel: PHASE_LABELS[episode.currentPhase] || episode.currentPhase,
        index: phaseIndex,
        total: PHASE_ORDER.length,
        percent: phaseIndex >= 0 ? Math.round(((phaseIndex + 1) / PHASE_ORDER.length) * 100) : 0,
        phases: PHASE_ORDER.map((p, i) => ({
          key: p,
          label: PHASE_LABELS[p],
          status: i < phaseIndex ? 'completed' : i === phaseIndex ? 'active' : 'pending',
        })),
      },
      goals: carePlan?.goals || [],
      teamMembers: episode.teamMembers || [],
      diagnoses: episode.diagnoses || [],
      generatedAt: new Date(),
    };
  }

  // ───────────────────────────────────────────────────────────────
  // 4. CREATE — إنشاء حلقة جديدة
  // ───────────────────────────────────────────────────────────────

  async create(data, actorId) {
    const Episode = M.Episode();
    if (!Episode) throw new Error('Episode model unavailable');

    const doc = new Episode({
      ...data,
      currentPhase: data.currentPhase || 'referral',
      status: data.status || 'planned',
      createdBy: actorId,
    });
    await doc.save();
    return doc.toObject();
  }

  // ───────────────────────────────────────────────────────────────
  // 5. ADVANCE PHASE — تقدم مرحلة
  // ───────────────────────────────────────────────────────────────

  async advancePhase(episodeId, notes, actorId) {
    const Episode = M.Episode();
    if (!Episode) throw new Error('Episode model unavailable');

    const episode = await Episode.findById(episodeId);
    if (!episode) throw new Error('حلقة الرعاية غير موجودة');

    const currentIndex = PHASE_ORDER.indexOf(episode.currentPhase);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
      throw new Error('لا يمكن التقدم — الحلقة في آخر مرحلة');
    }

    const nextPhase = PHASE_ORDER[currentIndex + 1];
    const previousPhase = episode.currentPhase;

    // سجل المرحلة السابقة
    if (!episode.phases) episode.phases = [];
    episode.phases.push({
      phase: previousPhase,
      enteredAt:
        episode.phases.length > 0
          ? episode.phases[episode.phases.length - 1].exitedAt || episode.startDate
          : episode.startDate,
      exitedAt: new Date(),
      notes: notes || '',
      advancedBy: actorId,
    });

    episode.currentPhase = nextPhase;
    episode.updatedBy = actorId;

    // إذا وصلنا للخروج، حدّث الحالة
    if (nextPhase === 'discharge' || nextPhase === 'post_discharge_followup') {
      episode.status = nextPhase === 'discharge' ? 'completed' : episode.status;
    }

    // إذا كانت في مرحلة الإحالة وتقدمت → active
    if (previousPhase === 'referral') {
      episode.status = 'active';
    }

    await episode.save();
    return episode.toObject();
  }

  // ───────────────────────────────────────────────────────────────
  // 6. UPDATE STATUS — تحديث الحالة
  // ───────────────────────────────────────────────────────────────

  async updateStatus(episodeId, status, reason, actorId) {
    const Episode = M.Episode();
    if (!Episode) throw new Error('Episode model unavailable');

    const VALID_STATUSES = [
      'planned',
      'active',
      'on_hold',
      'suspended',
      'completed',
      'cancelled',
      'transferred',
    ];
    if (!VALID_STATUSES.includes(status)) {
      throw new Error(`حالة غير صحيحة: ${status}`);
    }

    const update = { status, updatedBy: actorId };
    if (status === 'completed' || status === 'cancelled') {
      update.actualEndDate = new Date();
    }
    if (reason) update.statusChangeReason = reason;

    return Episode.findByIdAndUpdate(episodeId, { $set: update }, { new: true }).lean();
  }

  // ───────────────────────────────────────────────────────────────
  // 7. ADD TEAM MEMBER — إضافة عضو للفريق
  // ───────────────────────────────────────────────────────────────

  async addTeamMember(episodeId, memberData, actorId) {
    const Episode = M.Episode();
    if (!Episode) throw new Error('Episode model unavailable');

    const episode = await Episode.findById(episodeId);
    if (!episode) throw new Error('حلقة الرعاية غير موجودة');

    // تجنب التكرار
    const exists = episode.teamMembers?.some(
      m => m.userId?.toString() === memberData.userId && m.role === memberData.role
    );
    if (exists) throw new Error('العضو موجود بالفعل في الفريق بنفس الدور');

    episode.teamMembers = episode.teamMembers || [];
    episode.teamMembers.push({ ...memberData, addedBy: actorId, addedAt: new Date() });
    episode.updatedBy = actorId;
    await episode.save();
    return episode.toObject();
  }

  // ───────────────────────────────────────────────────────────────
  // Private helpers
  // ───────────────────────────────────────────────────────────────

  _emptyDashboard() {
    return {
      stats: { active: 0, planned: 0, completed: 0, total: 0 },
      phaseDistribution: [],
      typeDistribution: [],
      priorityBreakdown: [],
      recentEpisodes: [],
      expiringEpisodes: [],
      phaseOrder: PHASE_ORDER,
      phaseLabels: PHASE_LABELS,
      generatedAt: new Date(),
    };
  }
}

module.exports = new EpisodeCenterSvc();
