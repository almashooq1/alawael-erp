/**
 * invoiceZatcaHook.js — bridges the local Invoice model into the
 * standalone ZATCA Phase 2 service so finalized invoices reach ZATCA
 * without manual API calls.
 *
 * Design:
 *   • Idempotent: if `invoice.zatca.zatcaStatus === 'ACCEPTED'` the
 *     bridge returns `{ skipped: 'already_accepted' }` and does
 *     nothing. Re-running on a flaky network is safe.
 *   • Best-effort: any exception is caught + logged. The bridge NEVER
 *     throws, because Invoice creation must not be blocked by a
 *     downstream ZATCA outage. The caller can re-trigger later.
 *   • Feature-flagged: only fires when `ZATCA_AUTOSUBMIT=true`. Default
 *     off so existing flows do not start hitting fatoora.zatca.gov.sa
 *     the moment this lands. Operators flip the flag at go-live.
 *   • Persistence: results write back via `Invoice.updateOne()`
 *     (NOT `invoice.save()`) so we don't re-trigger the post-save hook
 *     and create an infinite loop.
 *
 * Public surface:
 *   submitInvoiceToZatca(invoice, options)
 *     options.zatcaService  — DI for tests
 *     options.invoiceModel  — DI for tests
 *     options.force         — bypass the idempotency guard (for re-tries)
 *
 *   Returns:
 *     { ok: true, status: 'ACCEPTED'|'REJECTED'|'SUBMITTED', reference, errors }
 *     { ok: false, skipped: 'already_accepted'|'autosubmit_disabled'|... }
 *     { ok: false, error: '<message>' }
 */

'use strict';

const logger = require('../utils/logger');

function autosubmitEnabled() {
  return String(process.env.ZATCA_AUTOSUBMIT || '').toLowerCase() === 'true';
}

function mapInvoiceToZatcaInput(invoice) {
  // Translate the local Invoice document into the shape expected by
  // ZatcaPhase2Service.processInvoice. Conservative defaults are used
  // for fields the local model doesn't track yet (e.g. seller VAT comes
  // from env until per-branch credentials carry it).
  return {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate || invoice.createdAt,
    invoiceType: invoice.zatca?.invoiceType?.toLowerCase() || 'simplified',

    sellerName: invoice.zatca?.sellerName || process.env.ZATCA_SELLER_NAME,
    sellerVatNumber: invoice.zatca?.sellerVatNumber || process.env.ZATCA_SELLER_VAT,
    sellerCrNumber: process.env.ZATCA_SELLER_CR,

    buyerName: invoice.zatca?.buyerName || invoice.beneficiaryName,
    buyerVatNumber: invoice.zatca?.buyerVatNumber,

    totalAmount: invoice.totalAmount,
    vatAmount: invoice.vatAmount,
    netAmount:
      invoice.netAmount ?? (Number(invoice.totalAmount) || 0) - (Number(invoice.vatAmount) || 0),

    items: Array.isArray(invoice.items) ? invoice.items : [],
    paymentMethod: invoice.paymentMethod,
    invoiceUuid: invoice.zatca?.uuid,
  };
}

