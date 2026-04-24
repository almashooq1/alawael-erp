/**
 * PII Redactor — sanitize objects / strings before writing to logs, DLQ
 * payloads, integration audit rows, or anywhere persisted outside the
 * hardened database.
 *
 * PDPL (Personal Data Protection Law — KSA) and CHI auditor expectations
 * require that the following are never stored in plaintext in log stores:
 *   - Saudi national ID (nationalId) — 10 digits starting with 1/2
 *   - Iqama — same shape
 *   - Phone numbers (Saudi + international)
 *   - Email addresses
 *   - IBAN, bank accounts, card numbers (PAN)
 *   - Passwords, OTPs, access tokens, JWTs, API keys
 *
 * Strategy:
 *   - Field-name blacklist: common key names are replaced wholesale.
 *   - Pattern-based scrubbing of string values for anything that slipped into
 *     a free-text field.
 *   - Partial masking where downstream still needs a discriminator (show last
 *     4 digits of a phone, for example).
 *
 * Use this at the audit / log boundary, NOT on data that the business logic
 * still needs. Never pass a redacted object back into the domain.
 */

'use strict';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'apiKey',
  'api_key',
  'apikey',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
  'authorization',
  'cookie',
  'csid',
  'otp',
  'pin',
  'cardNumber',
  'card_number',
  'pan',
  'cvv',
  'cvc',
  'iban',
  'bankAccount',
  'bank_account',
]);

const PARTIAL_MASK_KEYS = new Set([
  'nationalId',
  'national_id',
  'iqamaId',
  'iqama_id',
  'iqama',
  'phone',
  'phoneNumber',
  'phone_number',
  'mobile',
  'email',
]);

const NATIONAL_ID_RE = /\b[12]\d{9}\b/g; // Saudi national/iqama 10 digits
const PHONE_RE = /\+?\d{1,3}[- .]?\(?\d{1,4}\)?[- .]?\d{3,4}[- .]?\d{3,4}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const IBAN_RE = /\bSA\d{2}[A-Z0-9]{20}\b/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi;

const REDACTED = '[REDACTED]';

function mask(value, keep = 4) {
  if (value == null) return value;
  const s = String(value);
  if (s.length <= keep) return '*'.repeat(s.length);
  return '*'.repeat(s.length - keep) + s.slice(-keep);
}

function redactString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(JWT_RE, REDACTED)
    .replace(BEARER_RE, 'Bearer ' + REDACTED)
    .replace(IBAN_RE, REDACTED)
    .replace(CARD_RE, m => (m.replace(/[^\d]/g, '').length >= 13 ? REDACTED : m))
    .replace(EMAIL_RE, REDACTED)
    .replace(NATIONAL_ID_RE, REDACTED)
    .replace(PHONE_RE, m => (m.replace(/\D/g, '').length >= 7 ? REDACTED : m));
}

function redact(value, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);

  if (Array.isArray(value)) return value.map(v => redact(v, seen));

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const keyLc = k.toLowerCase();
    if (SENSITIVE_KEYS.has(k) || SENSITIVE_KEYS.has(keyLc)) {
      out[k] = REDACTED;
      continue;
    }
    if (PARTIAL_MASK_KEYS.has(k) || PARTIAL_MASK_KEYS.has(keyLc)) {
      out[k] = typeof v === 'string' || typeof v === 'number' ? mask(v) : REDACTED;
      continue;
    }
    out[k] = redact(v, seen);
  }
  return out;
}

module.exports = {
  redact,
  redactString,
  mask,
  SENSITIVE_KEYS,
  PARTIAL_MASK_KEYS,
  REDACTED,
};
