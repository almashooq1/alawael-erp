/**
 * inApp.channel.js — reporting-engine adapter over the Notification
 * mongoose model.
 *
 * Phase 10 Commit 2.
 *
 * In-app notifications are cheap and always-on — they serve both as a
 * primary channel for real-time dashboards and a fallback for the
 * confidential portal-only class (the notification says "your report
 * is ready", the content lives behind portal auth).
 *
 * On success, the providerMessageId is the Notification _id.
 */

'use strict';

function createInAppChannel({ NotificationModel, logger = console } = {}) {
  if (!NotificationModel) {
    throw new Error('inApp.channel: NotificationModel required');
  }
  const Model = NotificationModel.model || NotificationModel;
  return {
    name: 'in_app',
    async send(payload, recipients) {
      const results = [];
      for (const r of recipients || []) {
        if (!r || !r.id) {
          results.push({ success: false, error: 'no recipient id' });
          continue;
        }
        try {
          const doc = await Model.create({
            recipientId: r.id,
            recipient: r.id,
            title: (payload.subject || 'report ready').slice(0, 200),
            message: (payload.bodyText || payload.subject || '').slice(0, 2000),
            body: (payload.bodyText || payload.subject || '').slice(0, 2000),
            type: 'notification',
            category: 'report',
            priority: payload.confidentiality === 'confidential' ? 'high' : 'medium',
            channel: 'in-app',
            status: 'sent',
            link: payload.link || null,
            actionUrl: payload.link || null,
            metadata: {
              reportId: payload.reportId,
              instanceKey: payload.instanceKey,
              confidentiality: payload.confidentiality,
              locale: payload.locale,
            },
          });
          results.push({
            recipientId: r.id,
            success: true,
            providerMessageId: String(doc._id || doc.id),
          });
        } catch (err) {
          logger.warn && logger.warn(`inApp.channel send failed: ${err.message}`);
          results.push({ recipientId: r.id, success: false, error: err.message });
        }
      }
      const succeeded = results.filter(x => x.success);
      if (!results.length) return { success: false, error: 'no recipients' };
      if (!succeeded.length) {
        return {
          success: false,
          error: results
            .map(x => x.error)
            .filter(Boolean)
            .join('; '),
        };
      }
      return {
        success: true,
        providerMessageId: succeeded[0].providerMessageId,
        partial: succeeded.length !== results.length,
        results,
      };
    },
  };
}

module.exports = { createInAppChannel };
