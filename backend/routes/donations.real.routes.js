/**
 * Donations Routes — عمليات التبرعات + لوحة التحكم
 * Handles: /api/donations
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

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
    logger.error('Donations dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات التبرعات' });
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
    logger.error('Donations list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب التبرعات' });
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
    logger.error('Donations by donor error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تبرعات المتبرع' });
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
    logger.error('Donations by campaign error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تبرعات الحملة' });
  }
});

// POST / — create donation
router.post('/', async (req, res) => {
  try {
    const Donation = require('../models/Donation');
    const Donor = require('../models/Donor');
    const Campaign = require('../models/Campaign');

    // Auto-generate receipt number
    const count = await Donation.countDocuments();
    const receiptNo = `DON-${String(count + 1).padStart(6, '0')}`;

    const donation = await Donation.create({
      ...req.body,
      donationNumber: receiptNo,
      receiptNumber: receiptNo,
      createdBy: req.user?.id,
    });

    // Update donor stats
    if (req.body.donorId) {
      await Donor.findByIdAndUpdate(req.body.donorId, {
        $inc: { totalDonations: req.body.amount || 0, donationsCount: 1 },
        lastDonation: new Date(),
      });
    }

    // Update campaign stats
    if (req.body.campaignId) {
      await Campaign.findByIdAndUpdate(req.body.campaignId, {
        $inc: { collectedAmount: req.body.amount || 0, donorsCount: 1 },
      });
    }

    res.status(201).json({ success: true, data: donation, message: 'تم تسجيل التبرع بنجاح' });
  } catch (err) {
    logger.error('Donation create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تسجيل التبرع' });
  }
});

module.exports = router;
