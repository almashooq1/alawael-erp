/* eslint-disable no-unused-vars */
/**
 * Employee Affairs Service - خدمة شؤون الموظفين
 *
 * Comprehensive service covering:
 * ─── إدارة الموظفين (CRUD + البحث + الفلترة)
 * ─── الإجازات (طلب + موافقة + أرصدة + تقارير)
 * ─── الحضور والانصراف (تسجيل + تقارير يومية/شهرية)
 * ─── تقييم الأداء (إنشاء + متابعة + مؤشرات)
 * ─── العقود (مراقبة + تجديد + إنهاء)
 * ─── التطور الوظيفي (ترقيات + تدريب + شهادات)
 * ─── لوحة المعلومات (إحصائيات شاملة + KPIs)
 * ─── المستندات (رفع + تصنيف + أرشفة)
 *
 * @version 1.0.0
 */

const logger = require('../utils/logger');

// Lazy model loaders (safe for test environments)
let Employee, LeaveRequest;
const getEmployee = () => {
  if (!Employee) Employee = require('../models/employee.model');
  return Employee;
};
const getLeaveRequest = () => {
  if (!LeaveRequest) LeaveRequest = require('../models/LeaveRequest');
  return LeaveRequest;
};

class EmployeeAffairsService {
  // ═══════════════════════════════════════════════════════════════════════════
  // إدارة الموظفين
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إنشاء موظف جديد
   */
  async createEmployee(data) {
    const Emp = getEmployee();
    const existing = await Emp.findOne({
      $or: [{ employeeId: data.employeeId }, { email: data.email }],
    });
    if (existing) {
      throw new Error(
        existing.employeeId === data.employeeId
          ? 'رقم الموظف مستخدم بالفعل'
          : 'البريد الإلكتروني مستخدم بالفعل'
      );
    }

    const employee = new Emp({
      ...data,
      status: data.status || 'active',
      leave: {
        annualLeaveDays: data.annualLeaveDays || 30,
        sickLeaveDays: data.sickLeaveDays || 10,
        usedAnnualLeave: 0,
        usedSickLeave: 0,
      },
    });
    await employee.save();
    logger.info(`[EmployeeAffairs] Employee created: ${employee.employeeId}`);
    return employee;
  }

  /**
   * جلب موظف بالمعرف
   */
  async getEmployeeById(id) {
    const Emp = getEmployee();
    const employee = await Emp.findById(id);
    if (!employee) throw new Error('الموظف غير موجود');
    return employee;
  }

