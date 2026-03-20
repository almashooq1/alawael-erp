/**
 * Toll & Fine Management Service - خدمة إدارة الرسوم والمخالفات المرورية
 */

const { TrafficFine, TollTransaction } = require('../models/TrafficFine');
const _logger = require('../utils/logger');

class TrafficFineService {
  // ─── Traffic Fines ────────────────────────────────────────────────

  static async createFine(data) {
    return TrafficFine.create(data);
  }

  static async getAllFines(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.source) query.source = filter.source;
    if (filter.dateFrom && filter.dateTo) {
      query['violation.date'] = { $gte: new Date(filter.dateFrom), $lte: new Date(filter.dateTo) };
    }

    const [fines, total] = await Promise.all([
      TrafficFine.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name licenseNumber')
        .sort({ 'violation.date': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      TrafficFine.countDocuments(query),
    ]);
    return { fines, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getFineById(id) {
    return TrafficFine.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name licenseNumber phone');
  }

  static async updateFine(id, data) {
    return TrafficFine.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async payFine(id, paymentData) {
    const fine = await TrafficFine.findById(id);
    if (!fine) return null;
    fine.status = 'paid';
    fine.payment = { ...paymentData, paidAt: new Date() };
    await fine.save();
    return fine;
  }

  static async disputeFine(id, disputeData) {
    const fine = await TrafficFine.findById(id);
    if (!fine) return null;
    fine.status = 'disputed';
    fine.dispute = {
      filed: true,
      reason: disputeData.reason,
      filedAt: new Date(),
      filedBy: disputeData.filedBy,
      outcome: 'pending',
      documents: disputeData.documents || [],
    };
    await fine.save();
    return fine;
  }

  static async resolveDispute(id, outcome, resolvedAmount) {
    const fine = await TrafficFine.findById(id);
    if (!fine) return null;
    fine.dispute.outcome = outcome;
    fine.dispute.resolvedAt = new Date();
    if (outcome === 'dismissed') {
      fine.status = 'dismissed';
    } else if (outcome === 'reduced') {
      fine.fine.amount = resolvedAmount;
      fine.status = 'pending';
    } else {
      fine.status = 'pending';
    }
    await fine.save();
    return fine;
  }

  static async assignToDriver(id, assignmentData) {
    const fine = await TrafficFine.findById(id);
    if (!fine) return null;
    fine.assignment = assignmentData;
    await fine.save();
    return fine;
  }

  static async getDriverFines(driverId) {
    return TrafficFine.find({ driver: driverId, isActive: true })
      .populate('vehicle', 'plateNumber')
      .sort({ 'violation.date': -1 });
  }

  static async getVehicleFines(vehicleId) {
    return TrafficFine.find({ vehicle: vehicleId, isActive: true })
      .populate('driver', 'name')
      .sort({ 'violation.date': -1 });
  }

  static async getOverdueFines(organization) {
    const query = { isActive: true, status: 'overdue' };
    if (organization) query.organization = organization;
    return TrafficFine.find(query)
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name')
      .sort({ 'fine.dueDate': 1 });
  }

  static async getFineStatistics(organization) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);

    const stats = await TrafficFine.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] } },
          disputed: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } },
          totalAmount: { $sum: '$fine.totalAmount' },
          totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$fine.totalAmount', 0] } },
          totalPending: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'overdue']] }, '$fine.totalAmount', 0] },
          },
        },
      },
    ]);

    const byType = await TrafficFine.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$fine.totalAmount' } } },
      { $sort: { count: -1 } },
    ]);

    const topDrivers = await TrafficFine.aggregate([
      { $match: { ...match, driver: { $exists: true } } },
      {
        $group: { _id: '$driver', count: { $sum: 1 }, totalAmount: { $sum: '$fine.totalAmount' } },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'drivers', localField: '_id', foreignField: '_id', as: 'driver' } },
      { $unwind: '$driver' },
      { $project: { driverName: '$driver.name', count: 1, totalAmount: 1 } },
    ]);

    return { summary: stats[0] || {}, byType, topDrivers };
  }

  // ─── Toll Transactions ────────────────────────────────────────────

  static async createToll(data) {
    return TollTransaction.create(data);
  }

  static async getAllTolls(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.status) query.status = filter.status;
    if (filter.dateFrom && filter.dateTo) {
      query['passage.date'] = { $gte: new Date(filter.dateFrom), $lte: new Date(filter.dateTo) };
    }

    const [tolls, total] = await Promise.all([
      TollTransaction.find(query)
        .populate('vehicle', 'plateNumber make model')
        .sort({ 'passage.date': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      TollTransaction.countDocuments(query),
    ]);
    return { tolls, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getTollStatistics(organization) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);

    return TollTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
        },
      },
    ]);
  }

  static async getVehicleTolls(vehicleId) {
    return TollTransaction.find({ vehicle: vehicleId, isActive: true }).sort({
      'passage.date': -1,
    });
  }
}

module.exports = TrafficFineService;
