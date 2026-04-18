/**
 * fatooraAdapter.js — Saudi ZATCA Fatoora e-invoicing adapter.
 *
 * Responsible for actually transmitting the ZATCA-compliant invoice
 * envelope (UUID + invoice hash + QR) to ZATCA/Fatoora for clearance
 * or reporting — the step that turns a `NOT_SUBMITTED` envelope into
 * `ACCEPTED`.
 *
 * Modes (FATOORA_MODE, default 'mock'):
 *   • mock — deterministic, offline:
 *            - invoice.totalAmount ending in .99 → REJECTED (validation error)
 *            - invoice.totalAmount >= 10000     → ACCEPTED (standard clearance)
 *            - else                             → ACCEPTED (simplified reporting)
 *            Adds 800ms latency so the UI shows a realistic spinner.
 *   • live — calls real Fatoora reporting/clearance endpoint.
 *            Requires the compliance onboarding to be done beforehand
 *            (CSR → CSID → production CSID) and those certs present
 *            in env. This adapter does the final POST + response map.
 *
 * Env (live mode):
 *   FATOORA_BASE_URL        — https://gw-fatoora.zatca.gov.sa/e-invoicing/core
 *   FATOORA_BINARY_TOKEN    — base64-encoded production CSID (Basic auth)
 *   FATOORA_OTP             — one-time password (for onboarding only)
 *   FATOORA_MODE_TYPE       — 'reporting' | 'clearance' (default 'reporting')
 *   FATOORA_TIMEOUT_MS      — request timeout (default 12000)
 *
 * Public API:
 *   submit({ invoiceHash, uuid, invoiceXmlB64, invoiceType })
 *     → { status: 'ACCEPTED'|'REPORTED'|'REJECTED'|'ERROR', zatcaReference?, errors?, mode, latencyMs? }
 *   testConnection(), getConfig()
 *
 * Important: this module does NOT perform XML UBL canonicalization +
 * XAdES signing. That is the job of a crypto step that must happen
 * before `submit()` is called. The `invoiceXmlB64` parameter receives
 * the already-signed envelope. For now (mock mode) we accept the
 * internal canonical hash as a stand-in, which is sufficient to exercise
 * the full UI flow end-to-end.
 */

'use strict';

const MODE = (process.env.FATOORA_MODE || 'mock').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.FATOORA_TIMEOUT_MS, 10) || 12_000;
const SUBMISSION_TYPE = (process.env.FATOORA_MODE_TYPE || 'reporting').toLowerCase();

// ── Mock ────────────────────────────────────────────────────────────────
async function mockSubmit({ invoice, uuid, invoiceHash }) {
  // Simulate network + ZATCA processing latency
  await new Promise(r => setTimeout(r, 800));
  const total = Number(invoice?.totalAmount || 0);
  // Two-decimal business rule check: amounts ending in .99 → pretend REJECTED
  const cents = Math.round(total * 100) % 100;
  if (cents === 99) {
    return {
      status: 'REJECTED',
      errors: [{ code: 'BR-S-08', message: 'مبلغ الضريبة لا يطابق الحساب الموزون' }],
      mode: 'mock',
    };
  }
  const isStandard = total >= 10_000;
  return {
    status: isStandard ? 'ACCEPTED' : 'REPORTED',
    zatcaReference: `MOCK-${uuid.slice(0, 8)}-${Date.now()}`,
    clearedXmlB64: invoiceHash, // pretend we got signed clearance back
    mode: 'mock',
    submissionType: isStandard ? 'clearance' : 'reporting',
  };
}

// ── Live ────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function assertConfigured() {
  const missing = [];
  if (!process.env.FATOORA_BASE_URL) missing.push('FATOORA_BASE_URL');
  if (!process.env.FATOORA_BINARY_TOKEN) missing.push('FATOORA_BINARY_TOKEN');
  if (missing.length) {
    const e = new Error(`Fatoora live mode غير مُكوَّن — مفقود: ${missing.join(', ')}`);
    e.code = 'NOT_CONFIGURED';
    e.missing = missing;
    throw e;
  }
}

