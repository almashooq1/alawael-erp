/**
 * nationalAddressService.js
 *
 * The thin domain layer over `services/waselAdapter.js` that the rest
 * of the app uses to populate, verify, and stamp the embedded
 * `nationalAddress` subdocument (see models/_shared/nationalAddress.subschema.js).
 *
 * Two callers in practice:
 *
 *   • HTTP layer — POST endpoints that accept an address payload from
 *     the client call `coerceFromPayload(payload)` to normalize keys and
 *     then `verifyAndStamp(addr, { actorId })` to fill in the Wasel
 *     enrichment + verification stamp before assigning to the document.
 *
 *   • Direct service code — anywhere a record is created/updated server-
 *     side (seeds, migrations, bulk import) call `verifyAndStamp(addr)`
 *     to satisfy the strict guard in `attachNationalAddressGuard`.
 *
 * Both paths converge on a single mutation point so the verification
 * stamp shape is consistent everywhere.
 */

'use strict';

const wasel = require('./waselAdapter');
const {
  SHORT_CODE_REGEX,
  isAddressProvided,
} = require('../models/_shared/nationalAddress.subschema');

/**
 * Normalize an inbound payload from any caller into the canonical
 * nationalAddress subdocument shape. Accepts legacy keys
 * (postal_code, building_number, etc.) and trims/uppercases as needed.
 */
function coerceFromPayload(input = {}) {
  if (!input || typeof input !== 'object') return {};

  const shortCode = (input.shortCode || input.short_code || input.code || '')
    .toString()
    .trim()
    .toUpperCase();

  return {
    shortCode: shortCode || undefined,
    buildingNumber: input.buildingNumber || input.building_number || undefined,
    additionalNumber: input.additionalNumber || input.additional_number || undefined,
    postalCode: input.postalCode || input.postal_code || input.zip || undefined,
    street: input.street || undefined,
    district: input.district || input.neighborhood || undefined,
    city: input.city || undefined,
    region: input.region || undefined,
    country: input.country || 'SA',
    fullAddress: input.fullAddress || input.address || undefined,
    geo:
      input.geo ||
      (input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : undefined),
    isDeliverable: input.isDeliverable,
    verification: input.verification || undefined,
  };
}

/**
 * Run the address through Wasel and produce a fully-stamped subdocument
 * ready for assignment. The result always carries a verification block,
 * even on failure — the caller can then either reject the save (strict
 * mode) or persist the unverified record (lenient mode).
 *
 * @param {object} addr   — nationalAddress shape (post-coerce)
 * @param {object} opts
 * @param {string=} opts.actorId  — userId stamped onto verification.verifiedBy
 * @param {string=} opts.nationalId — optional national ID to cross-check
 * @returns {Promise<object>} stamped address
 */
async function verifyAndStamp(addr, opts = {}) {
  const out = { ...addr };
  const sc = out.shortCode && String(out.shortCode).toUpperCase();

  if (!sc) {
    out.verification = {
      verified: false,
      status: 'unverified',
      message: 'لم يُقدَّم رمز عنوان وطني',
    };
    return out;
  }
  if (!SHORT_CODE_REGEX.test(sc)) {
    out.verification = {
      verified: false,
      status: 'invalid_format',
      message: 'تنسيق الرمز البريدي غير صالح',
    };
    return out;
  }

  const r = await wasel.verifyShortCode({ shortCode: sc, nationalId: opts.nationalId });
  const matched = r.status === 'match';

  if (matched) {
    out.shortCode = sc;
    if (r.buildingNumber && !out.buildingNumber) out.buildingNumber = r.buildingNumber;
    if (r.additionalNumber && !out.additionalNumber) out.additionalNumber = r.additionalNumber;
    if (r.postalCode && !out.postalCode) out.postalCode = r.postalCode;
    if (r.city && !out.city) out.city = r.city;
    if (r.district && !out.district) out.district = r.district;
    if (r.address && !out.fullAddress) out.fullAddress = r.address;
    if (r.geo && !out.geo) out.geo = r.geo;
    if (r.isDeliverable != null && out.isDeliverable == null) out.isDeliverable = r.isDeliverable;
  }

  out.verification = {
    verified: matched,
    status: r.status || 'unknown',
    mode: r.mode,
    verifiedAt: new Date(),
    verifiedBy: opts.actorId,
    message: r.message,
  };
  return out;
}

/**
 * Throws a descriptive error if the supplied address is missing,
 * malformed, or unverified. Used by HTTP handlers that want to reject
 * the request *before* trying to save.
 */
function requireVerified(addr, label = 'العنوان الوطني') {
  if (!isAddressProvided(addr)) {
    const e = new Error(`${label} مطلوب`);
    e.code = 'NATIONAL_ADDRESS_REQUIRED';
    e.statusCode = 400;
    throw e;
  }
  if (!addr.shortCode || !SHORT_CODE_REGEX.test(String(addr.shortCode).toUpperCase())) {
    const e = new Error(`${label}: تنسيق shortCode غير صالح`);
    e.code = 'NATIONAL_ADDRESS_INVALID_FORMAT';
    e.statusCode = 400;
    throw e;
  }
  if (!(addr.verification && addr.verification.verified === true)) {
    const e = new Error(`${label}: يجب التحقق عبر وَصِل قبل الحفظ`);
    e.code = 'NATIONAL_ADDRESS_UNVERIFIED';
    e.statusCode = 422;
    throw e;
  }
}

module.exports = {
  coerceFromPayload,
  verifyAndStamp,
  requireVerified,
};
