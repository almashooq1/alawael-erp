/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Analytics Service — خدمة تحليلات البريد الإلكتروني
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides email analytics: delivery rates, open rates,
 * bounce tracking, provider comparison, and time-series data.
 */

const config = require('./EmailConfig');
const logger = require('../../utils/logger');

class EmailAnalytics {
  /**
   * @param {import('./EmailManager')} emailManager
   */
  constructor(emailManager) {
    this.emailManager = emailManager;
  }

  /**
   * Get the EmailLog model (through emailManager)
   */
  get _log() {
    return this.emailManager._EmailLog;
  }

  /**
   * Dashboard summary for today, this week, this month
   */
  async getDashboard() {
    if (!this._log) return { error: 'EmailLog model not available' };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayStats, weekStats, monthStats, providerBreakdown, topErrors] = await Promise.all([
      this._getStatusCounts(todayStart),
      this._getStatusCounts(weekStart),
      this._getStatusCounts(monthStart),
      this._getProviderBreakdown(monthStart),
      this._getTopErrors(monthStart, 5),
    ]);

    return {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      providers: providerBreakdown,
      topErrors,
      rates: {
        delivery: this._calcRate(monthStats.sent, monthStats.delivered),
        open: this._calcRate(monthStats.delivered, monthStats.opened),
        click: this._calcRate(monthStats.delivered, monthStats.clicked),
        bounce: this._calcRate(monthStats.sent, monthStats.bounced),
      },
    };
  }

  /**
   * Status counts for a period
   */
  async _getStatusCounts(since) {
    if (!this._log) return {};

    const agg = await this._log.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result = { total: 0 };
    for (const s of agg) {
      result[s._id] = s.count;
      result.total += s.count;
    }
    return result;
  }

  /**
   * Provider breakdown
   */
  async _getProviderBreakdown(since) {
    if (!this._log) return [];

    return this._log.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$provider',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);
  }

  /**
   * Top errors
   */
  async _getTopErrors(since, limit = 5) {
    if (!this._log) return [];

    return this._log.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          'error.message': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$error.message',
          count: { $sum: 1 },
          lastSeen: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Time-series data (emails per day for the last N days)
   */
  async getTimeSeries(days = 30) {
    if (!this._log) return [];

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return this._log.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: { status: '$_id.status', count: '$count' },
          },
          total: { $sum: '$count' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * Get email logs with pagination
   */
  async getLogs(options = {}) {
    if (!this._log) return { data: [], total: 0 };

    const {
      page = 1,
      limit = 20,
      status,
      provider,
      to,
      from,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = -1,
    } = options;

    const query = {};
    if (status) query.status = status;
    if (provider) query.provider = provider;
    if (to) query['to.address'] = { $regex: to, $options: 'i' };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { 'to.address': { $regex: search, $options: 'i' } },
        { emailId: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this._log
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v')
        .lean(),
      this._log.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single email log detail
   */
  async getEmailDetail(emailId) {
    if (!this._log) return null;
    return this._log.findOne({ emailId }).lean();
  }

  /**
   * Record email open event
   */
  async recordOpen(emailId, metadata = {}) {
    if (!this._log) return;

    await this._log.updateOne(
      { emailId },
      {
        $set: {
          status: 'opened',
          'timestamps.lastOpenedAt': new Date(),
        },
        $setOnInsert: { 'timestamps.firstOpenedAt': new Date() },
        $inc: { 'tracking.totalOpens': 1 },
        $push: {
          'tracking.opens': {
            timestamp: new Date(),
            ipAddress: metadata.ip,
            userAgent: metadata.userAgent,
          },
        },
      }
    );
  }

  /**
   * Record email click event
   */
  async recordClick(emailId, url, metadata = {}) {
    if (!this._log) return;

    await this._log.updateOne(
      { emailId },
      {
        $inc: { 'tracking.totalClicks': 1 },
        $push: {
          'tracking.clicks': {
            timestamp: new Date(),
            url,
            ipAddress: metadata.ip,
            userAgent: metadata.userAgent,
          },
        },
      }
    );
  }

  /**
   * Record bounce event
   */
  async recordBounce(emailId, bounceType, details = {}) {
    if (!this._log) return;

    await this._log.updateOne(
      { emailId },
      {
        $set: {
          status: 'bounced',
          'timestamps.bouncedAt': new Date(),
          'error.message': details.message || `${bounceType} bounce`,
          'error.category': bounceType === 'hard' ? 'permanent' : 'transient',
        },
      }
    );
  }

  /**
   * Calculate rate percentage
   */
  _calcRate(total, count) {
    if (!total || total === 0) return 0;
    return Math.round(((count || 0) / total) * 10000) / 100;
  }

  /**
   * Get bounce report
   */
  async getBounceReport(days = 30) {
    if (!this._log) return { hard: 0, soft: 0, total: 0, addresses: [] };

    const since = new Date();
    since.setDate(since.getDate() - days);

    const bounces = await this._log.aggregate([
      {
        $match: {
          status: 'bounced',
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$error.category',
          count: { $sum: 1 },
          addresses: { $addToSet: { $arrayElemAt: ['$to.address', 0] } },
        },
      },
    ]);

    const result = { hard: 0, soft: 0, total: 0, addresses: [] };
    for (const b of bounces) {
      if (b._id === 'permanent') {
        result.hard = b.count;
        result.addresses.push(...(b.addresses || []));
      } else {
        result.soft = b.count;
      }
      result.total += b.count;
    }

    return result;
  }

  /**
   * Clean up old log entries
   */
  async cleanup(retainDays = config.logging.retainDays) {
    if (!this._log) return { deleted: 0 };

    const threshold = new Date(Date.now() - retainDays * 86400000);
    const result = await this._log.deleteMany({
      createdAt: { $lt: threshold },
    });

    logger.info(`[EmailAnalytics] 🧹 Cleaned up ${result.deletedCount} old log entries`);
    return { deleted: result.deletedCount };
  }
}

module.exports = EmailAnalytics;
