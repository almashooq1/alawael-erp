const Invoice = require('../models/Invoice');
const TherapySession = require('../models/TherapySession');
const BeneficiaryFile = require('../models/BeneficiaryFile');
const SmartNotificationService = require('./smartNotificationService');

class SmartFinanceService {
  /**
   * Scan for completed sessions that haven't been billed yet
   * and group them by Beneficiary to suggest Invoices.
   */
  static async getUnbilledSessions() {
    const unbilled = await TherapySession.find({
      status: 'COMPLETED',
      isBilled: false,
    })
      .populate('beneficiary', 'firstName lastName fileNumber')
      .populate('therapist', 'firstName lastName')
      .sort({ date: 1 });

    // Group by Beneficiary
    const grouped = {};
    unbilled.forEach(session => {
      const benId = session.beneficiary._id.toString();
      if (!grouped[benId]) {
        grouped[benId] = {
          beneficiary: session.beneficiary,
          sessions: [],
          totalEstimated: 0,
        };
      }
      grouped[benId].sessions.push(session);
      grouped[benId].totalEstimated += 150; // Base rate assumption if price list missing
    });

    return Object.values(grouped);
  }

  /**
   * Generate Invoices for a specific Beneficiary
   * or 'ALL' to generate for everyone with pending sessions.
   */
  static async generateInvoices(performerId, specificBeneficiaryId = null) {
    let candidates = await this.getUnbilledSessions();

    if (specificBeneficiaryId) {
      candidates = candidates.filter(c => c.beneficiary._id.toString() === specificBeneficiaryId);
    }

    const stats = { generated: 0, totalAmount: 0 };
    const generatedInvoices = [];

    for (const candidate of candidates) {
      const sessions = candidate.sessions;
      if (sessions.length === 0) continue;

      // Create Invoice Items
      const items = sessions.map(s => ({
        description: `Therapy Session - ${s.date.toISOString().split('T')[0]} (${s.therapist.firstName})`,
        quantity: 1,
        unitPrice: 150, // Hardcoded for demo, normally from PriceList
        total: 150,
        serviceRef: null, // Could link to Service Catalog
      }));

      const subTotal = items.reduce((acc, item) => acc + item.total, 0);
      const tax = subTotal * 0.15; // 15% VAT
      const total = subTotal + tax;

      // Create Invoice Record
      const invoice = new Invoice({
        invoiceNumber: `INV-${Date.now()}-${stats.generated + 1}`,
        beneficiary: candidate.beneficiary._id,
        issuer: performerId,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        items: items,
        subTotal: subTotal,
        taxAmount: tax,
        totalAmount: total,
        status: 'ISSUED',
        paymentMethod: 'CASH', // Default
        notes: 'Auto-generated based on completed sessions.',
      });

      const savedInvoice = await invoice.save();
      generatedInvoices.push(savedInvoice);

      // Update Sessions
      const sessionIds = sessions.map(s => s._id);
      await TherapySession.updateMany({ _id: { $in: sessionIds } }, { $set: { isBilled: true, invoiceId: savedInvoice._id } });

      stats.generated++;
      stats.totalAmount += total;
    }

    if (stats.generated > 0) {
      await SmartNotificationService.send(
        performerId,
        'Smart Billing Complete',
        `Generated ${stats.generated} invoices totaling ${stats.totalAmount} SAR.`,
        'SUCCESS',
        '/finance/invoices',
      );
    }

    return { success: true, stats, invoices: generatedInvoices };
  }

  /**
   * Get Revenue Analytics
   */
  static async getRevenueMetrics(month, year) {
    // Find Invoices in this month
    // Being simple with date filter (createdAt usually works for issued)
    // using aggregation for speed
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const result = await Invoice.aggregate([
      {
        $match: {
          issueDate: { $gte: start, $lte: end },
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          paid: {
            $sum: {
              $cond: [{ $eq: ['$status', 'PAID'] }, '$totalAmount', 0],
            },
          },
        },
      },
    ]);

    return result[0] || { revenue: 0, count: 0, paid: 0 };
  }
}

module.exports = SmartFinanceService;
module.exports.instance = new SmartFinanceService();
