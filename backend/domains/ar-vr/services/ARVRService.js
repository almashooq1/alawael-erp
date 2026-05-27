/**
 * ARVRService — خدمة تأهيل الواقع الافتراضي / المعزز
 *
 * Wraps the ARVRSession model with input normalization (the UI sends
 * `sessionType` / `duration` / `goals` / `active` while the schema is
 * canonical `technologyType` / `plannedDurationMinutes` / `scenario.objectives` /
 * `in_progress`) and output shaping (the dashboard tab reads
 * `totalSessions, byType, completionRate, …` — none of which existed on
 * the prior return). Without this layer the dashboard tab 404s on a
 * field-name level and create-form 400s on missing `therapistId`.
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');
const { SCENARIOS_BY_ID, getScenario } = require('../data/arvr-scenarios.catalog');

const CANONICAL_TECH_TYPES = ['vr', 'ar', 'mr', 'xr', 'mixed', 'hologram', 'bci'];
const CANONICAL_STATUS = [
  'scheduled',
  'preparing',
  'in_progress',
  'paused',
  'completed',
  'cancelled',
  'aborted',
  'technical_failure',
];

// UI sends `pending` / `active` — schema stores `scheduled` / `in_progress`.
const STATUS_ALIAS_IN = { pending: 'scheduled', active: 'in_progress' };
const STATUS_ALIAS_OUT = { scheduled: 'pending', in_progress: 'active' };

const TECH_ALIAS_IN = { virtual: 'vr', augmented: 'ar', extended: 'xr' };

function normalizeStatusIn(s) {
  if (!s) return s;
  return STATUS_ALIAS_IN[s] || s;
}
function normalizeStatusOut(s) {
  return STATUS_ALIAS_OUT[s] || s;
}
function normalizeTechIn(t) {
  if (!t) return t;
  const lower = String(t).toLowerCase();
  return TECH_ALIAS_IN[lower] || lower;
}

// Take whatever the UI sends (sessionType, duration, environment, goals[],
// difficulty) and merge it into the canonical schema shape without
// dropping anything an integrator might pass through the same endpoint
// using the rich shape.
function normalizeCreatePayload(raw = {}) {
  const out = { ...raw };

  // sessionType is the UI's name for technologyType
  if (raw.sessionType && !out.technologyType) {
    out.technologyType = normalizeTechIn(raw.sessionType);
  } else if (raw.technologyType) {
    out.technologyType = normalizeTechIn(raw.technologyType);
  }
  delete out.sessionType;

  // duration (UI: minutes) → plannedDurationMinutes
  if (raw.duration != null && out.plannedDurationMinutes == null) {
    const n = Number(raw.duration);
    if (!Number.isNaN(n)) out.plannedDurationMinutes = n;
  }
  delete out.duration;

  // Scenario shaping — if the UI sent a scenarioId from the catalog,
  // hydrate the scenario sub-doc from the catalog entry. If the UI sent
  // free-text environment/goals/difficulty, fold those into scenario.*
  const scenarioId = raw.scenarioId || raw.scenario?.scenarioId;
  const catalog = scenarioId ? getScenario(scenarioId) : null;
  const baseScenario = catalog
    ? {
        scenarioId: catalog.id,
        name: catalog.name,
        category: catalog.category,
        difficultyLevel: catalog.defaultDifficulty,
        environment: catalog.description,
        objectives: catalog.objectives,
      }
    : {};
  out.scenario = { ...baseScenario, ...(raw.scenario || {}) };
  if (raw.environment && !out.scenario.environment) out.scenario.environment = raw.environment;
  if (Array.isArray(raw.goals) && !out.scenario.objectives?.length) {
    out.scenario.objectives = raw.goals;
  } else if (
    typeof raw.goals === 'string' &&
    raw.goals.trim() &&
    !out.scenario.objectives?.length
  ) {
    out.scenario.objectives = raw.goals
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (raw.difficulty != null && out.scenario.difficultyLevel == null) {
    const lvlMap = { easy: 2, medium: 5, hard: 8 };
    const mapped = lvlMap[raw.difficulty];
    out.scenario.difficultyLevel = mapped != null ? mapped : Number(raw.difficulty) || undefined;
  }
  if (!out.scenario.name) out.scenario.name = raw.environment || 'جلسة عامة';

  delete out.environment;
  delete out.goals;
  delete out.difficulty;
  delete out.scenarioId;

  // Use createdBy as therapistId fallback (legacy UI doesn't send therapistId)
  if (!out.therapistId && out.createdBy) out.therapistId = out.createdBy;

  return out;
}

// Add UI-friendly aliases to outgoing session docs without losing the
// canonical fields downstream callers may expect.
function shapeSession(doc) {
  if (!doc) return doc;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    ...plain,
    sessionType: plain.technologyType,
    status: plain.status,
    uiStatus: normalizeStatusOut(plain.status),
    duration:
      plain.plannedDurationMinutes ??
      (plain.activeDurationSeconds ? Math.round(plain.activeDurationSeconds / 60) : null),
    environment: plain.scenario?.environment,
    performanceScore: plain.performance?.overallScore,
  };
}

class ARVRService extends BaseService {
  constructor() {
    super({ serviceName: 'ARVRService', cachePrefix: 'arvr' });
  }

  /* ── Create session ── */
  async createSession(data) {
    const ARVRSession = mongoose.model('ARVRSession');
    const normalized = normalizeCreatePayload(data);
    if (!normalized.technologyType) normalized.technologyType = 'vr';
    if (!CANONICAL_TECH_TYPES.includes(normalized.technologyType)) {
      const err = new Error(
        `نوع التقنية غير صالح: ${normalized.technologyType}. القيم المقبولة: ${CANONICAL_TECH_TYPES.join(', ')}`
      );
      err.statusCode = 400;
      throw err;
    }
    const session = await ARVRSession.create(normalized);
    this.emit('arvr:session:created', {
      sessionId: session._id,
      beneficiaryId: normalized.beneficiaryId,
    });
    return shapeSession(session);
  }

  /* ── List sessions ── */
  async listSessions({
    beneficiaryId,
    therapistId,
    status,
    technologyType,
    sessionType,
    search,
    page = 1,
    limit = 20,
  } = {}) {
    const ARVRSession = mongoose.model('ARVRSession');
    const q = { isDeleted: { $ne: true } };
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (therapistId) q.therapistId = therapistId;
    const normStatus = normalizeStatusIn(status);
    if (normStatus) q.status = normStatus;
    const tech = normalizeTechIn(technologyType || sessionType);
    if (tech) q.technologyType = tech;
    if (search) q['scenario.name'] = { $regex: search, $options: 'i' };

    const total = await ARVRSession.countDocuments(q);
    const data = await ARVRSession.find(q)
      .sort({ startedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('therapistId', 'name email')
      .lean();
    return {
      data: data.map(shapeSession),
      total,
      page: +page,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  /* ── Get one ── */
  async getSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    const doc = await ARVRSession.findById(id)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('therapistId', 'name email')
      .lean();
    return shapeSession(doc);
  }

  /* ── Lifecycle: start ── */
  async startSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    const doc = await ARVRSession.findByIdAndUpdate(
      id,
      { status: 'in_progress', startedAt: new Date() },
      { returnDocument: 'after' }
    );
    return shapeSession(doc);
  }

  /* ── Pause / resume ── */
  async pauseSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    const doc = await ARVRSession.findByIdAndUpdate(
      id,
      { status: 'paused', $inc: { pauseCount: 1 } },
      { returnDocument: 'after' }
    );
    return shapeSession(doc);
  }
  async resumeSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    const doc = await ARVRSession.findByIdAndUpdate(
      id,
      { status: 'in_progress' },
      { returnDocument: 'after' }
    );
    return shapeSession(doc);
  }

  /* ── Complete ── */
  async completeSession(id, payload = {}) {
    const ARVRSession = mongoose.model('ARVRSession');
    const endedAt = new Date();
    const session = await ARVRSession.findById(id);
    if (!session) {
      const err = new Error('الجلسة غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    const activeDuration = session.startedAt
      ? Math.round((endedAt - session.startedAt) / 1000) - (session.pauseDurationSeconds || 0)
      : 0;

    // Normalize the UI's flat shape into performance.* + clinicalNotes
    const update = { status: 'completed', endedAt, activeDurationSeconds: activeDuration };
    if (payload.performance) update.performance = payload.performance;
    if (payload.performanceScore != null) {
      update.performance = {
        ...(payload.performance || {}),
        overallScore: Number(payload.performanceScore),
      };
    }
    if (payload.notes || payload.outcome || payload.sessionNotes || payload.summary) {
      update.clinicalNotes = {
        ...(session.clinicalNotes?.toObject?.() || session.clinicalNotes || {}),
        observation: payload.notes || payload.observation,
        assessment: payload.assessment || payload.outcome,
        plan: payload.plan,
        response: payload.response || payload.sessionNotes,
      };
    }

    // Compare to previous completed session for the same scenario.
    const previous = await ARVRSession.findOne({
      beneficiaryId: session.beneficiaryId,
      'scenario.scenarioId': session.scenario?.scenarioId,
      status: 'completed',
      _id: { $ne: id },
    })
      .sort({ endedAt: -1 })
      .lean();

    if (previous?.performance && update.performance) {
      const scoreDiff =
        (update.performance.overallScore || 0) - (previous.performance.overallScore || 0);
      update.comparisonToPrevious = {
        scoreChange: scoreDiff,
        accuracyChange: (update.performance.accuracy || 0) - (previous.performance.accuracy || 0),
        reactionTimeChange:
          (update.performance.reactionTimeMs || 0) - (previous.performance.reactionTimeMs || 0),
        trend: scoreDiff > 2 ? 'improving' : scoreDiff < -2 ? 'declining' : 'stable',
      };
    }

    const doc = await ARVRSession.findByIdAndUpdate(id, update, { returnDocument: 'after' });
    return shapeSession(doc);
  }

  /* ── Abort ── */
  async abortSession(id, reason) {
    const ARVRSession = mongoose.model('ARVRSession');
    const doc = await ARVRSession.findByIdAndUpdate(
      id,
      { status: 'aborted', abortReason: reason, endedAt: new Date() },
      { returnDocument: 'after' }
    );
    return shapeSession(doc);
  }

  /* ── Record safety/discomfort ── */
  async recordSafety(id, safetyData = {}) {
    const ARVRSession = mongoose.model('ARVRSession');
    // The UI sends { type, severity, description }; the schema stores
    // these as cybersicknessSymptoms[] + safetyIncidents[]. Map both.
    const incident = {
      type: safetyData.type,
      description: safetyData.description,
      severity:
        safetyData.severity === 'low'
          ? 'minor'
          : safetyData.severity === 'medium'
            ? 'moderate'
            : safetyData.severity === 'high'
              ? 'serious'
              : safetyData.severity,
      timestamp: new Date(),
    };
    const update = {
      $set: {
        'safety.discomfortReported': true,
        'safety.discomfortDetails': safetyData.description,
        'safety.cybersicknessLevel':
          safetyData.severity === 'high'
            ? 'severe'
            : safetyData.severity === 'medium'
              ? 'moderate'
              : 'mild',
      },
      $push: { 'safety.safetyIncidents': incident },
    };
    const doc = await ARVRSession.findByIdAndUpdate(id, update, { returnDocument: 'after' });
    return shapeSession(doc);
  }

  /* ── Progress across sessions — UI-shaped summary ── */
  async getBeneficiaryProgress(beneficiaryId, scenarioId) {
    const ARVRSession = mongoose.model('ARVRSession');
    if (!mongoose.isValidObjectId(beneficiaryId)) {
      const err = new Error('معرّف المستفيد غير صالح');
      err.statusCode = 400;
      throw err;
    }
    const q = {
      beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
      isDeleted: { $ne: true },
    };
    if (scenarioId) q['scenario.scenarioId'] = scenarioId;

    const sessions = await ARVRSession.find(q)
      .sort({ startedAt: -1, createdAt: -1 })
      .select(
        'technologyType scenario.name scenario.scenarioId scenario.difficultyLevel performance startedAt endedAt status activeDurationSeconds plannedDurationMinutes comparisonToPrevious'
      )
      .lean();

    const completed = sessions.filter(s => s.status === 'completed');
    const totalDurationMin = sessions.reduce(
      (acc, s) =>
        acc +
        (s.activeDurationSeconds
          ? Math.round(s.activeDurationSeconds / 60)
          : s.plannedDurationMinutes || 0),
      0
    );
    const scores = completed
      .map(s => s.performance?.overallScore)
      .filter(n => typeof n === 'number');
    const avgScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    const lastCompleted = completed[0];
    const trend = lastCompleted?.comparisonToPrevious?.trend || null;

    return {
      beneficiaryId,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      totalDuration: totalDurationMin,
      avgScore,
      trend,
      progressNotes: lastCompleted?.clinicalNotes?.assessment || null,
      sessions: sessions.map(s => ({
        _id: s._id,
        sessionType: s.technologyType,
        type: s.technologyType,
        scenarioName: s.scenario?.name,
        scenarioId: s.scenario?.scenarioId,
        date: s.startedAt || s.endedAt,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        duration: s.activeDurationSeconds
          ? Math.round(s.activeDurationSeconds / 60)
          : s.plannedDurationMinutes,
        performanceScore: s.performance?.overallScore,
        status: s.status,
        uiStatus: normalizeStatusOut(s.status),
      })),
    };
  }

  /* ── Dashboard — UI-shaped ── */
  async getDashboard(branchId) {
    const ARVRSession = mongoose.model('ARVRSession');
    const match = { isDeleted: { $ne: true } };
    if (branchId && mongoose.isValidObjectId(branchId)) {
      match.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [statusBucket, techBucket, perf, beneficiaryCount, incidentsThisMonth, durAvg] =
      await Promise.all([
        ARVRSession.aggregate([
          { $match: match },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        ARVRSession.aggregate([
          { $match: match },
          { $group: { _id: '$technologyType', count: { $sum: 1 } } },
        ]),
        ARVRSession.aggregate([
          { $match: { ...match, status: 'completed' } },
          {
            $group: {
              _id: null,
              avgScore: { $avg: '$performance.overallScore' },
              avgDuration: { $avg: '$activeDurationSeconds' },
            },
          },
        ]),
        ARVRSession.distinct('beneficiaryId', match).then(arr => arr.length),
        ARVRSession.countDocuments({
          ...match,
          'safety.safetyIncidents.0': { $exists: true },
          createdAt: { $gte: startOfMonth },
        }),
        ARVRSession.aggregate([
          { $match: { ...match, plannedDurationMinutes: { $gt: 0 } } },
          { $group: { _id: null, avg: { $avg: '$plannedDurationMinutes' } } },
        ]),
      ]);

    const statusMap = Object.fromEntries(statusBucket.map(s => [s._id, s.count]));
    const techMap = Object.fromEntries(techBucket.map(s => [s._id, s.count]));
    const totalSessions = statusBucket.reduce((acc, s) => acc + s.count, 0);
    const completed = statusMap['completed'] || 0;
    const aborted = statusMap['aborted'] || 0;

    const avgScore = perf[0]?.avgScore != null ? Math.round(perf[0].avgScore) : null;
    const avgActiveDurationMin = perf[0]?.avgDuration ? Math.round(perf[0].avgDuration / 60) : null;
    const avgPlannedDurationMin = durAvg[0]?.avg ? Math.round(durAvg[0].avg) : null;

    return {
      totalSessions,
      activeSessions: statusMap['in_progress'] || 0,
      pausedSessions: statusMap['paused'] || 0,
      completedSessions: completed,
      abortedSessions: aborted,
      scheduledSessions: statusMap['scheduled'] || 0,
      totalBeneficiaries: beneficiaryCount,
      byType: {
        vr: techMap['vr'] || 0,
        ar: techMap['ar'] || 0,
        xr: techMap['xr'] || 0,
        mr: techMap['mr'] || 0,
        mixed: techMap['mixed'] || 0,
        hologram: techMap['hologram'] || 0,
        bci: techMap['bci'] || 0,
      },
      avgDuration: avgActiveDurationMin ?? avgPlannedDurationMin,
      avgPerformanceScore: avgScore,
      completionRate: totalSessions ? Math.round((completed / totalSessions) * 100) : 0,
      safetyIncidents: incidentsThisMonth,
    };
  }

  /* ── Analytics: trend across last N days ── */
  async getAnalytics({ days = 30, branchId } = {}) {
    const ARVRSession = mongoose.model('ARVRSession');
    const since = new Date(Date.now() - Number(days) * 86400000);
    const match = { isDeleted: { $ne: true }, createdAt: { $gte: since } };
    if (branchId && mongoose.isValidObjectId(branchId)) {
      match.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const [perDay, byScenario, cybersickness] = await Promise.all([
      ARVRSession.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            avgScore: { $avg: '$performance.overallScore' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ARVRSession.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
          $group: {
            _id: '$scenario.scenarioId',
            name: { $first: '$scenario.name' },
            count: { $sum: 1 },
            avgScore: { $avg: '$performance.overallScore' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      ARVRSession.aggregate([
        {
          $match: {
            ...match,
            'safety.cybersicknessLevel': { $exists: true, $ne: 'none' },
          },
        },
        { $group: { _id: '$safety.cybersicknessLevel', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      windowDays: Number(days),
      perDay: perDay.map(d => ({
        date: d._id,
        sessions: d.count,
        completed: d.completed,
        avgScore: d.avgScore != null ? Math.round(d.avgScore) : null,
      })),
      topScenarios: byScenario.map(s => ({
        scenarioId: s._id,
        name: s.name,
        sessions: s.count,
        avgScore: s.avgScore != null ? Math.round(s.avgScore) : null,
      })),
      cybersicknessIncidence: Object.fromEntries(cybersickness.map(c => [c._id, c.count])),
    };
  }
}

const arvrService = new ARVRService();

module.exports = {
  arvrService,
  ARVRService,
  // exported for tests
  __internals: {
    normalizeCreatePayload,
    shapeSession,
    STATUS_ALIAS_IN,
    STATUS_ALIAS_OUT,
    CANONICAL_TECH_TYPES,
    CANONICAL_STATUS,
    SCENARIOS_BY_ID,
  },
};
