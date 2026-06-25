/**
 * WhatsApp Reminder Risk Policy (W1537) — تذكيرات واعية بمخاطر الغياب
 * ═══════════════════════════════════════════════════════════════════════════
 * Makes the reminder intensity INTELLIGENT by reusing the platform's existing
 * no-show predictor (intelligence/no-show-prediction.service) — NOT a new risk
 * model. A reliable family (low no-show risk) gets a single gentle 24h reminder;
 * medium/high risk keeps the standard two-touch (24h + 2h). Respects reliable
 * families + concentrates reminding where it changes outcomes.
 *
 * Read-only on the predictor (`dryRun: true` → no persisted prediction). Fully
 * defensive: env-gated (default OFF) and any predictor hiccup returns null so the
 * caller falls back to the default reminder set — never blocks enqueue.
 *
 * @module services/whatsapp/whatsappReminderRiskPolicy
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const ENV_FLAG = 'ENABLE_WHATSAPP_RISK_AWARE_REMINDERS';

// Map a no-show risk band → reminder types. Pure + testable.
function reminderTypesForBand(band) {
  // Reliable families (low risk) → one gentle reminder; don't over-message them.
  if (band === 'low') return ['reminder_24h'];
  // medium / high / unknown → the standard two-touch.
  return ['reminder_24h', 'reminder_2h'];
}

/**
 * Resolve the risk-aware reminder types for an appointment, or null to use the
 * default set (when risk-aware is off, or the predictor is unavailable/errors).
 * @returns {Promise<string[]|null>}
 */
async function riskAwareReminderTypes(appointmentId, deps = {}) {
  if (process.env[ENV_FLAG] !== 'true') return null;
  if (!appointmentId) return null;
  const log = deps.logger || logger;
  try {
    let predict = deps.predictForAppointment;
    if (!predict) {
      const {
        createNoShowPredictionService,
      } = require('../../intelligence/no-show-prediction.service');
      const svc = createNoShowPredictionService({
        appointmentModel: mongoose.model('Appointment'),
        predictionModel: mongoose.model('AiPrediction'),
      });
      predict = svc.predictForAppointment;
    }
    const r = await predict(appointmentId, { dryRun: true });
    if (!r || !r.ok || !r.band) return null;
    return reminderTypesForBand(r.band);
  } catch (err) {
    log?.warn?.(`[wa-reminder-risk] prediction skipped: ${err.message}`);
    return null;
  }
}

module.exports = { reminderTypesForBand, riskAwareReminderTypes, ENV_FLAG };
