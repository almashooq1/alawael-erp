/**
 * Fleet Parts Service - خدمة قطع غيار الأسطول
 */

const FleetPart = require('../models/FleetPart');
const logger = require('../utils/logger');

class FleetPartService {
  static async create(data) {
    return FleetPart.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;
    if (filter.brand) query.brand = filter.brand;
    if (filter.search) {
      query.$or = [
        { name: { $regex: filter.search, $options: 'i' } },
        { nameAr: { $regex: filter.search, $options: 'i' } },
        { sku: { $regex: filter.search, $options: 'i' } },
        { partNumber: { $regex: filter.search, $options: 'i' } },
      ];
    }

    const [parts, total] = await Promise.all([
      FleetPart.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetPart.countDocuments(query),
    ]);
    return { parts, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetPart.findById(id);
  }

  static async update(id, data) {
    return FleetPart.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return FleetPart.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async adjustStock(id, quantity, type = 'add') {
    const part = await FleetPart.findById(id);
    if (!part) return null;
    if (type === 'add') {
      part.quantityInStock += quantity;
    } else if (type === 'use') {
      if (part.quantityInStock < quantity) throw new Error('مخزون غير كافٍ');
      part.quantityInStock -= quantity;
      part.totalUsed += quantity;
      part.lastUsedDate = new Date();
    }
    await part.save();
    return part;
  }

  static async getLowStock(organizationId) {
    return FleetPart.find({
      organization: organizationId,
      isActive: true,
      $expr: { $lte: ['$quantityInStock', '$minimumStock'] },
    }).sort({ quantityInStock: 1 });
  }

  static async getOutOfStock(organizationId) {
    return FleetPart.find({
      organization: organizationId,
      isActive: true,
      quantityInStock: 0,
    }).sort({ name: 1 });
  }

  static async getByCategory(organizationId, category) {
    return FleetPart.find({
      organization: organizationId,
      isActive: true,
      category,
    }).sort({ name: 1 });
  }

  static async getCompatibleParts(make, model, year) {
    return FleetPart.find({
      isActive: true,
      'compatibleVehicles.make': make,
      'compatibleVehicles.model': model,
      'compatibleVehicles.yearFrom': { $lte: year },
      'compatibleVehicles.yearTo': { $gte: year },
    });
  }

  static async getStatistics(organizationId) {
    const [total, inStock, lowStock, outOfStock, totalValue] = await Promise.all([
      FleetPart.countDocuments({ organization: organizationId, isActive: true }),
      FleetPart.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'in_stock',
      }),
      FleetPart.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'low_stock',
      }),
      FleetPart.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'out_of_stock',
      }),
      FleetPart.aggregate([
        { $match: { organization: organizationId, isActive: true } },
        {
          $group: { _id: null, value: { $sum: { $multiply: ['$quantityInStock', '$unitCost'] } } },
        },
      ]),
    ]);
    return {
      total,
      inStock,
      lowStock,
      outOfStock,
      totalInventoryValue: totalValue[0]?.value || 0,
    };
  }
}

module.exports = FleetPartService;
