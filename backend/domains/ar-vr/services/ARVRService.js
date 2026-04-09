/**
 * ARVRService — خدمة تأهيل الواقع الافتراضي / المعزز
 *
 * إدارة الجلسات، السيناريوهات، الأداء، بيانات الحركة، لوحة المعلومات
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class ARVRService extends BaseService {
  constructor() {
    super({ serviceName: 'ARVRService', cachePrefix: 'arvr' });
  }

  /* ── Create session ── */
  async createSession(data) {
    const ARVRSession = mongoose.model('ARVRSession');
    const session = await ARVRSession.create(data);
    this.emit('arvr:session:created', {
      sessionId: session._id,
      beneficiaryId: data.beneficiaryId,
    });
    return session;
  }

  /* ── List sessions ── */
  async listSessions({
    beneficiaryId,
    therapistId,
    status,
    technologyType,
    page = 1,
    limit = 20,
  } = {}) {
    const ARVRSession = mongoose.model('ARVRSession');
    const q = { isDeleted: { $ne: true } };
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (therapistId) q.therapistId = therapistId;
    if (status) q.status = status;
    if (technologyType) q.technologyType = technologyType;
    const total = await ARVRSession.countDocuments(q);
    const data = await ARVRSession.find(q)
      .sort({ startedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('therapistId', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  /* ── Get one ── */
  async getSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    return ARVRSession.findById(id)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('therapistId', 'name email')
      .lean();
  }

  /* ── Start ── */
  async startSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    return ARVRSession.findByIdAndUpdate(
      id,
      { status: 'in_progress', startedAt: new Date() },
      { new: true }
    );
  }

  /* ── Pause / resume ── */
  async pauseSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    return ARVRSession.findByIdAndUpdate(
      id,
      { status: 'paused', $inc: { pauseCount: 1 } },
      { new: true }
    );
  }
  async resumeSession(id) {
    const ARVRSession = mongoose.model('ARVRSession');
    return ARVRSession.findByIdAndUpdate(id, { status: 'in_progress' }, { new: true });
  }

  /* ── Complete ── */
  async completeSession(id, payload) {
    const ARVRSession = mongoose.model('ARVRSession');
    const endedAt = new Date();
    const session = await ARVRSession.findById(id);
    const activeDuration = session?.startedAt
      ? Math.round((endedAt - session.startedAt) / 1000) - (session.pauseDurationSeconds || 0)
      : 0;

    // Compare to previous
    const previous = await ARVRSession.findOne({
      beneficiaryId: session.beneficiaryId,
      'scenario.scenarioId': session.scenario?.scenarioId,
      status: 'completed',
      _id: { $ne: id },
    })
      .sort({ endedAt: -1 })
      .lean();

    let comparisonToPrevious;
    if (previous?.performance && payload.performance) {
      const scoreDiff =
        (payload.performance.overallScore || 0) - (previous.performance.overallScore || 0);
      comparisonToPrevious = {
        scoreChange: scoreDiff,
        accuracyChange: (payload.performance.accuracy || 0) - (previous.performance.accuracy || 0),
        reactionTimeChange:
          (payload.performance.reactionTimeMs || 0) - (previous.performance.reactionTimeMs || 0),
        trend: scoreDiff > 2 ? 'improving' : scoreDiff < -2 ? 'declining' : 'stable',
      };
    }

    return ARVRSession.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        endedAt,
        activeDurationSeconds: activeDuration,
        ...payload,
        ...(comparisonToPrevious ? { comparisonToPrevious } : {}),
      },
      { new: true }
    );
  }

  /* ── Abort ── */
  async abortSession(id, reason) {
    const ARVRSession = mongoose.model('ARVRSession');
    return ARVRSession.findByIdAndUpdate(
      id,
      { status: 'aborted', abortReason: reason, endedAt: new Date() },
      { new: true }
    );
  }

  /* ── Record safety/discomfort ── */
  async recordSafety(id, safetyData) {
    const ARVRSession = mongoose.model('ARVRSession');
    return ARVRSession.findByIdAndUpdate(id, { safety: safetyData }, { new: true });
  }

  /* ── Progress across sessions ── */
  async getBeneficiaryProgress(beneficiaryId, scenarioId) {
    const ARVRSession = mongoose.model('ARVRSession');
    const q = {
      beneficiaryId: new mongoose.Types.ObjectId(beneficiaryId),
      status: 'completed',
      isDeleted: { $ne: true },
    };
    if (scenarioId) q['scenario.scenarioId'] = scenarioId;

    return ARVRSession.find(q)
      .sort({ endedAt: 1 })
      .select(
        'scenario.name scenario.difficultyLevel performance.overallScore performance.accuracy performance.reactionTimeMs comparisonToPrevious endedAt'
      )
      .lean();
  }

  /* ── Dashboard ── */
  async getDashboard(branchId) {
    const ARVRSession = mongoose.model('ARVRSession');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [statusStats, techStats, safetyStats] = await Promise.all([
      ARVRSession.aggregate([
        { $match: { ...match, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ARVRSession.aggregate([
        { $match: { ...match, status: 'completed' } },
        {
          $group: {
            _id: '$technologyType',
            count: { $sum: 1 },
            avgScore: { $avg: '$performance.overallScore' },
          },
        },
      ]),
      ARVRSession.aggregate([
        { $match: { ...match, 'safety.cybersicknessLevel': { $exists: true, $ne: 'none' } } },
        { $group: { _id: '$safety.cybersicknessLevel', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      last30Days: Object.fromEntries(statusStats.map(s => [s._id, s.count])),
      byTechnology: techStats,
      cybersicknessIncidence: Object.fromEntries(safetyStats.map(s => [s._id, s.count])),
    };
  }
}

const arvrService = new ARVRService();
module.exports = { arvrService };
