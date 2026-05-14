'use strict';

/**
 * Backfill universal codes for entities that existed BEFORE the plugin
 * was installed. Idempotent — re-runs are safe (existing codes are
 * never overwritten).
 *
 * Strategy:
 *   - For each entity type that opted into the plugin, iterate the
 *     collection in batches of 1000 and call `svc.generate()` once per
 *     doc. The generate() function is idempotent so already-issued
 *     codes are a no-op.
 *
 * Usage:
 *   const { runBackfill } = require('./services/universalCode/backfill');
 *   const summary = await runBackfill({ entityTypes: ['BNF', 'EMP'], dryRun: true });
 *
 * CLI: node scripts/backfill-universal-codes.js [--dry-run] [--types=BNF,EMP]
 */

const svc = require('./');
const UniversalCode = require('../../models/UniversalCode');

// Map entityType → { modelName, labelFrom }
// modelName is the mongoose registration NAME (after the dedup work, several
// of these are scoped — we use the EXPORT KEY-mapped registrations).
const TYPE_TO_MODEL = {
  BNF: {
    modelName: 'Beneficiary',
    labelFrom: d =>
      [d.firstName, d.middleName, d.lastName].filter(Boolean).join(' ') || d.fullName || d.nameAr,
  },
  EMP: {
    modelName: 'Employee', // canonical models/HR/Employee.js
    labelFrom: d => d.full_name_ar || d.full_name_en || d.employee_id,
  },
  INV: {
    modelName: 'Invoice', // canonical models/Invoice.js
    labelFrom: d => d.invoiceNumber || d.number,
  },
  AST: {
    modelName: 'FixedAsset',
    labelFrom: d => d.assetName || d.nameAr || d.serialNumber || d.assetTag,
  },
  DOC: {
    modelName: 'Document',
    labelFrom: d => d.title || d.filename || d.documentNumber,
  },
  SES: {
    modelName: 'TherapySession',
    labelFrom: d => d.sessionCode || (d.date ? new Date(d.date).toISOString().slice(0, 10) : null),
  },
  APT: {
    modelName: 'Appointment',
    labelFrom: d =>
      d.appointmentNumber || (d.date ? new Date(d.date).toISOString().slice(0, 10) : null),
  },
  VEH: {
    modelName: 'Vehicle',
    labelFrom: d => d.plateNumber || d.vin || d.assetCode,
  },
  ITM: {
    modelName: 'InventoryItem',
    labelFrom: d => d.name || d.nameAr || d.sku,
  },
};

const BATCH_SIZE = 500;

async function backfillType(entityType, opts = {}) {
  const mongoose = require('mongoose');
  const cfg = TYPE_TO_MODEL[entityType];
  if (!cfg) throw new Error('backfill: unknown entityType ' + entityType);
  const Model = mongoose.models[cfg.modelName];
  if (!Model) {
    return {
      entityType,
      modelName: cfg.modelName,
      scanned: 0,
      issued: 0,
      skipped: 0,
      missingModel: true,
    };
  }
  const total = await Model.estimatedDocumentCount();
  let scanned = 0;
  let issued = 0;
  let skipped = 0;
  const cursor = Model.find({}, { _id: 1, ...projectionForLabel(cfg.labelFrom) })
    .lean()
    .cursor({ batchSize: BATCH_SIZE });

  for await (const doc of cursor) {
    scanned++;
    const existing = await UniversalCode.findOne({ entityType, entityId: doc._id }).lean();
    if (existing) {
      skipped++;
      continue;
    }
    if (opts.dryRun) {
      issued++;
      continue;
    }
    const label = cfg.labelFrom ? cfg.labelFrom(doc) : null;
    await svc.generate(entityType, doc._id, label ? { entityLabel: label } : {});
    issued++;
    if (opts.onProgress && scanned % 200 === 0) opts.onProgress({ entityType, scanned, total });
  }
  return { entityType, modelName: cfg.modelName, scanned, issued, skipped, total };
}

function projectionForLabel(labelFn) {
  // We pull a generous projection so labelFrom() can read whichever
  // fields it wants. Cheap to include — these are all small strings.
  return {
    firstName: 1,
    middleName: 1,
    lastName: 1,
    fullName: 1,
    nameAr: 1,
    full_name_ar: 1,
    full_name_en: 1,
    employee_id: 1,
    invoiceNumber: 1,
    number: 1,
    assetName: 1,
    serialNumber: 1,
    assetTag: 1,
    title: 1,
    filename: 1,
    documentNumber: 1,
    sessionCode: 1,
    date: 1,
    appointmentNumber: 1,
    plateNumber: 1,
    vin: 1,
    assetCode: 1,
    name: 1,
    sku: 1,
  };
}

async function runBackfill(opts = {}) {
  const types =
    opts.entityTypes && opts.entityTypes.length ? opts.entityTypes : Object.keys(TYPE_TO_MODEL);
  const results = [];
  for (const t of types) {
    const r = await backfillType(t, opts);
    results.push(r);
  }
  const totals = results.reduce(
    (a, r) => ({
      scanned: a.scanned + (r.scanned || 0),
      issued: a.issued + (r.issued || 0),
      skipped: a.skipped + (r.skipped || 0),
    }),
    { scanned: 0, issued: 0, skipped: 0 }
  );
  return { totals, byType: results, dryRun: !!opts.dryRun };
}

module.exports = { runBackfill, backfillType, TYPE_TO_MODEL };
