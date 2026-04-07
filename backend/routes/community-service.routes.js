/**
 * Community Service Routes — System 42
 * نظام الخدمة المجتمعية
 *
 * Endpoints:
 *   GET    /api/community-service/stats
 *   GET    /api/community-service/programs
 *   POST   /api/community-service/programs
 *   GET    /api/community-service/programs/:id
 *   PUT    /api/community-service/programs/:id
 *   DELETE /api/community-service/programs/:id
 *   GET    /api/community-service/events
 *   POST   /api/community-service/events
 *   GET    /api/community-service/events/:id
 *   PUT    /api/community-service/events/:id
 *   DELETE /api/community-service/events/:id
 *   GET    /api/community-service/events/upcoming
 *   GET    /api/community-service/partnerships
 *   POST   /api/community-service/partnerships
 *   PUT    /api/community-service/partnerships/:id
 *   DELETE /api/community-service/partnerships/:id
 *   GET    /api/community-service/resources
 *   POST   /api/community-service/resources
 *   PUT    /api/community-service/resources/:id
 *   GET    /api/community-service/referrals
 *   POST   /api/community-service/referrals
 *   PATCH  /api/community-service/referrals/:id/status
 *   GET    /api/community-service/donations
 *   POST   /api/community-service/donations
 *   GET    /api/community-service/impact-report
 */

'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { escapeRegex, stripUpdateMeta } = require('../utils/sanitize');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// 🔒 All community service routes require authentication
router.use(authenticate);

// Models
const CommunityProgram = require('../models/CommunityProgram');
const CommunityEvent = require('../models/CommunityEvent');
const CsoPartnership = require('../models/CsoPartnership');
const CommunityResource = require('../models/CommunityResource');
const CommunityReferral = require('../models/CommunityReferral');
const CommunityDonation = require('../models/CommunityDonation');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const ok = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const fail = (res, msg, status = 400) => res.status(status).json({ success: false, message: msg });

