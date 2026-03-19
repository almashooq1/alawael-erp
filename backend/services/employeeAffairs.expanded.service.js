/**
 * Employee Affairs Expanded Service — خدمة شؤون الموظفين الموسعة
 *
 * New services covering:
 * ─── الشكاوى والتظلمات (تقديم + تحقيق + حل)
 * ─── السلف والقروض (طلب + موافقة + أقساط + خصم من الراتب)
 * ─── الإنذارات والإجراءات التأديبية (إصدار + اعتراض + تنفيذ)
 * ─── الشهادات والخطابات (طلب + إعداد + توقيع + تسليم)
 * ─── الترقيات والتنقلات (اقتراح + موافقات + تنفيذ)
 * ─── إدارة العمل الإضافي (طلب + موافقة + حساب + ربط بالرواتب)
 *
 * @version 2.0.0
 */

const logger = require('../utils/logger');

// ─── Lazy Model Loaders ──────────────────────────────────────────────────────
let Complaint,
  EmployeeLoan,
  DisciplinaryAction,
  EmployeeLetter,
  PromotionTransfer,
  OvertimeRequest,
  Employee;

const getComplaint = () => {
  if (!Complaint) Complaint = require('../models/HR/Complaint');
  return Complaint;
};
const getEmployeeLoan = () => {
  if (!EmployeeLoan) EmployeeLoan = require('../models/HR/EmployeeLoan');
  return EmployeeLoan;
};
const getDisciplinaryAction = () => {
  if (!DisciplinaryAction) DisciplinaryAction = require('../models/HR/DisciplinaryAction');
  return DisciplinaryAction;
};
const getEmployeeLetter = () => {
  if (!EmployeeLetter) EmployeeLetter = require('../models/HR/EmployeeLetter');
  return EmployeeLetter;
};
const getPromotionTransfer = () => {
  if (!PromotionTransfer) PromotionTransfer = require('../models/HR/PromotionTransfer');
  return PromotionTransfer;
};
const getOvertimeRequest = () => {
  if (!OvertimeRequest) OvertimeRequest = require('../models/HR/OvertimeRequest');
  return OvertimeRequest;
};
const getEmployee = () => {
  if (!Employee) Employee = require('../models/employee.model');
  return Employee;
};

