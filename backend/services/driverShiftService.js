/**
 * Driver Shift & Scheduling Service - خدمة جدولة ومناوبات السائقين
 */

const { DriverShift, ShiftTemplate } = require('../models/DriverShift');
const logger = require('../utils/logger');

class DriverShiftService {
  // ─── Shifts ───────────────────────────────────────────────────────

  static async create(data) {
    return DriverShift.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.driver) query.driver = filter.driver;
    if (filter.vehicle) query.vehicle = filter.vehicle;
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;
    if (filter.date) query['schedule.date'] = new Date(filter.date);
    if (filter.dateFrom && filter.dateTo) {
      query['schedule.date'] = { $gte: new Date(filter.dateFrom), $lte: new Date(filter.dateTo) };
    }

    const [shifts, total] = await Promise.all([
      DriverShift.find(query)
        .populate('driver', 'name licenseNumber phone')
        .populate('vehicle', 'plateNumber make model')
        .sort({ 'schedule.date': -1, 'schedule.startTime': 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      DriverShift.countDocuments(query),
    ]);
    return { shifts, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return DriverShift.findById(id)
      .populate('driver', 'name licenseNumber phone')
      .populate('vehicle', 'plateNumber make model')
      .populate('route', 'name startPoint endPoint');
  }

  static async update(id, data) {
    return DriverShift.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  static async clockIn(id) {
    return DriverShift.findByIdAndUpdate(
      id,
      {
        status: 'started',
        'actual.clockIn': new Date(),
      },
      { new: true }
    );
  }

  static async clockOut(id) {
    const shift = await DriverShift.findById(id);
    if (!shift) return null;
    shift.status = 'completed';
    shift.actual.clockOut = new Date();
    if (shift.actual.clockIn) {
      const hours = (shift.actual.clockOut - shift.actual.clockIn) / (1000 * 60 * 60);
      shift.actual.actualHours = Math.round(hours * 100) / 100;
      if (shift.schedule.plannedHours && shift.actual.actualHours > shift.schedule.plannedHours) {
        shift.actual.overtime =
          Math.round((shift.actual.actualHours - shift.schedule.plannedHours) * 100) / 100;
      }
    }
    await shift.save();
    return shift;
  }

  static async confirmShift(id) {
    return DriverShift.findByIdAndUpdate(id, { status: 'confirmed' }, { new: true });
  }

  static async cancelShift(id, reason) {
    return DriverShift.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        notes: reason,
      },
      { new: true }
    );
  }

  static async markNoShow(id) {
    return DriverShift.findByIdAndUpdate(id, { status: 'no_show' }, { new: true });
  }

  static async requestSwap(id, requestingDriverId, reason) {
    const shift = await DriverShift.findById(id);
    if (!shift) return null;
    shift.swap = {
      requestedBy: requestingDriverId,
      originalDriver: shift.driver,
      reason,
      status: 'pending',
      requestedAt: new Date(),
    };
    await shift.save();
    return shift;
  }

  static async approveSwap(id, approvedBy) {
    const shift = await DriverShift.findById(id);
    if (!shift || !shift.swap?.requestedBy) return null;
    shift.driver = shift.swap.requestedBy;
    shift.swap.approvedBy = approvedBy;
    shift.swap.status = 'approved';
    shift.status = 'swapped';
    await shift.save();
    return shift;
  }

  static async getDriverSchedule(driverId, dateFrom, dateTo) {
    const query = {
      driver: driverId,
      isActive: true,
      'schedule.date': { $gte: new Date(dateFrom), $lte: new Date(dateTo) },
    };
    return DriverShift.find(query)
      .populate('vehicle', 'plateNumber make model')
      .sort({ 'schedule.date': 1, 'schedule.startTime': 1 });
  }

  static async getDailyRoster(organization, date) {
    return DriverShift.find({
      organization,
      isActive: true,
      'schedule.date': new Date(date),
      status: { $nin: ['cancelled'] },
    })
      .populate('driver', 'name licenseNumber phone')
      .populate('vehicle', 'plateNumber make model')
      .sort({ 'schedule.startTime': 1 });
  }

  static async checkHOSCompliance(driverId) {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const shifts = await DriverShift.find({
      driver: driverId,
      isActive: true,
      status: 'completed',
      'schedule.date': { $gte: weekAgo },
    }).sort({ 'schedule.date': 1 });

    let dailyHours = 0;
    let weeklyHours = 0;
    const violations = [];

    for (const shift of shifts) {
      const hours = shift.actual.actualHours || shift.schedule.plannedHours || 0;
      weeklyHours += hours;
      dailyHours = hours;
      if (dailyHours > 9) {
        violations.push({
          type: 'daily_driving_exceeded',
          details: `${dailyHours}h يوم ${shift.schedule.date.toISOString().split('T')[0]}`,
        });
      }
    }
    if (weeklyHours > 56) {
      violations.push({ type: 'weekly_driving_exceeded', details: `${weeklyHours}h هذا الأسبوع` });
    }
    return { compliant: violations.length === 0, weeklyHours, violations };
  }

  static async getStatistics(organization, dateFrom, dateTo) {
    const match = { isActive: true };
    if (organization) match.organization = new (require('mongoose').Types.ObjectId)(organization);
    if (dateFrom && dateTo) {
      match['schedule.date'] = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
    }

    return DriverShift.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          totalHours: { $sum: '$actual.actualHours' },
          totalOvertime: { $sum: '$actual.overtime' },
          avgLateMinutes: { $avg: '$actual.lateMinutes' },
        },
      },
    ]);
  }

  // ─── Templates ────────────────────────────────────────────────────

  static async createTemplate(data) {
    return ShiftTemplate.create(data);
  }

  static async getTemplates(organization) {
    return ShiftTemplate.find({ organization, isActive: true }).sort({ name: 1 });
  }

  static async generateFromTemplate(templateId, organization, driverId, startDate, weeks = 1) {
    const template = await ShiftTemplate.findById(templateId);
    if (!template) return null;
    const shifts = [];
    const start = new Date(startDate);
    for (let w = 0; w < weeks; w++) {
      for (const s of template.shifts) {
        const date = new Date(start);
        date.setDate(date.getDate() + w * 7 + s.dayOfWeek);
        shifts.push({
          organization,
          driver: driverId,
          type: s.type || 'morning',
          schedule: {
            date,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes,
          },
        });
      }
    }
    return DriverShift.insertMany(shifts);
  }
}

module.exports = DriverShiftService;
