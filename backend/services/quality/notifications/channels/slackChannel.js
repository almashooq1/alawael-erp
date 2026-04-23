'use strict';

/**
 * slackChannel.js — Phase 15 Commit 2 (4.0.65).
 *
 * Minimal Slack webhook channel for the notification router.
 * Posts a Block-Kit-formatted message to the incoming-webhook
 * URL configured via `SLACK_WEBHOOK_URL`. When unconfigured,
 * returns `{ success: false, reason: 'slack_not_configured' }`
 * — so the router records a `skipped` status without blowing
 * up and the policy can still email in parallel.
 *
 * Priority → emoji + color mapping matches the router's policy
 * priorities so an operator glancing at a channel can
 * immediately see severity.
 *
 * Deliberately depends on nothing except `fetch` (Node 18+) and
 * a webhook URL. No `@slack/web-api` dep pulled in.
 */

const PRIORITY_ICONS = Object.freeze({
  critical: '🔴',
  high: '🟠',
  normal: '🔵',
  low: '⚪',
});

const PRIORITY_COLORS = Object.freeze({
  critical: '#dc2626',
  high: '#ea580c',
  normal: '#2563eb',
  low: '#9ca3af',
});

function buildSlackChannel({
  webhookUrl = process.env.SLACK_WEBHOOK_URL,
  fetchImpl = typeof fetch === 'function' ? fetch : null,
  logger = console,
} = {}) {
  return {
    async send({ subject, body, priority = 'normal' }) {
      if (!webhookUrl) {
        return { success: false, reason: 'slack_not_configured' };
      }
      if (!fetchImpl) {
        return { success: false, reason: 'fetch_unavailable' };
      }

      const icon = PRIORITY_ICONS[priority] || PRIORITY_ICONS.normal;
      const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal;

      // Truncate body to keep Slack message readable. Full body
      // is still persisted in NotificationLog.bodyPreview upstream.
      const trimmedBody = (body || '').slice(0, 1500);

      const payload = {
        attachments: [
          {
            color,
            fallback: subject,
            title: `${icon} ${subject}`,
            text: trimmedBody,
            footer: 'Al-Awael QMS',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      try {
        const res = await fetchImpl(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          return {
            success: false,
            reason: `slack_http_${res.status}`,
            error: text.slice(0, 200),
          };
        }
        return { success: true };
      } catch (err) {
        logger.warn(`[slackChannel] dispatch failed: ${err.message}`);
        return { success: false, error: err.message };
      }
    },
  };
}

module.exports = {
  buildSlackChannel,
  PRIORITY_ICONS,
  PRIORITY_COLORS,
};
