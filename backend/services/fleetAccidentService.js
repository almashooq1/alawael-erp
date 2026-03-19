/**
 * Fleet Accident Service - خدمة حوادث الأسطول
 */

const FleetAccident = require('../models/FleetAccident');
const logger = require('../utils/logger');

class FleetAccidentService {
  async create(data) {
    const record = await FleetAccident.create(data);
    logger.info(`Accident report created: ${record.accidentNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const {
      page = 1,
      limit = 20,
      organization,
      vehicle,
      driver,
      severity,
      status,
      startDate,
      endDate,
    } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (vehicle) filter.vehicle = vehicle;
    if (driver) filter.driver = driver;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.accidentDate = {};
      if (startDate) filter.accidentDate.$gte = new Date(startDate);
      if (endDate) filter.accidentDate.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetAccident.find(filter)
        .populate('vehicle driver')
        .sort({ accidentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetAccident.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetAccident.findById(id).populate('vehicle driver trip createdBy resolvedBy');
  }

  async update(id, data) {
    return FleetAccident.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetAccident.findByIdAndDelete(id);
  }

  async updateStatus(id, status, userId) {
    const update = { status, updatedBy: userId };
    if (status === 'resolved' || status === 'closed') {
      update.resolvedBy = userId;
      update.resolvedAt = new Date();
    }
    return FleetAccident.findByIdAndUpdate(id, update, { new: true });
  }

  async updateInsuranceClaim(id, claimData) {
    return FleetAccident.findByIdAndUpdate(id, { insuranceClaim: claimData }, { new: true });
  }

  async getByVehicle(vehicleId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { vehicle: vehicleId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetAccident.find(filter)
        .populate('driver')
        .sort({ accidentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetAccident.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getByDriver(driverId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { driver: driverId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetAccident.find(filter)
        .populate('vehicle')
        .sort({ accidentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetAccident.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getPendingClaims(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = {
      'insuranceClaim.claimStatus': { $in: ['filed', 'under_review', 'additional_info_needed'] },
    };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetAccident.find(filter)
        .populate('vehicle driver')
        .sort({ 'insuranceClaim.filedDate': -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetAccident.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async addWitness(id, witnessData) {
    return FleetAccident.findByIdAndUpdate(
      id,
      { $push: { witnesses: witnessData } },
      { new: true }
    );
  }

  async getStatistics(organization) {
    const [total, reported, investigating, resolved, bySeverity, claimStats] = await Promise.all([
      FleetAccident.countDocuments({ organization }),
      FleetAccident.countDocuments({ organization, status: 'reported' }),
      FleetAccident.countDocuments({ organization, status: 'under_investigation' }),
      FleetAccident.countDocuments({ organization, status: { $in: ['resolved', 'closed'] } }),
      FleetAccident.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      FleetAccident.aggregate([
        {
          $match: {
            organization: new (require('mongoose').Types.ObjectId)(organization),
            'insuranceClaim.claimAmount': { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            totalClaimed: { $sum: '$insuranceClaim.claimAmount' },
            totalPaid: { $sum: '$insuranceClaim.paidAmount' },
          },
        },
      ]),
    ]);
    const severityMap = {};
    bySeverity.forEach(s => (severityMap[s._id] = s.count));
    const claims = claimStats[0] || {};
    return {
      total,
      reported,
      investigating,
      resolved,
      bySeverity: severityMap,
      totalClaimed: claims.totalClaimed || 0,
      totalPaid: claims.totalPaid || 0,
    };
  }
}

module.exports = new FleetAccidentService();
