/**
 * Vehicle Assignment Service - خدمة تعيينات المركبات
 */

const VehicleAssignment = require('../models/VehicleAssignment');
const _logger = require('../utils/logger');

class VehicleAssignmentService {
  static async create(data) {
    // Deactivate previous active assignment for same vehicle
    await VehicleAssignment.updateMany(
      { vehicle: data.vehicle, status: 'active', isActive: true },
      { status: 'transferred' }
    );
    return VehicleAssignment.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.driver) query.driver = filter.driver;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.department) query.department = filter.department;

    const [assignments, total] = await Promise.all([
      VehicleAssignment.find(query)
        .populate('vehicle', 'plateNumber make model year')
        .populate('driver', 'name phone licenseNumber')
        .populate('previousDriver', 'name')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      VehicleAssignment.countDocuments(query),
    ]);
    return { assignments, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return VehicleAssignment.findById(id)
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name phone licenseNumber')
      .populate('previousDriver', 'name phone')
      .populate('approvedBy', 'name')
      .populate('handover.handoverBy', 'name')
      .populate('handover.receivedBy', 'name')
      .populate('returnDetails.returnedTo', 'name');
  }

  static async update(id, data) {
    return VehicleAssignment.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async delete(id) {
    return VehicleAssignment.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  static async recordHandover(id, handoverData) {
    return VehicleAssignment.findByIdAndUpdate(
      id,
      { handover: { ...handoverData, date: new Date() }, status: 'active' },
      { new: true }
    );
  }

  static async recordReturn(id, returnData) {
    return VehicleAssignment.findByIdAndUpdate(
      id,
      { returnDetails: { ...returnData, date: new Date() }, status: 'returned' },
      { new: true }
    );
  }

  static async transfer(id, newDriverId, transferData) {
    const assignment = await VehicleAssignment.findById(id);
    if (!assignment) return null;
    assignment.status = 'transferred';
    await assignment.save();
    // Create new assignment
    return VehicleAssignment.create({
      organization: assignment.organization,
      vehicle: assignment.vehicle,
      driver: newDriverId,
      previousDriver: assignment.driver,
      type: assignment.type,
      department: transferData.department || assignment.department,
      startDate: new Date(),
      ...transferData,
    });
  }

  static async getActiveByVehicle(vehicleId) {
    return VehicleAssignment.findOne({ vehicle: vehicleId, status: 'active', isActive: true })
      .populate('driver', 'name phone licenseNumber')
      .populate('vehicle', 'plateNumber make model');
  }

  static async getActiveByDriver(driverId) {
    return VehicleAssignment.findOne({ driver: driverId, status: 'active', isActive: true })
      .populate('vehicle', 'plateNumber make model year')
      .populate('driver', 'name');
  }

  static async getHistory(vehicleId) {
    return VehicleAssignment.find({ vehicle: vehicleId, isActive: true })
      .populate('driver', 'name phone')
      .populate('previousDriver', 'name')
      .sort({ startDate: -1 });
  }

  static async getDriverHistory(driverId) {
    return VehicleAssignment.find({ driver: driverId, isActive: true })
      .populate('vehicle', 'plateNumber make model')
      .sort({ startDate: -1 });
  }

  static async getStatistics(organizationId) {
    const [total, active, returned, transferred, byType] = await Promise.all([
      VehicleAssignment.countDocuments({ organization: organizationId, isActive: true }),
      VehicleAssignment.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'active',
      }),
      VehicleAssignment.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'returned',
      }),
      VehicleAssignment.countDocuments({
        organization: organizationId,
        isActive: true,
        status: 'transferred',
      }),
      VehicleAssignment.aggregate([
        { $match: { organization: organizationId, isActive: true, status: 'active' } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);
    return { total, active, returned, transferred, byType };
  }
}

module.exports = VehicleAssignmentService;
