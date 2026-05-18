'use strict';

/**
 * hikvision-face-enrollment.service.js — Wave 97 Phase 2.
 *
 * Owns the lifecycle of `HikvisionFaceTemplateLink` rows.
 *
 *   enrollEmployee()      → creates `pending` template (no device push yet)
 *   confirmEnrollment()   → marks `active` after device acks
 *   suspendTemplate()     → kept in DB, excluded from matching
 *   reEnroll()            → creates new pending, supersedes the previous
 *   deactivateOnExit()    → cascades all employee templates to deleted
 *   listTemplates() / getTemplate() — read APIs
 *
 * Capacity gating: enrolment recounts NON-deleted templates as the
 * authoritative source — we do NOT trust the library's denormalised
 * `usedSlots`. After every successful state change the service
 * recomputes `usedSlots` and updates the library row (best-effort).
 *
 * 2-person rule: operator-bound. The route layer is responsible for
 * the permission gate; the service additionally requires `actor.userId`
 * on enrolment + reEnroll, and writes it to `enrolledBy`. A missing
 * actor returns VALIDATION_FAILED.
 */

const crypto = require('crypto');
const reg = require('./hikvision.registry');

function createHikvisionFaceEnrollmentService({
  templateModel = null,
  libraryModel = null,
  employeeModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!templateModel) {
    throw new Error('hikvision-face-enrollment.service: templateModel is required');
  }
  if (!libraryModel) {
    throw new Error('hikvision-face-enrollment.service: libraryModel is required');
  }
  // employeeModel is optional — when present, we verify the employee
  // exists + is active. When absent (test/dev), we trust the caller.

  // ─── enrollEmployee ──────────────────────────────────────────

  async function enrollEmployee(input = {}) {
    const { libraryId, employeeId, images, actor, allowMultiPerAngle } = input;

    if (!libraryId) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'enrolledBy required' },
      };
    }

    const imageCheck = reg.validateEnrollmentImages(images, {
      allowMultiPerAngle: !!allowMultiPerAngle,
    });
    if (!imageCheck.ok) return imageCheck;

    const library = await libraryModel.findById(libraryId).lean();
    if (!library) return { ok: false, reason: reg.REASON.LIBRARY_NOT_FOUND };
    if (library.status === reg.LIBRARY_STATUS.ARCHIVED) {
      return { ok: false, reason: reg.REASON.LIBRARY_ARCHIVED };
    }
    if (library.status === reg.LIBRARY_STATUS.PAUSED) {
      return {
        ok: false,
        reason: reg.REASON.INVALID_LIBRARY_STATUS,
        errors: { status: 'paused libraries reject new enrolments' },
      };
    }

    if (employeeModel) {
      const emp = await employeeModel.findById(employeeId).lean();
      if (!emp) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
      // We deliberately don't gate on employee.status here — HR may
      // pre-enrol new hires before activation. The cascade flow
      // handles exits.
    }

    // Capacity gate — authoritative recount, not the denormalised counter.
    const activeCount = await templateModel.countDocuments({
      libraryId,
      status: { $in: [reg.TEMPLATE_STATUS.PENDING, reg.TEMPLATE_STATUS.ACTIVE] },
    });
    if (activeCount >= library.capacity) {
      return { ok: false, reason: reg.REASON.LIBRARY_FULL };
    }

    // Duplicate gate — at most one non-deleted template per (library, employee).
    const existing = await templateModel
      .findOne({
        libraryId,
        employeeId,
        status: {
          $in: [
            reg.TEMPLATE_STATUS.PENDING,
            reg.TEMPLATE_STATUS.ACTIVE,
            reg.TEMPLATE_STATUS.SUSPENDED,
          ],
        },
      })
      .lean();
    if (existing) return { ok: false, reason: reg.REASON.TEMPLATE_DUPLICATE };

    const doc = new templateModel({
      libraryId,
      employeeId,
      hikvisionPersonId: null,
      enrollmentImages: images.map(img => ({
        angle: img.angle,
        quality: Number(img.quality),
        ref: String(img.ref),
        capturedAt: img.capturedAt ? new Date(img.capturedAt) : now(),
        capturedBy: img.capturedBy || actor.userId,
      })),
      templateChecksum: null,
      status: reg.TEMPLATE_STATUS.PENDING,
      enrolledAt: now(),
      enrolledBy: actor.userId,
    });

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      if (err && err.code === 11000) {
        return { ok: false, reason: reg.REASON.TEMPLATE_DUPLICATE };
      }
      logger.error('[Hikvision Enrol] enrollEmployee save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    await _recountAndUpdateUsedSlots(libraryId);
    return { ok: true, template: doc.toObject ? doc.toObject() : doc };
  }

  // ─── confirmEnrollment ──────────────────────────────────────

  async function confirmEnrollment(input = {}) {
    const { templateId, hikvisionPersonId, templateChecksum } = input;

    if (!templateId) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    if (!hikvisionPersonId) return { ok: false, reason: reg.REASON.PERSON_ID_REQUIRED };
    if (!templateChecksum) return { ok: false, reason: reg.REASON.CHECKSUM_REQUIRED };

    const doc = await templateModel.findById(templateId);
    if (!doc) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    if (doc.status !== reg.TEMPLATE_STATUS.PENDING) {
      return {
        ok: false,
        reason: reg.REASON.TEMPLATE_NOT_PENDING,
        errors: { status: doc.status },
      };
    }

    doc.hikvisionPersonId = String(hikvisionPersonId).slice(0, 128);
    doc.templateChecksum = String(templateChecksum).slice(0, 128);
    doc.status = reg.TEMPLATE_STATUS.ACTIVE;
    doc.confirmedAt = now();
    doc.lastSyncedAt = now();

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision Enrol] confirmEnrollment save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, template: doc.toObject ? doc.toObject() : doc };
  }

  // ─── suspendTemplate ────────────────────────────────────────

  async function suspendTemplate(input = {}) {
    const { templateId, reason, actor, cascadeReason } = input;

    if (!templateId) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    if (!reason || !String(reason).trim()) {
      return { ok: false, reason: reg.REASON.SUSPENSION_REASON_REQUIRED };
    }

    const doc = await templateModel.findById(templateId);
    if (!doc) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };

    if (doc.status === reg.TEMPLATE_STATUS.SUSPENDED) {
      // Idempotent — re-suspend with new reason is a no-op success.
      return { ok: true, template: doc.toObject ? doc.toObject() : doc, idempotent: true };
    }
    if (doc.status === reg.TEMPLATE_STATUS.DELETED) {
      return { ok: false, reason: reg.REASON.TEMPLATE_NOT_ACTIVE };
    }

    doc.status = reg.TEMPLATE_STATUS.SUSPENDED;
    doc.deactivatedAt = now();
    doc.deactivationReason = String(reason).trim().slice(0, 500);
    doc.cascadeReason = reg.CASCADE_REASONS.includes(cascadeReason)
      ? cascadeReason
      : reg.CASCADE_REASON.OPERATOR_OVERRIDE;
    doc.deactivatedBy = actor?.userId || null;

    try {
      await doc.validate();
    } catch (err) {
      return _validationFail(err);
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[Hikvision Enrol] suspendTemplate save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }

    await _recountAndUpdateUsedSlots(doc.libraryId);
    return { ok: true, template: doc.toObject ? doc.toObject() : doc };
  }

  // ─── reEnroll (refresh template for same employee) ──────────

  async function reEnroll(input = {}) {
    const { templateId, images, actor, allowMultiPerAngle } = input;

    if (!templateId) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    if (!actor || !actor.userId) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { actor: 'enrolledBy required' },
      };
    }
    const imageCheck = reg.validateEnrollmentImages(images, {
      allowMultiPerAngle: !!allowMultiPerAngle,
    });
    if (!imageCheck.ok) return imageCheck;

    const old = await templateModel.findById(templateId);
    if (!old) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    if (old.status !== reg.TEMPLATE_STATUS.ACTIVE && old.status !== reg.TEMPLATE_STATUS.SUSPENDED) {
      return { ok: false, reason: reg.REASON.TEMPLATE_NOT_ACTIVE };
    }

    // First — supersede the old one. We set it to SUSPENDED with a
    // cascadeReason=operator-override so audit can distinguish a
    // re-enrol-suspended from a permanent suspension.
    old.status = reg.TEMPLATE_STATUS.SUSPENDED;
    old.deactivatedAt = now();
    old.deactivationReason = old.deactivationReason || 'superseded by re-enrolment';
    old.cascadeReason = reg.CASCADE_REASON.OPERATOR_OVERRIDE;
    old.deactivatedBy = actor.userId;

    // Create the new pending template AFTER deactivating the old —
    // the partial unique index allows pending + suspended to coexist
    // because suspended is in the index. So we must first transition
    // old to a state that lets the new pending land — but suspended
    // is IN the partial index too! So we must transition old to
    // DELETED in this single op, or update old AFTER inserting new.
    // We chose: insert new with a status=PENDING, but to avoid the
    // unique-index conflict (since old is still in the partialFilter
    // set), we first save old's transition to ensure its index entry
    // updates, then insert new. The partial filter keeps suspended
    // IN — so the conflict remains. Path: leave `old` ACTIVE here,
    // insert new, then suspend old. Race window is small; the docs
    // show old=active+new=pending briefly. Acceptable for HR-scale ops.
    // -- Revert: don't mutate old yet.
    Object.assign(old, {
      status: reg.TEMPLATE_STATUS.ACTIVE,
      deactivatedAt: null,
      deactivationReason: null,
      cascadeReason: null,
      deactivatedBy: null,
    });

    // Strategy: insert new first as DELETED-staged, then mutate old to
    // suspended, then promote new to PENDING. Easier: just promote
    // old to DELETED (tombstone, exits the partial index), insert
    // new pending. We lose the "suspended" semantic on old. Better:
    // create new with libraryId+employeeId but transitional status.
    //
    // Cleanest implementation: move old → DELETED (tombstone), then
    // insert new pending. The forward link `supersededByTemplateId`
    // on the OLD row points to NEW. Cascade audit walks the chain.

    const newDoc = new templateModel({
      libraryId: old.libraryId,
      employeeId: old.employeeId,
      hikvisionPersonId: null,
      enrollmentImages: images.map(img => ({
        angle: img.angle,
        quality: Number(img.quality),
        ref: String(img.ref),
        capturedAt: img.capturedAt ? new Date(img.capturedAt) : now(),
        capturedBy: img.capturedBy || actor.userId,
      })),
      templateChecksum: null,
      status: reg.TEMPLATE_STATUS.PENDING,
      enrolledAt: now(),
      enrolledBy: actor.userId,
    });

    // Tombstone the old row so the unique partial index frees up.
    old.status = reg.TEMPLATE_STATUS.DELETED;
    old.deactivatedAt = now();
    old.deactivationReason = 'superseded by re-enrolment';
    old.cascadeReason = reg.CASCADE_REASON.OPERATOR_OVERRIDE;
    old.deactivatedBy = actor.userId;

    try {
      await old.validate();
      await old.save();
    } catch (err) {
      logger.error('[Hikvision Enrol] reEnroll old save failed:', err.message);
      return _validationFail(err);
    }
    try {
      await newDoc.validate();
      await newDoc.save();
    } catch (err) {
      // Roll back old to suspended so we don't lose evidence.
      try {
        old.status = reg.TEMPLATE_STATUS.SUSPENDED;
        old.deactivationReason = 'reEnroll attempt failed — rolled back';
        await old.save();
      } catch {
        /* best-effort */
      }
      if (err && err.code === 11000) {
        return { ok: false, reason: reg.REASON.TEMPLATE_DUPLICATE };
      }
      return _validationFail(err);
    }

    // Forward link old → new for audit walking
    try {
      old.supersededByTemplateId = newDoc._id;
      await old.save();
    } catch (err) {
      logger.warn('[Hikvision Enrol] reEnroll forward-link save failed (non-fatal):', err.message);
    }

    await _recountAndUpdateUsedSlots(old.libraryId);
    return {
      ok: true,
      template: newDoc.toObject ? newDoc.toObject() : newDoc,
      supersededTemplateId: old._id,
    };
  }

  // ─── deactivateOnExit (employee left) ───────────────────────

  async function deactivateOnExit(input = {}) {
    const { employeeId, exitDate, exitReason, actor } = input;
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    const exitDt = exitDate ? new Date(exitDate) : now();
    const reasonText = exitReason
      ? `employee exit: ${String(exitReason).slice(0, 400)}`
      : 'employee exit';

    // Walk as instances (not lean) — we mutate + save each row in the loop.
    const templates = await templateModel.find({
      employeeId,
      status: {
        $in: [
          reg.TEMPLATE_STATUS.PENDING,
          reg.TEMPLATE_STATUS.ACTIVE,
          reg.TEMPLATE_STATUS.SUSPENDED,
        ],
      },
    });

    const affectedLibraries = new Set();
    let deactivated = 0;
    for (const t of templates) {
      t.status = reg.TEMPLATE_STATUS.DELETED;
      t.deactivatedAt = now();
      t.deactivationReason = reasonText;
      t.cascadeReason = reg.CASCADE_REASON.EMPLOYEE_EXIT;
      t.deactivatedBy = actor?.userId || null;
      t.exitTriggeredAt = exitDt;
      try {
        await t.validate();
        await t.save();
        deactivated += 1;
        affectedLibraries.add(String(t.libraryId));
      } catch (err) {
        logger.warn(
          `[Hikvision Enrol] deactivateOnExit failed for template ${t._id}:`,
          err.message
        );
      }
    }

    for (const libId of affectedLibraries) {
      await _recountAndUpdateUsedSlots(libId);
    }
    return { ok: true, deactivated, affectedLibraries: Array.from(affectedLibraries) };
  }

  // ─── Read APIs ──────────────────────────────────────────────

  async function getTemplate(id) {
    if (!id) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    const t = await templateModel.findById(id).lean();
    if (!t) return { ok: false, reason: reg.REASON.TEMPLATE_NOT_FOUND };
    return { ok: true, template: t };
  }

  async function listTemplates(filter = {}) {
    const q = {};
    if (filter.libraryId) q.libraryId = filter.libraryId;
    if (filter.employeeId) q.employeeId = filter.employeeId;
    if (filter.status) q.status = filter.status;
    if (filter.hikvisionPersonId) q.hikvisionPersonId = filter.hikvisionPersonId;
    if (filter.excludeDeleted) {
      q.status = q.status || { $ne: reg.TEMPLATE_STATUS.DELETED };
    }
    const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 500);
    const skip = Math.max(Number(filter.skip) || 0, 0);
    let cursor = templateModel.find(q).sort({ enrolledAt: -1 }).skip(skip).limit(limit);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    const items = await cursor;
    const total =
      typeof templateModel.countDocuments === 'function'
        ? await templateModel.countDocuments(q)
        : items.length;
    return { ok: true, items, total };
  }

  // ─── Pure helper for callers (deterministic checksum of images) ─
  //
  // Useful for the sync worker (Phase 2 extended) to compute the same
  // value Hikvision SDK reports, OR for duplicate detection without
  // pulling the device's checksum.
  function computeImagesChecksum(images) {
    const sorted = [...(images || [])].sort((a, b) => (a.angle < b.angle ? -1 : 1));
    const hash = crypto.createHash('sha256');
    for (const img of sorted) {
      hash.update(`${img.angle}|${img.ref}|${img.quality}`);
      hash.update('\n');
    }
    return hash.digest('hex');
  }

  // ─── Internal: recount + sync library.usedSlots ─────────────

  async function _recountAndUpdateUsedSlots(libraryId) {
    if (!libraryId) return;
    try {
      const count = await templateModel.countDocuments({
        libraryId,
        status: { $in: [reg.TEMPLATE_STATUS.PENDING, reg.TEMPLATE_STATUS.ACTIVE] },
      });
      if (typeof libraryModel.updateOne === 'function') {
        await libraryModel.updateOne({ _id: libraryId }, { $set: { usedSlots: count } });
      }
    } catch (err) {
      logger.warn('[Hikvision Enrol] usedSlots recount failed (non-fatal):', err.message);
    }
  }

  function _validationFail(err) {
    const errors = {};
    if (err && err.errors) {
      for (const k of Object.keys(err.errors)) errors[k] = err.errors[k].message || 'invalid';
    }
    return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
  }

  return {
    enrollEmployee,
    confirmEnrollment,
    suspendTemplate,
    reEnroll,
    deactivateOnExit,
    getTemplate,
    listTemplates,
    computeImagesChecksum,
  };
}

module.exports = { createHikvisionFaceEnrollmentService };
