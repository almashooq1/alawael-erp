const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const InsuranceProvider = require('../models/InsuranceProvider');
const { authenticateToken } = require('../middleware/auth.middleware');
const AuditService = require('../services/audit.service');

router.use(authenticateToken);

// ============ ANALYTICS (Smart Finance) ============

router.get('/analytics/revenue', async (req, res) => {
  try {
    // Aggregation Pipeline for Revenue
    const revenueStats = await Invoice.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } }, // Ignore cancelled
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          paidRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$totalAmount', 0] },
          },
          outstanding: {
            $sum: { $cond: [{ $eq: ['$status', 'UNPAID'] }, '$totalAmount', 0] },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: revenueStats[0] || { totalRevenue: 0, paidRevenue: 0, outstanding: 0, count: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ INVOICES ============

router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().populate('beneficiary', 'firstName lastName fileNumber').sort({ createdAt: -1 });
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const invoice = new Invoice({
      ...req.body,
      invoiceNumber,
      issuer: req.user.id,
    });

    await invoice.save();

    await AuditService.log(req, 'CREATE_INVOICE', 'FINANCE', { id: invoice.id, type: 'Invoice' });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ============ INSURANCE ============

router.get('/insurance-providers', async (req, res) => {
  try {
    const providers = await InsuranceProvider.find({ isActive: true });
    res.json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/insurance-providers', async (req, res) => {
  try {
    const provider = new InsuranceProvider(req.body);
    await provider.save();
    res.status(201).json({ success: true, data: provider });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;

