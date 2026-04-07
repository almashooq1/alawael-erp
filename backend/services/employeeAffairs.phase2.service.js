/**
 * Employee Affairs Phase 2 Service — خدمة شؤون الموظفين المرحلة الثانية
 *
 * New services covering:
 * ─── المهام والتكليفات (إنشاء + توزيع + متابعة + تقييم)
 * ─── السكن والمواصلات (وحدات سكنية + تخصيص + خطوط نقل)
 * ─── العهد والممتلكات (تسليم + استلام + جرد + صيانة)
 * ─── تصاريح العمل والإقامات (إصدار + تجديد + تنبيهات)
 * ─── المكافآت والحوافز (ترشيح + اعتماد + صرف + نقاط)
 * ─── نظام الورديات (تعريف + جدولة + تبديل + متابعة)
 *
 * @version 3.0.0
 */

const logger = require('../utils/logger');

// ─── Lazy Model Loaders ──────────────────────────────────────────────────────
let EmployeeTask,
  HousingUnit,
  HousingAssignment,
  TransportationRoute,
  EmployeeCustody,
  WorkPermit,
  EmployeeReward,
  ShiftDefinition,
  ShiftAssignment,
  ShiftSwapRequest,
  Employee;

const getEmployeeTask = () => {
  if (!EmployeeTask) EmployeeTask = require('../models/HR/EmployeeTask');
  return EmployeeTask;
};
const getHousingModels = () => {
  if (!HousingUnit) {
    const m = require('../models/HR/Housing');
    HousingUnit = m.HousingUnit;
    HousingAssignment = m.HousingAssignment;
    TransportationRoute = m.TransportationRoute;
  }
  return { HousingUnit, HousingAssignment, TransportationRoute };
};
const getEmployeeCustody = () => {
  if (!EmployeeCustody) EmployeeCustody = require('../models/HR/EmployeeCustody');
  return EmployeeCustody;
};
const getWorkPermit = () => {
  if (!WorkPermit) WorkPermit = require('../models/HR/WorkPermit');
  return WorkPermit;
};
const getEmployeeReward = () => {
  if (!EmployeeReward) EmployeeReward = require('../models/HR/EmployeeReward');
  return EmployeeReward;
};
const getShiftModels = () => {
  if (!ShiftDefinition) {
    const m = require('../models/HR/ShiftSchedule');
    ShiftDefinition = m.ShiftDefinition;
    ShiftAssignment = m.ShiftAssignment;
    ShiftSwapRequest = m.ShiftSwapRequest;
  }
  return { ShiftDefinition, ShiftAssignment, ShiftSwapRequest };
};
const _getEmployee = () => {
  if (!Employee) Employee = require('../models/employee.model');
  return Employee;
};

class EmployeeAffairsPhase2Service {
  // ═══════════════════════════════════════════════════════════════════════════
  // المهام والتكليفات — Tasks & Assignments
  // ═══════════════════════════════════════════════════════════════════════════

