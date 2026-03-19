/**
 * Fleet Document Service - خدمة مستندات الأسطول
 */

const FleetDocument = require('../models/FleetDocument');
const logger = require('../utils/logger');

class FleetDocumentService {
  static async create(data) {
    return FleetDocument.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.type) query.type = filter.type;
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;

    const [documents, total] = await Promise.all([
      FleetDocument.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name licenseNumber')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetDocument.countDocuments(query),
    ]);
    return { documents, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetDocument.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name licenseNumber phone')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name');
  }

  static async update(id, data) {
    return FleetDocument.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return FleetDocument.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async getExpiring(organizationId, days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return FleetDocument.find({
      organization: organizationId,
      isActive: true,
      expiryDate: { $lte: futureDate, $gte: new Date() },
      status: { $in: ['active', 'expiring_soon'] },
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name')
      .sort({ expiryDate: 1 });
  }

  static async getExpired(organizationId) {
    return FleetDocument.find({
      organization: organizationId,
      isActive: true,
      expiryDate: { $lt: new Date() },
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name')
      .sort({ expiryDate: 1 });
  }

  static async getByVehicle(vehicleId) {
    return FleetDocument.find({ vehicle: vehicleId, isActive: true }).sort({
      type: 1,
      expiryDate: 1,
    });
  }

  static async getByDriver(driverId) {
    return FleetDocument.find({ driver: driverId, isActive: true }).sort({
      type: 1,
      expiryDate: 1,
    });
  }

  static async verify(id, verifiedBy) {
    return FleetDocument.findByIdAndUpdate(
      id,
      { verifiedBy, verifiedAt: new Date() },
      { new: true }
    );
  }

  static async renewDocument(id, renewalData) {
    const doc = await FleetDocument.findById(id);
    if (!doc) return null;
    Object.assign(doc, renewalData);
    doc.status = 'active';
    doc.reminderSent = false;
    await doc.save();
    return doc;
  }

  static async getStatistics(organizationId) {
    const [total, active, expiring, expired, byType] = await Promise.all([
      FleetDocument.countDocuments({ organization: organizationId, isActive: true }),
      FleetDocument.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'active',
      }),
      FleetDocument.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'expiring_soon',
      }),
      FleetDocument.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'expired',
      }),
      FleetDocument.aggregate([
        { $match: { organization: organizationId, isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return { total, active, expiring, expired, byType };
  }
}

module.exports = FleetDocumentService;