async function liveSubmit({ invoiceXmlB64, invoiceHash, uuid }) {
  if (!invoiceXmlB64) {
    return {
      status: 'ERROR',
      mode: 'live',
      errors: [{ message: 'invoiceXmlB64 مطلوب للإرسال الفعلي' }],
    };
  }
  try {
    assertConfigured();
  } catch (err) {
    return { status: 'ERROR', mode: 'live', errors: [{ message: err.message }] };
  }
  const base = process.env.FATOORA_BASE_URL;
  const token = process.env.FATOORA_BINARY_TOKEN;
  const endpoint =
    SUBMISSION_TYPE === 'clearance' ? '/invoices/clearance/single' : '/invoices/reporting/single';

  const start = Date.now();
  try {
    const resp = await fetchWithTimeout(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': 'en',
        'Accept-Version': 'V2',
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify({
        invoiceHash,
        uuid,
        invoice: invoiceXmlB64,
      }),
    });

    const latencyMs = Date.now() - start;
    const data = await resp.json().catch(() => ({}));

    // ZATCA returns 200 for ACCEPTED, 202 for ACCEPTED_WITH_WARNINGS,
    // 400 for REJECTED with validationResults
    if (resp.status === 200 || resp.status === 202) {
      return {
        status: SUBMISSION_TYPE === 'clearance' ? 'ACCEPTED' : 'REPORTED',
        zatcaReference: data.reportingStatus || data.clearanceStatus || `ZATCA-${uuid.slice(0, 8)}`,
        clearedXmlB64: data.clearedInvoice,
        warnings: data.validationResults?.warningMessages,
        mode: 'live',
        latencyMs,
        submissionType: SUBMISSION_TYPE,
      };
    }
    if (resp.status === 400) {
      return {
        status: 'REJECTED',
        errors: data.validationResults?.errorMessages?.map(e => ({
          code: e.code,
          message: e.message,
        })) || [{ message: data.message || `HTTP 400` }],
        mode: 'live',
        latencyMs,
      };
    }
    return {
      status: 'ERROR',
      errors: [{ message: `HTTP ${resp.status} — ${data.message || 'unknown'}` }],
      mode: 'live',
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'ERROR',
      errors: [{ message: err?.message || 'فشل الاتصال بـ Fatoora' }],
      mode: 'live',
    };
  }
}

/**
 * submit — public entry point. Takes the invoice document + envelope
 * data. In live mode, `invoiceXmlB64` is required and must be the
 * signed canonical XML produced by a separate signing step.
 */
async function submit({ invoice, uuid, invoiceHash, invoiceXmlB64 }) {
  if (!uuid || !invoiceHash) {
    return {
      status: 'ERROR',
      mode: MODE,
      errors: [{ message: 'uuid و invoiceHash مطلوبان (أصدر الفاتورة أولاً)' }],
    };
  }
  return MODE === 'live'
    ? liveSubmit({ invoiceXmlB64, invoiceHash, uuid })
    : mockSubmit({ invoice, uuid, invoiceHash });
}

async function testConnection() {
  if (MODE !== 'live')
    return { ok: true, mode: 'mock', message: 'وضع المحاكاة — لا يوجد اتصال شبكي' };
  try {
    assertConfigured();
    // Fatoora has no bare health endpoint — best we can do without
    // burning a real invoice is check that the token is well-formed.
    const token = process.env.FATOORA_BINARY_TOKEN;
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const ok = decoded.length > 20;
    return {
      ok,
      mode: 'live',
      message: ok
        ? 'الرمز (Binary Token) مُكوَّن وبطول صالح. للاختبار الحقيقي أرسل فاتورة اختبارية.'
        : 'الرمز يبدو غير صالح',
    };
  } catch (err) {
    return { ok: false, mode: 'live', error: err.message, missing: err.missing };
  }
}

function getConfig() {
  const missing = [];
  if (MODE === 'live') {
    if (!process.env.FATOORA_BASE_URL) missing.push('FATOORA_BASE_URL');
    if (!process.env.FATOORA_BINARY_TOKEN) missing.push('FATOORA_BINARY_TOKEN');
  }
  return {
    provider: 'fatoora',
    mode: MODE,
    submissionType: SUBMISSION_TYPE,
    configured: MODE === 'mock' ? true : missing.length === 0,
    missing: missing.length ? missing : undefined,
    timeoutMs: TIMEOUT_MS,
  };
}

module.exports = { MODE, submit, testConnection, getConfig };
