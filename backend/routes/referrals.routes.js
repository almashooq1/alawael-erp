/**
 * referrals.routes.js
 * ══════════════════════════════════════════════════════════════════
 * Referral Portal API — بوابة التحويلات
 *
 * Covers all referralPortalService.js frontend calls.
 * Mounted at: /api/v1/referrals (dualMountAuth at registry)
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { stripUpdateMeta } = require('../utils/sanitize');
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const {
  fetchScopedByBeneficiary,
  assertBeneficiaryInScope,
} = require('../utils/beneficiaryBranchGate');
const Beneficiary = require('../models/Beneficiary');

// ── Models ────────────────────────────────────────────────────────────────────
function Referral() {
  try {
    return mongoose.model('Referral');
  } catch (_e) {
    return mongoose.model(
      'Referral',
      new mongoose.Schema(
        {
          referralNumber: String,
          beneficiaryId: mongoose.Schema.Types.ObjectId,
          episodeId: mongoose.Schema.Types.ObjectId,
          referringFacilityId: mongoose.Schema.Types.ObjectId,
          referredToFacilityId: mongoose.Schema.Types.ObjectId,
          referredBy: mongoose.Schema.Types.ObjectId,
          assignedTo: mongoose.Schema.Types.ObjectId,
          reason: String,
          urgency: { type: String, default: 'routine', enum: ['routine', 'urgent', 'emergency'] },
          priority: { type: Number, default: 0 },
          status: {
            type: String,
            default: 'pending',
            enum: ['pending', 'under_review', 'accepted', 'rejected', 'completed', 'cancelled'],
          },
          reviewNotes: String,
          reviewedAt: Date,
          reviewedBy: mongoose.Schema.Types.ObjectId,
          communications: [
            {
              sender: mongoose.Schema.Types.ObjectId,
              message: String,
              readAt: Date,
              createdAt: { type: Date, default: Date.now },
            },
          ],
          documents: [{ name: String, url: String, uploadedAt: { type: Date, default: Date.now } }],
          assessment: mongoose.Schema.Types.Mixed,
          fhirId: String,
          isDeleted: { type: Boolean, default: false },
        },
        { timestamps: true }
      )
    );
  }
}

function ReferralFacility() {
  try {
    return mongoose.model('ReferralFacility');
  } catch (_e) {
    return mongoose.model(
      'ReferralFacility',
      new mongoose.Schema(
        {
          name: { type: String, required: true },
          type: String,
          address: String,
          phone: String,
          email: String,
          specialties: [String],
          isActive: { type: Boolean, default: true },
          isDeleted: { type: Boolean, default: false },
        },
        { timestamps: true }
      )
    );
  }
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.use(authenticate);
router.use(requireBranchAccess);

const GATE_SELECT = 'beneficiaryId beneficiary branch';

async function beneficiaryIdsInScope(req) {
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return null;
  const rows = await Beneficiary.find(scope).select('_id').lean();
  return rows.map(r => r._id);
}

/** W913 — list/analytics scope for portal + canonical referral shapes. */
async function applyReferralListScope(req, filter) {
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return filter;
  const ids = await beneficiaryIdsInScope(req);
  const or = [];
  if (ids && ids.length) {
    or.push({ beneficiaryId: { $in: ids } }, { beneficiary: { $in: ids } });
  }
  const bid = scope.branchId;
  if (bid) {
    or.push({ branch: bid.$in ? { $in: bid.$in } : bid });
  }
  if (!or.length) return { ...filter, _id: { $in: [] } };
  if (filter.beneficiaryId) {
    const qid = String(filter.beneficiaryId);
    if (!ids || !ids.some(id => String(id) === qid)) {
      return { ...filter, _id: { $in: [] } };
    }
    return filter;
  }
  return { ...filter, $or: or };
}

async function gateReferralRow(req, res, row) {
  if (!row) {
    res.status(404).json({ success: false, message: 'غير موجود' });
    return false;
  }
  const scope = branchFilter(req);
  if (!Object.keys(scope).length) return true;
  if (row.branch) {
    const bid = scope.branchId;
    const ok = bid?.$in
      ? bid.$in.some(b => String(b) === String(row.branch))
      : String(row.branch) === String(bid);
    if (!ok) {
      res.status(404).json({ success: false, message: 'غير موجود' });
      return false;
    }
    return true;
  }
  const benId = row.beneficiaryId || row.beneficiary;
  const denied = await assertBeneficiaryInScope(req, benId, res);
  return !denied;
}