async function submitInvoiceToZatca(invoice, options = {}) {
  if (!invoice || !invoice._id) {
    return { ok: false, error: 'invalid_invoice' };
  }

  if (!options.force && !autosubmitEnabled()) {
    return { ok: false, skipped: 'autosubmit_disabled' };
  }

  const currentStatus = invoice.zatca?.zatcaStatus;
  if (!options.force && currentStatus === 'ACCEPTED') {
    return { ok: false, skipped: 'already_accepted' };
  }

  const zatcaService = options.zatcaService || require('./zatca-phase2.service');
  const Invoice = options.invoiceModel || require('../models/Invoice');

  let result;
  try {
    result = await zatcaService.processInvoice(
      mapInvoiceToZatcaInput(invoice),
      invoice.branchId || null
    );
  } catch (err) {
    logger.warn('[invoice-zatca-hook] processInvoice failed (best-effort)', {
      invoiceId: String(invoice._id),
      error: err.message,
    });
    // Persist failure marker so the UI can surface a "retry submit" button.
    try {
      await Invoice.updateOne(
        { _id: invoice._id },
        {
          $set: {
            'zatca.zatcaStatus': 'REJECTED',
            'zatca.zatcaErrors': [String(err.message || err)],
            'zatca.submittedToZatcaAt': new Date(),
          },
        }
      );
    } catch (persistErr) {
      logger.error('[invoice-zatca-hook] failure-marker persist failed', {
        invoiceId: String(invoice._id),
        error: persistErr.message,
      });
    }
    // Also fire the real-time ops alert so on-call hears about it
    // immediately. We treat thrown errors as functionally equivalent to
    // a REJECTED status — the operator needs the same kind of nudge.
    try {
      const { sendOpsAlert } = require('./ops-alerter');
      await sendOpsAlert({
        kind: 'zatca_invoice_rejected',
        severity: 'high',
        subject: `ZATCA فشل إرسال الفاتورة ${invoice.invoiceNumber || invoice._id}`,
        body:
          `فشل استدعاء خدمة ZATCA للفاتورة. السبب: ${err.message || err}\n\n` +
          `رقم الفاتورة: ${invoice.invoiceNumber || invoice._id}\n` +
          `راجع docs/blueprint/22-zatca-phase2.md`,
        metadata: {
          invoiceId: String(invoice._id),
          invoiceNumber: invoice.invoiceNumber,
          error: err.message || String(err),
        },
      });
    } catch (alertErr) {
      logger.warn('[invoice-zatca-hook] ops-alerter dispatch failed (after throw)', {
        invoiceId: String(invoice._id),
        error: alertErr.message,
      });
    }
    return { ok: false, error: err.message || String(err) };
  }

  // Map the ZATCA service response into the Invoice envelope schema.
  const status = mapZatcaStatus(result?.status);
  const update = {
    'zatca.uuid': result?.uuid || invoice.zatca?.uuid,
    'zatca.icv': result?.icv,
    'zatca.invoiceHash': result?.invoiceHash,
    'zatca.qrCode': result?.qrCode,
    'zatca.zatcaStatus': status,
    'zatca.zatcaReference': result?.zatcaReference || result?.reference,
    'zatca.zatcaErrors': Array.isArray(result?.errors) ? result.errors : [],
    'zatca.submittedToZatcaAt': new Date(),
  };

  try {
    await Invoice.updateOne({ _id: invoice._id }, { $set: update });
  } catch (err) {
    logger.error('[invoice-zatca-hook] update failed (response not persisted)', {
      invoiceId: String(invoice._id),
      error: err.message,
    });
    // We still return the result — the operator can re-fetch + retry.
  }

  // Fire a real-time ops alert on rejection. The dashboard alert
  // evaluator also catches these via the zatca-submission-rejected
  // rule (defense in depth — the rule sweeps every N minutes and
  // catches any we missed, e.g. when the hook ran before ops-alerter
  // recipients were configured), but we want immediate notification
  // for the most-recent rejection rather than waiting for the sweep.
  if (status === 'REJECTED') {
    try {
      const { sendOpsAlert } = require('./ops-alerter');
      await sendOpsAlert({
        kind: 'zatca_invoice_rejected',
        severity: 'high',
        subject: `ZATCA رفضت الفاتورة ${invoice.invoiceNumber || invoice._id}`,
        body:
          `رفضت ZATCA إرسال الفاتورة. السبب:\n` +
          (Array.isArray(update['zatca.zatcaErrors']) && update['zatca.zatcaErrors'].length
            ? update['zatca.zatcaErrors'].map(e => ` • ${e}`).join('\n')
            : ' • (لا توجد رسالة خطأ)') +
          `\n\nرقم الفاتورة: ${invoice.invoiceNumber || invoice._id}\n` +
          `راجع docs/blueprint/22-zatca-phase2.md`,
        metadata: {
          invoiceId: String(invoice._id),
          invoiceNumber: invoice.invoiceNumber,
          reference: update['zatca.zatcaReference'],
        },
      });
    } catch (err) {
      // Alerting must never break the bridge.
      logger.warn('[invoice-zatca-hook] ops-alerter dispatch failed', {
        invoiceId: String(invoice._id),
        error: err.message,
      });
    }
  }

  return {
    ok: status === 'ACCEPTED' || status === 'SUBMITTED',
    status,
    reference: update['zatca.zatcaReference'],
    errors: update['zatca.zatcaErrors'],
  };
}

function mapZatcaStatus(raw) {
  const v = String(raw || '').toUpperCase();
  if (['ACCEPTED', 'CLEARED'].includes(v)) return 'ACCEPTED';
  if (['REJECTED', 'DENIED', 'ERROR'].includes(v)) return 'REJECTED';
  if (['SUBMITTED', 'REPORTED', 'PENDING'].includes(v)) return 'SUBMITTED';
  return 'SUBMITTED'; // default — at least we tried
}

module.exports = {
  submitInvoiceToZatca,
  mapInvoiceToZatcaInput,
  mapZatcaStatus,
  autosubmitEnabled,
};
