'use strict';

/**
 * beneficiary-lifecycle-auto-transition-notify.service.js — Phase C.
 *
 * Subscribes to `beneficiary.lifecycle.auto_requested` events emitted by the
 * journey-score scheduler and fans out notifications to branch supervisors
 * and therapists who are allowed to review/approve the auto-requested
 * transition.
 *
 * Notification surface
 *   - In-app  → domains/notifications/services/notificationService.send
 *   - Email   → unifiedNotifier.notify (channels: ['email'])
 *
 * All external dependencies are injectable for tests. The default resolver
 * lazy-loads User/Beneficiary/Branch models so the module can be required in
 * unit tests without a full app boot.
 */

const mongoose = require('mongoose');

const EVENT_PATTERN = 'beneficiary.lifecycle.auto_requested';
const SOURCE_TAG = 'beneficiary_auto_transition';
const TEMPLATE_KEY = 'BENEFICIARY_AUTO_TRANSITION_REQUESTED';

const RECIPIENT_ROLES = Object.freeze([
  'supervisor',
  'therapy_supervisor',
  'special_ed_supervisor',
  'therapist',
  'therapist_slp',
  'therapist_ot',
  'therapist_pt',
  'therapist_psych',
]);

function _modelOrNull(name, fallbackPath) {
  try {
    return mongoose.model(name);
  } catch {
    try {
      require(fallbackPath);
      return mongoose.model(name);
    } catch {
      return null;
    }
  }
}

function _loadNotificationService() {
  try {
    return require('../domains/notifications/services/notificationService');
  } catch {
    return null;
  }
}

function _loadUnifiedNotifier() {
  try {
    const mod = require('./unifiedNotifier');
    return typeof mod.notify === 'function' ? mod.notify : null;
  } catch {
    return null;
  }
}

function _isDbReady() {
  return mongoose.connection?.readyState === 1;
}

async function _defaultResolveRecipients({ branchId }) {
  const User = _modelOrNull('User', '../models/User');
  if (!User || !branchId || !_isDbReady()) return [];
  return User.find({ branchId, role: { $in: RECIPIENT_ROLES } })
    .select('_id email firstName lastName firstName_ar lastName_ar role')
    .lean();
}