  async createTask(data) {
    const Model = getEmployeeTask();
    const count = await Model.countDocuments();
    const task = new Model({
      ...data,
      taskNumber: `TSK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
    });
    await task.save();
    logger.info(`[Tasks] Task created: ${task.taskNumber}`);
    return task;
  }

  async listTasks(filters = {}) {
    const Model = getEmployeeTask();
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters.assignedBy) query.assignedBy = filters.assignedBy;
    if (filters.department) query.department = filters.department;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const [tasks, total] = await Promise.all([
      Model.find(query)
        .populate('assignedTo', 'firstName lastName employeeId')
        .populate('assignedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);
    return { tasks, total, page, pages: Math.ceil(total / limit) };
  }

  async getTaskById(id) {
    return getEmployeeTask()
      .findById(id)
      .populate('assignedTo', 'firstName lastName employeeId department')
      .populate('assignedBy', 'firstName lastName')
      .populate('comments.author', 'firstName lastName')
      .lean();
  }

  async updateTaskStatus(id, { status, progress, comment, userId }) {
    const task = await getEmployeeTask().findById(id);
    if (!task) throw new Error('المهمة غير موجودة');
    task.status = status;
    if (progress !== undefined) task.progress = progress;
    if (status === 'مكتملة') {
      task.progress = 100;
      task.completedDate = new Date();
    }
    if (comment) {
      task.comments.push({ text: comment, author: userId, createdAt: new Date() });
    }
    await task.save();
    return task;
  }

  async addTaskComment(id, { text, userId }) {
    const task = await getEmployeeTask().findById(id);
    if (!task) throw new Error('المهمة غير موجودة');
    task.comments.push({ text, author: userId, createdAt: new Date() });
    await task.save();
    return task;
  }

  async delegateTask(id, { delegatedTo, reason, userId }) {
    const task = await getEmployeeTask().findById(id);
    if (!task) throw new Error('المهمة غير موجودة');
    task.delegatedTo = delegatedTo;
    task.delegationReason = reason;
    task.delegatedAt = new Date();
    task.comments.push({ text: `تم تفويض المهمة — السبب: ${reason}`, author: userId });
    await task.save();
    return task;
  }

  async rateTask(id, { rating, ratingComment, ratedBy }) {
    const task = await getEmployeeTask().findById(id);
    if (!task) throw new Error('المهمة غير موجودة');
    if (task.status !== 'مكتملة') throw new Error('لا يمكن تقييم مهمة غير مكتملة');
    task.rating = rating;
    task.ratingComment = ratingComment;
    task.ratedBy = ratedBy;
    await task.save();
    return task;
  }

  async getTaskStats(filters = {}) {
    const Model = getEmployeeTask();
    const match = {};
    if (filters.assignedTo)
      match.assignedTo = new (require('mongoose').Types.ObjectId)(filters.assignedTo);
    if (filters.department) match.department = filters.department;

    const [byStatus, byPriority, total, overdue] = await Promise.all([
      Model.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      Model.aggregate([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      Model.countDocuments(match),
      Model.countDocuments({
        ...match,
        dueDate: { $lt: new Date() },
        status: { $nin: ['مكتملة', 'ملغية'] },
      }),
    ]);
    return { total, overdue, byStatus, byPriority };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // السكن والمواصلات — Housing & Transportation
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Housing Units ---
  async createHousingUnit(data) {
    const { HousingUnit } = getHousingModels();
    const count = await HousingUnit.countDocuments();
    const unit = new HousingUnit({
      ...data,
      unitNumber: `HU-${String(count + 1).padStart(4, '0')}`,
    });
    await unit.save();
    logger.info(`[Housing] Unit created: ${unit.unitNumber}`);
    return unit;
  }

  async listHousingUnits(filters = {}) {
    const { HousingUnit } = getHousingModels();
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.building) query.building = filters.building;
    const units = await HousingUnit.find(query)
      .populate('currentOccupants', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
    const total = await HousingUnit.countDocuments(query);
    return { units, total };
  }

  async assignHousing(data) {
    const { HousingAssignment, HousingUnit } = getHousingModels();
    const count = await HousingAssignment.countDocuments();
    const assignment = new HousingAssignment({
      ...data,
      assignmentNumber: `HA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
    });
    await assignment.save();
    // Update unit occupants
    await HousingUnit.findByIdAndUpdate(data.unitId, {
      $push: { currentOccupants: { $each: [data.employeeId], $slice: -50 } },
      $set: { status: 'مشغول' },
    });
    return assignment;
  }

  async listHousingAssignments(filters = {}) {
    const { HousingAssignment } = getHousingModels();
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    return HousingAssignment.find(query)
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('unitId', 'unitNumber building type')
      .sort({ createdAt: -1 })
      .lean();
  }

  // --- Transportation ---
  async createTransportationRoute(data) {
    const { TransportationRoute } = getHousingModels();
    const count = await TransportationRoute.countDocuments();
    const route = new TransportationRoute({
      ...data,
      routeNumber: `TR-${String(count + 1).padStart(3, '0')}`,
    });
    await route.save();
    logger.info(`[Transport] Route created: ${route.routeNumber}`);
    return route;
  }

