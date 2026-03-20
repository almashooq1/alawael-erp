/**
 * Fleet Alert Service - خدمة تنبيهات الأسطول
 */

const FleetAlert = require('../models/FleetAlert');
const _logger = require('../utils/logger');

class FleetAlertService {
  static async create(data) {
    return FleetAlert.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.category) query.category = filter.category;
    if (filter.severity) query.severity = filter.severity;
    if (filter.status) query.status = filter.status;
    if (filter.source) query.source = filter.source;

    const [alerts, total] = await Promise.all([
      FleetAlert.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name phone')
        .populate('acknowledgedBy', 'name')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetAlert.countDocuments(query),
    ]);
    return { alerts, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetAlert.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name phone licenseNumber')
      .populate('acknowledgedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('escalatedTo', 'name email');
  }

  static async update(id, data) {
    return FleetAlert.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return FleetAlert.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async acknowledge(id, userId) {
    return FleetAlert.findByIdAndUpdate(
      id,
      { status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() },
      { new: true }
    );
  }

  static async resolve(id, userId, resolutionNotes) {
    return FleetAlert.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedBy: userId, resolvedAt: new Date(), resolutionNotes },
      { new: true }
    );
  }

  static async dismiss(id, userId) {
    return FleetAlert.findByIdAndUpdate(
      id,
      { status: 'dismissed', resolvedBy: userId, resolvedAt: new Date() },
      { new: true }
    );
  }

  static async escalate(id, escalatedTo) {
    const alert = await FleetAlert.findById(id);
    if (!alert) return null;
    alert.status = 'escalated';
    alert.escalatedTo = escalatedTo;
    alert.escalatedAt = new Date();
    alert.escalationLevel = (alert.escalationLevel || 0) + 1;
    await alert.save();
    return alert;
  }

  static async getActive(organizationId) {
    return FleetAlert.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['active', 'escalated'] },
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name')
      .sort({ severity: -1, createdAt: -1 });
  }

  static async getCritical(organizationId) {
    return FleetAlert.find({
      organization: organizationId,
      isActive: true,
      severity: 'critical',
      status: { $in: ['active', 'escalated'] },
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 });
  }

  static async getByVehicle(vehicleId) {
    return FleetAlert.find({ vehicle: vehicleId, isActive: true }).sort({ createdAt: -1 });
  }

  static async getByDriver(driverId) {
    return FleetAlert.find({ driver: driverId, isActive: true }).sort({ createdAt: -1 });
  }

  static async bulkAcknowledge(ids, userId) {
    return FleetAlert.updateMany(
      { _id: { $in: ids }, status: 'active' },
      { status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() }
    );
  }

  static async getStatistics(organizationId) {
    const [total, active, critical, acknowledged, resolved, byCategory] = await Promise.all([
      FleetAlert.countDocuments({ organization: organizationId, isActive: true }),
      FleetAlert.countDocuments({ organization: organizationId, isActive: true, status: 'active' }),
      FleetAlert.countDocuments({
        organization: organizationId,
        isActive: true,
        severity: 'critical',
        status: { $in: ['active', 'escalated'] },
      }),
      FleetAlert.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'acknowledged',
      }),
      FleetAlert.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'resolved',
      }),
      FleetAlert.aggregate([
        { $match: { organization: organizationId, isActive: true, status: 'active' } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return { total, active, critical, acknowledged, resolved, byCategory };
  }
}

module.exports = FleetAlertService;