async function fetchScopedReferral(req, res, id, opts = {}) {
  const M = Referral();
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'معرّف غير صالح' });
    return { doc: null, denied: true };
  }
  const gateDoc = await M.findById(id).select(GATE_SELECT).lean();
  if (!(await gateReferralRow(req, res, gateDoc))) return { doc: null, denied: true };
  const benField = gateDoc.beneficiaryId ? 'beneficiaryId' : 'beneficiary';
  if (gateDoc[benField]) {
    return fetchScopedByBeneficiary(M, id, req, res, { beneficiaryField: benField, ...opts });
  }
  const query = M.findById(id);
  if (opts.select) query.select(opts.select);
  const doc = opts.lean ? await query.lean() : await query;
  return { doc, denied: false };
}

async function gateReferralSubdoc(req, res, query) {
  const M = Referral();
  const row = await M.findOne(query).select(GATE_SELECT).lean();
  return gateReferralRow(req, res, row);
}

async function scopedReferralUpdate(req, res, id, update, opts = {}) {
  const M = Referral();
  const { doc, denied } = await fetchScopedReferral(req, res, id, { lean: true });
  if (denied) return null;
  return M.findByIdAndUpdate(doc._id, update, { returnDocument: 'after', ...opts }).lean();
}

/* ══════════════════════ ANALYTICS ══════════════════════════════════════════ */

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const base = await applyReferralListScope(req, { isDeleted: { $ne: true } });
    const [total, byStatus, byUrgency] = await Promise.all([
      M.countDocuments(base),
      M.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      M.aggregate([{ $match: base }, { $group: { _id: '$urgency', count: { $sum: 1 } } }]),
    ]);
    res.json({
      success: true,
      data: {
        total,
        byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
        byUrgency: Object.fromEntries(byUrgency.map(r => [r._id, r.count])),
      },
    });
  })
);

/* ══════════════════════ FACILITIES (org-wide directory) ═══════════════════ */

router.get(
  '/facilities',
  asyncHandler(async (req, res) => {
    const M = ReferralFacility();
    const data = await M.find({ isDeleted: { $ne: true }, isActive: true })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

router.post(
  '/facilities',
  asyncHandler(async (req, res) => {
    const M = ReferralFacility();
    const facility = await M.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data: facility });
  })
);

router.get(
  '/facilities/:id',
  asyncHandler(async (req, res) => {
    const M = ReferralFacility();
    const facility = await M.findById(req.params.id).lean();
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });
    res.json({ success: true, data: facility });
  })
);

router.patch(
  '/facilities/:id',
  asyncHandler(async (req, res) => {
    const M = ReferralFacility();
    const facility = await M.findByIdAndUpdate(
      req.params.id,
      { $set: stripUpdateMeta(req.body) },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: facility });
  })
);

router.delete(
  '/facilities/:id',
  asyncHandler(async (req, res) => {
    const M = ReferralFacility();
    await M.findByIdAndUpdate(req.params.id, { $set: { isActive: false, isDeleted: true } });
    res.json({ success: true });
  })
);

/* ══════════════════════ FHIR ═══════════════════════════════════════════════ */

router.post(
  '/fhir/import',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const body = stripUpdateMeta(req.body || {});
    if (body.beneficiaryId) {
      const denied = await assertBeneficiaryInScope(req, body.beneficiaryId, res);
      if (denied) return;
    }
    const referral = await M.create({
      referringFacilityId: body.facilityId,
      beneficiaryId: body.beneficiaryId,
      fhirId: body.fhirResource?.id,
      reason: body.fhirResource?.reasonCode?.[0]?.text || 'FHIR import',
      status: 'pending',
    });
    res.status(201).json({ success: true, data: referral });
  })
);

router.get(
  '/fhir/logs',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const q = await applyReferralListScope(req, {
      fhirId: { $exists: true, $ne: null },
      isDeleted: { $ne: true },
    });
    const data = await M.find(q).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ══════════════════════ COMMUNICATIONS ═════════════════════════════════════ */

router.patch(
  '/communications/:commId/read',
  asyncHandler(async (req, res) => {
    const M = Referral();
    if (!(await gateReferralSubdoc(req, res, { 'communications._id': req.params.commId }))) return;
    const result = await M.updateOne(
      { 'communications._id': req.params.commId },
      { $set: { 'communications.$.readAt': new Date() } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'غير موجود' });
    }
    res.json({ success: true });
  })
);

/* ══════════════════════ DOCUMENTS ══════════════════════════════════════════ */

router.delete(
  '/documents/:docId',
  asyncHandler(async (req, res) => {
    const M = Referral();
    if (!(await gateReferralSubdoc(req, res, { 'documents._id': req.params.docId }))) return;
    const result = await M.updateOne(
      { 'documents._id': req.params.docId },
      { $pull: { documents: { _id: req.params.docId } } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'غير موجود' });
    }
    res.json({ success: true });
  })
);

