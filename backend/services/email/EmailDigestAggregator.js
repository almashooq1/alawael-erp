'use strict';

/**
 * ═══════════════════════════════════════════════════════════════
 * 📧 Email Digest Aggregator — مجمع الرسائل المختصرة
 * ═══════════════════════════════════════════════════════════════
 *
 * Collects emails that would be sent immediately and batches them
 * into daily or weekly digests based on user preferences.
 *
 * Flow:
 *  1. EmailManager.send() checks user preference → frequency is 'daily_digest' or 'weekly_digest'
 *  2. Instead of sending immediately, the email is added to the digest queue
 *  3. The aggregator flushes pending digests at scheduled intervals
 *  4. Each user gets a single combined email with all their queued notifications
 *
 * Features:
 *  - Per-user digest queuing by category
 *  - Daily and weekly flush schedules
 *  - Deduplication of identical notifications
 *  - Max digest size limit
 *  - Compact Arabic RTL digest template
 */

const logger = require('../../utils/logger');

class EmailDigestAggregator {
  /**
   * @param {import('./EmailManager')} emailManager
   * @param {Object} [options]
   * @param {number}  [options.maxItemsPerDigest=50]  — max notifications per digest email
   * @param {number}  [options.dedupeWindowMs=300000]  — 5 min dedup window
   */
  constructor(emailManager, options = {}) {
    this._emailManager = emailManager;
    this._maxItems = options.maxItemsPerDigest ?? 50;
    this._dedupeWindowMs = options.dedupeWindowMs ?? 5 * 60 * 1000;

    // In-memory queue: Map<userId, { email, items: Array, lastAdded }>
    this._queue = new Map();

    // Stats
    this._stats = {
      totalQueued: 0,
      totalFlushed: 0,
      totalDigestsSent: 0,
      totalDeduplicated: 0,
      lastDailyFlush: null,
      lastWeeklyFlush: null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  QUEUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════

  /**
   * Add a notification to the digest queue for a user.
   * @param {string} userId
   * @param {string} email
   * @param {string} category — e.g. 'hr', 'finance', 'system'
   * @param {Object} notification — { subject, summary, template, data }
   * @param {'daily_digest'|'weekly_digest'} frequency
   * @returns {{ queued: boolean, queueId: string }}
   */
  add(userId, email, category, notification, frequency = 'daily_digest') {
    if (!userId || !email) {
      return { queued: false, reason: 'missing_user_or_email' };
    }

    // Get or create user bucket
    if (!this._queue.has(userId)) {
      this._queue.set(userId, {
        email,
        daily: [],
        weekly: [],
        seenKeys: new Set(),
        lastAdded: null,
      });
    }

    const bucket = this._queue.get(userId);
    const targetQueue = frequency === 'weekly_digest' ? 'weekly' : 'daily';

    // Deduplication
    const dedupeKey = `${category}:${notification.subject || ''}:${notification.summary || ''}`;
    if (bucket.seenKeys.has(dedupeKey)) {
      this._stats.totalDeduplicated++;
      return { queued: false, reason: 'deduplicated' };
    }

    // Max items check
    if (bucket[targetQueue].length >= this._maxItems) {
      return { queued: false, reason: 'digest_full' };
    }

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      subject: notification.subject || '',
      summary: notification.summary || notification.message || '',
      template: notification.template || null,
      data: notification.data || {},
      timestamp: new Date(),
      frequency,
    };

    bucket[targetQueue].push(item);
    bucket.seenKeys.add(dedupeKey);
    bucket.lastAdded = new Date();

    this._stats.totalQueued++;

    logger.debug(
      `[DigestAggregator] Queued ${targetQueue} digest item for ${email}: ${item.subject}`
    );

    return { queued: true, queueId: item.id, bucket: targetQueue };
  }

  /**
   * Get pending items count by frequency type.
   */
  getPendingCounts() {
    let dailyUsers = 0;
    let dailyItems = 0;
    let weeklyUsers = 0;
    let weeklyItems = 0;

    for (const [, bucket] of this._queue) {
      if (bucket.daily.length > 0) {
        dailyUsers++;
        dailyItems += bucket.daily.length;
      }
      if (bucket.weekly.length > 0) {
        weeklyUsers++;
        weeklyItems += bucket.weekly.length;
      }
    }

    return { dailyUsers, dailyItems, weeklyUsers, weeklyItems };
  }

  // ═══════════════════════════════════════════════════════════
  //  FLUSH / SEND DIGESTS
  // ═══════════════════════════════════════════════════════════

  /**
   * Flush all daily digests — called by the scheduler (e.g. 8 AM daily)
   * @returns {{ sent: number, failed: number, empty: number }}
   */
  async flushDaily() {
    logger.info('[DigestAggregator] 📬 Flushing daily digests...');
    const results = { sent: 0, failed: 0, empty: 0 };

    for (const [userId, bucket] of this._queue) {
      if (bucket.daily.length === 0) {
        results.empty++;
        continue;
      }

      try {
        await this._sendDigest(bucket.email, bucket.daily, 'يومي');
        results.sent++;
        this._stats.totalDigestsSent++;
        bucket.daily = [];
        // Clean dedup keys for daily items
        this._cleanDedupeKeys(bucket);
      } catch (err) {
        results.failed++;
        logger.error(`[DigestAggregator] Failed daily digest for user ${userId}: ${err.message}`);
      }
    }

    this._stats.lastDailyFlush = new Date();
    this._stats.totalFlushed += results.sent;

    logger.info(
      `[DigestAggregator] Daily flush complete: ${results.sent} sent, ${results.failed} failed, ${results.empty} empty`
    );
    return results;
  }

  /**
   * Flush all weekly digests — called by the scheduler (e.g. Sunday 8 AM)
   * @returns {{ sent: number, failed: number, empty: number }}
   */
  async flushWeekly() {
    logger.info('[DigestAggregator] 📬 Flushing weekly digests...');
    const results = { sent: 0, failed: 0, empty: 0 };

    for (const [userId, bucket] of this._queue) {
      if (bucket.weekly.length === 0) {
        results.empty++;
        continue;
      }

      try {
        await this._sendDigest(bucket.email, bucket.weekly, 'أسبوعي');
        results.sent++;
        this._stats.totalDigestsSent++;
        bucket.weekly = [];
        this._cleanDedupeKeys(bucket);
      } catch (err) {
        results.failed++;
        logger.error(`[DigestAggregator] Failed weekly digest for user ${userId}: ${err.message}`);
      }
    }

    this._stats.lastWeeklyFlush = new Date();
    this._stats.totalFlushed += results.sent;

    logger.info(
      `[DigestAggregator] Weekly flush complete: ${results.sent} sent, ${results.failed} failed, ${results.empty} empty`
    );
    return results;
  }

  /**
   * Send a single digest email to a user.
   * @param {string} email
   * @param {Array} items
   * @param {string} period — 'يومي' or 'أسبوعي'
   */
  async _sendDigest(email, items, period) {
    // Group items by category
    const grouped = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }

    const categoryLabels = {
      auth: '🔐 الأمان والمصادقة',
      hr: '👥 الموارد البشرية',
      finance: '💰 المالية',
      system: '⚙️ النظام',
      marketing: '📢 التسويق',
      appointments: '📅 المواعيد',
    };

    // Build digest HTML
    const sectionsHtml = Object.entries(grouped)
      .map(([cat, catItems]) => {
        const label = categoryLabels[cat] || cat;
        const itemsHtml = catItems
          .map(
            item => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;color:#333">
              <strong>${item.subject}</strong>
              ${item.summary ? `<br><span style="color:#666">${item.summary}</span>` : ''}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:12px;color:#999;white-space:nowrap">
              ${new Date(item.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            </td>
          </tr>`
          )
          .join('');

        return `
        <div style="margin-bottom:24px">
          <h3 style="color:#667eea;font-size:16px;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #667eea">
            ${label} (${catItems.length})
          </h3>
          <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
        </div>`;
      })
      .join('');

    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Tahoma,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">📧 ملخص الإشعارات ${period}</h1>
          <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px">
            ${items.length} إشعار${items.length > 1 ? 'ات' : ''} — ${new Date().toLocaleDateString('ar-SA')}
          </p>
        </div>
        <div style="padding:24px">
          ${sectionsHtml}
        </div>
        <div style="background:#f8f9fa;padding:16px;text-align:center;font-size:12px;color:#888">
          يمكنك تغيير تفضيلات الإشعارات من إعدادات حسابك
        </div>
      </div>
    </body>
    </html>`;

    await this._emailManager.send({
      to: email,
      subject: `📧 ملخص الإشعارات ${period} — ${items.length} إشعار جديد`,
      html,
      metadata: {
        type: 'digest',
        period,
        itemCount: items.length,
        categories: Object.keys(grouped),
      },
    });
  }

  /**
   * Remove old dedup keys if both queues are empty.
   */
  _cleanDedupeKeys(bucket) {
    if (bucket.daily.length === 0 && bucket.weekly.length === 0) {
      bucket.seenKeys.clear();
    }
  }

  /**
   * Purge all queued items (e.g. on shutdown or error recovery).
   */
  purge() {
    const counts = this.getPendingCounts();
    this._queue.clear();
    logger.info(
      `[DigestAggregator] Purged all queued digests: ${counts.dailyItems} daily + ${counts.weeklyItems} weekly`
    );
    return counts;
  }

  /**
   * Get aggregator statistics.
   */
  get stats() {
    return {
      ...this._stats,
      pending: this.getPendingCounts(),
      usersInQueue: this._queue.size,
    };
  }
}

module.exports = { EmailDigestAggregator };
