/**
 * Fleet Toll Service - خدمة رسوم المرور
 */

const FleetToll = require('../models/FleetToll');
const logger = require('../utils/logger');

class FleetTollService {
  async create(data) {
    const record = await FleetToll.create(data);
    logger.info(`Toll record created: ${record.tollNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const {
      page = 1,
      limit = 20,
      organization,
      vehicle,
      driver,
      paymentStatus,
      startDate,
      endDate,
    } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (vehicle) filter.vehicle = vehicle;
    if (driver) filter.driver = driver;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      filter.passageTime = {};
      if (startDate) filter.passageTime.$gte = new Date(startDate);
      if (endDate) filter.passageTime.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetToll.find(filter)
        .populate('vehicle driver')
        .sort({ passageTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetToll.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetToll.findById(id).populate('vehicle driver trip createdBy');
  }

  async update(id, data) {
    return FleetToll.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetToll.findByIdAndDelete(id);
  }

  async getByVehicle(vehicleId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { vehicle: vehicleId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetToll.find(filter).sort({ passageTime: -1 }).skip(skip).limit(Number(limit)),
      FleetToll.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async reconcile(id, userId) {
    return FleetToll.findByIdAndUpdate(
      id,
      { reconciled: true, reconciledBy: userId, reconciledAt: new Date() },
      { new: true }
    );
  }

  async pay(id, paymentData) {
    return FleetToll.findByIdAndUpdate(
      id,
      {
        paymentStatus: 'paid',
        paymentMethod: paymentData.paymentMethod,
        paymentDate: new Date(),
        receiptNumber: paymentData.receiptNumber,
      },
      { new: true }
    );
  }

  async getUnpaid(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { paymentStatus: { $in: ['pending', 'overdue'] } };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetToll.find(filter)
        .populate('vehicle driver')
        .sort({ passageTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetToll.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getTagSummary(tagId) {
    const records = await FleetToll.find({ 'tag.tagId': tagId }).sort({ passageTime: -1 });
    const totalAmount = records.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    return { tagId, totalPasses: records.length, totalAmount, recentPasses: records.slice(0, 10) };
  }

  async getStatistics(organization) {
    const [total, paid, pending, overdue, costAgg] = await Promise.all([
      FleetToll.countDocuments({ organization }),
      FleetToll.countDocuments({ organization, paymentStatus: 'paid' }),
      FleetToll.countDocuments({ organization, paymentStatus: 'pending' }),
      FleetToll.countDocuments({ organization, paymentStatus: 'overdue' }),
      FleetToll.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
          },
        },
      ]),
    ]);
    const agg = costAgg[0] || {};
    return {
      total,
      paid,
      pending,
      overdue,
      totalAmount: agg.totalAmount || 0,
      paidAmount: agg.paidAmount || 0,
    };
  }
}

module.exports = new FleetTollService();