class EmployeeAffairsExpandedService {
  // ═══════════════════════════════════════════════════════════════════════════
  // الشكاوى والتظلمات — Complaints & Grievances
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تقديم شكوى جديدة
   */
  async createComplaint(data) {
    const Model = getComplaint();
    const count = await Model.countDocuments();
    const complaint = new Model({
      ...data,
      complaintNumber: `CMP-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      timeline: [
        {
          action: 'تم تقديم الشكوى',
          performedBy: data.employeeId,
          date: new Date(),
          notes: 'تم تقديم الشكوى بنجاح',
        },
      ],
    });
    await complaint.save();
    logger.info(`[EmployeeAffairs] Complaint created: ${complaint.complaintNumber}`);
    return complaint;
  }

  /**
   * قائمة الشكاوى مع فلترة
   */
  async listComplaints(filters = {}) {
    const Model = getComplaint();
    const query = {};
    const { employeeId, status, type, priority, page = 1, limit = 20 } = filters;

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const [complaints, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    return { complaints, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  /**
   * جلب شكوى بالمعرف
   */
  async getComplaintById(id) {
    const Model = getComplaint();
    const complaint = await Model.findById(id)
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('investigation.assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName')
      .lean();
    if (!complaint) throw new Error('الشكوى غير موجودة');
    return complaint;
  }

  /**
   * تحديث حالة الشكوى
   */
  async updateComplaintStatus(id, data) {
    const Model = getComplaint();
    const complaint = await Model.findById(id);
    if (!complaint) throw new Error('الشكوى غير موجودة');

    complaint.status = data.status;
    complaint.timeline.push({
      action: `تم تغيير الحالة إلى: ${data.status}`,
      performedBy: data.performedBy,
      date: new Date(),
      notes: data.notes || '',
    });

    if (data.status === 'قيد التحقيق' && data.assignedTo) {
      complaint.investigation.assignedTo = data.assignedTo;
      complaint.investigation.startDate = new Date();
    }

    if (data.status === 'تم الحل') {
      complaint.resolution = {
        decision: data.decision,
        actionTaken: data.actionTaken,
        resolvedBy: data.performedBy,
        resolvedAt: new Date(),
      };
    }

    await complaint.save();
    logger.info(`[EmployeeAffairs] Complaint ${complaint.complaintNumber} → ${data.status}`);
    return complaint;
  }

  /**
   * إحصائيات الشكاوى
   */
  async getComplaintStats() {
    const Model = getComplaint();
    const [statusStats, typeStats, total] = await Promise.all([
      Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Model.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Model.countDocuments(),
    ]);
    return { total, byStatus: statusStats, byType: typeStats };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // السلف والقروض — Employee Loans & Advances
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تقديم طلب سلفة/قرض
   */
  async createLoan(data) {
    const Model = getEmployeeLoan();
    const count = await Model.countDocuments();

    // Check active loans for employee
    const activeLoans = await Model.countDocuments({
      employeeId: data.employeeId,
      status: { $in: ['قيد السداد', 'تم الصرف', 'معتمد'] },
    });

    if (activeLoans >= 2) {
      throw new Error('لا يمكن تقديم طلب جديد - يوجد لديك قروض نشطة بالفعل (الحد الأقصى 2)');
    }

    const monthlyInstallment = data.amount / data.numberOfInstallments;

    const loan = new Model({
      ...data,
      loanNumber: `LN-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      monthlyInstallment: data.monthlyInstallment || monthlyInstallment,
      totalRepayment: data.amount * (1 + (data.interestRate || 0) / 100),
      remainingBalance: data.amount * (1 + (data.interestRate || 0) / 100),
      approvalWorkflow: [
        {
          step: 'المدير المباشر',
          status: 'معلق',
        },
        {
          step: 'الموارد البشرية',
          status: 'معلق',
        },
        {
          step: 'المالية',
          status: 'معلق',
        },
      ],
    });

    // Generate installment schedule
    const installments = [];
    const startDate = new Date(data.startDate || Date.now());
    for (let i = 1; i <= data.numberOfInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      installments.push({
        installmentNumber: i,
        amount: monthlyInstallment,
        dueDate,
        status: 'مستحق',
      });
    }
    loan.installments = installments;

    await loan.save();
    logger.info(`[EmployeeAffairs] Loan created: ${loan.loanNumber} for ${data.amount} SAR`);
    return loan;
  }

