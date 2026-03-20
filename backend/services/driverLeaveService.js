/**
 * Driver Leave Service - خدمة إجازات السائقين
 */

const DriverLeave = require('../models/DriverLeave');
const _logger = require('../utils/logger');

class DriverLeaveService {
  static async create(data) {
    // Check for overlapping leaves
    const overlap = await DriverLeave.findOne({
      driver: data.driver,
      isActive: true,
      status: { $in: ['pending', 'approved', 'active'] },
      startDate: { $lte: data.endDate },
      endDate: { $gte: data.startDate },
    });
    if (overlap) throw new Error('يوجد إجازة متداخلة للسائق في هذه الفترة');
    return DriverLeave.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.driver) query.driver = filter.driver;
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.dateFrom) query.startDate = { $gte: new Date(filter.dateFrom) };
    if (filter.dateTo) query.endDate = { ...(query.endDate || {}), $lte: new Date(filter.dateTo) };

    const [leaves, total] = await Promise.all([
      DriverLeave.find(query)
        .populate('driver', 'name phone licenseNumber')
        .populate('substituteDriver', 'name phone')
        .populate('approvedBy', 'name')
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      DriverLeave.countDocuments(query),
    ]);
    return { leaves, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return DriverLeave.findById(id)
      .populate('driver', 'name phone licenseNumber')
      .populate('substituteDriver', 'name phone licenseNumber')
      .populate('approvedBy', 'name email')
      .populate('rejectedBy', 'name email')
      .populate('affectedTrips')
      .populate('affectedShifts');
  }

  static async update(id, data) {
    return DriverLeave.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return DriverLeave.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async approve(id, approvedBy) {
    return DriverLeave.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy, approvedAt: new Date() },
      { new: true }
    );
  }

  static async reject(id, rejectedBy, rejectionReason) {
    return DriverLeave.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectedBy, rejectedAt: new Date(), rejectionReason },
      { new: true }
    );
  }

  static async cancel(id) {
    return DriverLeave.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
  }

  static async assignSubstitute(id, substituteDriverId, reassignmentNotes) {
    return DriverLeave.findByIdAndUpdate(
      id,
      { substituteDriver: substituteDriverId, coverageArranged: true, reassignmentNotes },
      { new: true }
    );
  }

  static async getActiveLeaves(organizationId) {
    const now = new Date();
    return DriverLeave.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['approved', 'active'] },
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('driver', 'name phone')
      .populate('substituteDriver', 'name phone')
      .sort({ endDate: 1 });
  }

  static async getUpcomingLeaves(organizationId, days = 14) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return DriverLeave.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['approved'] },
      startDate: { $gt: new Date(), $lte: futureDate },
    })
      .populate('driver', 'name phone')
      .populate('substituteDriver', 'name')
      .sort({ startDate: 1 });
  }

  static async getPendingApprovals(organizationId) {
    return DriverLeave.find({
      organization: organizationId,
      isActive: true,
      status: 'pending',
    })
      .populate('driver', 'name phone')
      .sort({ createdAt: 1 });
  }

  static async getDriverBalance(driverId, year) {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31);

    const leaves = await DriverLeave.find({
      driver: driverId,
      isActive: true,
      status: { $in: ['approved', 'active', 'completed'] },
      startDate: { $gte: startOfYear, $lte: endOfYear },
    });

    const summary = {};
    leaves.forEach(leave => {
      if (!summary[leave.type]) summary[leave.type] = { count: 0, days: 0 };
      summary[leave.type].count += 1;
      summary[leave.type].days += leave.totalDays || 0;
    });
    return { year: targetYear, driverId, leavesByType: summary, totalLeaves: leaves.length };
  }

  static async getStatistics(organizationId) {
    const [total, pending, approved, active, rejected, byType] = await Promise.all([
      DriverLeave.countDocuments({ organization: organizationId, isActive: true }),
      DriverLeave.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'pending',
      }),
      DriverLeave.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'approved',
      }),
      DriverLeave.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'active',
      }),
      DriverLeave.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'rejected',
      }),
      DriverLeave.aggregate([
        { $match: { organization: organizationId, isActive: true } },
        { $group: { _id: '$type', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return { total, pending, approved, active, rejected, byType };
  }
}

module.exports = DriverLeaveService;
