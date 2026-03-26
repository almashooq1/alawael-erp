/**
 * Vehicle Insurance Service - خدمة تأمين المركبات
 */

const VehicleInsurance = require('../models/VehicleInsurance');
const _logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

class VehicleInsuranceService {
  static async create(data) {
    return VehicleInsurance.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.provider) query['provider.name'] = { $regex: escapeRegex(filter.provider), $options: 'i' };

    const [policies, total] = await Promise.all([
      VehicleInsurance.find(query)
        .populate('vehicle', 'plateNumber make model year')
        .sort({ endDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      VehicleInsurance.countDocuments(query),
    ]);
    return { policies, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return VehicleInsurance.findById(id).populate('vehicle', 'plateNumber make model year vin');
  }

  static async update(id, data) {
    return VehicleInsurance.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async activatePolicy(id) {
    return VehicleInsurance.findByIdAndUpdate(id, { status: 'active' }, { new: true });
  }

  static async cancelPolicy(id, reason) {
    return VehicleInsurance.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        notes: reason,
      },
      { new: true }
    );
  }

  static async addPayment(id, paymentData) {
    const policy = await VehicleInsurance.findById(id);
    if (!policy) return null;
    policy.payments.push(paymentData);
    policy.premium.totalPaid = policy.payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    await policy.save();
    return policy;
  }

  static async fileClaim(id, claimData) {
    const policy = await VehicleInsurance.findById(id);
    if (!policy) return null;
    if (policy.status !== 'active') throw new Error('البوليصة غير نشطة');
    const claimCount = await VehicleInsurance.aggregate([
      { $match: { _id: policy._id } },
      { $unwind: '$claims' },
      { $count: 'total' },
    ]);
    const num = (claimCount[0]?.total || 0) + 1;
    claimData.claimNumber = `CLM-${policy.policyNumber}-${String(num).padStart(3, '0')}`;
    claimData.submittedAt = new Date();
    policy.claims.push(claimData);
    await policy.save();
    return policy;
  }

  static async updateClaim(id, claimId, data) {
    const policy = await VehicleInsurance.findById(id);
    if (!policy) return null;
    const claim = policy.claims.id(claimId);
    if (!claim) return null;
    Object.assign(claim, data);
    if (data.status === 'paid' || data.status === 'closed') claim.resolvedAt = new Date();
    await policy.save();
    return policy;
  }

  static async getExpiringPolicies(daysAhead = 30, organization) {
    const deadline = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const query = {
      isActive: true,
      status: 'active',
      endDate: { $lte: deadline, $gte: new Date() },
    };
    if (organization) query.organization = organization;
    return VehicleInsurance.find(query)
      .populate('vehicle', 'plateNumber make model')
      .sort({ endDate: 1 });
  }

  static async getVehicleInsurance(vehicleId) {
    return VehicleInsurance.find({ vehicle: vehicleId, isActive: true }).sort({ endDate: -1 });
  }

  static async getStatistics(organization) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);
    const stats = await VehicleInsurance.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPolicies: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          totalPremiums: { $sum: '$premium.amount' },
          totalPaid: { $sum: '$premium.totalPaid' },
          totalClaims: { $sum: { $size: '$claims' } },
        },
      },
    ]);

    const byType = await VehicleInsurance.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 }, totalPremium: { $sum: '$premium.amount' } } },
    ]);

    const byProvider = await VehicleInsurance.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$provider.name',
          count: { $sum: 1 },
          totalPremium: { $sum: '$premium.amount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return { summary: stats[0] || {}, byType, byProvider };
  }

  static async renewPolicy(id, renewalData) {
    const oldPolicy = await VehicleInsurance.findById(id);
    if (!oldPolicy) return null;
    oldPolicy.status = 'expired';
    await oldPolicy.save();

    const newData = {
      ...oldPolicy.toObject(),
      _id: undefined,
      policyNumber: undefined,
      startDate: renewalData.startDate || oldPolicy.endDate,
      endDate: renewalData.endDate,
      premium: {
        ...oldPolicy.premium.toObject(),
        amount: renewalData.premium || oldPolicy.premium.amount,
        totalPaid: 0,
      },
      status: 'active',
      claims: [],
      payments: [],
      renewal: {
        ...oldPolicy.renewal?.toObject(),
        renewalHistory: [
          ...(oldPolicy.renewal?.renewalHistory || []),
          {
            previousPolicyNumber: oldPolicy.policyNumber,
            renewedAt: new Date(),
            newPremium: renewalData.premium || oldPolicy.premium.amount,
          },
        ],
      },
    };
    return VehicleInsurance.create(newData);
  }
}

module.exports = VehicleInsuranceService;