  /**
   * قائمة السلف والقروض
   */
  async listLoans(filters = {}) {
    const Model = getEmployeeLoan();
    const query = {};
    const { employeeId, status, type, page = 1, limit = 20 } = filters;

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;

    const [loans, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    return { loans, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  /**
   * جلب قرض بالمعرف
   */
  async getLoanById(id) {
    const Model = getEmployeeLoan();
    const loan = await Model.findById(id)
      .populate('employeeId', 'firstName lastName employeeId department salary')
      .lean();
    if (!loan) throw new Error('القرض غير موجود');
    return loan;
  }

  /**
   * الموافقة على خطوة في سير العمل
   */
  async approveLoanStep(id, data) {
    const Model = getEmployeeLoan();
    const loan = await Model.findById(id);
    if (!loan) throw new Error('القرض غير موجود');

    const pendingStep = loan.approvalWorkflow.find(s => s.status === 'معلق');
    if (!pendingStep) throw new Error('لا توجد خطوة معلقة للموافقة');

    pendingStep.status = data.approved ? 'موافق' : 'مرفوض';
    pendingStep.approvedBy = data.approvedBy;
    pendingStep.date = new Date();
    pendingStep.notes = data.notes;

    if (!data.approved) {
      loan.status = 'مرفوض';
    } else {
      const allApproved = loan.approvalWorkflow.every(s => s.status === 'موافق');
      if (allApproved) {
        loan.status = 'معتمد';
      } else {
        const stepMap = {
          'المدير المباشر': 'موافقة المدير',
          'الموارد البشرية': 'موافقة الموارد البشرية',
          المالية: 'موافقة المالية',
        };
        loan.status = stepMap[pendingStep.step] || loan.status;
      }
    }

    await loan.save();
    logger.info(`[EmployeeAffairs] Loan ${loan.loanNumber} step approved: ${pendingStep.step}`);
    return loan;
  }

  /**
   * تسجيل دفعة قسط
   */
  async recordInstallmentPayment(loanId, installmentNumber) {
    const Model = getEmployeeLoan();
    const loan = await Model.findById(loanId);
    if (!loan) throw new Error('القرض غير موجود');

    const installment = loan.installments.find(i => i.installmentNumber === installmentNumber);
    if (!installment) throw new Error('القسط غير موجود');
    if (installment.status === 'مدفوع') throw new Error('القسط مدفوع بالفعل');

    installment.status = 'مدفوع';
    installment.paidDate = new Date();
    installment.deductedFromPayroll = true;

    loan.paidAmount += installment.amount;
    loan.remainingBalance -= installment.amount;

    if (loan.remainingBalance <= 0) {
      loan.status = 'مكتمل';
      loan.remainingBalance = 0;
    } else {
      loan.status = 'قيد السداد';
    }

    await loan.save();
    logger.info(`[EmployeeAffairs] Loan ${loan.loanNumber} installment #${installmentNumber} paid`);
    return loan;
  }

  /**
   * إحصائيات القروض
   */
  async getLoanStats() {
    const Model = getEmployeeLoan();
    const stats = await Model.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalRemaining: { $sum: '$remainingBalance' },
        },
      },
    ]);
    const total = await Model.countDocuments();
    const totalDisbursed = await Model.aggregate([
      { $match: { status: { $in: ['تم الصرف', 'قيد السداد', 'مكتمل'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return { total, byStatus: stats, totalDisbursed: totalDisbursed[0]?.total || 0 };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // الإنذارات والإجراءات التأديبية — Disciplinary Actions
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إنشاء إجراء تأديبي
   */
  async createDisciplinaryAction(data) {
    const Model = getDisciplinaryAction();
    const count = await Model.countDocuments();

    // Count previous warnings for this employee
    const previousCount = await Model.countDocuments({
      employeeId: data.employeeId,
      status: { $in: ['معتمد', 'تم التنفيذ'] },
    });

    const action = new Model({
      ...data,
      actionNumber: `DA-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      previousWarnings: {
        count: previousCount,
      },
    });

    await action.save();
    logger.info(`[EmployeeAffairs] Disciplinary action created: ${action.actionNumber}`);
    return action;
  }

  /**
   * قائمة الإجراءات التأديبية
   */
  async listDisciplinaryActions(filters = {}) {
    const Model = getDisciplinaryAction();
    const query = {};
    const { employeeId, status, type, severity, page = 1, limit = 20 } = filters;

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (severity) query.severity = severity;

    const [actions, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .populate('issuedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    return { actions, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  /**
   * جلب إجراء تأديبي بالمعرف
   */
  async getDisciplinaryActionById(id) {
    const Model = getDisciplinaryAction();
    const action = await Model.findById(id)
      .populate('employeeId', 'firstName lastName employeeId department')
      .populate('issuedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .lean();
    if (!action) throw new Error('الإجراء التأديبي غير موجود');
    return action;
  }

  /**
   * اعتماد إجراء تأديبي
   */
  async approveDisciplinaryAction(id, data) {
    const Model = getDisciplinaryAction();
    const action = await Model.findById(id);
    if (!action) throw new Error('الإجراء التأديبي غير موجود');

    action.status = data.approved ? 'معتمد' : 'ملغي';
    action.approvedBy = data.approvedBy;
    action.approvalDate = new Date();

    await action.save();
    logger.info(
      `[EmployeeAffairs] Disciplinary action ${action.actionNumber} ${data.approved ? 'approved' : 'cancelled'}`
    );
    return action;
  }

  /**
   * تسجيل اعتراض الموظف
   */
  async fileAppeal(id, data) {
    const Model = getDisciplinaryAction();
    const action = await Model.findById(id);
    if (!action) throw new Error('الإجراء التأديبي غير موجود');

    action.status = 'تم الاعتراض';
    action.appeal = {
      filed: true,
      date: new Date(),
      reason: data.reason,
      decision: 'معلق',
    };

    await action.save();
    logger.info(`[EmployeeAffairs] Appeal filed for ${action.actionNumber}`);
    return action;
  }

  /**
   * سجل الموظف التأديبي
   */
  async getEmployeeDisciplinaryRecord(employeeId) {
    const Model = getDisciplinaryAction();
    const actions = await Model.find({ employeeId }).sort({ createdAt: -1 }).lean();
    return {
      total: actions.length,
      active: actions.filter(a => ['معتمد', 'تم التنفيذ'].includes(a.status)).length,
      actions,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // الشهادات والخطابات — Certificates & Letters
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * طلب شهادة/خطاب
   */
  async createLetterRequest(data) {
    const Model = getEmployeeLetter();
    const count = await Model.countDocuments();

    const letter = new Model({
      ...data,
      letterNumber: `LTR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      requestedBy: data.requestedBy || data.employeeId,
    });

    // Auto-include salary details for salary-related letters
    if (['تعريف بالراتب', 'خطاب بنكي'].includes(data.type)) {
      letter.includesSalaryDetails = true;
      try {
        const Emp = getEmployee();
        const emp = await Emp.findById(data.employeeId).lean();
        if (emp && emp.salary) {
          letter.salaryDetails = {
            basicSalary: emp.salary.basic || emp.salary,
            totalPackage: emp.salary.total || emp.salary,
            currency: 'SAR',
          };
        }
      } catch (e) {
        logger.warn(`[EmployeeAffairs] Could not fetch salary for letter: ${e.message}`);
      }
    }

    await letter.save();
    logger.info(`[EmployeeAffairs] Letter request created: ${letter.letterNumber} (${data.type})`);
    return letter;
  }

  /**
   * قائمة الخطابات والشهادات
   */
  async listLetters(filters = {}) {
    const Model = getEmployeeLetter();
    const query = {};
    const { employeeId, status, type, page = 1, limit = 20 } = filters;

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;

    const [letters, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    return { letters, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  /**
   * جلب خطاب بالمعرف
   */
  async getLetterById(id) {
    const Model = getEmployeeLetter();
    const letter = await Model.findById(id)
      .populate('employeeId', 'firstName lastName employeeId department position')
      .lean();
    if (!letter) throw new Error('الخطاب غير موجود');
    return letter;
  }

  /**
   * تحديث حالة الخطاب
   */
  async updateLetterStatus(id, data) {
    const Model = getEmployeeLetter();
    const letter = await Model.findById(id);
    if (!letter) throw new Error('الخطاب غير موجود');

    letter.status = data.status;
    if (data.preparedBy) letter.preparedBy = data.preparedBy;
    if (data.signedBy) {
      letter.signedBy = data.signedBy;
      letter.signatureDate = new Date();
    }
    if (data.status === 'تم التسليم') {
      letter.deliveredAt = new Date();
      letter.deliveryMethod = data.deliveryMethod || 'استلام يدوي';
    }
    if (data.content) letter.content = data.content;

    await letter.save();
    logger.info(`[EmployeeAffairs] Letter ${letter.letterNumber} → ${data.status}`);
    return letter;
  }

  /**
   * إحصائيات الخطابات
   */
  async getLetterStats() {
    const Model = getEmployeeLetter();
    const stats = await Model.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]);
    const statusStats = await Model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    return { byType: stats, byStatus: statusStats };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // الترقيات والتنقلات — Promotions & Transfers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تقديم طلب ترقية/نقل
   */
  async createPromotionTransfer(data) {
    const Model = getPromotionTransfer();
    const count = await Model.countDocuments();
    const prefix = data.type === 'ترقية' ? 'PRM' : 'TRF';

    const request = new Model({
      ...data,
      requestNumber: `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      approvalWorkflow: [
        { step: 'المدير المباشر', status: 'معلق' },
        { step: 'الموارد البشرية', status: 'معلق' },
        { step: 'الإدارة العليا', status: 'معلق' },
      ],
    });

    if (data.type === 'ترقية' && data.proposed?.salary && data.current?.salary) {
      request.salaryAdjustment = {
        oldSalary: data.current.salary,
        newSalary: data.proposed.salary,
        adjustment: data.proposed.salary - data.current.salary,
        adjustmentPercentage:
          ((data.proposed.salary - data.current.salary) / data.current.salary) * 100,
        effectiveFrom: data.effectiveDate,
      };
    }

    await request.save();
    logger.info(`[EmployeeAffairs] ${data.type} request created: ${request.requestNumber}`);
    return request;
  }

  /**
   * قائمة الترقيات والتنقلات
   */
  async listPromotionTransfers(filters = {}) {
    const Model = getPromotionTransfer();
    const query = {};
    const { employeeId, status, type, page = 1, limit = 20 } = filters;

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (type) query.type = type;

    const [requests, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department position')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    return { requests, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  /**
   * جلب طلب ترقية/نقل بالمعرف
   */
  async getPromotionTransferById(id) {
    const Model = getPromotionTransfer();
    const request = await Model.findById(id)
      .populate('employeeId', 'firstName lastName employeeId department position')
      .populate('initiatedBy', 'firstName lastName')
      .lean();
    if (!request) throw new Error('الطلب غير موجود');
    return request;
  }

  /**
   * الموافقة على خطوة في سير عمل الترقية/النقل
   */
  async approvePromotionTransferStep(id, data) {
    const Model = getPromotionTransfer();
    const request = await Model.findById(id);
    if (!request) throw new Error('الطلب غير موجود');

    const pendingStep = request.approvalWorkflow.find(s => s.status === 'معلق');
    if (!pendingStep) throw new Error('لا توجد خطوة معلقة للموافقة');

    pendingStep.status = data.approved ? 'موافق' : 'مرفوض';
    pendingStep.approver = data.approver;
    pendingStep.date = new Date();
    pendingStep.notes = data.notes;

    if (!data.approved) {
      request.status = 'مرفوض';
    } else {
      const allApproved = request.approvalWorkflow.every(s => s.status === 'موافق');
      if (allApproved) {
        request.status = 'معتمد';
      } else {
        const stepMap = {
          'المدير المباشر': 'موافقة المدير المباشر',
          'الموارد البشرية': 'موافقة الموارد البشرية',
          'الإدارة العليا': 'موافقة الإدارة العليا',
        };
        request.status = stepMap[pendingStep.step] || request.status;
      }
    }

    await request.save();
    logger.info(
      `[EmployeeAffairs] ${request.type} ${request.requestNumber} step: ${pendingStep.step} → ${pendingStep.status}`
    );
    return request;
  }

  /**
   * تنفيذ الترقية/النقل
   */
  async executePromotionTransfer(id, data) {
    const Model = getPromotionTransfer();
    const request = await Model.findById(id);
    if (!request) throw new Error('الطلب غير موجود');
    if (request.status !== 'معتمد') throw new Error('الطلب غير معتمد بعد');

    // Update employee record
    try {
      const Emp = getEmployee();
      const updateData = {};
      if (request.proposed.department) updateData.department = request.proposed.department;
      if (request.proposed.position) updateData.position = request.proposed.position;
      if (request.proposed.grade) updateData.grade = request.proposed.grade;
      if (request.proposed.branch) updateData.branch = request.proposed.branch;

      await Emp.findByIdAndUpdate(request.employeeId, { $set: updateData });
    } catch (e) {
      logger.warn(`[EmployeeAffairs] Could not update employee record: ${e.message}`);
    }

    request.status = 'تم التنفيذ';
    await request.save();
    logger.info(`[EmployeeAffairs] ${request.type} ${request.requestNumber} executed`);
    return request;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // إدارة العمل الإضافي — Overtime Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تقديم طلب عمل إضافي
   */
  async createOvertimeRequest(data) {
    const Model = getOvertimeRequest();
    const count = await Model.countDocuments();

    // Calculate overtime payment
    let hourlyRate = data.hourlyRate || 0;
    if (!hourlyRate && data.employeeId) {
      try {
        const Emp = getEmployee();
        const emp = await Emp.findById(data.employeeId).lean();
        const monthlySalary = emp?.salary?.basic || emp?.salary || 0;
        hourlyRate = monthlySalary / 30 / 8; // Monthly / 30 days / 8 hours
      } catch (e) {
        logger.warn(`[EmployeeAffairs] Could not calculate hourly rate: ${e.message}`);
      }
    }

    const multiplierMap = {
      'عمل إضافي عادي': 1.5,
      'عمل يوم راحة': 2.0,
      'عمل يوم عطلة رسمية': 2.5,
      'عمل ليلي': 1.75,
    };

    const multiplier = multiplierMap[data.type] || 1.5;
    const overtimeRate = hourlyRate * multiplier;
    const totalAmount = overtimeRate * data.totalHours;

    const request = new Model({
      ...data,
      requestNumber: `OT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      calculation: {
        hourlyRate,
        multiplier,
        overtimeRate,
        totalAmount,
      },
      approvalWorkflow: [
        { step: 'المدير المباشر', status: 'معلق' },
        { step: 'الموارد البشرية', status: 'معلق' },
      ],
    });

    await request.save();
    logger.info(
      `[EmployeeAffairs] Overtime request created: ${request.requestNumber} (${data.totalHours}h)`
    );
    return request;
  }

  /**
   * قائمة طلبات العمل الإضافي
   */
  async listOvertimeRequests(filters = {}) {
    const Model = getOvertimeRequest();
    const query = {};
    const { employeeId, status, department, dateFrom, dateTo, page = 1, limit = 20 } = filters;

    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (department) query.department = department;
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }

    const [requests, total] = await Promise.all([
      Model.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Model.countDocuments(query),
    ]);

    return { requests, total, page: Number(page), pages: Math.ceil(total / limit) };
  }

  /**
   * جلب طلب عمل إضافي بالمعرف
   */
  async getOvertimeRequestById(id) {
    const Model = getOvertimeRequest();
    const request = await Model.findById(id)
      .populate('employeeId', 'firstName lastName employeeId department salary')
      .lean();
    if (!request) throw new Error('طلب العمل الإضافي غير موجود');
    return request;
  }

  /**
   * الموافقة على طلب عمل إضافي
   */
  async approveOvertimeStep(id, data) {
    const Model = getOvertimeRequest();
    const request = await Model.findById(id);
    if (!request) throw new Error('الطلب غير موجود');

    const pendingStep = request.approvalWorkflow.find(s => s.status === 'معلق');
    if (!pendingStep) throw new Error('لا توجد خطوة معلقة');

    pendingStep.status = data.approved ? 'موافق' : 'مرفوض';
    pendingStep.approver = data.approver;
    pendingStep.date = new Date();
    pendingStep.notes = data.notes;

    if (!data.approved) {
      request.status = 'مرفوض';
    } else {
      const allApproved = request.approvalWorkflow.every(s => s.status === 'موافق');
      request.status = allApproved ? 'معتمد' : 'موافقة المدير';
    }

    await request.save();
    logger.info(
      `[EmployeeAffairs] Overtime ${request.requestNumber} step: ${pendingStep.step} → ${pendingStep.status}`
    );
    return request;
  }

  /**
   * تقرير العمل الإضافي الشهري
   */
  async getOvertimeMonthlyReport(month, year) {
    const Model = getOvertimeRequest();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const report = await Model.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: 'معتمد',
        },
      },
      {
        $group: {
          _id: '$employeeId',
          totalHours: { $sum: '$totalHours' },
          totalAmount: { $sum: '$calculation.totalAmount' },
          requestCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          employeeId: '$_id',
          employeeName: {
            $concat: [
              { $ifNull: ['$employee.firstName', ''] },
              ' ',
              { $ifNull: ['$employee.lastName', ''] },
            ],
          },
          department: '$employee.department',
          totalHours: 1,
          totalAmount: 1,
          requestCount: 1,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const summary = report.reduce(
      (acc, r) => ({
        totalHours: acc.totalHours + r.totalHours,
        totalAmount: acc.totalAmount + r.totalAmount,
        totalRequests: acc.totalRequests + r.requestCount,
      }),
      { totalHours: 0, totalAmount: 0, totalRequests: 0 }
    );

    return { month, year, employees: report, summary };
  }

  /**
   * إحصائيات العمل الإضافي
   */
  async getOvertimeStats() {
    const Model = getOvertimeRequest();
    const [statusStats, typeStats, total] = await Promise.all([
      Model.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalHours: { $sum: '$totalHours' } } },
      ]),
      Model.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, totalHours: { $sum: '$totalHours' } } },
      ]),
      Model.countDocuments(),
    ]);

    const approvedTotal = await Model.aggregate([
      { $match: { status: 'معتمد' } },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$totalHours' },
          totalAmount: { $sum: '$calculation.totalAmount' },
        },
      },
    ]);

    return {
      total,
      byStatus: statusStats,
      byType: typeStats,
      approved: approvedTotal[0] || { totalHours: 0, totalAmount: 0 },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // لوحة المعلومات الموسعة — Expanded Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إحصائيات شاملة لشؤون الموظفين الموسعة
   */
  async getExpandedDashboard() {
    const [complaints, loans, disciplinary, letters, promotions, overtime] = await Promise.all([
      this.getComplaintStats(),
      this.getLoanStats(),
      getDisciplinaryAction().countDocuments(),
      this.getLetterStats(),
      getPromotionTransfer().aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      this.getOvertimeStats(),
    ]);

    return {
      complaints,
      loans,
      disciplinaryActions: disciplinary,
      letters,
      promotionsAndTransfers: promotions,
      overtime,
    };
  }
}

module.exports = new EmployeeAffairsExpandedService();