  async listTransportationRoutes(filters = {}) {
    const { TransportationRoute } = getHousingModels();
    const query = {};
    if (filters.status) query.status = filters.status;
    return TransportationRoute.find(query)
      .populate('assignedEmployees', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  }

  async assignEmployeeToRoute(routeId, employeeId) {
    const { TransportationRoute } = getHousingModels();
    return TransportationRoute.findByIdAndUpdate(
      routeId,
      {
        $addToSet: { assignedEmployees: employeeId },
      },
      { new: true }
    );
  }

  async getHousingStats() {
    const { HousingUnit, HousingAssignment, TransportationRoute } = getHousingModels();
    const [totalUnits, available, occupied, totalRoutes, activeAssignments] = await Promise.all([
      HousingUnit.countDocuments(),
      HousingUnit.countDocuments({ status: 'متاح' }),
      HousingUnit.countDocuments({ status: 'مشغول' }),
      TransportationRoute.countDocuments({ status: 'نشط' }),
      HousingAssignment.countDocuments({ status: 'نشط' }),
    ]);
    return { totalUnits, available, occupied, totalRoutes, activeAssignments };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // العهد والممتلكات — Custody & Asset Management
  // ═══════════════════════════════════════════════════════════════════════════

  async createCustody(data) {
    const Model = getEmployeeCustody();
    const count = await Model.countDocuments();
    const custody = new Model({
      ...data,
      custodyNumber: `CUS-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      history: [
        {
          action: 'تسليم',
          date: new Date(),
          performedBy: data.assignedBy,
          notes: 'تسليم العهدة',
          condition: data.condition || 'جيد',
        },
      ],
    });
    await custody.save();
    logger.info(`[Custody] Created: ${custody.custodyNumber}`);
    return custody;
  }

  async listCustodies(filters = {}) {
    const Model = getEmployeeCustody();
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.assetCategory) query.assetCategory = filters.assetCategory;
    if (filters.department) query.department = filters.department;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const [custodies, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);
    return { custodies, total, page };
  }

  async getCustodyById(id) {
    return getEmployeeCustody()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('history.performedBy', 'firstName lastName')
      .lean();
  }

  async returnCustody(id, { returnedBy, condition, notes }) {
    const custody = await getEmployeeCustody().findById(id);
    if (!custody) throw new Error('العهدة غير موجودة');
    custody.status = 'مرتجعة';
    custody.returnDate = new Date();
    custody.condition = condition || custody.condition;
    custody.history.push({
      action: 'استلام',
      date: new Date(),
      performedBy: returnedBy,
      notes: notes || 'تم استلام العهدة',
      condition,
    });
    await custody.save();
    return custody;
  }

  async reportCustodyIssue(id, { action, notes, performedBy, condition }) {
    const custody = await getEmployeeCustody().findById(id);
    if (!custody) throw new Error('العهدة غير موجودة');
    if (action === 'فقدان') custody.status = 'مفقودة';
    if (action === 'تلف') custody.status = 'تالفة';
    if (action === 'صيانة') custody.status = 'قيد الصيانة';
    custody.condition = condition || custody.condition;
    custody.history.push({ action, date: new Date(), performedBy, notes, condition });
    await custody.save();
    return custody;
  }

  async getEmployeeCustodies(employeeId) {
    return getEmployeeCustody()
      .find({ employeeId, status: 'مسلّمة' })
      .sort({ assignedDate: -1 })
      .lean();
  }

  async getCustodyStats() {
    const Model = getEmployeeCustody();
    const [total, byCategory, byStatus] = await Promise.all([
      Model.countDocuments(),
      Model.aggregate([
        {
          $group: {
            _id: '$assetCategory',
            count: { $sum: 1 },
            totalValue: { $sum: '$currentValue' },
          },
        },
        { $limit: 1000 },
      ]),
      Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
    ]);
    return { total, byCategory, byStatus };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // تصاريح العمل والإقامات — Work Permits & Iqama
  // ═══════════════════════════════════════════════════════════════════════════

  async createWorkPermit(data) {
    const Model = getWorkPermit();
    const count = await Model.countDocuments();
    const prefix =
      data.documentType === 'إقامة' ? 'IQA' : data.documentType === 'رخصة عمل' ? 'WP' : 'DOC';
    const permit = new Model({
      ...data,
      recordNumber: `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
    });
    await permit.save();
    logger.info(`[WorkPermit] Created: ${permit.recordNumber}`);
    return permit;
  }

  async listWorkPermits(filters = {}) {
    const Model = getWorkPermit();
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.documentType) query.documentType = filters.documentType;
    if (filters.employeeId) query.employeeId = filters.employeeId;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const [permits, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId nationality')
        .sort({ expiryDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);
    return { permits, total, page };
  }

  async getWorkPermitById(id) {
    return getWorkPermit()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeId nationality')
      .populate('processedBy', 'firstName lastName')
      .lean();
  }

  async renewWorkPermit(id, data) {
    const permit = await getWorkPermit().findById(id);
    if (!permit) throw new Error('التصريح غير موجود');
    permit.renewalHistory.push({
      previousNumber: permit.documentNumber,
      previousExpiry: permit.expiryDate,
      renewedDate: new Date(),
      cost: data.totalCost || 0,
      processedBy: data.processedBy,
    });
    permit.documentNumber = data.newDocumentNumber || permit.documentNumber;
    permit.issueDate = data.issueDate || new Date();
    permit.expiryDate = data.expiryDate;
    permit.status = 'ساري';
    permit.fees = data.fees || permit.fees;
    permit.reminderSent = false;
    await permit.save();
    logger.info(`[WorkPermit] Renewed: ${permit.recordNumber}`);
    return permit;
  }

  async getExpiringPermits(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return getWorkPermit()
      .find({
        expiryDate: { $lte: futureDate, $gte: new Date() },
        status: { $in: ['ساري', 'قارب الانتهاء'] },
      })
      .populate('employeeId', 'firstName lastName employeeId nationality')
      .sort({ expiryDate: 1 })
      .lean();
  }

  async getWorkPermitStats() {
    const Model = getWorkPermit();
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in60 = new Date();
    in60.setDate(in60.getDate() + 60);

    const [total, expired, expiringSoon, byType, byStatus, totalCost] = await Promise.all([
      Model.countDocuments(),
      Model.countDocuments({ expiryDate: { $lt: now }, status: { $ne: 'ملغي' } }),
      Model.countDocuments({ expiryDate: { $gte: now, $lte: in30 }, status: { $ne: 'ملغي' } }),
      Model.aggregate([{ $group: { _id: '$documentType', count: { $sum: 1 } } }, { $limit: 1000 }]),
      Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
      Model.aggregate([
        { $group: { _id: null, total: { $sum: '$fees.totalCost' } } },
        { $limit: 1000 },
      ]),
    ]);
    return { total, expired, expiringSoon, byType, byStatus, totalCost: totalCost[0]?.total || 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // المكافآت والحوافز — Rewards & Incentives
  // ═══════════════════════════════════════════════════════════════════════════

  async createReward(data) {
    const Model = getEmployeeReward();
    const count = await Model.countDocuments();
    const reward = new Model({
      ...data,
      rewardNumber: `RWD-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
    });
    await reward.save();
    logger.info(`[Rewards] Created: ${reward.rewardNumber}`);
    return reward;
  }

  async listRewards(filters = {}) {
    const Model = getEmployeeReward();
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.category) query.category = filters.category;
    if (filters.employeeId) query.employeeId = filters.employeeId;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const [rewards, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .populate('nominatedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);
    return { rewards, total, page };
  }

  async getRewardById(id) {
    return getEmployeeReward()
      .findById(id)
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('nominatedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .lean();
  }

  async approveReward(id, { approved, approvedBy, rejectionReason }) {
    const reward = await getEmployeeReward().findById(id);
    if (!reward) throw new Error('المكافأة غير موجودة');
    reward.status = approved ? 'معتمد' : 'مرفوض';
    reward.approvedBy = approvedBy;
    reward.approvalDate = new Date();
    if (!approved) reward.rejectionReason = rejectionReason;
    await reward.save();
    return reward;
  }

  async disburseReward(id, { disbursedBy, paymentMethod, payrollMonth }) {
    const reward = await getEmployeeReward().findById(id);
    if (!reward || reward.status !== 'معتمد') throw new Error('المكافأة غير معتمدة أو غير موجودة');
    reward.status = 'تم الصرف';
    reward.disbursedBy = disbursedBy;
    reward.disbursementDate = new Date();
    reward.paymentMethod = paymentMethod;
    reward.payrollMonth = payrollMonth;
    await reward.save();
    return reward;
  }

  async getEmployeeRewardPoints(employeeId) {
    const Model = getEmployeeReward();
    const result = await Model.aggregate([
      {
        $match: {
          employeeId: new (require('mongoose').Types.ObjectId)(employeeId),
          category: 'نقاط',
          status: 'تم الصرف',
        },
      },
      { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      { $limit: 1000 },
    ]);
    return { totalPoints: result[0]?.totalPoints || 0 };
  }

  async getRewardStats() {
    const Model = getEmployeeReward();
    const year = new Date().getFullYear();
    const [total, byType, byStatus, totalAmount, monthlySpend] = await Promise.all([
      Model.countDocuments({ 'period.year': year }),
      Model.aggregate([
        { $match: { 'period.year': year } },
        { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } },
        { $limit: 1000 },
      ]),
      Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $limit: 1000 }]),
      Model.aggregate([
        { $match: { status: 'تم الصرف', 'period.year': year } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
        { $limit: 1000 },
      ]),
      Model.aggregate([
        { $match: { status: 'تم الصرف', 'period.year': year } },
        { $group: { _id: '$period.month', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $limit: 1000 },
      ]),
    ]);
    return { total, byType, byStatus, totalDisbursed: totalAmount[0]?.total || 0, monthlySpend };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // نظام الورديات — Shift Management
  // ═══════════════════════════════════════════════════════════════════════════

  async createShiftDefinition(data) {
    const { ShiftDefinition } = getShiftModels();
    const shift = new ShiftDefinition(data);
    await shift.save();
    logger.info(`[Shifts] Definition created: ${shift.shiftCode}`);
    return shift;
  }

  async listShiftDefinitions() {
    const { ShiftDefinition } = getShiftModels();
    return ShiftDefinition.find({ isActive: true }).sort({ type: 1 }).lean();
  }

  async createShiftAssignment(data) {
    const { ShiftAssignment } = getShiftModels();
    const assignment = new ShiftAssignment(data);
    await assignment.save();
    return assignment;
  }

  async bulkCreateShiftAssignments(assignments) {
    const { ShiftAssignment } = getShiftModels();
    return ShiftAssignment.insertMany(assignments);
  }

  async getEmployeeSchedule(employeeId, startDate, endDate) {
    const { ShiftAssignment } = getShiftModels();
    return ShiftAssignment.find({
      employeeId,
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    })
      .populate('shiftId', 'name type startTime endTime color workingHours')
      .sort({ date: 1 })
      .lean();
  }

  async getDepartmentSchedule(department, date) {
    const { ShiftAssignment } = getShiftModels();
    const targetDate = new Date(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return ShiftAssignment.find({
      department,
      date: { $gte: targetDate, $lt: nextDay },
    })
      .populate('employeeId', 'firstName lastName employeeId')
      .populate('shiftId', 'name type startTime endTime color')
      .sort({ 'shiftId.startTime': 1 })
      .lean();
  }

  async recordShiftAttendance(assignmentId, { checkIn, checkOut }) {
    const { ShiftAssignment } = getShiftModels();
    const assignment = await ShiftAssignment.findById(assignmentId).populate('shiftId');
    if (!assignment) throw new Error('لا يوجد جدولة');

    if (checkIn) {
      assignment.actualCheckIn = new Date(checkIn);
      assignment.status = 'حاضر';
      // Calculate lateness
      const scheduled = assignment.shiftId.startTime.split(':');
      const scheduledMinutes = parseInt(scheduled[0]) * 60 + parseInt(scheduled[1]);
      const actualMinutes =
        assignment.actualCheckIn.getHours() * 60 + assignment.actualCheckIn.getMinutes();
      const diff = actualMinutes - scheduledMinutes;
      if (diff > (assignment.shiftId.graceMinutesLate || 15)) {
        assignment.isLate = true;
        assignment.lateMinutes = diff;
      }
    }
    if (checkOut) {
      assignment.actualCheckOut = new Date(checkOut);
      if (assignment.actualCheckIn) {
        assignment.workedHours =
          (assignment.actualCheckOut - assignment.actualCheckIn) / (1000 * 60 * 60);
      }
    }
    await assignment.save();
    return assignment;
  }

  async createShiftSwapRequest(data) {
    const { ShiftSwapRequest } = getShiftModels();
    const count = await ShiftSwapRequest.countDocuments();
    const swap = new ShiftSwapRequest({
      ...data,
      requestNumber: `SWP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
    });
    await swap.save();
    return swap;
  }

  async approveShiftSwap(id, { step, approved, approvedBy }) {
    const { ShiftSwapRequest, ShiftAssignment } = getShiftModels();
    const swap = await ShiftSwapRequest.findById(id);
    if (!swap) throw new Error('طلب التبديل غير موجود');

    if (step === 'employee') {
      swap.targetEmployeeApproval = approved;
      swap.status = approved ? 'موافقة الموظف' : 'مرفوض';
    } else if (step === 'manager') {
      swap.managerApproval = approved;
      swap.approvedBy = approvedBy;
      if (approved) {
        swap.status = 'معتمد';
        // Execute swap
        const [a1, a2] = await Promise.all([
          ShiftAssignment.findById(swap.requesterAssignmentId),
          ShiftAssignment.findById(swap.targetAssignmentId),
        ]);
        if (a1 && a2) {
          const tempShift = a1.shiftId;
          a1.shiftId = a2.shiftId;
          a1.status = 'مبدّل';
          a2.shiftId = tempShift;
          a2.status = 'مبدّل';
          await Promise.all([a1.save(), a2.save()]);
        }
      } else {
        swap.status = 'مرفوض';
      }
    }
    await swap.save();
    return swap;
  }

  async getShiftStats(department) {
    const { ShiftAssignment, ShiftDefinition } = getShiftModels();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const match = { date: { $gte: today, $lt: tomorrow } };
    if (department) match.department = department;

    const [todayStats, shiftTypes, totalDefinitions] = await Promise.all([
      ShiftAssignment.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      ShiftAssignment.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'shiftdefinitions',
            localField: 'shiftId',
            foreignField: '_id',
            as: 'shift',
          },
        },
        { $unwind: '$shift' },
        { $group: { _id: '$shift.type', count: { $sum: 1 } } },
        { $limit: 1000 },
      ]),
      ShiftDefinition.countDocuments({ isActive: true }),
    ]);
    return { todayStats, shiftTypes, totalDefinitions };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // لوحة المعلومات الشاملة — Phase 2 Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  async getPhase2Dashboard() {
    const [tasks, housing, custody, permits, rewards, shifts] = await Promise.all([
      this.getTaskStats(),
      this.getHousingStats(),
      this.getCustodyStats(),
      this.getWorkPermitStats(),
      this.getRewardStats(),
      this.getShiftStats(),
    ]);
    return { tasks, housing, custody, permits, rewards, shifts };
  }
}

module.exports = new EmployeeAffairsPhase2Service();