/* ══════════════════════ REFERRAL CRUD ══════════════════════════════════════ */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const { status, urgency, beneficiaryId, limit = 20, skip = 0 } = req.query;
    let q = { isDeleted: { $ne: true } };
    if (status) q.status = status;
    if (urgency) q.urgency = urgency;
    if (beneficiaryId) q.beneficiaryId = new mongoose.Types.ObjectId(beneficiaryId);
    q = await applyReferralListScope(req, q);
    const [data, total] = await Promise.all([
      M.find(q).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      M.countDocuments(q),
    ]);
    res.json({ success: true, data, total });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const body = stripUpdateMeta(req.body);
    if (body.beneficiaryId) {
      const denied = await assertBeneficiaryInScope(req, body.beneficiaryId, res);
      if (denied) return;
    }
    const referral = await M.create({
      ...body,
      referralNumber: `REF-${Date.now()}`,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: referral });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { doc, denied } = await fetchScopedReferral(req, res, req.params.id, { lean: true });
    if (denied) return;
    res.json({ success: true, data: doc });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = stripUpdateMeta(req.body);
    delete body.beneficiaryId;
    delete body.branch;
    const referral = await scopedReferralUpdate(req, res, req.params.id, { $set: body });
    if (!referral) return;
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/review',
  asyncHandler(async (req, res) => {
    const { decision, notes } = req.body || {};
    const referral = await scopedReferralUpdate(req, res, req.params.id, {
      $set: {
        status: decision || 'under_review',
        reviewNotes: notes,
        reviewedAt: new Date(),
        reviewedBy: req.user?.id,
      },
    });
    if (!referral) return;
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const referral = await scopedReferralUpdate(req, res, req.params.id, {
      $set: { status: req.body.status },
    });
    if (!referral) return;
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/auto-assign',
  asyncHandler(async (req, res) => {
    const referral = await scopedReferralUpdate(req, res, req.params.id, {
      $set: { status: 'under_review' },
    });
    if (!referral) return;
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/recalculate-priority',
  asyncHandler(async (req, res) => {
    const { doc, denied } = await fetchScopedReferral(req, res, req.params.id, { lean: true });
    if (denied) return;
    const priority = doc?.urgency === 'emergency' ? 100 : doc?.urgency === 'urgent' ? 70 : 30;
    const M = Referral();
    const updated = await M.findByIdAndUpdate(
      doc._id,
      { $set: { priority } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: updated });
  })
);

router.get(
  '/:id/communications',
  asyncHandler(async (req, res) => {
    const { doc, denied } = await fetchScopedReferral(req, res, req.params.id, {
      select: 'communications',
      lean: true,
    });
    if (denied) return;
    res.json({ success: true, data: doc?.communications || [] });
  })
);

router.post(
  '/:id/communications',
  asyncHandler(async (req, res) => {
    const msg = { sender: req.user?.id, message: req.body.message, createdAt: new Date() };
    const referral = await scopedReferralUpdate(req, res, req.params.id, {
      $push: { communications: msg },
    });
    if (!referral) return;
    res.status(201).json({ success: true, data: referral?.communications?.slice(-1)[0] });
  })
);

router.get(
  '/:id/documents',
  asyncHandler(async (req, res) => {
    const { doc, denied } = await fetchScopedReferral(req, res, req.params.id, {
      select: 'documents',
      lean: true,
    });
    if (denied) return;
    res.json({ success: true, data: doc?.documents || [] });
  })
);

router.post(
  '/:id/documents',
  asyncHandler(async (req, res) => {
    const doc = {
      name: req.body.name || 'document',
      url: req.body.url || '',
      uploadedAt: new Date(),
    };
    const referral = await scopedReferralUpdate(req, res, req.params.id, {
      $push: { documents: doc },
    });
    if (!referral) return;
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/:id/assessment',
  asyncHandler(async (req, res) => {
    const { doc, denied } = await fetchScopedReferral(req, res, req.params.id, {
      select: 'assessment',
      lean: true,
    });
    if (denied) return;
    res.json({ success: true, data: doc?.assessment || null });
  })
);

router.post(
  '/:id/assessment',
  asyncHandler(async (req, res) => {
    const referral = await scopedReferralUpdate(req, res, req.params.id, {
      $set: { assessment: req.body },
    });
    if (!referral) return;
    res.json({ success: true, data: referral?.assessment });
  })
);

module.exports = router;