async function _enrichContext({ beneficiaryId, branchId }) {
  if (!_isDbReady()) {
    return {
      beneficiaryName: beneficiaryId ? String(beneficiaryId).slice(-6) : '',
      branchName: branchId ? String(branchId).slice(-6) : '',
    };
  }
  const Beneficiary = _modelOrNull('Beneficiary', '../models/Beneficiary');
  const Branch = _modelOrNull('Branch', '../models/Branch');

  let beneficiaryName = '';
  if (Beneficiary && beneficiaryId) {
    try {
      const beneficiary = await Beneficiary.findById(beneficiaryId)
        .select('firstName lastName')
        .lean();
      if (beneficiary) {
        beneficiaryName = [beneficiary.firstName, beneficiary.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
      }
    } catch {
      // fallback to empty name
    }
  }
  if (!beneficiaryName && beneficiaryId) {
    beneficiaryName = String(beneficiaryId).slice(-6);
  }

  let branchName = '';
  if (Branch && branchId) {
    try {
      const branch = await Branch.findById(branchId).select('name').lean();
      branchName = branch?.name || '';
    } catch {
      // fallback to empty name
    }
  }
  if (!branchName && branchId) {
    branchName = String(branchId).slice(-6);
  }

  return { beneficiaryName, branchName };
}

function _renderEmail(templateData) {
  try {
    const { renderTemplate } = require('./email/templateRenderer.service');
    return renderTemplate(TEMPLATE_KEY, templateData);
  } catch (_err) {
    // Fall back to a plain-text shaped payload so notifications still go out.
    return {
      subject: `انتقال تلقائي — ${templateData.beneficiaryName || 'مستفيد'}`,
      html: `<p>تم طلب انتقال ${templateData.transitionId} للمستفيد ${templateData.beneficiaryName}.</p>`,
      text: `تم طلب انتقال ${templateData.transitionId} للمستفيد ${templateData.beneficiaryName}.`,
    };
  }
}

function _reviewUrl(beneficiaryId, transitionRecordId) {
  const base = process.env.FRONTEND_URL || 'https://alaweal.org';
  const path = '/beneficiary-lifecycle/transitions';
  const params = new URLSearchParams();
  if (beneficiaryId) params.set('beneficiaryId', String(beneficiaryId));
  if (transitionRecordId) params.set('transitionId', String(transitionRecordId));
  return `${base}${path}?${params.toString()}`;
}

function _displayName(recipient) {
  return (
    [recipient?.firstName_ar, recipient?.lastName_ar].filter(Boolean).join(' ').trim() ||
    [recipient?.firstName, recipient?.lastName].filter(Boolean).join(' ').trim() ||
    ' زميل/ة '
  );
}

async function _sendInApp({ notificationService, recipient, templateData, payload }) {
  if (!notificationService || typeof notificationService.send !== 'function') {
    return { success: false, skipped: true, reason: 'service-unavailable' };
  }
  const target = recipient?._id || recipient?.userId;
  if (!target) return { success: false, skipped: true, reason: 'recipient-id-missing' };
  return notificationService.send({
    recipientId: String(target),
    senderId: null,
    title: templateData.subject || `انتقال تلقائي — ${templateData.beneficiaryName}`,
    body:
      templateData.text ||
      `تم طلب انتقال ${templateData.transitionId} للمستفيد ${templateData.beneficiaryName}.`,
    type: 'alert',
    category: 'beneficiary.lifecycle',
    priority: 'high',
    channels: ['inApp'],
    metadata: {
      source: SOURCE_TAG,
      beneficiaryId: payload.beneficiaryId,
      branchId: payload.branchId,
      transitionId: payload.transitionId,
      transitionRecordId: payload.transitionRecordId,
      score: payload.score,
      confidence: payload.confidence,
    },
  });
}

async function _sendEmail({ notify, recipient, templateData, payload }) {
  if (typeof notify !== 'function') {
    return { success: false, skipped: true, reason: 'notify-unavailable' };
  }
  const email = recipient?.email;
  if (!email) return { success: false, skipped: true, reason: 'email-missing' };
  return notify({
    to: email,
    channels: ['email'],
    subject: templateData.subject,
    body: templateData.html,
    priority: 'high',
    templateKey: TEMPLATE_KEY,
    beneficiaryId: payload.beneficiaryId,
    userId: recipient?._id || recipient?.userId || null,
    metadata: {
      source: SOURCE_TAG,
      transitionId: payload.transitionId,
      transitionRecordId: payload.transitionRecordId,
      score: payload.score,
      confidence: payload.confidence,
    },
  });
}

function wireBeneficiaryLifecycleAutoTransitionNotify({
  integrationBus,
  logger = console,
  notify = null,
  notificationService = null,
  resolveRecipients = null,
} = {}) {
  if (!integrationBus || typeof integrationBus.subscribe !== 'function') {
    throw new Error(
      'wireBeneficiaryLifecycleAutoTransitionNotify: integrationBus with .subscribe(pattern, handler) required'
    );
  }

  const unifiedNotify = typeof notify === 'function' ? notify : _loadUnifiedNotifier();
  const ns = notificationService || _loadNotificationService();
  const resolve =
    typeof resolveRecipients === 'function' ? resolveRecipients : _defaultResolveRecipients;

  const stats = {
    received: 0,
    notified: 0,
    skipped: 0,
    errored: 0,
    lastError: null,
  };

  const handler = async event => {
    stats.received++;
    const payload = event?.payload || event || {};
    if (!payload.beneficiaryId || !payload.transitionId) {
      stats.skipped++;
      logger.warn?.(
        `[lifecycle-auto-notify] skipping malformed event (beneficiaryId=${payload.beneficiaryId ?? '?'} transitionId=${payload.transitionId ?? '?'})`
      );
      return;
    }

    try {
      const recipients = await resolve({
        branchId: payload.branchId,
        beneficiaryId: payload.beneficiaryId,
      });
      if (!Array.isArray(recipients) || recipients.length === 0) {
        stats.skipped++;
        logger.warn?.(
          `[lifecycle-auto-notify] no recipients for beneficiary=${payload.beneficiaryId} branch=${payload.branchId ?? '?'}`
        );
        return;
      }

      const { beneficiaryName, branchName } = await _enrichContext({
        beneficiaryId: payload.beneficiaryId,
        branchId: payload.branchId,
      });

      const templateData = _renderEmail({
        beneficiaryName,
        transitionId: payload.transitionId,
        score: payload.score ?? '-',
        confidence: payload.confidence ?? '-',
        branchName,
        reviewUrl: _reviewUrl(payload.beneficiaryId, payload.transitionRecordId),
      });

      for (const recipient of recipients) {
        try {
          await _sendInApp({ notificationService: ns, recipient, templateData, payload });
          await _sendEmail({ notify: unifiedNotify, recipient, templateData, payload });
          stats.notified += 1;
        } catch (err) {
          stats.errored += 1;
          stats.lastError = err?.message || String(err);
          logger.error?.(
            `[lifecycle-auto-notify] send failed for recipient=${recipient?._id || recipient?.userId || '?'}: ${stats.lastError}`
          );
        }
      }
    } catch (err) {
      stats.errored += 1;
      stats.lastError = err?.message || String(err);
      logger.error?.(`[lifecycle-auto-notify] handler failed: ${stats.lastError}`);
    }
  };

  const unsubscribe = integrationBus.subscribe(EVENT_PATTERN, handler);
  logger.info?.(`[lifecycle-auto-notify] wired — subscribing to '${EVENT_PATTERN}'`);

  return {
    unsubscribe: typeof unsubscribe === 'function' ? unsubscribe : () => {},
    ranSinceBoot: () => ({ ...stats }),
    EVENT_PATTERN,
    TEMPLATE_KEY,
  };
}

module.exports = {
  wireBeneficiaryLifecycleAutoTransitionNotify,
  // Exposed for tests
  EVENT_PATTERN,
  TEMPLATE_KEY,
  _renderEmail,
  _reviewUrl,
  _displayName,
};
