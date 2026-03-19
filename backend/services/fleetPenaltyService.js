/**
 * Fleet Penalty Service - خدمة المخالفات والغرامات
 */

const FleetPenalty = require('../models/FleetPenalty');
const logger = require('../utils/logger');

class FleetPenaltyService {
  async create(data) {
    const record = await FleetPenalty.create(data);
    logger.info(`Penalty recorded: ${record.penaltyNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const {
      page = 1,
      limit = 20,
      organization,
      vehicle,
      driver,
      type,
      category,
      paymentStatus,
      severity,
      status,
    } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (vehicle) filter.vehicle = vehicle;
    if (driver) filter.driver = driver;
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetPenalty.find(filter)
        .populate('vehicle driver')
        .sort({ violationDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetPenalty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetPenalty.findById(id).populate('vehicle driver createdBy');
  }

  async update(id, data) {
    return FleetPenalty.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetPenalty.findByIdAndDelete(id);
  }

  async pay(id, paymentData) {
    return FleetPenalty.findByIdAndUpdate(
      id,
      {
        paymentStatus: 'paid',
        paymentMethod: paymentData.paymentMethod,
        paymentDate: new Date(),
        paymentReference: paymentData.paymentReference,
        receiptUrl: paymentData.receiptUrl,
        status: 'paid',
      },
      { new: true }
    );
  }

  async fileAppeal(id, appealData) {
    return FleetPenalty.findByIdAndUpdate(
      id,
      {
        'appeal.filed': true,
        'appeal.filedDate': new Date(),
        'appeal.reason': appealData.reason,
        'appeal.reasonAr': appealData.reasonAr,
        'appeal.status': 'pending',
        'appeal.documents': appealData.documents || [],
        paymentStatus: 'appealed',
        status: 'appealed',
      },
      { new: true }
    );
  }

  async resolveAppeal(id, resolution) {
    const update = {
      'appeal.status': resolution.status,
      'appeal.outcome': resolution.outcome,
      'appeal.resolvedDate': new Date(),
    };
    if (resolution.status === 'accepted') {
      update.status = 'waived';
      update.paymentStatus = 'waived';
    } else if (resolution.revisedAmount) {
      update['appeal.revisedAmount'] = resolution.revisedAmount;
      update.fineAmount = resolution.revisedAmount;
    }
    return FleetPenalty.findByIdAndUpdate(id, update, { new: true });
  }

  async getByVehicle(vehicleId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { vehicle: vehicleId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetPenalty.find(filter)
        .populate('driver')
        .sort({ violationDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetPenalty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getByDriver(driverId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { driver: driverId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetPenalty.find(filter)
        .populate('vehicle')
        .sort({ violationDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetPenalty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getDriverDemeritPoints(driverId) {
    const result = await FleetPenalty.aggregate([
      {
        $match: {
          driver: new (require('mongoose').Types.ObjectId)(driverId),
          status: { $in: ['active', 'paid'] },
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$demeritPoints' },
          totalFines: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0] || { totalPoints: 0, totalFines: 0, count: 0 };
  }

  async getUnpaid(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { paymentStatus: { $in: ['unpaid', 'overdue'] } };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetPenalty.find(filter)
        .populate('vehicle driver')
        .sort({ violationDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetPenalty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getStatistics(organization) {
    const [total, unpaid, paid, appealed, costAgg, bySeverity] = await Promise.all([
      FleetPenalty.countDocuments({ organization }),
      FleetPenalty.countDocuments({ organization, paymentStatus: { $in: ['unpaid', 'overdue'] } }),
      FleetPenalty.countDocuments({ organization, paymentStatus: 'paid' }),
      FleetPenalty.countDocuments({ organization, status: 'appealed' }),
      FleetPenalty.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        {
          $group: {
            _id: null,
            totalFines: { $sum: '$totalAmount' },
            totalPaid: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
            totalDemeritPoints: { $sum: '$demeritPoints' },
          },
        },
      ]),
      FleetPenalty.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);
    const costs = costAgg[0] || {};
    const severityMap = {};
    bySeverity.forEach(s => (severityMap[s._id] = s.count));
    return {
      total,
      unpaid,
      paid,
      appealed,
      totalFines: costs.totalFines || 0,
      totalPaid: costs.totalPaid || 0,
      totalDemeritPoints: costs.totalDemeritPoints || 0,
      bySeverity: severityMap,
    };
  }
}

module.exports = new FleetPenaltyService();
