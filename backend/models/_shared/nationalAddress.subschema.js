/**
 * nationalAddress.subschema.js
 *
 * العنوان الوطني السعودي (Saudi National Address — SPL / Wasel).
 *
 * Reusable Mongoose subdocument that every domain entity carrying a
 * postal/physical address (Beneficiary, Customer, Vendor, Driver,
 * Guardian, Employee, Supplier, ContractParty, EmergencyContact, Branch)
 * embeds as `nationalAddress`.
 *
 * The shape mirrors what `Branch.wasel_verification` already used so
 * existing data migrates cleanly. The single source of truth for
 * verification is `services/waselAdapter.js`.
 *
 * Strict-verification policy (Slice 1 of the project-wide rollout):
 * any document that *provides* a `nationalAddress.shortCode` MUST also
 * pass verification. Documents without any address are accepted
 * unchanged — strictness applies only when an address is present.
 *
 * To attach the guard on a model:
 *
 *   const { nationalAddressSubschema, attachNationalAddressGuard } =
 *     require('./_shared/nationalAddress.subschema');
 *
 *   schema.add({ nationalAddress: nationalAddressSubschema });
 *   attachNationalAddressGuard(schema);
 */

'use strict';

const mongoose = require('mongoose');

const SHORT_CODE_REGEX = /^[A-Z]{4}\d{4}$/;
const VERIFICATION_STATUS = [
  'unverified', // user typed an address but never asked Wasel
  'match', // Wasel confirmed
  'not_found', // shortCode well-formed but not registered
  'invalid_format', // failed the regex / Wasel rejected format
  'unknown', // Wasel call errored (network / 5xx / not configured)
];

const verificationSchema = new mongoose.Schema(
  {
    verified: { type: Boolean, default: false, index: true },
    status: { type: String, enum: VERIFICATION_STATUS, default: 'unverified' },
    mode: { type: String, enum: ['mock', 'live'] },
    verifiedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
  },
  { _id: false }
);

const geoSchema = new mongoose.Schema(
  {
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const nationalAddressSchemaDef = {
  // ── Wasel short code — 4 letters + 4 digits (e.g. RFYA1234) ───────
  shortCode: {
    type: String,
    uppercase: true,
    trim: true,
    validate: {
      validator: v => v == null || v === '' || SHORT_CODE_REGEX.test(v),
      message: 'تنسيق الرمز البريدي للعنوان الوطني غير صالح',
    },
  },
  // ── Structured fields populated from Wasel response ───────────────
  buildingNumber: { type: String, trim: true },
  additionalNumber: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  street: { type: String, trim: true },
  district: { type: String, trim: true },
  city: { type: String, trim: true },
  region: { type: String, trim: true },
  country: { type: String, trim: true, default: 'SA' },
  fullAddress: { type: String, trim: true },
  geo: { type: geoSchema },
  isDeliverable: { type: Boolean },

  // ── Verification stamp ────────────────────────────────────────────
  verification: { type: verificationSchema, default: () => ({}) },
};

/**
 * Factory — returns a fresh Mongoose Schema instance.
 * Use when a model wants its own subschema (e.g. to add per-model
 * validators or paths). Most callers should use the exported
 * singleton `nationalAddressSubschema`.
 */
function buildNationalAddressSubschema(extra = {}) {
  return new mongoose.Schema({ ...nationalAddressSchemaDef, ...extra }, { _id: false });
}

const nationalAddressSubschema = buildNationalAddressSubschema();

/**
 * Returns true when the embedded address object should be treated as
 * "user-provided" — i.e. at least one of the meaningful fields is set.
 * An empty object (just defaults) is NOT considered provided.
 */
function isAddressProvided(addr) {
  if (!addr || typeof addr !== 'object') return false;
  const meaningful = [
    addr.shortCode,
    addr.buildingNumber,
    addr.postalCode,
    addr.street,
    addr.district,
    addr.city,
    addr.fullAddress,
  ];
  return meaningful.some(v => v != null && String(v).trim() !== '');
}

/**
 * Pre-save guard. When an address is present on `path`, this enforces
 * the strict-verification policy:
 *   1. shortCode is mandatory (cannot describe an address without one)
 *   2. shortCode must match the SPL format regex
 *   3. verification.verified must be true (caller must run the Wasel
 *      verification first via nationalAddressService.verifyAndStamp)
 *
 * Options:
 *   path     — dot-path to the embedded address (default 'nationalAddress')
 *   required — when true, the address itself is mandatory on every save
 *              (defaults to false; you can require it per-entity)
 *   strict   — when false, accepts unverified addresses with a status
 *              warning instead of throwing (default true)
 */
function attachNationalAddressGuard(schema, options = {}) {
  const { path = 'nationalAddress', required = false, strict = true } = options;

  function fail(doc, fieldPath, message, type, value) {
    const ValidationError =
      (mongoose.Error && mongoose.Error.ValidationError) || mongoose.ValidationError;
    const ValidatorError =
      (mongoose.Error && mongoose.Error.ValidatorError) || mongoose.ValidatorError;

    if (ValidationError && ValidatorError) {
      const ve = new ValidationError(doc);
      const inner = new ValidatorError({ message, path: fieldPath, type, value });
      ve.errors[fieldPath] = inner;
      return ve;
    }
    // Fallback (only matters under heavy mongoose mocks in test harness):
    const e = new Error(message);
    e.code = type === 'unverified' ? 'NATIONAL_ADDRESS_UNVERIFIED' : 'NATIONAL_ADDRESS_INVALID';
    e.path = fieldPath;
    return e;
  }

  // Mongoose 9 modern signature: no `next`, throws to fail validation.
  // The legacy-hook-shim in config/mongoose.plugins.js wraps single-arg
  // hooks, so a 0-arg modern hook is the safe lowest-common-denominator.
  schema.pre('validate', function preNationalAddressValidate() {
    const addr = this.get ? this.get(path) : this[path];
    const provided = isAddressProvided(addr);

    if (!provided) {
      if (required) {
        throw fail(this, path, 'العنوان الوطني السعودي مطلوب', 'required', addr);
      }
      return;
    }

    if (!addr.shortCode) {
      throw fail(
        this,
        `${path}.shortCode`,
        'الرمز البريدي (shortCode) مطلوب عند إدخال العنوان الوطني',
        'required',
        addr.shortCode
      );
    }
    if (!SHORT_CODE_REGEX.test(String(addr.shortCode).toUpperCase())) {
      throw fail(
        this,
        `${path}.shortCode`,
        'تنسيق الرمز البريدي غير صالح (يجب أن يكون 4 حروف + 4 أرقام)',
        'format',
        addr.shortCode
      );
    }

    if (strict && !(addr.verification && addr.verification.verified === true)) {
      throw fail(
        this,
        `${path}.verification.verified`,
        'يجب التحقق من العنوان الوطني عبر وَصِل قبل الحفظ (verification.verified=false)',
        'unverified',
        false
      );
    }
  });
}

module.exports = {
  SHORT_CODE_REGEX,
  VERIFICATION_STATUS,
  nationalAddressSchemaDef,
  buildNationalAddressSubschema,
  nationalAddressSubschema,
  isAddressProvided,
  attachNationalAddressGuard,
};
