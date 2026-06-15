'use strict';
/**
 * W1340 — Sponsorship → FHIR R4 Coverage mapper.
 *
 * Projects a canonical Sponsorship (kafala: a Donor funding a Beneficiary's
 * costs with a monthly commitment + payment ledger) onto a base FHIR R4
 * Coverage — the resource that represents financial coverage of a patient by
 * a paying party. The beneficiary becomes `Coverage.beneficiary` (Patient) and
 * the donor becomes `Coverage.payor` (RelatedPerson). The monthly commitment,
 * coverage items, zakat flag and the payment ledger are carried as namespaced
 * extensions. The original lifecycle status is always preserved in an extension
 * while `status` is projected onto the Coverage value-set.
 *
 * PURE: no DB, no IO, no mongoose. Deterministic. Never mutates input.
 * Additive + non-breaking: standalone module.
 */

const ORG_FHIR_BASE = 'https://alawael.sa/fhir';

const SP_TYPE_SYSTEM = `${ORG_FHIR_BASE}/CodeSystem/sponsorship-type`;

const SD = `${ORG_FHIR_BASE}/StructureDefinition`;
const SP_STATUS_EXTENSION_URL = `${SD}/sponsorship-status`;
const SP_MONTHLY_AMOUNT_EXTENSION_URL = `${SD}/sponsorship-monthly-amount`;
const SP_COVERAGE_ITEMS_EXTENSION_URL = `${SD}/sponsorship-coverage-items`;
const SP_IS_ZAKAT_EXTENSION_URL = `${SD}/sponsorship-is-zakat`;
const SP_PAUSE_REASON_EXTENSION_URL = `${SD}/sponsorship-pause-reason`;
const SP_CANCEL_REASON_EXTENSION_URL = `${SD}/sponsorship-cancel-reason`;
const SP_PAYMENT_EXTENSION_URL = `${SD}/sponsorship-payment`;
const SP_BRANCH_EXTENSION_URL = `${SD}/sponsorship-branch`;

const DEFAULT_CURRENCY = 'SAR';

