'use strict';

/**
 * tier-notifier.service.js — Wave 16.
 *
 * Bridges the escalation coordinator's `notifyTier` callback (Wave 13)
 * onto the unified notifier (services/unifiedNotifier.js). The shape
 * is intentionally minimal so the coordinator stays pure:
 *
 *     coordinator notifies → buildTierNotifier returns
 *     async ({ alert, tier, roles, channels }) => { delivered, failed }
 *
 * Two injection points:
 *
 *   - `notify`            — async ({to, channels, subject, body,
 *                            priority, templateKey, userId, metadata})
 *                            → unifiedNotifier.notify or any compatible
 *                            stand-in (lets tests skip the SDK).
 *   - `resolveUsersForRole` — async (role, alert) → Array<{
 *                            userId, phone, email, name?
 *                          }>. Implementation lives in the app boot
 *                            because role → user resolution depends
 *                            on tenant scope which only the host
 *                            knows.
 *
 * Behavior:
 *
 *   - For every role in the promotion's `roles[]`, resolve users
 *     and notify each via the supplied channels.
 *   - Tier 3 + (critical|high) always includes SMS — confirmed by
 *     escalation.service.channelsForTier() and re-checked here so
 *     either layer alone is safe.
 *   - Localized Arabic subject + body — kept short, fit for SMS.
 *   - Every send writes through unifiedNotifier's NotificationLog
 *     audit (PDPL Art.13 compliant).
 *   - Never throws — collects failures into the result envelope.
 */

const DEFAULT_SUBJECT_PREFIX = 'تصعيد تنبيه';
const SEV_LABEL_AR = Object.freeze({
  critical: 'حرج',
  high: 'عالي',
  warning: 'تحذير',
  info: 'معلوماتي',
});

function severityToPriority(sev) {
  if (sev === 'critical') return 'urgent';
  if (sev === 'high') return 'high';
  if (sev === 'warning') return 'normal';
  return 'low';
}

function buildSubject({ alert, tier }) {
  const sev = SEV_LABEL_AR[alert.severity] || alert.severity;
  return `${DEFAULT_SUBJECT_PREFIX} — ${sev} — درجة ${tier}`;
}

function buildBody({ alert, tier, roles }) {
  const sev = SEV_LABEL_AR[alert.severity] || alert.severity;
  const msg = alert.message || alert.description || 'تنبيه يتطلب مراجعة';
  // Keep body SMS-friendly — under 160 chars when possible.
  return [`[${sev} • تصعيد ${tier}]`, msg, `الأدوار المُبلَّغة: ${roles.join('، ')}`].join('\n');
}

/**
 * Pick the best `to` value for a user given allowed channels.
 * Returns { to, channels } where channels is a filtered list of
 * channels the user actually has contact details for.
 */
function pickRecipient(user, channels) {
  if (!user) return null;
  const out = { phone: user.phone || '', email: user.email || '' };
  const usable = channels.filter(c => {
    if (c === 'sms' || c === 'whatsapp') return !!out.phone;
    if (c === 'email') return !!out.email;
    if (c === 'in_app' || c === 'push') return !!user.userId;
    return false;
  });
  if (usable.length === 0) return null;
  return { to: out, channels: usable };
}

/**
 * @param {object} opts
 *   - notify:               async function (unifiedNotifier-compatible)
 *   - resolveUsersForRole:  async (role, alert) → Array<user>
 *   - logger:               console-compatible
 */
function buildTierNotifier({ notify, resolveUsersForRole, logger = console } = {}) {
  if (typeof notify !== 'function') {
    throw new Error('buildTierNotifier: notify is required');
  }
  if (typeof resolveUsersForRole !== 'function') {
    throw new Error('buildTierNotifier: resolveUsersForRole is required');
  }

  return async function notifyTier({ alert, tier, roles, channels }) {
    const summary = {
      alertId: alert?._id,
      tier,
      delivered: 0,
      failed: 0,
      skipped: 0,
      perChannel: {},
      errors: [],
    };

    if (!alert || !Array.isArray(roles) || roles.length === 0) {
      return summary;
    }

    // Tier 3 + critical/high MUST include SMS. Defensive guard in
    // case a misconfigured caller passes a narrower list. We mutate
    // the array in place (via push) so `const` is fine here.
    const effectiveChannels =
      Array.isArray(channels) && channels.length > 0 ? channels.slice() : ['in_app', 'email'];
    if (tier === 3 && (alert.severity === 'critical' || alert.severity === 'high')) {
      if (!effectiveChannels.includes('sms')) effectiveChannels.push('sms');
    }

    const subject = buildSubject({ alert, tier });
    const body = buildBody({ alert, tier, roles });
    const priority = severityToPriority(alert.severity);

    for (const role of roles) {
      let users;
      try {
        users = await resolveUsersForRole(role, alert);
      } catch (err) {
        summary.errors.push({ role, message: `resolve failed: ${err.message}` });
        continue;
      }
      if (!Array.isArray(users) || users.length === 0) {
        summary.skipped += 1;
        continue;
      }

      for (const user of users) {
        const picked = pickRecipient(user, effectiveChannels);
        if (!picked) {
          summary.skipped += 1;
          continue;
        }
        try {
          await notify({
            to: picked.to,
            channels: picked.channels,
            subject,
            body,
            priority,
            templateKey: `alert.escalation.tier${tier}`,
            userId: user.userId || null,
            metadata: {
              alertId: alert._id,
              ruleId: alert.ruleId,
              severity: alert.severity,
              category: alert.category,
              tier,
              role,
            },
          });
          summary.delivered += 1;
          for (const c of picked.channels) {
            summary.perChannel[c] = (summary.perChannel[c] || 0) + 1;
          }
        } catch (err) {
          summary.failed += 1;
          summary.errors.push({
            role,
            userId: user.userId || null,
            message: err.message,
          });
          if (logger.warn) {
            logger.warn(
              `[tierNotifier] alert ${alert._id} role ${role} user ${user.userId || '?'}: ${err.message}`
            );
          }
        }
      }
    }

    return summary;
  };
}

module.exports = {
  buildTierNotifier,
  // Exposed so tests + alternative callers can compose without us.
  _internal: {
    buildSubject,
    buildBody,
    severityToPriority,
    pickRecipient,
  },
};
