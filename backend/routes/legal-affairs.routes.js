/**
 * Legal Affairs Routes — مسارات الشؤون القانونية
 */
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

function safeModel(name) {
  try {
    return require('mongoose').model(name);
  } catch {
    try {
      return require(`../models/${name}`);
const safeError = require('../utils/safeError');
    } catch {
      return null;
    }
  }
}

router.use(authenticate);

/* ── Field whitelists ───────────────────────────────────── */
const CASE_FIELDS = [
  'title',
  'type',
  'priority',
  'description',
  'parties',
  'court',
  'caseNumber',
  'filingDate',
  'nextHearing',
  'assignedTo',
  'financials',
  'documents',
];
const CONSULTATION_FIELDS = [
  'title',
  'description',
  'type',
  'priority',
  'category',
  'dueDate',
  'assignedTo',
  'notes',
  'documents',
];

function pick(src, fields) {
  const out = {};
  for (const f of fields) if (src[f] !== undefined) out[f] = src[f];
  return out;
}

// ── Dashboard ────────────────────────────────────────────────────
router.get('/dashboard', async (_req, res) => {
  try {
    const LC = safeModel('LegalCase');
    const LCons = safeModel('LegalConsultation');

    const [openCases, pendingHearings, totalConsultations, pendingConsultations] =
      await Promise.all([
        LC ? LC.countDocuments({ status: { $in: ['open', 'in_progress', 'pending_hearing'] } }) : 0,
        LC
          ? LC.countDocuments({
              nextHearing: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
            })
          : 0,
        LCons ? LCons.countDocuments() : 0,
        LCons ? LCons.countDocuments({ status: 'pending' }) : 0,
      ]);

    const casesByType = LC
      ? await LC.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
      : [];

    const casesByStatus = LC
      ? await LC.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
      : [];

    const upcomingHearings = LC
      ? await LC.find({ nextHearing: { $gte: new Date() } })
          .sort({ nextHearing: 1 })
          .limit(10)
          .select('caseNumber title nextHearing court status')
          .lean()
      : [];

    const totalClaims = LC
      ? (await LC.aggregate([{ $group: { _id: null, v: { $sum: '$financials.claimAmount' } } }]))[0]
          ?.v || 0
      : 0;

    const totalFees = LC
      ? (
          await LC.aggregate([
            {
              $group: {
                _id: null,
                v: { $sum: { $add: ['$financials.legalFees', '$financials.courtFees'] } },
              },
            },
          ])
        )[0]?.v || 0
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          openCases,
          pendingHearings,
          totalConsultations,
          pendingConsultations,
          totalClaims,
          totalFees,
        },
        casesByType,
        casesByStatus,
        upcomingHearings,
      },
    });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

// ── Cases CRUD ───────────────────────────────────────────────────
router.get('/cases', async (req, res) => {
  try {
    const LC = safeModel('LegalCase');
    if (!LC) return res.json({ success: true, data: [] });
    const { status, type, priority, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    const total = await LC.countDocuments(filter);
    const data = await LC.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

router.get('/cases/:id', async (req, res) => {
  try {
    const LC = safeModel('LegalCase');
    const data = await LC.findById(req.params.id).lean();
    if (!data) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

router.post('/cases', async (req, res) => {
  try {
    const LC = safeModel('LegalCase');
    const data = await LC.create(pick(req.body, CASE_FIELDS));
    res.status(201).json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

router.put('/cases/:id', async (req, res) => {
  try {
    const LC = safeModel('LegalCase');
    const data = await LC.findByIdAndUpdate(req.params.id, pick(req.body, CASE_FIELDS), {
      new: true,
      runValidators: true,
    });
    if (!data) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

router.delete('/cases/:id', async (req, res) => {
  try {
    const LC = safeModel('LegalCase');
    const data = await LC.findByIdAndUpdate(
      req.params.id,
      { status: 'closed', closedAt: new Date() },
      { new: true }
    );
    if (!data) return res.status(404).json({ success: false, message: 'القضية غير موجودة' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

// ── Consultations CRUD ───────────────────────────────────────────
router.get('/consultations', async (req, res) => {
  try {
    const LCons = safeModel('LegalConsultation');
    if (!LCons) return res.json({ success: true, data: [] });
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const total = await LCons.countDocuments(filter);
    const data = await LCons.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

router.post('/consultations', async (req, res) => {
  try {
    const LCons = safeModel('LegalConsultation');
    const num = `LC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const data = await LCons.create({
      ...pick(req.body, CONSULTATION_FIELDS),
      consultationNumber: num,
      requestedBy: req.user._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

router.put('/consultations/:id', async (req, res) => {
  try {
    const LCons = safeModel('LegalConsultation');
    const data = await LCons.findByIdAndUpdate(req.params.id, pick(req.body, CONSULTATION_FIELDS), {
      new: true,
    });
    if (!data) return res.status(404).json({ success: false, message: 'الاستشارة غير موجودة' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

// ── Calendar (upcoming hearings) ─────────────────────────────────
router.get('/calendar', async (req, res) => {
  try {
    const LC = safeModel('LegalCase');
    const LCons = safeModel('LegalConsultation');
    const { start, end } = req.query;
    const from = start ? new Date(start) : new Date();
    const to = end ? new Date(end) : new Date(Date.now() + 90 * 86400000);

    const hearings = LC
      ? await LC.find({ nextHearing: { $gte: from, $lte: to } })
          .select('caseNumber title nextHearing status')
          .lean()
      : [];

    const dueDates = LCons
      ? await LCons.find({ dueDate: { $gte: from, $lte: to } })
          .select('consultationNumber title dueDate status')
          .lean()
      : [];

    const events = [
      ...hearings.map(h => ({
        type: 'hearing',
        date: h.nextHearing,
        title: h.title,
        ref: h.caseNumber,
        status: h.status,
      })),
      ...dueDates.map(d => ({
        type: 'consultation_due',
        date: d.dueDate,
        title: d.title,
        ref: d.consultationNumber,
        status: d.status,
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ success: true, data: events });
  } catch (err) {
    safeError(res, err, 'legal-affairs');
  }
});

module.exports = router;
