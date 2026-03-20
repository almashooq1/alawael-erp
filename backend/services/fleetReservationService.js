/**
 * Fleet Reservation Service - خدمة حجوزات الأسطول
 */

const FleetReservation = require('../models/FleetReservation');
const _logger = require('../utils/logger');

class FleetReservationService {
  static async create(data) {
    // Check for conflicts
    const conflict = await FleetReservation.findOne({
      vehicle: data.vehicle,
      isActive: true,
      status: { $in: ['pending', 'approved', 'active'] },
      $or: [{ startDate: { $lte: data.endDate }, endDate: { $gte: data.startDate } }],
    });
    if (conflict) throw new Error('يوجد حجز متعارض لهذه المركبة في الفترة المحددة');
    return FleetReservation.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.requestedBy) query.requestedBy = filter.requestedBy;
    if (filter.status) query.status = filter.status;
    if (filter.purpose) query.purpose = filter.purpose;
    if (filter.dateFrom) query.startDate = { $gte: new Date(filter.dateFrom) };
    if (filter.dateTo) query.endDate = { ...(query.endDate || {}), $lte: new Date(filter.dateTo) };

    const [reservations, total] = await Promise.all([
      FleetReservation.find(query)
        .populate('vehicle', 'plateNumber make model')
        .populate('driver', 'name phone')
        .populate('requestedBy', 'name department')
        .populate('approvedBy', 'name')
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetReservation.countDocuments(query),
    ]);
    return { reservations, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetReservation.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name phone licenseNumber')
      .populate('requestedBy', 'name email department')
      .populate('approvedBy', 'name');
  }

  static async update(id, data) {
    return FleetReservation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return FleetReservation.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async approve(id, approvedBy) {
    return FleetReservation.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy, approvedAt: new Date() },
      { new: true }
    );
  }

  static async reject(id, rejectedBy, rejectionReason) {
    return FleetReservation.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason },
      { new: true }
    );
  }

  static async activate(id, startOdometer) {
    return FleetReservation.findByIdAndUpdate(
      id,
      { status: 'active', startOdometer },
      { new: true }
    );
  }

  static async complete(id, returnData) {
    return FleetReservation.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        actualReturnDate: new Date(),
        endOdometer: returnData.endOdometer,
        fuelLevel: returnData.fuelLevel,
        condition: returnData.condition,
        damageNotes: returnData.damageNotes,
      },
      { new: true }
    );
  }

  static async cancel(id) {
    return FleetReservation.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true });
  }

  static async checkAvailability(vehicleId, startDate, endDate, excludeId) {
    const query = {
      vehicle: vehicleId,
      isActive: true,
      status: { $in: ['pending', 'approved', 'active'] },
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
    };
    if (excludeId) query._id = { $ne: excludeId };
    const conflicts = await FleetReservation.find(query)
      .populate('requestedBy', 'name')
      .sort({ startDate: 1 });
    return { available: conflicts.length === 0, conflicts };
  }

  static async getUpcoming(organizationId, days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return FleetReservation.find({
      organization: organizationId,
      isActive: true,
      status: { $in: ['approved', 'active'] },
      startDate: { $lte: futureDate, $gte: new Date() },
    })
      .populate('vehicle', 'plateNumber make model')
      .populate('requestedBy', 'name')
      .sort({ startDate: 1 });
  }

  static async getStatistics(organizationId) {
    const [total, pending, approved, active, completed] = await Promise.all([
      FleetReservation.countDocuments({ organization: organizationId, isActive: true }),
      FleetReservation.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'pending',
      }),
      FleetReservation.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'approved',
      }),
      FleetReservation.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'active',
      }),
      FleetReservation.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'completed',
      }),
    ]);
    return { total, pending, approved, active, completed };
  }
}

module.exports = FleetReservationService;