// SponsorshipStatus → FHIR Coverage.status (active|cancelled|draft|entered-in-error)
const STATUS_MAP = Object.freeze({
  pending: 'draft',
  active: 'active',
  paused: 'active',
  completed: 'cancelled',
  cancelled: 'cancelled',
});

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/** Map an ISO-ish input to a full FHIR dateTime; undefined for bad/absent input. */
function toFhirDateTime(value) {
  if (!isPresent(value)) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Project lifecycle status onto Coverage.status (default draft). */
function toFhirStatus(status) {
  if (!isPresent(status)) return 'draft';
  return STATUS_MAP[status] || 'draft';
}

/** Coverage.type from sponsorshipType. */
function buildType(record) {
  return {
    coding: [{ system: SP_TYPE_SYSTEM, code: record.sponsorshipType }],
    text: record.sponsorshipType,
  };
}

/** Coverage.period from start/end dates. */
function buildPeriod(record) {
  const period = {};
  const start = toFhirDateTime(record.startDate);
  const end = toFhirDateTime(record.endDate);
  if (start) period.start = start;
  if (end) period.end = end;
  return Object.keys(period).length ? period : undefined;
}

function buildPaymentExtension(payment) {
  const children = [];
  const date = toFhirDateTime(payment.date);
  if (date) children.push({ url: 'date', valueDateTime: date });
  if (typeof payment.amount === 'number') {
    children.push({ url: 'amount', valueDecimal: payment.amount });
  }
  if (isPresent(payment.method)) children.push({ url: 'method', valueString: payment.method });
  if (isPresent(payment.donationId)) {
    children.push({ url: 'donation', valueString: String(payment.donationId) });
  }
  if (isPresent(payment.reference)) {
    children.push({ url: 'reference', valueString: payment.reference });
  }
  if (children.length === 0) return null;
  return { url: SP_PAYMENT_EXTENSION_URL, extension: children };
}

function buildExtensions(record) {
  const ext = [];

  // Always carry the original lifecycle status.
  ext.push({ url: SP_STATUS_EXTENSION_URL, valueCode: record.status });

  if (typeof record.monthlyAmount === 'number') {
    ext.push({
      url: SP_MONTHLY_AMOUNT_EXTENSION_URL,
      valueMoney: {
        value: record.monthlyAmount,
        currency: isPresent(record.currency) ? record.currency : DEFAULT_CURRENCY,
      },
    });
  }

  if (Array.isArray(record.coverageItems) && record.coverageItems.length) {
    ext.push({
      url: SP_COVERAGE_ITEMS_EXTENSION_URL,
      extension: record.coverageItems
        .filter(isPresent)
        .map(item => ({ url: 'item', valueString: item })),
    });
  }

  if (typeof record.isZakat === 'boolean') {
    ext.push({ url: SP_IS_ZAKAT_EXTENSION_URL, valueBoolean: record.isZakat });
  }
  if (isPresent(record.pauseReason)) {
    ext.push({ url: SP_PAUSE_REASON_EXTENSION_URL, valueString: record.pauseReason });
  }
  if (isPresent(record.cancelReason)) {
    ext.push({ url: SP_CANCEL_REASON_EXTENSION_URL, valueString: record.cancelReason });
  }

  if (Array.isArray(record.payments)) {
    for (const payment of record.payments) {
      const paymentExt = buildPaymentExtension(payment);
      if (paymentExt) ext.push(paymentExt);
    }
  }

  if (isPresent(record.branchId)) {
    ext.push({
      url: SP_BRANCH_EXTENSION_URL,
      valueReference: { reference: `Organization/${record.branchId}` },
    });
  }

  return ext;
}

/**
 * Map a canonical Sponsorship to a base FHIR R4 Coverage.
 * @param {object} record canonical Sponsorship
 * @param {object} [opts]
 * @param {boolean} [opts.includeId=true] set `id` from `_id`
 * @returns {object} plain FHIR Coverage resource
 */
function sponsorshipToFhir(record, opts = {}) {
  if (!record || typeof record !== 'object') {
    throw new TypeError('sponsorshipToFhir: record object is required');
  }
  if (!isPresent(record.beneficiaryId)) {
    throw new TypeError('sponsorshipToFhir: record.beneficiaryId is required');
  }
  if (!isPresent(record.donorId)) {
    throw new TypeError('sponsorshipToFhir: record.donorId is required');
  }

  const { includeId = true } = opts;

  const resource = {
    resourceType: 'Coverage',
    status: toFhirStatus(record.status),
    type: buildType(record),
    beneficiary: { reference: `Patient/${record.beneficiaryId}` },
    payor: [{ reference: `RelatedPerson/${record.donorId}` }],
  };

  if (includeId && isPresent(record._id)) {
    resource.id = String(record._id);
  }

  const period = buildPeriod(record);
  if (period) resource.period = period;

  resource.extension = buildExtensions(record);

  return resource;
}

module.exports = {
  sponsorshipToFhir,
  toFhirDateTime,
  toFhirStatus,
  buildType,
  buildPeriod,
  buildPaymentExtension,
  buildExtensions,
  isPresent,
  STATUS_MAP,
  DEFAULT_CURRENCY,
  ORG_FHIR_BASE,
  SP_TYPE_SYSTEM,
  SP_STATUS_EXTENSION_URL,
  SP_MONTHLY_AMOUNT_EXTENSION_URL,
  SP_COVERAGE_ITEMS_EXTENSION_URL,
  SP_IS_ZAKAT_EXTENSION_URL,
  SP_PAUSE_REASON_EXTENSION_URL,
  SP_CANCEL_REASON_EXTENSION_URL,
  SP_PAYMENT_EXTENSION_URL,
  SP_BRANCH_EXTENSION_URL,
};
