/**
 * Fleet Compliance & Regulatory Service - خدمة الامتثال التنظيمي للأسطول
 */

const FleetCompliance = require('../models/FleetCompliance');
const logger = require('../utils/logger');

class FleetComplianceService {
  static async create(data) {
    return FleetCompliance.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;

    const [items, total] = await Promise.all([
      FleetCompliance.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name licenseNumber')
        .sort({ 'dates.expiryDate': 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetCompliance.countDocuments(query),
    ]);
    return { items, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetCompliance.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name licenseNumber phone')
      .populate('history.performedBy', 'name');
  }

  static async update(id, data, userId) {
    const item = await FleetCompliance.findById(id);
    if (!item) return null;
    const previousStatus = item.status;
    Object.assign(item, data);
    if (data.status && data.status !== previousStatus) {
      item.history.push({
        action: 'status_change',
        performedBy: userId,
        previousStatus,
        newStatus: data.status,
        notes: data.notes,
      });
    }
    await item.save();
    return item;
  }

  static async markCompliant(id, inspectionResult, userId) {
    const item = await FleetCompliance.findById(id);
    if (!item) return null;
    item.status = 'compliant';
    item.inspectionResult = inspectionResult;
    item.dates.lastCheckDate = new Date();
    item.history.push({
      action: 'marked_compliant',
      performedBy: userId,
      previousStatus: item.status,
      newStatus: 'compliant',
    });
    await item.save();
    return item;
  }

  static async markNonCompliant(id, findings, userId) {
    const item = await FleetCompliance.findById(id);
    if (!item) return null;
    item.status = 'non_compliant';
    item.inspectionResult = { passed: false, findings, inspectedAt: new Date() };
    item.history.push({
      action: 'marked_non_compliant',
      performedBy: userId,
      previousStatus: item.status,
      newStatus: 'non_compliant',
    });
    await item.save();
    return item;
  }

  static async addDocument(id, docData) {
    return FleetCompliance.findByIdAndUpdate(
      id,
      {
        $push: { documents: docData },
      },
      { new: true }
    );
  }

  static async getExpiring(daysAhead = 30, organization) {
    const deadline = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const query = {
      isActive: true,
      'dates.expiryDate': { $lte: deadline, $gte: new Date() },
      status: { $nin: ['expired', 'exempt', 'waived'] },
    };
    if (organization) query.organization = organization;
    return FleetCompliance.find(query)
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name')
      .sort({ 'dates.expiryDate': 1 });
  }

  static async getNonCompliant(organization) {
    const query = { isActive: true, status: { $in: ['non_compliant', 'expired'] } };
    if (organization) query.organization = organization;
    return FleetCompliance.find(query)
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name')
      .sort({ 'dates.expiryDate': 1 });
  }

  static async getVehicleCompliance(vehicleId) {
    return FleetCompliance.find({ vehicle: vehicleId, isActive: true }).sort({ category: 1 });
  }

  static async getDriverCompliance(driverId) {
    return FleetCompliance.find({ driver: driverId, isActive: true }).sort({ category: 1 });
  }

  static async getComplianceScore(vehicleId) {
    const items = await FleetCompliance.find({ vehicle: vehicleId, isActive: true });
    if (items.length === 0) return { score: 100, total: 0, compliant: 0 };
    const mandatory = items.filter(i => i.requirement.mandatory);
    const compliant = mandatory.filter(i => i.status === 'compliant').length;
    const score = mandatory.length > 0 ? Math.round((compliant / mandatory.length) * 100) : 100;
    return {
      score,
      total: mandatory.length,
      compliant,
      nonCompliant: mandatory.length - compliant,
    };
  }

  static async getStatistics(organization) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);

    const stats = await FleetCompliance.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          compliant: { $sum: { $cond: [{ $eq: ['$status', 'compliant'] }, 1, 0] } },
          nonCompliant: { $sum: { $cond: [{ $eq: ['$status', 'non_compliant'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          expiringSoon: { $sum: { $cond: [{ $eq: ['$status', 'expiring_soon'] }, 1, 0] } },
        },
      },
    ]);

    const byCategory = await FleetCompliance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          compliant: { $sum: { $cond: [{ $eq: ['$status', 'compliant'] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const byAuthority = await FleetCompliance.aggregate([
      { $match: match },
      { $group: { _id: '$authority.type', count: { $sum: 1 } } },
    ]);

    const summary = stats[0] || {};
    summary.overallComplianceRate =
      summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0;

    return { summary, byCategory, byAuthority };
  }
}

module.exports = FleetComplianceService;
