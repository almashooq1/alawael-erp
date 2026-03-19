/**
 * Fleet Fuel Service - خدمة إدارة الوقود
 */

const FleetFuel = require('../models/FleetFuel');
const logger = require('../utils/logger');

class FleetFuelService {
  async create(data) {
    // Auto-calc distance since last fill
    if (data.odometerReading && data.vehicle) {
      const lastFill = await FleetFuel.findOne({ vehicle: data.vehicle, type: 'refueling' }).sort({
        date: -1,
      });
      if (lastFill && lastFill.odometerReading) {
        data.previousOdometer = lastFill.odometerReading;
        data.distanceSinceLastFill = data.odometerReading - lastFill.odometerReading;
      }
    }
    const record = await FleetFuel.create(data);
    logger.info(`Fuel record created: ${record.transactionNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const {
      page = 1,
      limit = 20,
      organization,
      vehicle,
      driver,
      status,
      fuelType,
      startDate,
      endDate,
      anomaly,
    } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (vehicle) filter.vehicle = vehicle;
    if (driver) filter.driver = driver;
    if (status) filter.status = status;
    if (fuelType) filter.fuelType = fuelType;
    if (anomaly === 'true') filter['anomaly.detected'] = true;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetFuel.find(filter)
        .populate('vehicle driver fuelCard')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetFuel.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetFuel.findById(id).populate('vehicle driver fuelCard createdBy verifiedBy');
  }

  async update(id, data) {
    return FleetFuel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetFuel.findByIdAndDelete(id);
  }

  async verify(id, userId) {
    return FleetFuel.findByIdAndUpdate(
      id,
      { status: 'verified', verifiedBy: userId, verifiedAt: new Date() },
      { new: true }
    );
  }

  async getByVehicle(vehicleId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { vehicle: vehicleId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetFuel.find(filter).populate('driver').sort({ date: -1 }).skip(skip).limit(Number(limit)),
      FleetFuel.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getByDriver(driverId, query = {}) {
    const { page = 1, limit = 20 } = query;
    const filter = { driver: driverId };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetFuel.find(filter).populate('vehicle').sort({ date: -1 }).skip(skip).limit(Number(limit)),
      FleetFuel.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getAnomalies(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { 'anomaly.detected': true };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetFuel.find(filter)
        .populate('vehicle driver')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetFuel.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getEfficiencyReport(vehicleId) {
    const records = await FleetFuel.find({ vehicle: vehicleId, fuelEfficiency: { $gt: 0 } })
      .sort({ date: -1 })
      .limit(50);
    if (!records.length) return { average: 0, best: 0, worst: 0, trend: [], count: 0 };
    const efficiencies = records.map(r => r.fuelEfficiency);
    return {
      average:
        Math.round((efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length) * 100) / 100,
      best: Math.max(...efficiencies),
      worst: Math.min(...efficiencies),
      trend: records
        .slice(0, 10)
        .map(r => ({ date: r.date, efficiency: r.fuelEfficiency, quantity: r.quantity })),
      count: records.length,
    };
  }

  async getStatistics(organization) {
    const [total, pending, verified, anomalies, costAgg] = await Promise.all([
      FleetFuel.countDocuments({ organization }),
      FleetFuel.countDocuments({ organization, status: 'pending' }),
      FleetFuel.countDocuments({ organization, status: 'verified' }),
      FleetFuel.countDocuments({ organization, 'anomaly.detected': true }),
      FleetFuel.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$totalCost' },
            totalQuantity: { $sum: '$quantity' },
            avgEfficiency: { $avg: '$fuelEfficiency' },
          },
        },
      ]),
    ]);
    const agg = costAgg[0] || {};
    return {
      total,
      pending,
      verified,
      anomalies,
      totalCost: agg.totalCost || 0,
      totalQuantity: agg.totalQuantity || 0,
      avgEfficiency: Math.round((agg.avgEfficiency || 0) * 100) / 100,
    };
  }
}

module.exports = new FleetFuelService();