const paginate = (page, limit) => ({
  skip: (parseInt(page) - 1) * parseInt(limit),
  limit: parseInt(limit),
});

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const filter = branchId ? { branchId } : {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [programs, events, referrals, donationsAgg] = await Promise.all([
      CommunityProgram.countDocuments({ ...filter, status: 'active' }),
      CommunityEvent.countDocuments({
        ...filter,
        eventDate: { $gte: startOfMonth },
      }),
      CommunityReferral.countDocuments({ ...filter, status: 'pending' }),
      CommunityDonation.aggregate([
        {
          $match: {
            ...(branchId ? { branchId } : {}),
            status: 'received',
            deletedAt: null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    ok(res, {
      data: {
        programs: { title: 'البرامج النشطة', value: programs, icon: 'briefcase' },
        events: { title: 'فعاليات هذا الشهر', value: events, icon: 'calendar' },
        referrals: { title: 'إحالات معلقة', value: referrals, icon: 'arrow-right' },
        donations: {
          title: 'التبرعات (SAR)',
          value: donationsAgg[0]?.total || 0,
          icon: 'currency-dollar',
        },
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// PROGRAMS CRUD
// ─────────────────────────────────────────────
router.get('/programs', async (req, res) => {
  try {
    const { search, status, programType, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (programType) filter.programType = programType;
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [{ name: new RegExp(safe, 'i') }, { nameAr: new RegExp(safe, 'i') }];
    }
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      CommunityProgram.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .lean(),
      CommunityProgram.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/programs', async (req, res) => {
  try {
    const required = ['name', 'nameAr', 'programType', 'startDate'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await CommunityProgram.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء البرنامج بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.get('/programs/:id', async (req, res) => {
  try {
    const doc = await CommunityProgram.findById(req.params.id).lean();
    if (!doc) return fail(res, 'البرنامج غير موجود', 404);
    ok(res, { data: doc });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/programs/:id', async (req, res) => {
  try {
    const doc = await CommunityProgram.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return fail(res, 'البرنامج غير موجود', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.delete('/programs/:id', async (req, res) => {
  try {
    const doc = await CommunityProgram.findByIdAndUpdate(req.params.id, {
      deletedAt: new Date(),
    });
    if (!doc) return fail(res, 'البرنامج غير موجود', 404);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

// الفعاليات القادمة (يجب أن يكون قبل /:id)
router.get('/events/upcoming', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const filter = { status: 'upcoming', eventDate: { $gte: new Date() } };
    if (branchId) filter.branchId = branchId;
    const data = await CommunityEvent.find(filter)
      .sort({ eventDate: 1 })
      .limit(20)
      .populate('programId', 'name nameAr')
      .lean();
    ok(res, { data });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.get('/events', async (req, res) => {
  try {
    const { status, eventType, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      CommunityEvent.find(filter).skip(skip).limit(parseInt(limit)).sort({ eventDate: -1 }).lean(),
      CommunityEvent.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/events', async (req, res) => {
  try {
    const required = ['title', 'titleAr', 'eventType', 'eventDate'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await CommunityEvent.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء الفعالية بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.get('/events/:id', async (req, res) => {
  try {
    const doc = await CommunityEvent.findById(req.params.id)
      .populate('programId', 'name nameAr')
      .lean();
    if (!doc) return fail(res, 'الفعالية غير موجودة', 404);
    ok(res, { data: doc });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    const doc = await CommunityEvent.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return fail(res, 'الفعالية غير موجودة', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const doc = await CommunityEvent.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    if (!doc) return fail(res, 'الفعالية غير موجودة', 404);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// PARTNERSHIPS
// ─────────────────────────────────────────────
router.get('/partnerships', async (req, res) => {
  try {
    const { status, organizationType, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (organizationType) filter.organizationType = organizationType;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      CsoPartnership.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      CsoPartnership.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/partnerships', async (req, res) => {
  try {
    const required = ['organizationName', 'organizationType', 'partnershipType'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await CsoPartnership.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء الشراكة بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.put('/partnerships/:id', async (req, res) => {
  try {
    const doc = await CsoPartnership.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return fail(res, 'الشراكة غير موجودة', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.delete('/partnerships/:id', async (req, res) => {
  try {
    const doc = await CsoPartnership.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    if (!doc) return fail(res, 'الشراكة غير موجودة', 404);
    ok(res, { message: 'تم الحذف بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────────
router.get('/resources', async (req, res) => {
  try {
    const {
      resourceType,
      city,
      isFree,
      isDisabilitySpecific,
      search,
      branchId,
      page = 1,
      limit = 20,
    } = req.query;
    const filter = { isActive: true };
    if (branchId) filter.branchId = branchId;
    if (resourceType) filter.resourceType = resourceType;
    if (city) filter.city = new RegExp(escapeRegex(String(city)), 'i');
    if (isFree !== undefined) filter.isFree = isFree === 'true';
    if (isDisabilitySpecific !== undefined)
      filter.isDisabilitySpecific = isDisabilitySpecific === 'true';
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [
        { resourceName: new RegExp(safe, 'i') },
        { resourceNameAr: new RegExp(safe, 'i') },
        { description: new RegExp(safe, 'i') },
      ];
    }
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      CommunityResource.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ resourceName: 1 })
        .lean(),
      CommunityResource.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/resources', async (req, res) => {
  try {
    const required = ['resourceName', 'resourceType', 'providerName', 'providerType'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await CommunityResource.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إضافة المورد بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.put('/resources/:id', async (req, res) => {
  try {
    const doc = await CommunityResource.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
      runValidators: true,
    });
    if (!doc) return fail(res, 'المورد غير موجود', 404);
    ok(res, { data: doc, message: 'تم التحديث بنجاح' });
  } catch (err) {
    fail(res, err.message, 400);
  }
});

// ─────────────────────────────────────────────
// REFERRALS
// ─────────────────────────────────────────────
router.get('/referrals', async (req, res) => {
  try {
    const { status, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      CommunityReferral.find(filter)
        .populate('resourceId', 'resourceName resourceNameAr')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ referralDate: -1 })
        .lean(),
      CommunityReferral.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/referrals', async (req, res) => {
  try {
    const required = ['beneficiaryName', 'reasonForReferral', 'referralType', 'referralDate'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    if (!req.body.consentObtained) return fail(res, 'يجب الحصول على موافقة المستفيد');

    const doc = await CommunityReferral.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم إنشاء الإحالة بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

router.patch('/referrals/:id/status', async (req, res) => {
  try {
    const { status, outcomeNotes } = req.body;
    const allowed = ['pending', 'accepted', 'completed', 'rejected', 'no_response', 'withdrawn'];
    if (!allowed.includes(status)) return fail(res, 'حالة غير صالحة');

    const updates = { status, outcomeNotes };
    if (status === 'accepted') updates.acceptedAt = new Date();
    if (status === 'completed') updates.completedAt = new Date();

    const doc = await CommunityReferral.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return fail(res, 'الإحالة غير موجودة', 404);
    ok(res, { data: doc, message: 'تم تحديث حالة الإحالة بنجاح' });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

// ─────────────────────────────────────────────
// DONATIONS
// ─────────────────────────────────────────────
router.get('/donations', async (req, res) => {
  try {
    const { status, donorType, branchId, page = 1, limit = 15 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (donorType) filter.donorType = donorType;
    const { skip } = paginate(page, limit);
    const [data, total] = await Promise.all([
      CommunityDonation.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ donationDate: -1 })
        .lean(),
      CommunityDonation.countDocuments(filter),
    ]);
    ok(res, { data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

router.post('/donations', async (req, res) => {
  try {
    const required = ['donorName', 'donorType', 'amount', 'donationType', 'donationDate'];
    const missing = required.filter(f => !req.body[f]);
    if (missing.length) return fail(res, `الحقول المطلوبة: ${missing.join(', ')}`);
    const doc = await CommunityDonation.create({ ...req.body, uuid: uuidv4() });
    ok(res, { data: doc, message: 'تم تسجيل التبرع بنجاح' }, 201);
  } catch (err) {
    fail(res, err.message, 400);
  }
});

// ─────────────────────────────────────────────
// IMPACT REPORT
// ─────────────────────────────────────────────
router.get('/impact-report', async (req, res) => {
  try {
    const branchId = req.query.branchId || req.headers['x-branch-id'];
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const branchFilter = branchId ? { branchId } : {};

    const [
      programsLaunched,
      totalBeneficiaries,
      eventsHeld,
      totalAttendees,
      totalDonations,
      referralsCompleted,
      activePartnerships,
    ] = await Promise.all([
      CommunityProgram.countDocuments({
        ...branchFilter,
        startDate: { $gte: yearStart, $lt: yearEnd },
      }),
      CommunityProgram.aggregate([
        {
          $match: {
            ...(branchId ? { branchId } : {}),
            startDate: { $gte: yearStart, $lt: yearEnd },
            deletedAt: null,
          },
        },
        { $group: { _id: null, total: { $sum: '$actualBeneficiaries' } } },
      ]),
      CommunityEvent.countDocuments({
        ...branchFilter,
        eventDate: { $gte: yearStart, $lt: yearEnd },
        status: 'completed',
      }),
      CommunityEvent.aggregate([
        {
          $match: {
            ...(branchId ? { branchId } : {}),
            eventDate: { $gte: yearStart, $lt: yearEnd },
            deletedAt: null,
          },
        },
        { $group: { _id: null, total: { $sum: '$actualAttendees' } } },
      ]),
      CommunityDonation.aggregate([
        {
          $match: {
            ...(branchId ? { branchId } : {}),
            donationDate: { $gte: yearStart, $lt: yearEnd },
            status: 'received',
            deletedAt: null,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CommunityReferral.countDocuments({
        ...branchFilter,
        referralDate: { $gte: yearStart, $lt: yearEnd },
        status: 'completed',
      }),
      CsoPartnership.countDocuments({ ...branchFilter, status: 'active' }),
    ]);

    ok(res, {
      data: {
        year,
        programsLaunched,
        totalBeneficiaries: totalBeneficiaries[0]?.total || 0,
        eventsHeld,
        totalAttendees: totalAttendees[0]?.total || 0,
        totalDonations: totalDonations[0]?.total || 0,
        referralsCompleted,
        activePartnerships,
      },
    });
  } catch (err) {
    fail(res, err.message, 500);
  }
});

module.exports = router;
