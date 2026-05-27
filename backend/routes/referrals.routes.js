/**
 * referrals.routes.js
 * ══════════════════════════════════════════════════════════════════
 * Referral Portal API — بوابة التحويلات
 *
 * Covers all referralPortalService.js frontend calls.
 * Mounted at: /api/v1/referrals
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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

/* ══════════════════════ ANALYTICS ══════════════════════════════════════════ */

router.get(
  '/analytics',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const [total, byStatus, byUrgency] = await Promise.all([
      M.countDocuments({ isDeleted: { $ne: true } }),
      M.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      M.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
      ]),
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

/* ══════════════════════ FACILITIES ═════════════════════════════════════════ */

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
    const facility = await M.create(req.body);
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
      { $set: req.body },
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
    const { fhirResource, facilityId } = req.body || {};
    const referral = await M.create({
      referringFacilityId: facilityId,
      fhirId: fhirResource?.id,
      reason: fhirResource?.reasonCode?.[0]?.text || 'FHIR import',
      status: 'pending',
    });
    res.status(201).json({ success: true, data: referral });
  })
);

router.get(
  '/fhir/logs',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const data = await M.find({ fhirId: { $exists: true, $ne: null } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data, total: data.length });
  })
);

/* ══════════════════════ COMMUNICATIONS ═════════════════════════════════════ */

router.patch(
  '/communications/:commId/read',
  asyncHandler(async (req, res) => {
    const M = Referral();
    await M.updateOne(
      { 'communications._id': req.params.commId },
      { $set: { 'communications.$.readAt': new Date() } }
    );
    res.json({ success: true });
  })
);

/* ══════════════════════ DOCUMENTS ══════════════════════════════════════════ */

router.delete(
  '/documents/:docId',
  asyncHandler(async (req, res) => {
    const M = Referral();
    await M.updateOne(
      { 'documents._id': req.params.docId },
      { $pull: { documents: { _id: req.params.docId } } }
    );
    res.json({ success: true });
  })
);

/* ══════════════════════ REFERRAL CRUD ══════════════════════════════════════ */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const { status, urgency, beneficiaryId, limit = 20, skip = 0 } = req.query;
    const q = { isDeleted: { $ne: true } };
    if (status) q.status = status;
    if (urgency) q.urgency = urgency;
    if (beneficiaryId) q.beneficiaryId = new mongoose.Types.ObjectId(beneficiaryId);
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
    const referral = await M.create({
      ...req.body,
      referralNumber: `REF-${Date.now()}`,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: referral });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findById(req.params.id).lean();
    if (!referral) return res.status(404).json({ success: false, message: 'Referral not found' });
    res.json({ success: true, data: referral });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/review',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const { decision, notes } = req.body || {};
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: decision || 'under_review',
          reviewNotes: notes,
          reviewedAt: new Date(),
          reviewedBy: req.user?.id,
        },
      },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { status: req.body.status } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/auto-assign',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'under_review' } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: referral });
  })
);

router.post(
  '/:id/recalculate-priority',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findById(req.params.id).lean();
    const priority =
      referral?.urgency === 'emergency' ? 100 : referral?.urgency === 'urgent' ? 70 : 30;
    const updated = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { priority } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: updated });
  })
);

router.get(
  '/:id/communications',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findById(req.params.id).select('communications').lean();
    res.json({ success: true, data: referral?.communications || [] });
  })
);

router.post(
  '/:id/communications',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const msg = { sender: req.user?.id, message: req.body.message, createdAt: new Date() };
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      { $push: { communications: msg } },
      { returnDocument: 'after' }
    ).lean();
    res.status(201).json({ success: true, data: referral?.communications?.slice(-1)[0] });
  })
);

router.get(
  '/:id/documents',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findById(req.params.id).select('documents').lean();
    res.json({ success: true, data: referral?.documents || [] });
  })
);

router.post(
  '/:id/documents',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const doc = {
      name: req.body.name || 'document',
      url: req.body.url || '',
      uploadedAt: new Date(),
    };
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      { $push: { documents: doc } },
      { returnDocument: 'after' }
    ).lean();
    res.status(201).json({ success: true, data: doc });
  })
);

router.get(
  '/:id/assessment',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findById(req.params.id).select('assessment').lean();
    res.json({ success: true, data: referral?.assessment || null });
  })
);

router.post(
  '/:id/assessment',
  asyncHandler(async (req, res) => {
    const M = Referral();
    const referral = await M.findByIdAndUpdate(
      req.params.id,
      { $set: { assessment: req.body } },
      { returnDocument: 'after' }
    ).lean();
    res.json({ success: true, data: referral?.assessment });
  })
);

module.exports = router;
