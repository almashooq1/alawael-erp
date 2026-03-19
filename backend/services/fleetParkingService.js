/**
 * Fleet Parking Service - خدمة مواقف الأسطول
 */

const FleetParking = require('../models/FleetParking');
const logger = require('../utils/logger');

class FleetParkingService {
  static async create(data) {
    return FleetParking.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;

    const [records, total] = await Promise.all([
      FleetParking.find(query)
        .populate('spot.vehicle', 'plateNumber make model')
        .populate('spot.driver', 'name')
        .populate('entryLog.vehicle', 'plateNumber make model')
        .populate('violation.vehicle', 'plateNumber')
        .populate('violation.driver', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetParking.countDocuments(query),
    ]);
    return { records, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetParking.findById(id)
      .populate('spot.vehicle', 'plateNumber make model')
      .populate('spot.driver', 'name phone')
      .populate('entryLog.vehicle', 'plateNumber make model')
      .populate('entryLog.driver', 'name phone')
      .populate('violation.vehicle', 'plateNumber make model')
      .populate('violation.driver', 'name phone');
  }

  static async update(id, data) {
    return FleetParking.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return FleetParking.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  // Zone management
  static async getZones(organizationId) {
    return FleetParking.find({
      organization: organizationId,
      isActive: true,
      type: 'parking_zone',
    }).sort({ 'zone.name': 1 });
  }

  static async getZoneOccupancy(zoneId) {
    const zone = await FleetParking.findById(zoneId);
    if (!zone || zone.type !== 'parking_zone') return null;
    const assignedSpots = await FleetParking.countDocuments({
      'spot.zoneRef': zoneId,
      isActive: true,
      type: 'assigned_spot',
    });
    return {
      zone: zone.zone,
      capacity: zone.zone.capacity,
      occupied: assignedSpots,
      available: zone.zone.capacity - assignedSpots,
      occupancyRate: zone.zone.capacity > 0 ? (assignedSpots / zone.zone.capacity) * 100 : 0,
    };
  }

  // Entry/Exit logging
  static async logEntry(data) {
    return FleetParking.create({
      ...data,
      type: 'entry_log',
      entryLog: { ...data.entryLog, entryTime: new Date() },
    });
  }

  static async logExit(id) {
    const record = await FleetParking.findById(id);
    if (!record || record.type !== 'entry_log') return null;
    record.entryLog.exitTime = new Date();
    const duration = (record.entryLog.exitTime - record.entryLog.entryTime) / (1000 * 60 * 60);
    record.entryLog.duration = Math.round(duration * 100) / 100;
    // Calculate cost if zone has hourly rate
    if (record.entryLog.zoneRef) {
      const zone = await FleetParking.findById(record.entryLog.zoneRef);
      if (zone && zone.zone.hourlyRate) {
        record.entryLog.cost = Math.ceil(duration) * zone.zone.hourlyRate;
      }
    }
    await record.save();
    return record;
  }

  // Violations
  static async createViolation(data) {
    return FleetParking.create({
      ...data,
      type: 'violation',
      violation: { ...data.violation, issueDate: new Date() },
    });
  }

  static async payViolation(id) {
    return FleetParking.findByIdAndUpdate(
      id,
      { 'violation.violationStatus': 'paid', 'violation.paidDate': new Date() },
      { new: true }
    );
  }

  static async getVehicleViolations(vehicleId) {
    return FleetParking.find({
      'violation.vehicle': vehicleId,
      isActive: true,
      type: 'violation',
    }).sort({ createdAt: -1 });
  }

  static async getStatistics(organizationId) {
    const [totalZones, totalSpots, activeViolations, unpaidFines] = await Promise.all([
      FleetParking.countDocuments({
        organization: organizationId,
        isActive: true,
        type: 'parking_zone',
      }),
      FleetParking.countDocuments({
        organization: organizationId,
        isActive: true,
        type: 'assigned_spot',
      }),
      FleetParking.countDocuments({
        organization: organizationId,
        isActive: true,
        type: 'violation',
        'violation.violationStatus': { $in: ['issued', 'pending_payment'] },
      }),
      FleetParking.aggregate([
        {
          $match: {
            organization: organizationId,
            isActive: true,
            type: 'violation',
            'violation.violationStatus': { $in: ['issued', 'pending_payment'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$violation.fineAmount' } } },
      ]),
    ]);
    return { totalZones, totalSpots, activeViolations, unpaidFines: unpaidFines[0]?.total || 0 };
  }
}

module.exports = FleetParkingService;
