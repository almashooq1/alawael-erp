/**
 * Cargo Service - خدمة إدارة الشحنات
 */

const Cargo = require('../models/Cargo');
const logger = require('../utils/logger');

class CargoService {
  static async create(data) {
    return Cargo.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      query.$or = [
        { cargoNumber: { $regex: filter.search, $options: 'i' } },
        { description: { $regex: filter.search, $options: 'i' } },
        { 'shipper.name': { $regex: filter.search, $options: 'i' } },
        { 'consignee.name': { $regex: filter.search, $options: 'i' } },
      ];
    }

    const [shipments, total] = await Promise.all([
      Cargo.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Cargo.countDocuments(query),
    ]);
    return { shipments, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return Cargo.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name phone licenseNumber')
      .populate('trip')
      .populate('dispatchOrder');
  }

  static async update(id, data) {
    return Cargo.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return Cargo.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async updateStatus(id, status, additionalData = {}) {
    const update = { status, ...additionalData };
    if (status === 'loaded') update.actualPickupDate = new Date();
    if (status === 'delivered') update.actualDeliveryDate = new Date();
    return Cargo.findByIdAndUpdate(id, update, { new: true });
  }

  static async confirmDelivery(id, podData) {
    return Cargo.findByIdAndUpdate(
      id,
      {
        status: 'delivered',
        actualDeliveryDate: new Date(),
        proofOfDelivery: { ...podData, signedAt: new Date() },
      },
      { new: true }
    );
  }

  static async getByVehicle(vehicleId, status) {
    const query = { vehicle: vehicleId, isActive: true };
    if (status) query.status = status;
    return Cargo.find(query).sort({ createdAt: -1 });
  }

  static async getByDriver(driverId) {
    return Cargo.find({ driver: driverId, isActive: true })
      .populate('vehicle', 'plateNumber')
      .sort({ createdAt: -1 });
  }

  static async getInTransit(organizationId) {
    return Cargo.find({
      organization: organizationId,
      isActive: true,
      status: 'in_transit',
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('driver', 'name phone')
      .sort({ expectedDeliveryDate: 1 });
  }

  static async getDelayed(organizationId) {
    return Cargo.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['in_transit', 'loading', 'loaded'] },
      expectedDeliveryDate: { $lt: new Date() },
    })
      .populate('vehicle', 'plateNumber')
      .populate('driver', 'name phone')
      .sort({ expectedDeliveryDate: 1 });
  }

  static async getStatistics(organizationId) {
    const [total, inTransit, delivered, delayed, revenue] = await Promise.all([
      Cargo.countDocuments({ organization: organizationId, isActive: true }),
      Cargo.countDocuments({ organization: organizationId, isActive: true, status: 'in_transit' }),
      Cargo.countDocuments({ organization: organizationId, isActive: true, status: 'delivered' }),
      Cargo.countDocuments({
        organization: organizationId,
        isActive: true,
        status: { $in: ['in_transit', 'loading'] },
        expectedDeliveryDate: { $lt: new Date() },
      }),
      Cargo.aggregate([
        { $match: { organization: organizationId, isActive: true, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$freightCharge' } } },
      ]),
    ]);
    return { total, inTransit, delivered, delayed, totalRevenue: revenue[0]?.total || 0 };
  }
}

module.exports = CargoService;