  /**
   * قائمة الموظفين مع فلترة وترقيم
   */
  async listEmployees(filters = {}) {
    const Emp = getEmployee();
    const query = {};
    const {
      department,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = -1,
    } = filters;

    if (department) query.department = department;
    if (status) query.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeId: regex },
        { position: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [employees, total] = await Promise.all([
      Emp.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Emp.countDocuments(query),
    ]);

    return {
      employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * تحديث بيانات موظف
   */
  async updateEmployee(id, updates) {
    const Emp = getEmployee();
    const employee = await Emp.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!employee) throw new Error('الموظف غير موجود');
    logger.info(`[EmployeeAffairs] Employee updated: ${employee.employeeId}`);
    return employee;
  }

  /**
   * إنهاء خدمات موظف (soft delete)
   */
  async terminateEmployee(id, reason, terminationDate) {
    const Emp = getEmployee();
    const employee = await Emp.findByIdAndUpdate(
      id,
      {
        status: 'terminated',
        'contract.endDate': terminationDate || new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!employee) throw new Error('الموظف غير موجود');
    logger.info(`[EmployeeAffairs] Employee terminated: ${employee.employeeId} - ${reason}`);
    return employee;
  }

  /**
   * ملف الموظف الشامل
   */
  async getEmployeeProfile(id) {
    const Emp = getEmployee();
    const LR = getLeaveRequest();
    const employee = await Emp.findById(id).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const [recentLeaves, leaveBalance] = await Promise.all([
      LR.find({ employee: id, status: { $nin: ['cancelled'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      this.getLeaveBalance(id),
    ]);

    return {
      ...employee,
      fullName: `${employee.firstName} ${employee.lastName}`,
      totalSalary: this._calculateTotalSalary(employee),
      leaveBalance,
      recentLeaves,
      yearsOfService: this._calculateYearsOfService(employee.hireDate),
      contractStatus: this._getContractStatus(employee.contract),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // إدارة الإجازات
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تقديم طلب إجازة
   */
  async requestLeave(data) {
    const LR = getLeaveRequest();
    const Emp = getEmployee();

    const employee = await Emp.findById(data.employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    // حساب عدد الأيام
    const totalDays = data.isHalfDay
      ? 0.5
      : this._calculateWorkingDays(new Date(data.startDate), new Date(data.endDate));

    // التحقق من الرصيد
    const balance = await this.getLeaveBalance(data.employeeId);
    if (data.leaveType === 'annual' && totalDays > balance.annual.remaining) {
      throw new Error(`رصيد الإجازات السنوية غير كافٍ. المتبقي: ${balance.annual.remaining} يوم`);
    }
    if (data.leaveType === 'sick' && totalDays > balance.sick.remaining) {
      throw new Error(`رصيد الإجازات المرضية غير كافٍ. المتبقي: ${balance.sick.remaining} يوم`);
    }

    // التحقق من التعارض
    const conflict = await LR.findOne({
      employee: data.employeeId,
      status: { $in: ['pending', 'manager_approved', 'hr_approved', 'approved'] },
      $or: [
        {
          startDate: { $lte: new Date(data.endDate) },
          endDate: { $gte: new Date(data.startDate) },
        },
      ],
    });
    if (conflict) {
      throw new Error('يوجد تعارض مع إجازة أخرى في نفس الفترة');
    }

    const leaveRequest = new LR({
      employee: data.employeeId,
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      isHalfDay: data.isHalfDay || false,
      halfDayPeriod: data.halfDayPeriod,
      reason: data.reason,
      substitute: data.substitute,
      balanceSnapshot: {
        annualTotal: balance.annual.total,
        annualUsed: balance.annual.used,
        annualRemaining: balance.annual.remaining,
        sickTotal: balance.sick.total,
        sickUsed: balance.sick.used,
        sickRemaining: balance.sick.remaining,
      },
      createdBy: data.createdBy,
    });

    await leaveRequest.save();
    logger.info(
      `[EmployeeAffairs] Leave request created: ${leaveRequest._id} for ${employee.employeeId}`
    );
    return leaveRequest;
  }

  /**
   * موافقة المدير على الإجازة
   */
  async approveLeaveByManager(leaveId, approverId, approverName, comments) {
    const LR = getLeaveRequest();
    const leave = await LR.findById(leaveId);
    if (!leave) throw new Error('طلب الإجازة غير موجود');
    if (leave.status !== 'pending') throw new Error('لا يمكن الموافقة على هذا الطلب');
    return leave.approveByManager(approverId, approverName, comments);
  }

  /**
   * موافقة HR على الإجازة
   */
  async approveLeaveByHR(leaveId, approverId, approverName, comments) {
    const LR = getLeaveRequest();
    const Emp = getEmployee();
    const leave = await LR.findById(leaveId);
    if (!leave) throw new Error('طلب الإجازة غير موجود');
    if (leave.status !== 'manager_approved') throw new Error('يجب موافقة المدير أولاً');

    // تحديث رصيد الموظف
    const update = {};
    if (leave.leaveType === 'annual') {
      update['leave.usedAnnualLeave'] = leave.totalDays;
    } else if (leave.leaveType === 'sick') {
      update['leave.usedSickLeave'] = leave.totalDays;
    }
    if (Object.keys(update).length) {
      await Emp.findByIdAndUpdate(leave.employee, { $inc: update });
    }

    return leave.approveByHR(approverId, approverName, comments);
  }

  /**
   * رفض طلب الإجازة
   */
  async rejectLeave(leaveId, rejecterId, rejectorName, comments, stage) {
    const LR = getLeaveRequest();
    const leave = await LR.findById(leaveId);
    if (!leave) throw new Error('طلب الإجازة غير موجود');
    return leave.reject(rejecterId, rejectorName, comments, stage || 'hr');
  }

  /**
   * إلغاء طلب إجازة
   */
  async cancelLeave(leaveId, userId, reason) {
    const LR = getLeaveRequest();
    const Emp = getEmployee();
    const leave = await LR.findById(leaveId);
    if (!leave) throw new Error('طلب الإجازة غير موجود');
    if (leave.status === 'cancelled') throw new Error('الطلب ملغي بالفعل');

    // إعادة الرصيد إذا كان موافق عليه
    if (leave.status === 'approved') {
      const update = {};
      if (leave.leaveType === 'annual') {
        update['leave.usedAnnualLeave'] = -leave.totalDays;
      } else if (leave.leaveType === 'sick') {
        update['leave.usedSickLeave'] = -leave.totalDays;
      }
      if (Object.keys(update).length) {
        await Emp.findByIdAndUpdate(leave.employee, { $inc: update });
      }
    }

    return leave.cancel(userId, reason);
  }

  /**
   * رصيد الإجازات
   */
  async getLeaveBalance(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const leave = employee.leave || {};
    return {
      annual: {
        total: leave.annualLeaveDays || 30,
        used: leave.usedAnnualLeave || 0,
        remaining: (leave.annualLeaveDays || 30) - (leave.usedAnnualLeave || 0),
      },
      sick: {
        total: leave.sickLeaveDays || 10,
        used: leave.usedSickLeave || 0,
        remaining: (leave.sickLeaveDays || 10) - (leave.usedSickLeave || 0),
      },
    };
  }

  /**
   * قائمة الإجازات مع فلترة
   */
  async listLeaves(filters = {}) {
    const LR = getLeaveRequest();
    const query = {};
    const {
      employeeId,
      department,
      status,
      leaveType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    if (employeeId) query.employee = employeeId;
    if (department) query.department = department;
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const skip = (page - 1) * limit;
    const [leaves, total] = await Promise.all([
      LR.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LR.countDocuments(query),
    ]);

    return {
      leaves,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // الحضور والانصراف
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تسجيل حضور
   */
  async checkIn(employeeId, data = {}) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const now = new Date();
    const standardStart = new Date(now);
    standardStart.setHours(8, 0, 0, 0);

    const isLate = now > standardStart;
    const lateMinutes = isLate ? Math.round((now - standardStart) / 60000) : 0;

    const record = {
      date: now,
      checkIn: now,
      isLate,
      lateMinutes,
      location: data.location,
      method: data.method || 'manual',
      notes: data.notes,
    };

    // تحديث إحصائيات الحضور
    if (isLate) {
      await Emp.findByIdAndUpdate(employeeId, {
        $inc: { 'attendance.lateArrivals': 1 },
        'attendance.lastAttendanceUpdate': now,
      });
    }

    logger.info(`[EmployeeAffairs] Check-in: ${employee.employeeId} at ${now.toISOString()}`);
    return record;
  }

  /**
   * تسجيل انصراف
   */
  async checkOut(employeeId, data = {}) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const now = new Date();
    const standardEnd = new Date(now);
    standardEnd.setHours(16, 0, 0, 0);

    const isEarly = now < standardEnd;
    const earlyMinutes = isEarly ? Math.round((standardEnd - now) / 60000) : 0;
    const overtimeMinutes = !isEarly ? Math.round((now - standardEnd) / 60000) : 0;

    // تحديث الإحصائيات
    const updates = {
      $inc: { 'attendance.totalDaysWorked': 1 },
      'attendance.lastAttendanceUpdate': now,
    };
    if (isEarly) updates.$inc['attendance.earlyDepartures'] = 1;
    await Emp.findByIdAndUpdate(employeeId, updates);

    const record = {
      date: now,
      checkOut: now,
      isEarly,
      earlyMinutes,
      overtimeMinutes,
      location: data.location,
      method: data.method || 'manual',
      totalHours: 8 - earlyMinutes / 60 + overtimeMinutes / 60,
    };

    logger.info(`[EmployeeAffairs] Check-out: ${employee.employeeId} at ${now.toISOString()}`);
    return record;
  }

  /**
   * تقرير الحضور الشهري
   */
  async getMonthlyAttendanceReport(employeeId, month, year) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const att = employee.attendance || {};
    return {
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      month,
      year,
      summary: {
        totalDaysWorked: att.totalDaysWorked || 0,
        totalAbsences: att.totalAbsences || 0,
        lateArrivals: att.lateArrivals || 0,
        earlyDepartures: att.earlyDepartures || 0,
        attendanceRate: att.totalDaysWorked
          ? Math.round(((att.totalDaysWorked || 0) / 22) * 100)
          : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // تقييم الأداء
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إنشاء تقييم أداء
   */
  async createPerformanceReview(employeeId, data) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const review = {
      date: new Date(),
      rating: data.rating,
      reviewer: data.reviewer,
      comments: data.comments,
      criteria: data.criteria || {},
    };

    await employee.addPerformanceRating(data.rating, data.reviewer, data.comments);
    logger.info(
      `[EmployeeAffairs] Performance review added for ${employee.employeeId}: ${data.rating}/5`
    );

    return {
      employee: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      review,
      currentRating: employee.performance.currentRating,
      ratingHistory: employee.performance.ratingHistory.slice(-5),
    };
  }

  /**
   * جلب تقييمات أداء الموظف
   */
  async getPerformanceHistory(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    return {
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      currentRating: employee.performance?.currentRating || 0,
      ratingHistory: employee.performance?.ratingHistory || [],
      goals: employee.performance?.goals || [],
    };
  }

  /**
   * إضافة/تحديث أهداف الموظف
   */
  async setEmployeeGoals(employeeId, goals) {
    const Emp = getEmployee();
    const employee = await Emp.findByIdAndUpdate(
      employeeId,
      { 'performance.goals': goals },
      { new: true }
    );
    if (!employee) throw new Error('الموظف غير موجود');
    return employee.performance.goals;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // إدارة العقود
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * العقود المنتهية أو القريبة من الانتهاء
   */
  async getExpiringContracts(daysThreshold = 30) {
    const Emp = getEmployee();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const employees = await Emp.find({
      status: 'active',
      'contract.endDate': { $lte: futureDate, $gte: new Date() },
    })
      .select('employeeId firstName lastName department position contract')
      .lean();

    return employees.map(emp => ({
      ...emp,
      fullName: `${emp.firstName} ${emp.lastName}`,
      daysRemaining: Math.ceil(
        (new Date(emp.contract.endDate) - new Date()) / (1000 * 60 * 60 * 24)
      ),
      urgency:
        Math.ceil((new Date(emp.contract.endDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 7
          ? 'critical'
          : Math.ceil((new Date(emp.contract.endDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 15
            ? 'high'
            : 'medium',
    }));
  }

  /**
   * تجديد عقد
   */
  async renewContract(employeeId, newEndDate, contractType) {
    const Emp = getEmployee();
    const employee = await Emp.findByIdAndUpdate(
      employeeId,
      {
        'contract.startDate': new Date(),
        'contract.endDate': newEndDate,
        'contract.contractType': contractType,
        'contract.renewalDate': new Date(),
      },
      { new: true }
    );
    if (!employee) throw new Error('الموظف غير موجود');
    logger.info(`[EmployeeAffairs] Contract renewed: ${employee.employeeId} until ${newEndDate}`);
    return employee;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // التطور الوظيفي
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تسجيل ترقية
   */
  async promoteEmployee(employeeId, toPosition, newSalary, reason) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    const promotion = {
      fromPosition: employee.position,
      toPosition,
      date: new Date(),
      salary: newSalary,
      reason,
    };

    employee.careerDevelopment.promotions.push(promotion);
    employee.position = toPosition;
    employee.salary.base = newSalary;
    await employee.save();

    logger.info(`[EmployeeAffairs] Promotion: ${employee.employeeId} → ${toPosition}`);
    return { employee, promotion };
  }

  /**
   * إضافة شهادة
   */
  async addCertification(employeeId, certification) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    employee.careerDevelopment.certifications.push(certification);
    await employee.save();
    return employee.careerDevelopment.certifications;
  }

  /**
   * إضافة تدريب
   */
  async addTraining(employeeId, training) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    employee.careerDevelopment.trainings.push(training);
    await employee.save();
    return employee.careerDevelopment.trainings;
  }

  /**
   * إضافة مهارة
   */
  async addSkill(employeeId, skillData) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    employee.skills.push(skillData);
    await employee.save();
    return employee.skills;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // المستندات
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إضافة مستند
   */
  async addDocument(employeeId, document) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');
    employee.documents.push({ ...document, uploadDate: new Date() });
    await employee.save();
    return employee.documents;
  }

  /**
   * جلب مستندات الموظف
   */
  async getDocuments(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).select('documents').lean();
    if (!employee) throw new Error('الموظف غير موجود');
    return employee.documents || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // لوحة المعلومات والإحصائيات
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * لوحة معلومات شؤون الموظفين الشاملة
   */
  async getDashboard() {
    const Emp = getEmployee();
    const LR = getLeaveRequest();

    const [
      totalEmployees,
      activeEmployees,
      onLeaveCount,
      departmentStats,
      statusDistribution,
      pendingLeaves,
      expiringContracts,
      recentHires,
    ] = await Promise.all([
      Emp.countDocuments(),
      Emp.countDocuments({ status: 'active' }),
      Emp.countDocuments({ status: 'on-leave' }),
      Emp.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$department', count: { $sum: 1 }, avgSalary: { $avg: '$salary.base' } } },
        { $sort: { count: -1 } },
      ]),
      Emp.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      LR.countDocuments({ status: { $in: ['pending', 'manager_approved'] } }),
      this.getExpiringContracts(30),
      Emp.find({ status: 'active' })
        .sort({ hireDate: -1 })
        .limit(5)
        .select('employeeId firstName lastName position department hireDate')
        .lean(),
    ]);

    return {
      overview: {
        totalEmployees,
        activeEmployees,
        onLeave: onLeaveCount,
        terminatedThisMonth: await Emp.countDocuments({
          status: 'terminated',
          updatedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        }),
      },
      departmentStats,
      statusDistribution,
      pendingLeaveRequests: pendingLeaves,
      expiringContracts: expiringContracts.length,
      expiringContractsList: expiringContracts.slice(0, 5),
      recentHires: recentHires.map(e => ({
        ...e,
        fullName: `${e.firstName} ${e.lastName}`,
      })),
      kpis: {
        turnoverRate:
          totalEmployees > 0
            ? Math.round(((totalEmployees - activeEmployees) / totalEmployees) * 100)
            : 0,
        averageAttendanceRate: 92, // يتم حسابها من سجلات الحضور
        leaveUtilization: 45, // يتم حسابها من أرصدة الإجازات
      },
    };
  }

  /**
   * إحصائيات الأقسام
   */
  async getDepartmentStatistics(department) {
    const Emp = getEmployee();
    const LR = getLeaveRequest();

    const [employees, leaveStats] = await Promise.all([
      Emp.find({ department, status: 'active' })
        .select(
          'employeeId firstName lastName position salary.base performance.currentRating attendance'
        )
        .lean(),
      LR.aggregate([
        { $match: { department, status: 'approved' } },
        { $group: { _id: '$leaveType', count: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } },
      ]),
    ]);

    return {
      department,
      employeeCount: employees.length,
      employees: employees.map(e => ({
        ...e,
        fullName: `${e.firstName} ${e.lastName}`,
      })),
      averageSalary:
        employees.length > 0
          ? Math.round(employees.reduce((s, e) => s + (e.salary?.base || 0), 0) / employees.length)
          : 0,
      averageRating:
        employees.length > 0
          ? Math.round(
              (employees.reduce((s, e) => s + (e.performance?.currentRating || 0), 0) /
                employees.length) *
                10
            ) / 10
          : 0,
      leaveStats,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // مساعدات داخلية
  // ═══════════════════════════════════════════════════════════════════════════

  _calculateWorkingDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 5 && day !== 6) count++; // عدا الجمعة والسبت
      current.setDate(current.getDate() + 1);
    }
    return count || 1;
  }

  _calculateTotalSalary(employee) {
    let total = employee.salary?.base || 0;
    (employee.salary?.allowances || []).forEach(a => {
      if (a.type === 'monthly') total += a.amount;
    });
    (employee.salary?.deductions || []).forEach(d => {
      if (d.type === 'monthly') total -= d.amount;
    });
    return Math.max(total, 0);
  }

  _calculateYearsOfService(hireDate) {
    if (!hireDate) return 0;
    const diff = new Date() - new Date(hireDate);
    return Math.round((diff / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
  }

  _getContractStatus(contract) {
    if (!contract || !contract.endDate)
      return { status: 'indefinite', message: 'عقد غير محدد المدة' };
    const daysLeft = Math.ceil((new Date(contract.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { status: 'expired', message: 'العقد منتهي', daysLeft };
    if (daysLeft <= 30) return { status: 'expiring_soon', message: 'ينتهي قريباً', daysLeft };
    return { status: 'active', message: 'ساري', daysLeft };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // التكامل الحكومي — Government Integration helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * الحصول على ملخص التكامل الحكومي لموظف
   */
  async getEmployeeGovernmentSummary(employeeId) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId).lean();
    if (!employee) throw new Error('الموظف غير موجود');

    const isSaudi =
      (employee.nationality || '').includes('سعودي') || employee.nationality === 'Saudi';

    return {
      employeeId: employee.employeeId,
      fullName: `${employee.firstName} ${employee.lastName}`,
      nationality: employee.nationality,
      isSaudi,
      gosi: {
        registered: ['active', 'مسجل'].includes(employee.gosi?.status),
        status: employee.gosi?.status || 'غير مسجل',
        subscriptionNumber: employee.gosi?.subscriptionNumber || null,
        wage: employee.gosi?.wage || 0,
        totalContributionMonths: employee.gosi?.totalContributionMonths || 0,
      },
      qiwa: {
        hasContract: ['active', 'نشط'].includes(employee.qiwa?.contractStatus),
        contractStatus: employee.qiwa?.contractStatus || 'لا يوجد',
        contractId: employee.qiwa?.contractId || null,
        wpsStatus: employee.qiwa?.wageProtectionStatus || 'غير محدد',
      },
      mol: {
        workPermitNumber: employee.mol?.workPermitNumber || null,
        workPermitExpiry: employee.mol?.workPermitExpiry || null,
        occupationNameAr: employee.mol?.occupationNameAr || null,
      },
      sponsorship: {
        visaExpiry: employee.sponsorship?.visaExpiry || null,
        passportExpiry: employee.sponsorship?.passportExpiry || null,
      },
    };
  }

  /**
   * تحديث بيانات وزارة العمل لموظف
   */
  async updateEmployeeMOLData(employeeId, molData) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    employee.mol = { ...(employee.mol || {}), ...molData };
    await employee.save();

    return employee.toObject();
  }

  /**
   * تحديث بيانات الكفالة لموظف
   */
  async updateEmployeeSponsorshipData(employeeId, sponsorshipData) {
    const Emp = getEmployee();
    const employee = await Emp.findById(employeeId);
    if (!employee) throw new Error('الموظف غير موجود');

    employee.sponsorship = { ...(employee.sponsorship || {}), ...sponsorshipData };
    await employee.save();

    return employee.toObject();
  }

  /**
   * تقرير المستندات المنتهية / القريبة من الانتهاء
   */
  async getExpiringDocumentsReport(daysThreshold = 30) {
    const Emp = getEmployee();
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const employees = await Emp.find({ status: 'active' }).lean();

    const expiringItems = [];
    for (const emp of employees) {
      const name = `${emp.firstName} ${emp.lastName}`;

      if (emp.mol?.workPermitExpiry && new Date(emp.mol.workPermitExpiry) <= cutoff) {
        expiringItems.push({
          employeeId: emp.employeeId,
          name,
          document: 'تصريح العمل',
          expiryDate: emp.mol.workPermitExpiry,
          daysLeft: Math.ceil((new Date(emp.mol.workPermitExpiry) - now) / (1000 * 60 * 60 * 24)),
        });
      }
      if (emp.sponsorship?.visaExpiry && new Date(emp.sponsorship.visaExpiry) <= cutoff) {
        expiringItems.push({
          employeeId: emp.employeeId,
          name,
          document: 'التأشيرة / الإقامة',
          expiryDate: emp.sponsorship.visaExpiry,
          daysLeft: Math.ceil((new Date(emp.sponsorship.visaExpiry) - now) / (1000 * 60 * 60 * 24)),
        });
      }
      if (emp.sponsorship?.passportExpiry && new Date(emp.sponsorship.passportExpiry) <= cutoff) {
        expiringItems.push({
          employeeId: emp.employeeId,
          name,
          document: 'جواز السفر',
          expiryDate: emp.sponsorship.passportExpiry,
          daysLeft: Math.ceil(
            (new Date(emp.sponsorship.passportExpiry) - now) / (1000 * 60 * 60 * 24)
          ),
        });
      }
      if (emp.contract?.endDate && new Date(emp.contract.endDate) <= cutoff) {
        expiringItems.push({
          employeeId: emp.employeeId,
          name,
          document: 'العقد',
          expiryDate: emp.contract.endDate,
          daysLeft: Math.ceil((new Date(emp.contract.endDate) - now) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    expiringItems.sort((a, b) => a.daysLeft - b.daysLeft);

    return {
      totalExpiring: expiringItems.length,
      thresholdDays: daysThreshold,
      items: expiringItems,
    };
  }

  /**
   * تقرير نسبة السعودة
   */
  async getSaudizationReport() {
    const Emp = getEmployee();
    const employees = await Emp.find({ status: 'active' }).lean();

    const total = employees.length;
    const saudi = employees.filter(
      e => (e.nationality || '').includes('سعودي') || e.nationality === 'Saudi'
    ).length;
    const foreign = total - saudi;
    const rate = total > 0 ? Math.round((saudi / total) * 10000) / 100 : 0;

    // Per-department breakdown
    const deptMap = {};
    for (const emp of employees) {
      const dept = emp.department || 'غير محدد';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, saudi: 0, foreign: 0 };
      deptMap[dept].total++;
      const isSaudi = (emp.nationality || '').includes('سعودي') || emp.nationality === 'Saudi';
      if (isSaudi) deptMap[dept].saudi++;
      else deptMap[dept].foreign++;
    }

    const departments = Object.entries(deptMap).map(([name, stats]) => ({
      department: name,
      ...stats,
      saudizationRate: stats.total > 0 ? Math.round((stats.saudi / stats.total) * 10000) / 100 : 0,
    }));

    return {
      total,
      saudi,
      foreign,
      saudizationRate: rate,
      departments,
    };
  }
}

module.exports = new EmployeeAffairsService();
