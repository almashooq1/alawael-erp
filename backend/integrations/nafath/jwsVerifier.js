/**
 * Nafath JWS verifier — validates signed assertions returned by Nafath on
 * APPROVED signature requests.
 *
 * Nafath returns a compact JWS of the form:
 *   base64url(header).base64url(payload).base64url(signature)
 *
 * The header declares an `alg` (typically RS256) and optionally a `kid`
 * pointing at the signing key in Nafath's JWKS. We keep the verifier
 * self-contained by accepting either:
 *   - a PEM-encoded public key (set via NAFATH_PUBLIC_KEY_PEM)
 *   - a JWKS object (set via `jwks` constructor option)
 *
 * For local tests we also support HS256 with a shared secret so we can
 * emit and verify fixture tokens without minting RSA keys.
 *
 * Verification steps:
 *   1. Split + base64url-decode header/payload/signature
 *   2. Reject if header.alg not in the allowlist
 *   3. Recompute the signature over `header.payload` and compare
 *   4. Enforce iat/exp window if present
 *   5. Enforce caller-supplied constraints: documentHash, signerNationalId
 */

'use strict';

const crypto = require('crypto');

const DEFAULT_ALLOWED_ALGS = ['RS256', 'ES256', 'HS256'];

function b64urlDecode(str) {
  const pad = 4 - (str.length % 4);
  const base64 = (str + (pad < 4 ? '='.repeat(pad) : '')).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

function decodeJws(token) {
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    const err = new Error('NAFATH_JWS_MALFORMED');
    err.code = 'NAFATH_JWS_MALFORMED';
    throw err;
  }
  const [h, p, s] = token.split('.');
  const header = JSON.parse(b64urlDecode(h).toString('utf8'));
  const payload = JSON.parse(b64urlDecode(p).toString('utf8'));
  const signature = b64urlDecode(s);
  return { header, payload, signature, signingInput: `${h}.${p}` };
}

function _verifyBytes({ alg, signingInput, signature, publicKey, secret }) {
  if (alg === 'RS256') {
    if (!publicKey) throw new Error('NAFATH_JWS_MISSING_PUBLIC_KEY');
    const v = crypto.createVerify('RSA-SHA256');
    v.update(signingInput);
    v.end();
    return v.verify(publicKey, signature);
  }
  if (alg === 'ES256') {
    if (!publicKey) throw new Error('NAFATH_JWS_MISSING_PUBLIC_KEY');
    const v = crypto.createVerify('SHA256');
    v.update(signingInput);
    v.end();
    return v.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  }
  if (alg === 'HS256') {
    if (!secret) throw new Error('NAFATH_JWS_MISSING_SECRET');
    const expected = crypto.createHmac('sha256', secret).update(signingInput).digest();
    return signature.length === expected.length && crypto.timingSafeEqual(signature, expected);
  }
  throw new Error(`NAFATH_JWS_UNSUPPORTED_ALG:${alg}`);
}

function verify(token, opts = {}) {
  const {
    publicKey = process.env.NAFATH_PUBLIC_KEY_PEM || null,
    secret = process.env.NAFATH_JWS_HS_SECRET || null,
    allowedAlgs = DEFAULT_ALLOWED_ALGS,
    clockToleranceSec = 60,
    expectedDocumentHash = null,
    expectedSignerNationalId = null,
    expectedIssuer = null,
  } = opts;

  const { header, payload, signature, signingInput } = decodeJws(token);

  if (!allowedAlgs.includes(header.alg)) {
    const err = new Error('NAFATH_JWS_ALG_NOT_ALLOWED');
    err.code = 'NAFATH_JWS_ALG_NOT_ALLOWED';
    err.alg = header.alg;
    throw err;
  }

  const ok = _verifyBytes({ alg: header.alg, signingInput, signature, publicKey, secret });
  if (!ok) {
    const err = new Error('NAFATH_JWS_BAD_SIGNATURE');
    err.code = 'NAFATH_JWS_BAD_SIGNATURE';
    throw err;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now - clockToleranceSec > payload.exp) {
    const err = new Error('NAFATH_JWS_EXPIRED');
    err.code = 'NAFATH_JWS_EXPIRED';
    throw err;
  }
  if (payload.iat && payload.iat - clockToleranceSec > now) {
    const err = new Error('NAFATH_JWS_FUTURE_IAT');
    err.code = 'NAFATH_JWS_FUTURE_IAT';
    throw err;
  }
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    const err = new Error('NAFATH_JWS_WRONG_ISSUER');
    err.code = 'NAFATH_JWS_WRONG_ISSUER';
    err.got = payload.iss;
    throw err;
  }
  if (expectedDocumentHash && payload.documentHash !== expectedDocumentHash) {
    const err = new Error('NAFATH_JWS_DOCUMENT_HASH_MISMATCH');
    err.code = 'NAFATH_JWS_DOCUMENT_HASH_MISMATCH';
    throw err;
  }
  if (
    expectedSignerNationalId &&
    payload.sub !== expectedSignerNationalId &&
    payload.nationalId !== expectedSignerNationalId
  ) {
    const err = new Error('NAFATH_JWS_SIGNER_MISMATCH');
    err.code = 'NAFATH_JWS_SIGNER_MISMATCH';
    throw err;
  }

  return { header, payload };
}

/**
 * Test-only helper to issue a fixture JWS with HS256. Production code never
 * calls this — Nafath mints the token. We use it in tests to exercise the
 * verifier end-to-end without live credentials.
 */
function _signHs256(payload, secret, header = {}) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', ...header })).toString(
    'base64url'
  );
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${h}.${p}`;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest()
    .toString('base64url');
  return `${signingInput}.${sig}`;
}

module.exports = { verify, decodeJws, _signHs256 };
