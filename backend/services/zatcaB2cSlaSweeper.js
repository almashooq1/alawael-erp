/**
 * zatcaB2cSlaSweeper.js — enforces ZATCA's 24-hour reporting SLA
 * for simplified (B2C) invoices.
 *
 * ZATCA Phase 2 requires every simplified e-invoice to be reported via
 * the `/invoices/reporting/single` endpoint within 24 hours of issuance.
 * Missing the deadline is a regulatory exposure even if the invoice is
 * eventually reported. This sweeper is the safety net that catches
 * invoices the post-save hook didn't successfully submit (autosubmit
 * disabled, ZATCA outage, mis-routed traffic).
 *
 * Two thresholds:
 *   • `warnThresholdMs` (default 18h) — retry the submission. Plenty of
 *     time to recover before the SLA fires.
 *   • `breachThresholdMs` (default 23h) — within an hour of the SLA;
 *     fire ONE ops-alert per tick listing the breaching invoices, so
 *     on-call can intervene manually.
 *
 * Atomic per-invoice: a failure on any one row never stops the rest.
 * The result counts give the scheduler a clean signal for log lines.
 *
 * Contract:
 *   sweep({ now?, batchSize?, warnThresholdMs?, breachThresholdMs?, models? }) →
 *     { scanned, retried, retrySucceeded, retryFailed, breached, breachAlerted }
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const DEFAULTS = {
  batchSize: 50,
  warnThresholdMs: 18 * 60 * 60 * 1000, // 18h — start retrying
  breachThresholdMs: 23 * 60 * 60 * 1000, // 23h — alert ops
};

function getModel(models, name) {
  // Explicit null in the override map means "skip the fallback" — useful
  // for tests that want to assert behavior when the model is unavailable.
  if (models && Object.prototype.hasOwnProperty.call(models, name)) {
    return models[name];
  }
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

async function sweep({
  now,
  batchSize = DEFAULTS.batchSize,
  warnThresholdMs = DEFAULTS.warnThresholdMs,
  breachThresholdMs = DEFAULTS.breachThresholdMs,
  models,
  hook, // DI: { submitInvoiceToZatca }
  alerter, // DI: { sendOpsAlert }
} = {}) {
  const Invoice = getModel(models, 'Invoice');
  if (!Invoice) {
    return zeroResult('invoice_model_unavailable');
  }
  if (warnThresholdMs >= breachThresholdMs) {
    return zeroResult('invalid_thresholds');
  }

  const t = now instanceof Date ? now : new Date(now || Date.now());
  const warnCutoff = new Date(t.getTime() - warnThresholdMs);
  const breachCutoff = new Date(t.getTime() - breachThresholdMs);

  // Eligible rows: simplified invoices, not yet ACCEPTED, issued before
  // the warn cutoff. We include REJECTED rows so a transient error gets
  // retried automatically (the hook is idempotent on ACCEPTED).
  const filter = {
    'zatca.invoiceType': 'SIMPLIFIED',
    'zatca.zatcaStatus': { $in: ['NOT_SUBMITTED', 'SUBMITTED', 'REJECTED'] },
    issueDate: { $lte: warnCutoff },
  };

  const candidates = await Invoice.find(filter).sort({ issueDate: 1 }).limit(batchSize).lean(false); // need real docs for the hook

  const result = {
    scanned: candidates.length,
    retried: 0,
    retrySucceeded: 0,
    retryFailed: 0,
    breached: 0,
    breachAlerted: false,
    breachIds: [],
  };

  const breaches = [];
  const submitInvoiceToZatca =
    hook?.submitInvoiceToZatca || require('./invoiceZatcaHook').submitInvoiceToZatca;

  for (const inv of candidates) {
    const issuedAt = inv.issueDate ? new Date(inv.issueDate) : null;
    const isBreach = issuedAt && issuedAt <= breachCutoff;
    if (isBreach) {
      result.breached++;
      result.breachIds.push(String(inv._id));
      breaches.push(inv);
    }

    // Retry every eligible row — even breaches, in case ZATCA is back up.
    result.retried++;
    try {
      const r = await submitInvoiceToZatca(inv, { force: true });
      if (r?.ok || r?.status === 'ACCEPTED' || r?.status === 'SUBMITTED') {
        result.retrySucceeded++;
      } else {
        result.retryFailed++;
      }
    } catch (err) {
      result.retryFailed++;
      logger.warn('[zatca-sla-sweeper] retry threw (best-effort)', {
        invoiceId: String(inv._id),
        error: err.message,
      });
    }
  }

  // Single aggregated alert per tick when there's a breach. We do NOT
  // fire one alert per breaching invoice — that would spam on-call when
  // a long ZATCA outage produces dozens of overdue invoices. The
  // metadata carries every breaching id so the operator can drill in.
  if (breaches.length > 0) {
    try {
      const sendOpsAlert = alerter?.sendOpsAlert || require('./ops-alerter').sendOpsAlert;
      await sendOpsAlert({
        kind: 'zatca_b2c_sla_breach',
        severity: 'critical',
        subject: `تجاوز SLA لإبلاغ ZATCA — ${breaches.length} فاتورة B2C`,
        body:
          `لم يتم إبلاغ الفواتير التالية إلى ZATCA خلال 24 ساعة من إصدارها.\n\n` +
          breaches
            .slice(0, 25)
            .map(
              b =>
                ` • ${b.invoiceNumber || b._id} — أُصدرت ${
                  b.issueDate ? new Date(b.issueDate).toISOString() : '—'
                }`
            )
            .join('\n') +
          (breaches.length > 25 ? `\n ... و ${breaches.length - 25} فاتورة إضافية` : '') +
          `\n\nراجع docs/blueprint/22-zatca-phase2.md`,
        metadata: {
          breachIds: result.breachIds,
          breachCount: breaches.length,
          warnThresholdMs,
          breachThresholdMs,
        },
      });
      result.breachAlerted = true;
    } catch (err) {
      logger.warn('[zatca-sla-sweeper] ops-alerter dispatch failed', {
        error: err.message,
      });
    }
  }

  return result;
}

function zeroResult(reason) {
  return {
    scanned: 0,
    retried: 0,
    retrySucceeded: 0,
    retryFailed: 0,
    breached: 0,
    breachAlerted: false,
    breachIds: [],
    skippedReason: reason,
  };
}

module.exports = { sweep, DEFAULTS };
