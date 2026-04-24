/**
 * hrCredentialStatusSync.js — Phase 11 Commit 2.
 *
 * Keeps the `status` field on HR credential records aligned with
 * reality. Three inputs, three reconciled outputs:
 *
 *   Certification.expiry_date   → Certification.status
 *   EmploymentContract.end_date → EmploymentContract.status
 *   Employee.scfhs_expiry       → (no write; read-only verification)
 *
 * Why this exists: C1 shipped two BLOCKING red-flags that read
 * `expiry_date < now` / `end_date < now` directly. The engine's
 * verdict is now authoritative — but the UI, the HR list views, and
 * the per-employee profile page all render off the stored `status`
 * field, which no process was updating. Result: an engine flag would
 * fire while the UI still showed "valid". This sync closes the loop.
 *
 * Design decisions:
 *
 *   1. Pure function, not a class, and not a service singleton.
 *      Models are injected at call time; the runner (CLI or scheduled
 *      job) wires them. Tests pass fake models with the same shape.
 *
 *   2. `bulkWrite` with `ordered: false` — one round-trip per
 *      collection, failures on individual docs don't block the rest.
 *      For a 1,000-employee branch this is sub-second; for a
 *      10,000-employee org it's still under a few seconds.
 *
 *   3. The sync is IDEMPOTENT — safe to run multiple times, safe to
 *      run on a schedule, safe to run manually via CLI. A record
 *      already in the right state is not rewritten (bulkWrite filters
 *      on `status: { $ne: nextStatus }` so we don't touch `updatedAt`
 *      unnecessarily, which would invalidate other schedulers that
 *      key off it).
 *
 *   4. "Expiring soon" for Certification uses a 60-day window. This
 *      matches the existing `operational.therapist.license.expiring_60d`
 *      flag so UI and engine agree.
 *
 *   5. EmploymentContract.status values: ['active','expired',
 *      'terminated','draft']. We only flip `active → expired` when
 *      `end_date < now`. We never touch `terminated` or `draft` —
 *      those are manually-set terminal states that the sync must
 *      preserve.
 *
 *   6. Read-only verification on Employee.scfhs_expiry: the Employee
 *      model has no `license_status` computed field, and adding one
 *      would broaden the model's surface area. Instead, we emit a
 *      count of "employees with SCFHS expired" in the report so
 *      operators have one place to see the magnitude.
 *
 *   7. Soft-deleted records (`deleted_at != null`) are skipped.
 *      Terminal state on the employee side already; the credential
 *      lifecycle no longer applies.
 */

'use strict';

const MS_PER_DAY = 24 * 3600 * 1000;

/**
 * Compute the target status for a certification given its expiry date.
 * Returns one of: 'valid' | 'expiring_soon' | 'expired' | null.
 * `null` means no expiry recorded — we leave the status untouched
 * (could be 'pending_renewal' which we don't auto-manage).
 */
function computeCertificationStatus({ expiryDate, now, expiringSoonDays = 60 }) {
  if (!expiryDate) return null;
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (expiry < now) return 'expired';
  const soonThreshold = new Date(now.getTime() + expiringSoonDays * MS_PER_DAY);
  if (expiry <= soonThreshold) return 'expiring_soon';
  return 'valid';
}

async function syncCertificationStatuses({
  Certification,
  now = new Date(),
  expiringSoonDays = 60,
} = {}) {
  if (!Certification) throw new Error('syncCertificationStatuses: Certification model is required');

  const docs = await Certification.find(
    { deleted_at: null, expiry_date: { $ne: null } },
    '_id expiry_date status'
  ).lean();

  const updates = [];
  const tally = { expired: 0, expiring_soon: 0, valid: 0, skipped: 0 };

  for (const doc of docs) {
    const nextStatus = computeCertificationStatus({
      expiryDate: doc.expiry_date,
      now,
      expiringSoonDays,
    });
    if (nextStatus == null) {
      tally.skipped++;
      continue;
    }
    tally[nextStatus]++;
    if (doc.status !== nextStatus) {
      updates.push({
        updateOne: {
          filter: { _id: doc._id, status: { $ne: nextStatus } },
          update: { $set: { status: nextStatus } },
        },
      });
    }
  }

  let modified = 0;
  if (updates.length > 0) {
    const res = await Certification.bulkWrite(updates, { ordered: false });
    modified = res.modifiedCount || 0;
  }

  return {
    scanned: docs.length,
    modified,
    tally,
  };
}

/**
 * Flip `active → expired` on employment contracts whose end_date has
 * passed. Never touches `terminated` or `draft` — those are manual
 * terminal states.
 */
async function syncEmploymentContractStatuses({ EmploymentContract, now = new Date() } = {}) {
  if (!EmploymentContract)
    throw new Error('syncEmploymentContractStatuses: EmploymentContract model is required');

  const res = await EmploymentContract.updateMany(
    {
      deleted_at: null,
      status: 'active',
      end_date: { $lt: now, $ne: null },
    },
    { $set: { status: 'expired' } }
  );

  return {
    modified: res.modifiedCount || 0,
  };
}

/**
 * Read-only scan of Employee.scfhs_expiry — returns counts so the
 * operator can see the scope without the sync writing anywhere.
 */
async function summarizeSaudiLicenseExposure({ Employee, now = new Date() } = {}) {
  if (!Employee) throw new Error('summarizeSaudiLicenseExposure: Employee model is required');

  const expired = await Employee.countDocuments({ scfhs_expiry: { $lt: now, $ne: null } });
  const withinSixtyDays = await Employee.countDocuments({
    scfhs_expiry: {
      $ne: null,
      $gte: now,
      $lte: new Date(now.getTime() + 60 * MS_PER_DAY),
    },
  });

  return { expired, expiring_within_60d: withinSixtyDays };
}

/**
 * Full sync across all three credential sources. Invoked from the
 * CLI script and (optionally) a scheduled job. Returns a single
 * consolidated report.
 */
async function runFullHrCredentialSync({
  Certification,
  EmploymentContract,
  Employee,
  now = new Date(),
  expiringSoonDays = 60,
  logger = { info: () => {}, warn: () => {} },
} = {}) {
  const started = Date.now();

  const certifications = await syncCertificationStatuses({
    Certification,
    now,
    expiringSoonDays,
  });
  logger.info(
    `[HR-Sync] certifications scanned=${certifications.scanned} modified=${certifications.modified}`
  );

  const contracts = await syncEmploymentContractStatuses({
    EmploymentContract,
    now,
  });
  logger.info(`[HR-Sync] employment_contracts modified=${contracts.modified}`);

  let scfhs = null;
  if (Employee) {
    scfhs = await summarizeSaudiLicenseExposure({ Employee, now });
    logger.info(
      `[HR-Sync] scfhs_expiry expired=${scfhs.expired} expiring_within_60d=${scfhs.expiring_within_60d}`
    );
  }

  return {
    startedAt: new Date(started).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    certifications,
    employmentContracts: contracts,
    saudiLicenseExposure: scfhs,
  };
}

module.exports = {
  computeCertificationStatus,
  syncCertificationStatuses,
  syncEmploymentContractStatuses,
  summarizeSaudiLicenseExposure,
  runFullHrCredentialSync,
};
