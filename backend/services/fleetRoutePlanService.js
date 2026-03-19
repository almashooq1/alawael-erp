/**
 * Fleet Route Plan Service - خدمة تخطيط المسارات
 */

const FleetRoutePlan = require('../models/FleetRoutePlan');
const logger = require('../utils/logger');

class FleetRoutePlanService {
  async create(data) {
    const record = await FleetRoutePlan.create(data);
    logger.info(`Route plan created: ${record.planNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const { page = 1, limit = 20, organization, vehicle, driver, status, type } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (vehicle) filter.vehicle = vehicle;
    if (driver) filter.driver = driver;
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetRoutePlan.find(filter)
        .populate('vehicle driver')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetRoutePlan.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetRoutePlan.findById(id).populate('vehicle driver trip createdBy approvedBy');
  }

  async update(id, data) {
    return FleetRoutePlan.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetRoutePlan.findByIdAndDelete(id);
  }

  async approve(id, userId) {
    return FleetRoutePlan.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: userId, approvedAt: new Date() },
      { new: true }
    );
  }

  async start(id) {
    return FleetRoutePlan.findByIdAndUpdate(
      id,
      {
        status: 'in_progress',
        'origin.actualDeparture': new Date(),
      },
      { new: true }
    );
  }

  async complete(id, data = {}) {
    return FleetRoutePlan.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        'destination.actualArrival': new Date(),
        actualDistance: data.actualDistance,
        actualDuration: data.actualDuration,
        actualFuelConsumption: data.actualFuelConsumption,
        actualTollCost: data.actualTollCost,
      },
      { new: true }
    );
  }

  async completeWaypoint(id, waypointOrder, data = {}) {
    const plan = await FleetRoutePlan.findById(id);
    if (!plan) throw new Error('خطة المسار غير موجودة');
    const wp = plan.waypoints.find(w => w.order === Number(waypointOrder));
    if (!wp) throw new Error('نقطة التوقف غير موجودة');
    wp.completed = true;
    wp.actualArrival = data.actualArrival || new Date();
    wp.actualDeparture = data.actualDeparture;
    await plan.save();
    return plan;
  }

  async skipWaypoint(id, waypointOrder, reason) {
    const plan = await FleetRoutePlan.findById(id);
    if (!plan) throw new Error('خطة المسار غير موجودة');
    const wp = plan.waypoints.find(w => w.order === Number(waypointOrder));
    if (!wp) throw new Error('نقطة التوقف غير موجودة');
    wp.skipped = true;
    wp.skipReason = reason;
    await plan.save();
    return plan;
  }

  async getActive(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { status: 'in_progress' };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetRoutePlan.find(filter)
        .populate('vehicle driver')
        .sort({ 'origin.scheduledDeparture': 1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetRoutePlan.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getUpcoming(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = {
      status: { $in: ['planned', 'approved'] },
      'origin.scheduledDeparture': { $gte: new Date() },
    };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetRoutePlan.find(filter)
        .populate('vehicle driver')
        .sort({ 'origin.scheduledDeparture': 1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetRoutePlan.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getStatistics(organization) {
    const [total, draft, planned, inProgress, completed, perfAgg] = await Promise.all([
      FleetRoutePlan.countDocuments({ organization }),
      FleetRoutePlan.countDocuments({ organization, status: 'draft' }),
      FleetRoutePlan.countDocuments({ organization, status: { $in: ['planned', 'approved'] } }),
      FleetRoutePlan.countDocuments({ organization, status: 'in_progress' }),
      FleetRoutePlan.countDocuments({ organization, status: 'completed' }),
      FleetRoutePlan.aggregate([
        {
          $match: {
            organization: new (require('mongoose').Types.ObjectId)(organization),
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            avgScore: { $avg: '$performance.score' },
            totalDistance: { $sum: '$actualDistance' },
            avgDelay: { $avg: '$performance.delayMinutes' },
          },
        },
      ]),
    ]);
    const perf = perfAgg[0] || {};
    return {
      total,
      draft,
      planned,
      inProgress,
      completed,
      avgScore: Math.round(perf.avgScore || 0),
      totalDistance: perf.totalDistance || 0,
      avgDelay: Math.round(perf.avgDelay || 0),
    };
  }
}

module.exports = new FleetRoutePlanService();
