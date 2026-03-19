/**
 * Fleet Disposal Service - خدمة التخلص من المركبات
 */

const FleetDisposal = require('../models/FleetDisposal');
const logger = require('../utils/logger');

class FleetDisposalService {
  async create(data) {
    const record = await FleetDisposal.create(data);
    logger.info(`Disposal initiated: ${record.disposalNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const { page = 1, limit = 20, organization, type, status } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (type) filter.type = type;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetDisposal.find(filter)
        .populate('vehicle')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetDisposal.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetDisposal.findById(id).populate('vehicle createdBy condition.inspectedBy');
  }

  async update(id, data) {
    return FleetDisposal.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetDisposal.findByIdAndDelete(id);
  }

  async approve(id, userId, comments) {
    const disposal = await FleetDisposal.findById(id);
    if (!disposal) throw new Error('سجل التخلص غير موجود');
    disposal.approvals.push({ approver: userId, decision: 'approved', date: new Date(), comments });
    disposal.status = 'approved';
    disposal.timeline.approvedDate = new Date();
    await disposal.save();
    logger.info(`Disposal approved: ${disposal.disposalNumber}`);
    return disposal;
  }

  async reject(id, userId, comments) {
    const disposal = await FleetDisposal.findById(id);
    if (!disposal) throw new Error('سجل التخلص غير موجود');
    disposal.approvals.push({ approver: userId, decision: 'rejected', date: new Date(), comments });
    disposal.status = 'cancelled';
    await disposal.save();
    return disposal;
  }

  async listForAuction(id, auctionData) {
    return FleetDisposal.findByIdAndUpdate(
      id,
      {
        status: 'listed',
        auction: auctionData,
        'timeline.listedDate': new Date(),
      },
      { new: true }
    );
  }

  async addBid(id, bidData) {
    const disposal = await FleetDisposal.findById(id);
    if (!disposal) throw new Error('سجل التخلص غير موجود');
    disposal.auction.bids.push({ ...bidData, bidDate: new Date() });
    disposal.status = 'bidding';
    await disposal.save();
    return disposal;
  }

  async awardBid(id, bidIndex) {
    const disposal = await FleetDisposal.findById(id);
    if (!disposal || !disposal.auction.bids[bidIndex]) throw new Error('العرض غير موجود');
    disposal.auction.bids.forEach((b, i) => (b.isWinning = i === Number(bidIndex)));
    const winBid = disposal.auction.bids[bidIndex];
    disposal.auction.winningBid = winBid.amount;
    disposal.auction.winnerName = winBid.bidder;
    disposal.status = 'sold';
    disposal.sale = disposal.sale || {};
    disposal.sale.buyerName = winBid.bidder;
    disposal.sale.salePrice = winBid.amount;
    disposal.sale.saleDate = new Date();
    disposal.timeline.soldDate = new Date();
    disposal.financial = disposal.financial || {};
    disposal.financial.saleProceeds = winBid.amount;
    await disposal.save();
    logger.info(`Disposal bid awarded: ${disposal.disposalNumber} - ${winBid.amount} SAR`);
    return disposal;
  }

  async recordSale(id, saleData) {
    return FleetDisposal.findByIdAndUpdate(
      id,
      {
        sale: saleData,
        status: 'sold',
        'timeline.soldDate': new Date(),
        'financial.saleProceeds': saleData.salePrice,
      },
      { new: true }
    );
  }

  async complete(id) {
    return FleetDisposal.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        'timeline.completedDate': new Date(),
      },
      { new: true }
    );
  }

  async getByVehicle(vehicleId) {
    return FleetDisposal.find({ vehicle: vehicleId }).sort({ createdAt: -1 });
  }

  async getStatistics(organization) {
    const [total, initiated, approved, listed, sold, completed, financials] = await Promise.all([
      FleetDisposal.countDocuments({ organization }),
      FleetDisposal.countDocuments({ organization, status: 'initiated' }),
      FleetDisposal.countDocuments({ organization, status: 'approved' }),
      FleetDisposal.countDocuments({ organization, status: { $in: ['listed', 'bidding'] } }),
      FleetDisposal.countDocuments({ organization, status: 'sold' }),
      FleetDisposal.countDocuments({ organization, status: 'completed' }),
      FleetDisposal.aggregate([
        {
          $match: {
            organization: new (require('mongoose').Types.ObjectId)(organization),
            status: { $in: ['sold', 'completed'] },
          },
        },
        {
          $group: {
            _id: null,
            totalProceeds: { $sum: '$financial.saleProceeds' },
            totalGainLoss: { $sum: '$financial.gainLoss' },
          },
        },
      ]),
    ]);
    const fin = financials[0] || {};
    return {
      total,
      initiated,
      approved,
      listed,
      sold,
      completed,
      totalProceeds: fin.totalProceeds || 0,
      totalGainLoss: fin.totalGainLoss || 0,
    };
  }
}

module.exports = new FleetDisposalService();
