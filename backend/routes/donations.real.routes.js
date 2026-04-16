/**
 * Donations Routes — عمليات التبرعات + لوحة التحكم
 * Handles: /api/donations
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// ── Whitelist helper: pick only allowed fields from request body ──
const ALLOWED_DONATION_FIELDS = [
  'type',
  'donorName',
  'donorPhone',
  'donorEmail',
  'donorId',
  'isAnonymous',
  'amount',
  'currency',
  'paymentMethod',
  'paymentReference',
  'purpose',
  'campaign',
  'restrictedTo',
  'status',
  'receiptDate',
  'isRecurring',
  'recurringFrequency',
  'donationDate',
  'notes',
  'campaignId',
];

function pickFields(body, allowedFields) {
  const result = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

function validateDonationBody(body) {
  const errors = [];
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) errors.push('مبلغ التبرع يجب أن يكون رقماً موجباً');
  }
  if (body.type !== undefined) {
    const validTypes = [
      'cash',
      'in_kind',
      'endowment',
      'zakat',
      'sadaqah',
      'recurring',
      'conditional',
    ];
    if (!validTypes.includes(body.type)) errors.push('نوع التبرع غير صالح');
  }
  if (body.donorId !== undefined && !/^[a-fA-F0-9]{24}$/.test(body.donorId)) {
    errors.push('معرف المتبرع غير صالح');
  }
  if (body.campaignId !== undefined && !/^[a-fA-F0-9]{24}$/.test(body.campaignId)) {
    errors.push('معرف الحملة غير صالح');
  }
  return errors;
}

// GET /dashboard/stats — donation dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const Donor = require('../models/Donor');
    const Campaign = require('../models/Campaign');

    const [totalDonations, totalDonors, activeCampaigns, donations] = await Promise.all([
      Donation.countDocuments({ isDeleted: { $ne: true } }),
      Donor.countDocuments({ isDeleted: { $ne: true } }),
      Campaign.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
      Donation.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const totalAmount = donations[0]?.totalAmount || 0;

    // Monthly trend — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyTrend = await Donation.aggregate([
      { $match: { donationDate: { $gte: sixMonthsAgo }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$donationDate' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // By type
    const byType = await Donation.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$type', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalDonations,
        totalDonors,
        activeCampaigns,
        totalAmount,
        monthlyTrend,
        byType,
      },
    });
  } catch (err) {
    safeError(res, err, 'Donations dashboard error');
  }
});

// GET / — list donations
router.get('/', async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const { page = 1, limit = 50, status, type } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Donation.find(filter).sort({ donationDate: -1 }).skip(skip).limit(+limit).lean(),
      Donation.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'Donations list error');
  }
});

// GET /donor/:donorId — donations by donor
router.get('/donor/:donorId', async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const data = await Donation.find({
      donorId: req.params.donorId,
      isDeleted: { $ne: true },
    })
      .sort({ donationDate: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Donations by donor error');
  }
});

// GET /campaign/:campaignId — donations by campaign
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const data = await Donation.find({
      campaignId: req.params.campaignId,
      isDeleted: { $ne: true },
    })
      .sort({ donationDate: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Donations by campaign error');
  }
});

// POST / — create donation
router.post('/', async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const Donor = require('../models/Donor');
    const Campaign = require('../models/Campaign');

    // Validate input
    const errors = validateDonationBody(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    // Whitelist fields — prevent mass-assignment
    const fields = pickFields(req.body, ALLOWED_DONATION_FIELDS);
    const amount = Number(fields.amount) || 0;

    // Auto-generate receipt number
    const count = await Donation.countDocuments();
    const receiptNo = `DON-${String(count + 1).padStart(6, '0')}`;

    const donation = await Donation.create({
      ...fields,
      amount,
      donationNumber: receiptNo,
      receiptNumber: receiptNo,
      createdBy: req.user?.id,
    });

    // Update donor stats (use validated amount)
    if (fields.donorId) {
      await Donor.findByIdAndUpdate(fields.donorId, {
        $inc: { totalDonations: amount, donationsCount: 1 },
        lastDonation: new Date(),
      });
    }

    // Update campaign stats (use validated amount)
    if (fields.campaignId) {
      await Campaign.findByIdAndUpdate(fields.campaignId, {
        $inc: { collectedAmount: amount, donorsCount: 1 },
      });
    }

    res.status(201).json({ success: true, data: donation, message: 'تم تسجيل التبرع بنجاح' });
  } catch (err) {
    safeError(res, err, 'Donation create error');
  }
});

module.exports = router;
