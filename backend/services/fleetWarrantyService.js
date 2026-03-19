/**
 * Fleet Warranty Service - خدمة ضمانات الأسطول
 */

const FleetWarranty = require('../models/FleetWarranty');
const logger = require('../utils/logger');

class FleetWarrantyService {
  async create(data) {
    const record = await FleetWarranty.create(data);
    logger.info(`Warranty created: ${record.warrantyNumber}`);
    return record;
  }

  async getAll(query = {}) {
    const { page = 1, limit = 20, organization, vehicle, type, status, category } = query;
    const filter = {};
    if (organization) filter.organization = organization;
    if (vehicle) filter.vehicle = vehicle;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetWarranty.find(filter)
        .populate('vehicle part')
        .sort({ 'coverage.endDate': 1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetWarranty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getById(id) {
    return FleetWarranty.findById(id).populate('vehicle part createdBy');
  }

  async update(id, data) {
    return FleetWarranty.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id) {
    return FleetWarranty.findByIdAndDelete(id);
  }

  async getExpiring(query = {}) {
    const { organization, days = 60, page = 1, limit = 20 } = query;
    const future = new Date();
    future.setDate(future.getDate() + Number(days));
    const filter = {
      'coverage.endDate': { $gte: new Date(), $lte: future },
      status: { $nin: ['expired', 'voided'] },
    };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetWarranty.find(filter)
        .populate('vehicle part')
        .sort({ 'coverage.endDate': 1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetWarranty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getExpired(query = {}) {
    const { organization, page = 1, limit = 20 } = query;
    const filter = { 'coverage.endDate': { $lt: new Date() } };
    if (organization) filter.organization = organization;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      FleetWarranty.find(filter)
        .populate('vehicle part')
        .sort({ 'coverage.endDate': -1 })
        .skip(skip)
        .limit(Number(limit)),
      FleetWarranty.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  async getByVehicle(vehicleId) {
    return FleetWarranty.find({ vehicle: vehicleId })
      .populate('part')
      .sort({ 'coverage.endDate': 1 });
  }

  async addClaim(id, claimData) {
    const warranty = await FleetWarranty.findById(id);
    if (!warranty) throw new Error('الضمان غير موجود');
    const claimNumber = `CLM-${warranty.warrantyNumber}-${(warranty.claims?.length || 0) + 1}`;
    claimData.claimNumber = claimNumber;
    claimData.claimDate = claimData.claimDate || new Date();
    warranty.claims.push(claimData);
    if (warranty.coverage) {
      warranty.coverage.usedClaims = (warranty.coverage.usedClaims || 0) + 1;
    }
    await warranty.save();
    logger.info(`Warranty claim added: ${claimNumber}`);
    return warranty;
  }

  async updateClaim(id, claimNumber, claimData) {
    const warranty = await FleetWarranty.findById(id);
    if (!warranty) throw new Error('الضمان غير موجود');
    const claim = warranty.claims.find(c => c.claimNumber === claimNumber);
    if (!claim) throw new Error('المطالبة غير موجودة');
    Object.assign(claim, claimData);
    if (claimData.approvedAmount && warranty.coverage) {
      const totalUsed = warranty.claims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
      warranty.coverage.usedCoverageAmount = totalUsed;
    }
    await warranty.save();
    return warranty;
  }

  async getStatistics(organization) {
    const [total, active, expiringSoon, expired, claimStats] = await Promise.all([
      FleetWarranty.countDocuments({ organization }),
      FleetWarranty.countDocuments({ organization, status: 'active' }),
      FleetWarranty.countDocuments({ organization, status: 'expiring_soon' }),
      FleetWarranty.countDocuments({ organization, status: 'expired' }),
      FleetWarranty.aggregate([
        { $match: { organization: new (require('mongoose').Types.ObjectId)(organization) } },
        { $unwind: { path: '$claims', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            totalClaims: { $sum: 1 },
            totalClaimAmount: { $sum: '$claims.claimAmount' },
            totalApproved: { $sum: '$claims.approvedAmount' },
          },
        },
      ]),
    ]);
    const claims = claimStats[0] || {};
    return {
      total,
      active,
      expiringSoon,
      expired,
      totalClaims: claims.totalClaims || 0,
      totalClaimAmount: claims.totalClaimAmount || 0,
      totalApproved: claims.totalApproved || 0,
    };
  }
}

module.exports = new FleetWarrantyService();
