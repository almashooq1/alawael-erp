/**
 * Parent notifications — Phase J
 *
 * Arabic message templates + dispatch helpers for transport events:
 *   - pickup_confirmed
 *   - dropoff_confirmed
 *   - trip_started (with HMAC tracking link)
 *   - trip_delayed
 *   - trip_completed
 *
 * Pure template builders are unit-testable. The dispatch wrapper
 * (`sendToGuardians`) is fire-and-forget — never blocks the route
 * handler.
 *
 * Channels: delegates to unifiedNotifier (whatsapp → sms → email
 * fallback chain).
 */
'use strict';

const TIME_OPTS = { hour: '2-digit', minute: '2-digit', hour12: false };

function fmtTime(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleTimeString('ar-SA', TIME_OPTS);
  } catch {
    return '';
  }
}

function safeName(beneficiary) {
  if (!beneficiary) return '';
  if (typeof beneficiary === 'string') return '';
  return beneficiary.full_name_ar || beneficiary.firstName_ar || beneficiary.first_name || '';
}

function safePlate(vehicle) {
  if (!vehicle || typeof vehicle === 'string') return '';
  return vehicle.license_plate || vehicle.plate_number || vehicle.vehicle_number || '';
}

// ─── Template builders ──────────────────────────────────────────────────────

function buildPickupMessage({ beneficiary, vehicle, when }) {
  const name = safeName(beneficiary);
  const plate = safePlate(vehicle);
  const time = fmtTime(when || new Date());
  const lines = [`🚌 تم استلام ${name || 'الطفل'} بنجاح`, `الوقت: ${time}`];
  if (plate) lines.push(`المركبة: ${plate}`);
  lines.push('للتتبع المباشر، يمكنكم استخدام رابط الرحلة المرسل سابقاً.');
  return lines.join('\n');
}

function buildDropoffMessage({ beneficiary, when }) {
  const name = safeName(beneficiary);
  const time = fmtTime(when || new Date());
  return [`🏠 تم توصيل ${name || 'الطفل'} إلى المنزل`, `الوقت: ${time}`, 'شكراً لثقتكم.'].join(
    '\n'
  );
}

function buildTripStartedMessage({ trip, route, vehicle, trackingUrl }) {
  const routeName = (route && route.route_name_ar) || '';
  const plate = safePlate(vehicle);
  const lines = [
    `🚌 انطلقت رحلة ${routeName || trip?.trip_type === 'morning_pickup' ? 'الصباح' : 'المساء'}`,
  ];
  if (plate) lines.push(`المركبة: ${plate}`);
  if (trackingUrl) lines.push(`تتبع مباشر: ${trackingUrl}`);
  return lines.join('\n');
}

function buildDelayMessage({ delayMinutes, reason }) {
  const lines = [`⏱️ تأخير في الرحلة: ${delayMinutes} دقيقة`];
  if (reason) lines.push(`السبب: ${reason}`);
  lines.push('نعتذر عن الإزعاج.');
  return lines.join('\n');
}

function buildTripCompletedMessage({ trip }) {
  const lines = [`✅ اكتملت رحلة ${trip?.trip_number || ''}`, 'شكراً لاستخدامكم خدمة النقل.'];
  return lines.join('\n');
}

// ─── Recipient resolver ─────────────────────────────────────────────────────

/**
 * Extract phone numbers from a populated beneficiary's guardians.
 * Returns `[]` when no usable phone is found.
 *
 * @param {Object} beneficiary - populated with `guardians: [{phone, alternatePhone, name}]`
 *                              or a legacy doc with `guardian_phone` string
 * @param {Object} [opts]
 * @param {boolean} [opts.includeAlternate=false]
 */
function getGuardianPhones(beneficiary, opts = {}) {
  if (!beneficiary || typeof beneficiary === 'string') return [];

  // Legacy single phone field
  const legacy = beneficiary.guardian_phone || beneficiary.guardianPhone;
  if (legacy && !beneficiary.guardians?.length) return [String(legacy).trim()];

  if (!Array.isArray(beneficiary.guardians)) return [];

  const phones = new Set();
  for (const g of beneficiary.guardians) {
    if (!g || typeof g === 'string') continue;
    if (g.phone) phones.add(String(g.phone).trim());
    if (opts.includeAlternate && g.alternatePhone) phones.add(String(g.alternatePhone).trim());
  }
  return [...phones].filter(p => p && p.length >= 9);
}

/**
 * Does the beneficiary opt out of transport notifications?
 * Returns true when explicitly disabled. Default is enabled.
 */
function isOptedOut(beneficiary) {
  if (!beneficiary || typeof beneficiary === 'string') return false;
  if (beneficiary.transport_notifications_enabled === false) return true;
  // Nested preferences shape
  const prefs = beneficiary.notification_preferences || beneficiary.notificationPreferences;
  if (prefs && prefs.transport === false) return true;
  return false;
}

// ─── Dispatch wrapper ───────────────────────────────────────────────────────

/**
 * Fire a notification to every guardian phone of the given beneficiary.
 * Never throws — failures are swallowed and logged in NotificationLog
 * by unifiedNotifier.
 *
 * @param {Object} args
 * @param {Object} args.beneficiary - populated with guardians
 * @param {string} args.body
 * @param {string} args.templateKey - for audit tagging (e.g. "transport.pickup")
 * @param {Object} [args.metadata]
 * @param {Function} [args.notifier] - injected for testing; defaults to unifiedNotifier.notify
 */
async function sendToGuardians(args) {
  const { beneficiary, body, templateKey, metadata, notifier } = args;
  if (!body || !beneficiary) return { skipped: 'no_beneficiary_or_body' };
  if (isOptedOut(beneficiary)) return { skipped: 'opted_out' };

  const phones = getGuardianPhones(beneficiary);
  if (phones.length === 0) return { skipped: 'no_phone' };

  // Caller may inject a notifier (for tests). Default: unifiedNotifier.notify
  let fn = notifier;
  if (!fn) {
    try {
      fn = require('../unifiedNotifier').notify;
    } catch {
      return { skipped: 'notifier_unavailable' };
    }
  }

  const results = [];
  for (const phone of phones) {
    try {
      const r = await fn({
        to: phone,
        channels: 'auto',
        body,
        priority: 'normal',
        templateKey,
        beneficiaryId: beneficiary._id || beneficiary.id,
        metadata,
      });
      results.push({ phone, ...(r || {}) });
    } catch (err) {
      results.push({ phone, success: false, error: err.message });
    }
  }
  return { sent: results.filter(r => r.success).length, results };
}

/** Fire-and-forget version — drops the promise, never throws. */
function sendAsync(args) {
  Promise.resolve()
    .then(() => sendToGuardians(args))
    .catch(() => {});
}

module.exports = {
  buildPickupMessage,
  buildDropoffMessage,
  buildTripStartedMessage,
  buildDelayMessage,
  buildTripCompletedMessage,
  getGuardianPhones,
  isOptedOut,
  sendToGuardians,
  sendAsync,
};
