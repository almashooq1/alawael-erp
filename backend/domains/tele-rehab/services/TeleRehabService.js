/**
 * TeleRehabService — خدمة التأهيل عن بُعد
 *
 * إدارة الجلسات عن بعد: الجدولة، البدء، الإنهاء، التسجيل،
 * جودة الاتصال، التقارير، لوحة المعلومات
 */

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class TeleRehabService extends BaseService {
  constructor() {
    super({ serviceName: 'TeleRehabService', cachePrefix: 'telerehab' });
  }

  /* ── Schedule ── */
  async scheduleSession(data) {
    const TeleSession = mongoose.model('TeleSession');
    const session = await TeleSession.create(data);
    this.emit('tele:session:scheduled', {
      sessionId: session._id,
      beneficiaryId: data.beneficiaryId,
    });
    return session;
  }

  /* ── List ── */
  async listSessions({ beneficiaryId, therapistId, status, from, to, page = 1, limit = 20 } = {}) {
    const TeleSession = mongoose.model('TeleSession');
    const q = { isDeleted: { $ne: true } };
    if (beneficiaryId) q.beneficiaryId = beneficiaryId;
    if (therapistId) q.therapistId = therapistId;
    if (status) q.status = status;
    if (from || to) {
      q.scheduledAt = {};
      if (from) q.scheduledAt.$gte = new Date(from);
      if (to) q.scheduledAt.$lte = new Date(to);
    }
    const total = await TeleSession.countDocuments(q);
    const data = await TeleSession.find(q)
      .sort({ scheduledAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('therapistId', 'name email')
      .lean();
    return { data, total, page: +page, pages: Math.ceil(total / limit) };
  }

  /* ── Get one ── */
  async getSession(id) {
    const TeleSession = mongoose.model('TeleSession');
    return TeleSession.findById(id)
      .populate('beneficiaryId', 'firstName lastName fileNumber')
      .populate('therapistId', 'name email')
      .lean();
  }

  /* ── Start ── */
  async startSession(id) {
    const TeleSession = mongoose.model('TeleSession');
    const session = await TeleSession.findByIdAndUpdate(
      id,
      {
        status: 'in_progress',
        startedAt: new Date(),
      },
      { new: true }
    );
    this.emit('tele:session:started', { sessionId: id });
    return session;
  }

  /* ── Complete ── */
  async completeSession(id, payload) {
    const TeleSession = mongoose.model('TeleSession');
    const update = {
      status: 'completed',
      endedAt: new Date(),
      ...payload,
    };
    if (update.startedAt && update.endedAt) {
      update.durationMinutes = Math.round(
        (new Date(update.endedAt) - new Date(update.startedAt)) / 60000
      );
    }
    const session = await TeleSession.findByIdAndUpdate(id, update, { new: true });
    this.emit('tele:session:completed', { sessionId: id, beneficiaryId: session.beneficiaryId });
    return session;
  }

  /* ── Cancel ── */
  async cancelSession(id, reason) {
    const TeleSession = mongoose.model('TeleSession');
    return TeleSession.findByIdAndUpdate(
      id,
      { status: 'cancelled', cancellationReason: reason },
      { new: true }
    );
  }

  /* ── Record quality ── */
  async recordQuality(id, qualityData) {
    const TeleSession = mongoose.model('TeleSession');
    return TeleSession.findByIdAndUpdate(id, { connectionQuality: qualityData }, { new: true });
  }

  /* ── Satisfaction ── */
  async submitSatisfaction(id, satisfaction) {
    const TeleSession = mongoose.model('TeleSession');
    return TeleSession.findByIdAndUpdate(id, { satisfaction }, { new: true });
  }

  /* ── Dashboard ── */
  async getDashboard(branchId) {
    const TeleSession = mongoose.model('TeleSession');
    const match = { isDeleted: { $ne: true } };
    if (branchId) match.branchId = new mongoose.Types.ObjectId(branchId);

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    const [stats, qualityAvg, satisfactionStats] = await Promise.all([
      TeleSession.aggregate([
        { $match: { ...match, scheduledAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      TeleSession.aggregate([
        {
          $match: {
            ...match,
            status: 'completed',
            'connectionQuality.qualityScore': { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgQuality: { $avg: '$connectionQuality.qualityScore' },
            avgLatency: { $avg: '$connectionQuality.averageLatency' },
          },
        },
      ]),
      TeleSession.aggregate([
        {
          $match: {
            ...match,
            status: 'completed',
            'satisfaction.beneficiaryRating': { $exists: true },
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$satisfaction.beneficiaryRating' },
            total: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts = {};
    stats.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    return {
      last30Days: statusCounts,
      totalCompleted: statusCounts.completed || 0,
      totalNoShow: statusCounts.no_show || 0,
      totalTechnicalFailures: statusCounts.technical_failure || 0,
      avgConnectionQuality: qualityAvg[0]?.avgQuality || null,
      avgLatency: qualityAvg[0]?.avgLatency || null,
      avgSatisfaction: satisfactionStats[0]?.avgRating || null,
      satisfactionResponses: satisfactionStats[0]?.total || 0,
    };
  }
}

const teleRehabService = new TeleRehabService();
module.exports = { teleRehabService };
