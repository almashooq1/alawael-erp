/**
 * Unit Tests – EmployeeAffairsService
 * backend/services/employeeAffairs.service.js
 *
 * ~200 tests covering all 34 public methods + private helpers.
 */

/* ─── mock helpers ─────────────────────────────────────────────────────── */

const buildChain = finalValue => {
  const chain = {};
  ['sort', 'skip', 'limit', 'lean', 'select', 'populate'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  // lean() is typically the terminal — resolve with finalValue
  chain.lean.mockReturnValue(
    finalValue !== undefined
      ? typeof finalValue.then === 'function'
        ? finalValue
        : Promise.resolve(finalValue)
      : chain
  );
  return chain;
};

/* ─── mock Employee model ──────────────────────────────────────────────── */

const mockEmployee = jest.fn(function (data) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue(this);
  this.toObject = jest.fn().mockReturnValue({ ...data });
  this.addPerformanceRating = jest.fn().mockResolvedValue(undefined);
});
mockEmployee.findById = jest.fn();
mockEmployee.findOne = jest.fn();
mockEmployee.find = jest.fn();
mockEmployee.findByIdAndUpdate = jest.fn();
mockEmployee.countDocuments = jest.fn();
mockEmployee.aggregate = jest.fn();

/* ─── mock LeaveRequest model ──────────────────────────────────────────── */

const mockLeaveRequest = jest.fn(function (data) {
  Object.assign(this, data);
  this._id = 'leave123';
  this.save = jest.fn().mockResolvedValue(this);
});
mockLeaveRequest.findById = jest.fn();
mockLeaveRequest.findOne = jest.fn();
mockLeaveRequest.find = jest.fn();
mockLeaveRequest.countDocuments = jest.fn();
mockLeaveRequest.aggregate = jest.fn();

/* ─── wire mocks ───────────────────────────────────────────────────────── */

jest.mock('../../models/employee.model', () => mockEmployee);
jest.mock('../../models/LeaveRequest', () => mockLeaveRequest);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

const service = require('../../services/employeeAffairs.service');

/* ─── shared fixtures ──────────────────────────────────────────────────── */

const baseEmployee = {
  _id: 'emp1',
  employeeId: 'EMP-001',
  firstName: 'أحمد',
  lastName: 'محمد',
  email: 'ahmed@test.com',
  department: 'IT',
  position: 'مطور',
  status: 'active',
  isActive: true,
  nationality: 'سعودي',
  hireDate: new Date('2020-01-01'),
  salary: {
    base: 10000,
    allowances: [
      { type: 'monthly', amount: 2000 },
      { type: 'yearly', amount: 6000 },
    ],
    deductions: [{ type: 'monthly', amount: 500 }],
  },
  leave: {
    annualLeaveDays: 30,
    usedAnnualLeave: 5,
    sickLeaveDays: 10,
    usedSickLeave: 2,
  },
  attendance: {
    totalDaysWorked: 200,
    totalAbsences: 3,
    lateArrivals: 5,
    earlyDepartures: 2,
  },
  performance: {
    currentRating: 4,
    ratingHistory: [{ rating: 3 }, { rating: 4 }],
    goals: [{ title: 'g1' }],
  },
  contract: {
    startDate: new Date('2023-01-01'),
    endDate: new Date(Date.now() + 15 * 86400000), // 15 days from now
    contractType: 'full-time',
  },
  careerDevelopment: {
    promotions: [],
    certifications: [],
    trainings: [],
  },
  skills: [],
  documents: [{ name: 'cv.pdf' }],
  gosi: { status: 'active', subscriptionNumber: 'G123', wage: 10000, totalContributionMonths: 24 },
  qiwa: { contractStatus: 'active', contractId: 'Q1', wageProtectionStatus: 'مطابق' },
  mol: {
    workPermitNumber: 'MOL1',
    workPermitExpiry: new Date('2025-12-01'),
    occupationNameAr: 'مهندس',
  },
  sponsorship: { visaExpiry: new Date('2025-06-01'), passportExpiry: new Date('2026-01-01') },
};

const makeEmpDoc = (overrides = {}) => {
  const doc = { ...baseEmployee, ...overrides };
  doc.save = jest.fn().mockResolvedValue(doc);
  doc.toObject = jest.fn().mockReturnValue({ ...doc, save: undefined, toObject: undefined });
  doc.addPerformanceRating = jest.fn().mockResolvedValue(undefined);
  return doc;
};

/* ──────────────────────────────────────────────────────────────────────── */

beforeEach(() => {
  jest.clearAllMocks();
  // Reset return-value queues on static methods to prevent cross-test leaks
  [
    mockEmployee.findById,
    mockEmployee.findOne,
    mockEmployee.find,
    mockEmployee.findByIdAndUpdate,
    mockEmployee.countDocuments,
    mockEmployee.aggregate,
    mockLeaveRequest.findById,
    mockLeaveRequest.findOne,
    mockLeaveRequest.find,
    mockLeaveRequest.countDocuments,
    mockLeaveRequest.aggregate,
  ].forEach(m => m.mockReset());
});

/* ═══════════════════════════════════════════════════════════════════════
   1. Module exports
   ═══════════════════════════════════════════════════════════════════════ */

describe('EmployeeAffairsService – module exports', () => {
  it('exports a singleton object', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });

  const expectedMethods = [
    'createEmployee',
    'getEmployeeById',
    'listEmployees',
    'updateEmployee',
    'terminateEmployee',
    'getEmployeeProfile',
    'requestLeave',
    'approveLeaveByManager',
    'approveLeaveByHR',
    'rejectLeave',
    'cancelLeave',
    'getLeaveBalance',
    'listLeaves',
    'checkIn',
    'checkOut',
    'getMonthlyAttendanceReport',
    'createPerformanceReview',
    'getPerformanceHistory',
    'setEmployeeGoals',
    'getExpiringContracts',
    'renewContract',
    'promoteEmployee',
    'addCertification',
    'addTraining',
    'addSkill',
    'addDocument',
    'getDocuments',
    'getDashboard',
    'getDepartmentStatistics',
    'getEmployeeGovernmentSummary',
    'updateEmployeeMOLData',
    'updateEmployeeSponsorshipData',
    'getExpiringDocumentsReport',
    'getSaudizationReport',
  ];

  it.each(expectedMethods)('has method %s', method => {
    expect(typeof service[method]).toBe('function');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   2. Employee CRUD
   ═══════════════════════════════════════════════════════════════════════ */

describe('createEmployee', () => {
  const data = { employeeId: 'EMP-100', email: 'new@test.com', firstName: 'علي', lastName: 'حسن' };

  it('creates employee when no duplicate', async () => {
    mockEmployee.findOne.mockResolvedValue(null);
    const result = await service.createEmployee(data);
    expect(mockEmployee.findOne).toHaveBeenCalled();
    expect(result.employeeId).toBe(data.employeeId);
    expect(result.save).toHaveBeenCalled();
  });

  it('sets default status to active', async () => {
    mockEmployee.findOne.mockResolvedValue(null);
    const result = await service.createEmployee(data);
    expect(result.status).toBe('active');
  });

  it('sets default leave balances', async () => {
    mockEmployee.findOne.mockResolvedValue(null);
    const result = await service.createEmployee(data);
    expect(result.leave.annualLeaveDays).toBe(30);
    expect(result.leave.sickLeaveDays).toBe(10);
    expect(result.leave.usedAnnualLeave).toBe(0);
  });

  it('uses provided status when given', async () => {
    mockEmployee.findOne.mockResolvedValue(null);
    const result = await service.createEmployee({ ...data, status: 'probation' });
    expect(result.status).toBe('probation');
  });

  it('throws Arabic message for duplicate employeeId', async () => {
    mockEmployee.findOne.mockResolvedValue({ employeeId: data.employeeId });
    await expect(service.createEmployee(data)).rejects.toThrow('رقم الموظف مستخدم بالفعل');
  });

  it('throws Arabic message for duplicate email', async () => {
    mockEmployee.findOne.mockResolvedValue({ employeeId: 'OTHER', email: data.email });
    await expect(service.createEmployee(data)).rejects.toThrow('البريد الإلكتروني مستخدم بالفعل');
  });
});

describe('getEmployeeById', () => {
  it('returns employee when found', async () => {
    const emp = makeEmpDoc();
    mockEmployee.findById.mockResolvedValue(emp);
    const result = await service.getEmployeeById('emp1');
    expect(result).toBe(emp);
  });

  it('throws when not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.getEmployeeById('x')).rejects.toThrow('الموظف غير موجود');
  });
});

describe('listEmployees', () => {
  it('returns employees and pagination', async () => {
    const chain = buildChain([baseEmployee]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(1);

    const result = await service.listEmployees({});
    expect(result.employees).toHaveLength(1);
    expect(result.pagination).toEqual({ total: 1, page: 1, limit: 20, pages: 1 });
  });

  it('applies department filter', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(0);

    await service.listEmployees({ department: 'HR' });
    expect(mockEmployee.find).toHaveBeenCalledWith(expect.objectContaining({ department: 'HR' }));
  });

  it('applies status filter', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(0);

    await service.listEmployees({ status: 'active' });
    expect(mockEmployee.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });

  it('applies search regex across multiple fields', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(0);

    await service.listEmployees({ search: 'أحمد' });
    const q = mockEmployee.find.mock.calls[0][0];
    expect(q.$or).toBeDefined();
    expect(q.$or.length).toBe(5);
  });

  it('calculates skip from page and limit', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(50);

    await service.listEmployees({ page: 3, limit: 10 });
    expect(chain.skip).toHaveBeenCalledWith(20);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('handles sort parameters', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(0);

    await service.listEmployees({ sortBy: 'firstName', sortOrder: 1 });
    expect(chain.sort).toHaveBeenCalledWith({ firstName: 1 });
  });

  it('computes pages correctly', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);
    mockEmployee.countDocuments.mockResolvedValue(45);

    const result = await service.listEmployees({ page: 1, limit: 20 });
    expect(result.pagination.pages).toBe(3);
  });
});

describe('updateEmployee', () => {
  it('returns updated employee', async () => {
    const emp = makeEmpDoc({ position: 'مدير' });
    mockEmployee.findByIdAndUpdate.mockResolvedValue(emp);
    const result = await service.updateEmployee('emp1', { position: 'مدير' });
    expect(result.position).toBe('مدير');
  });

  it('passes runValidators option', async () => {
    mockEmployee.findByIdAndUpdate.mockResolvedValue(makeEmpDoc());
    await service.updateEmployee('emp1', { position: 'test' });
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      expect.objectContaining({ position: 'test' }),
      expect.objectContaining({ new: true, runValidators: true })
    );
  });

  it('throws when employee not found', async () => {
    mockEmployee.findByIdAndUpdate.mockResolvedValue(null);
    await expect(service.updateEmployee('x', {})).rejects.toThrow('الموظف غير موجود');
  });
});

describe('terminateEmployee', () => {
  it('sets status to terminated and isActive false', async () => {
    const emp = makeEmpDoc({ status: 'terminated', isActive: false });
    mockEmployee.findByIdAndUpdate.mockResolvedValue(emp);
    const result = await service.terminateEmployee('emp1', 'استقالة');
    expect(result.status).toBe('terminated');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      expect.objectContaining({ status: 'terminated', isActive: false }),
      { new: true }
    );
  });

  it('sets termination date when provided', async () => {
    const termDate = new Date('2025-06-01');
    mockEmployee.findByIdAndUpdate.mockResolvedValue(makeEmpDoc());
    await service.terminateEmployee('emp1', 'reason', termDate);
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      expect.objectContaining({ 'contract.endDate': termDate }),
      { new: true }
    );
  });

  it('throws when employee not found', async () => {
    mockEmployee.findByIdAndUpdate.mockResolvedValue(null);
    await expect(service.terminateEmployee('x', 'r')).rejects.toThrow('الموظف غير موجود');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   3. Employee Profile
   ═══════════════════════════════════════════════════════════════════════ */

describe('getEmployeeProfile', () => {
  it('returns enriched profile', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee }),
    });

    // getLeaveBalance needs its own findById chain
    const balanceChain = { lean: jest.fn().mockResolvedValue({ ...baseEmployee }) };
    // The second call to findById is inside getLeaveBalance
    mockEmployee.findById
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ ...baseEmployee }) })
      .mockReturnValueOnce(balanceChain);

    const leaveChain = buildChain([{ _id: 'l1', leaveType: 'annual' }]);
    mockLeaveRequest.find.mockReturnValue(leaveChain);

    const result = await service.getEmployeeProfile('emp1');
    expect(result.fullName).toBe('أحمد محمد');
    expect(result.leaveBalance).toBeDefined();
    expect(result.leaveBalance.annual).toBeDefined();
    expect(result.totalSalary).toBe(11500); // 10000 + 2000 - 500
    expect(result.yearsOfService).toBeGreaterThan(0);
    expect(result.contractStatus).toBeDefined();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(service.getEmployeeProfile('x')).rejects.toThrow('الموظف غير موجود');
  });

  it('includes recentLeaves', async () => {
    mockEmployee.findById
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ ...baseEmployee }) })
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ ...baseEmployee }) });

    const leaves = [{ _id: 'l1' }, { _id: 'l2' }];
    const leaveChain = buildChain(leaves);
    mockLeaveRequest.find.mockReturnValue(leaveChain);

    const result = await service.getEmployeeProfile('emp1');
    expect(result.recentLeaves).toEqual(leaves);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   4. Leave Management
   ═══════════════════════════════════════════════════════════════════════ */

describe('requestLeave', () => {
  const leaveData = {
    employeeId: 'emp1',
    leaveType: 'annual',
    startDate: '2025-07-01',
    endDate: '2025-07-03',
    reason: 'راحة',
  };

  beforeEach(() => {
    // employee exists
    mockEmployee.findById
      .mockResolvedValueOnce(makeEmpDoc()) // validate employee exists
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ ...baseEmployee }) }); // getLeaveBalance
    // no conflict
    mockLeaveRequest.findOne.mockResolvedValue(null);
  });

  it('creates leave request successfully', async () => {
    const result = await service.requestLeave(leaveData);
    expect(result.employee).toBe('emp1');
    expect(result.save).toHaveBeenCalled();
  });

  it('calculates working days correctly (excl Fri+Sat)', async () => {
    const result = await service.requestLeave(leaveData);
    expect(result.totalDays).toBeGreaterThanOrEqual(1);
  });

  it('uses 0.5 for half-day leave', async () => {
    const result = await service.requestLeave({ ...leaveData, isHalfDay: true });
    expect(result.totalDays).toBe(0.5);
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockReset();
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.requestLeave(leaveData)).rejects.toThrow('الموظف غير موجود');
  });

  it('throws when annual balance insufficient', async () => {
    mockEmployee.findById.mockReset();
    const empLow = makeEmpDoc();
    mockEmployee.findById.mockResolvedValueOnce(empLow).mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({
        ...baseEmployee,
        leave: { annualLeaveDays: 2, usedAnnualLeave: 2, sickLeaveDays: 10, usedSickLeave: 0 },
      }),
    });
    mockLeaveRequest.findOne.mockResolvedValue(null);

    await expect(service.requestLeave(leaveData)).rejects.toThrow('رصيد الإجازات السنوية غير كافٍ');
  });

  it('throws when sick balance insufficient', async () => {
    mockEmployee.findById.mockReset();
    const empLow = makeEmpDoc();
    mockEmployee.findById.mockResolvedValueOnce(empLow).mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({
        ...baseEmployee,
        leave: { annualLeaveDays: 30, usedAnnualLeave: 0, sickLeaveDays: 1, usedSickLeave: 1 },
      }),
    });
    mockLeaveRequest.findOne.mockResolvedValue(null);

    await expect(service.requestLeave({ ...leaveData, leaveType: 'sick' })).rejects.toThrow(
      'رصيد الإجازات المرضية غير كافٍ'
    );
  });

  it('throws when conflict found', async () => {
    mockEmployee.findById.mockReset();
    mockEmployee.findById
      .mockResolvedValueOnce(makeEmpDoc())
      .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ ...baseEmployee }) });
    mockLeaveRequest.findOne.mockResolvedValue({ _id: 'conflict' });

    await expect(service.requestLeave(leaveData)).rejects.toThrow('يوجد تعارض مع إجازة أخرى');
  });

  it('sets balanceSnapshot on leave request', async () => {
    const result = await service.requestLeave(leaveData);
    expect(result.balanceSnapshot).toBeDefined();
    expect(result.balanceSnapshot.annualTotal).toBe(30);
  });
});

describe('approveLeaveByManager', () => {
  it('calls leave.approveByManager when status is pending', async () => {
    const leave = {
      _id: 'l1',
      status: 'pending',
      approveByManager: jest.fn().mockResolvedValue({ status: 'manager_approved' }),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);

    const result = await service.approveLeaveByManager('l1', 'mgr1', 'Manager', 'ok');
    expect(leave.approveByManager).toHaveBeenCalledWith('mgr1', 'Manager', 'ok');
    expect(result.status).toBe('manager_approved');
  });

  it('throws when leave not found', async () => {
    mockLeaveRequest.findById.mockResolvedValue(null);
    await expect(service.approveLeaveByManager('x', 'a', 'n', 'c')).rejects.toThrow(
      'طلب الإجازة غير موجود'
    );
  });

  it('throws when status is not pending', async () => {
    mockLeaveRequest.findById.mockResolvedValue({ status: 'approved' });
    await expect(service.approveLeaveByManager('l1', 'a', 'n', 'c')).rejects.toThrow(
      'لا يمكن الموافقة على هذا الطلب'
    );
  });
});

describe('approveLeaveByHR', () => {
  it('updates balance and approves for annual leave', async () => {
    const leave = {
      _id: 'l1',
      status: 'manager_approved',
      leaveType: 'annual',
      totalDays: 3,
      employee: 'emp1',
      approveByHR: jest.fn().mockResolvedValue({ status: 'approved' }),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.approveLeaveByHR('l1', 'hr1', 'HR', 'ok');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith('emp1', {
      $inc: { 'leave.usedAnnualLeave': 3 },
    });
    expect(result.status).toBe('approved');
  });

  it('updates balance for sick leave', async () => {
    const leave = {
      _id: 'l1',
      status: 'manager_approved',
      leaveType: 'sick',
      totalDays: 2,
      employee: 'emp1',
      approveByHR: jest.fn().mockResolvedValue({ status: 'approved' }),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    await service.approveLeaveByHR('l1', 'hr1', 'HR', '');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith('emp1', {
      $inc: { 'leave.usedSickLeave': 2 },
    });
  });

  it('skips balance update for other leave types', async () => {
    const leave = {
      status: 'manager_approved',
      leaveType: 'emergency',
      totalDays: 1,
      employee: 'emp1',
      approveByHR: jest.fn().mockResolvedValue({}),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);

    await service.approveLeaveByHR('l1', 'hr1', 'HR', '');
    expect(mockEmployee.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('throws when leave not found', async () => {
    mockLeaveRequest.findById.mockResolvedValue(null);
    await expect(service.approveLeaveByHR('x', 'a', 'n', 'c')).rejects.toThrow(
      'طلب الإجازة غير موجود'
    );
  });

  it('throws when status is not manager_approved', async () => {
    mockLeaveRequest.findById.mockResolvedValue({ status: 'pending' });
    await expect(service.approveLeaveByHR('l1', 'a', 'n', 'c')).rejects.toThrow(
      'يجب موافقة المدير أولاً'
    );
  });
});

describe('rejectLeave', () => {
  it('calls leave.reject', async () => {
    const leave = { reject: jest.fn().mockResolvedValue({ status: 'rejected' }) };
    mockLeaveRequest.findById.mockResolvedValue(leave);

    const result = await service.rejectLeave('l1', 'r1', 'Rejector', 'no', 'manager');
    expect(leave.reject).toHaveBeenCalledWith('r1', 'Rejector', 'no', 'manager');
    expect(result.status).toBe('rejected');
  });

  it('defaults stage to hr', async () => {
    const leave = { reject: jest.fn().mockResolvedValue({}) };
    mockLeaveRequest.findById.mockResolvedValue(leave);

    await service.rejectLeave('l1', 'r1', 'R', 'no');
    expect(leave.reject).toHaveBeenCalledWith('r1', 'R', 'no', 'hr');
  });

  it('throws when leave not found', async () => {
    mockLeaveRequest.findById.mockResolvedValue(null);
    await expect(service.rejectLeave('x', 'r', 'n', 'c')).rejects.toThrow('طلب الإجازة غير موجود');
  });
});

describe('cancelLeave', () => {
  it('restores annual balance when cancelling approved leave', async () => {
    const leave = {
      status: 'approved',
      leaveType: 'annual',
      totalDays: 3,
      employee: 'emp1',
      cancel: jest.fn().mockResolvedValue({ status: 'cancelled' }),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.cancelLeave('l1', 'u1', 'reason');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith('emp1', {
      $inc: { 'leave.usedAnnualLeave': -3 },
    });
    expect(result.status).toBe('cancelled');
  });

  it('restores sick balance when cancelling approved sick leave', async () => {
    const leave = {
      status: 'approved',
      leaveType: 'sick',
      totalDays: 2,
      employee: 'emp1',
      cancel: jest.fn().mockResolvedValue({}),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    await service.cancelLeave('l1', 'u1', 'reason');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith('emp1', {
      $inc: { 'leave.usedSickLeave': -2 },
    });
  });

  it('does NOT restore balance when cancelling pending leave', async () => {
    const leave = {
      status: 'pending',
      leaveType: 'annual',
      totalDays: 3,
      employee: 'emp1',
      cancel: jest.fn().mockResolvedValue({}),
    };
    mockLeaveRequest.findById.mockResolvedValue(leave);

    await service.cancelLeave('l1', 'u1', 'reason');
    expect(mockEmployee.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('throws when leave not found', async () => {
    mockLeaveRequest.findById.mockResolvedValue(null);
    await expect(service.cancelLeave('x', 'u', 'r')).rejects.toThrow('طلب الإجازة غير موجود');
  });

  it('throws when leave already cancelled', async () => {
    mockLeaveRequest.findById.mockResolvedValue({ status: 'cancelled' });
    await expect(service.cancelLeave('l1', 'u', 'r')).rejects.toThrow('الطلب ملغي بالفعل');
  });
});

describe('getLeaveBalance', () => {
  it('returns annual and sick balances', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee }),
    });

    const result = await service.getLeaveBalance('emp1');
    expect(result.annual).toEqual({ total: 30, used: 5, remaining: 25 });
    expect(result.sick).toEqual({ total: 10, used: 2, remaining: 8 });
  });

  it('returns defaults when leave data missing', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'emp1' }),
    });

    const result = await service.getLeaveBalance('emp1');
    expect(result.annual).toEqual({ total: 30, used: 0, remaining: 30 });
    expect(result.sick).toEqual({ total: 10, used: 0, remaining: 10 });
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(service.getLeaveBalance('x')).rejects.toThrow('الموظف غير موجود');
  });
});

describe('listLeaves', () => {
  it('returns leaves and pagination', async () => {
    const chain = buildChain([{ _id: 'l1' }]);
    mockLeaveRequest.find.mockReturnValue(chain);
    mockLeaveRequest.countDocuments.mockResolvedValue(1);

    const result = await service.listLeaves({});
    expect(result.leaves).toHaveLength(1);
    expect(result.pagination).toEqual({ total: 1, page: 1, limit: 20, pages: 1 });
  });

  it('applies employeeId filter', async () => {
    const chain = buildChain([]);
    mockLeaveRequest.find.mockReturnValue(chain);
    mockLeaveRequest.countDocuments.mockResolvedValue(0);

    await service.listLeaves({ employeeId: 'emp1' });
    expect(mockLeaveRequest.find).toHaveBeenCalledWith(
      expect.objectContaining({ employee: 'emp1' })
    );
  });

  it('applies department filter', async () => {
    const chain = buildChain([]);
    mockLeaveRequest.find.mockReturnValue(chain);
    mockLeaveRequest.countDocuments.mockResolvedValue(0);

    await service.listLeaves({ department: 'IT' });
    expect(mockLeaveRequest.find).toHaveBeenCalledWith(
      expect.objectContaining({ department: 'IT' })
    );
  });

  it('applies status and leaveType filters', async () => {
    const chain = buildChain([]);
    mockLeaveRequest.find.mockReturnValue(chain);
    mockLeaveRequest.countDocuments.mockResolvedValue(0);

    await service.listLeaves({ status: 'pending', leaveType: 'annual' });
    expect(mockLeaveRequest.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', leaveType: 'annual' })
    );
  });

  it('applies date range filter', async () => {
    const chain = buildChain([]);
    mockLeaveRequest.find.mockReturnValue(chain);
    mockLeaveRequest.countDocuments.mockResolvedValue(0);

    await service.listLeaves({ startDate: '2025-01-01', endDate: '2025-12-31' });
    const q = mockLeaveRequest.find.mock.calls[0][0];
    expect(q.startDate).toBeDefined();
    expect(q.endDate).toBeDefined();
  });

  it('paginates correctly', async () => {
    const chain = buildChain([]);
    mockLeaveRequest.find.mockReturnValue(chain);
    mockLeaveRequest.countDocuments.mockResolvedValue(100);

    const result = await service.listLeaves({ page: 2, limit: 10 });
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(result.pagination.pages).toBe(10);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   5. Attendance
   ═══════════════════════════════════════════════════════════════════════ */

describe('checkIn', () => {
  it('returns check-in record', async () => {
    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkIn('emp1', { method: 'fingerprint' });
    expect(result.checkIn).toBeInstanceOf(Date);
    expect(result.method).toBe('fingerprint');
  });

  it('defaults method to manual', async () => {
    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkIn('emp1');
    expect(result.method).toBe('manual');
  });

  it('records late arrival after 8:00', async () => {
    // We can't easily control Date.now() without jest.useFakeTimers,
    // so we at least verify the shape of isLate/lateMinutes
    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkIn('emp1');
    expect(typeof result.isLate).toBe('boolean');
    expect(typeof result.lateMinutes).toBe('number');
  });

  it('increments lateArrivals when late', async () => {
    const realDate = Date;
    // Simulate 10:00 AM
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        const d = new realDate(2025, 5, 1, 10, 0, 0);
        d.setHours = realDate.prototype.setHours.bind(d);
        return d;
      }
      return new realDate(...args);
    });
    global.Date.now = realDate.now;

    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkIn('emp1');
    expect(result.isLate).toBe(true);
    expect(result.lateMinutes).toBe(120);
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      expect.objectContaining({ $inc: { 'attendance.lateArrivals': 1 } })
    );

    jest.restoreAllMocks();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.checkIn('x')).rejects.toThrow('الموظف غير موجود');
  });
});

describe('checkOut', () => {
  it('returns check-out record', async () => {
    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkOut('emp1', { method: 'card' });
    expect(result.checkOut).toBeInstanceOf(Date);
    expect(result.method).toBe('card');
  });

  it('defaults method to manual', async () => {
    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkOut('emp1');
    expect(result.method).toBe('manual');
  });

  it('increments totalDaysWorked', async () => {
    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    await service.checkOut('emp1');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      expect.objectContaining({
        $inc: expect.objectContaining({ 'attendance.totalDaysWorked': 1 }),
      })
    );
  });

  it('calculates overtime when after 16:00', async () => {
    const realDate = Date;
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        const d = new realDate(2025, 5, 1, 18, 0, 0);
        d.setHours = realDate.prototype.setHours.bind(d);
        return d;
      }
      return new realDate(...args);
    });
    global.Date.now = realDate.now;

    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkOut('emp1');
    expect(result.isEarly).toBe(false);
    expect(result.overtimeMinutes).toBe(120);
    expect(result.totalHours).toBeCloseTo(10);

    jest.restoreAllMocks();
  });

  it('calculates early departure before 16:00', async () => {
    const realDate = Date;
    jest.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        const d = new realDate(2025, 5, 1, 14, 0, 0);
        d.setHours = realDate.prototype.setHours.bind(d);
        return d;
      }
      return new realDate(...args);
    });
    global.Date.now = realDate.now;

    mockEmployee.findById.mockResolvedValue(makeEmpDoc());
    mockEmployee.findByIdAndUpdate.mockResolvedValue({});

    const result = await service.checkOut('emp1');
    expect(result.isEarly).toBe(true);
    expect(result.earlyMinutes).toBe(120);
    expect(result.totalHours).toBeCloseTo(6);

    jest.restoreAllMocks();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.checkOut('x')).rejects.toThrow('الموظف غير موجود');
  });
});

describe('getMonthlyAttendanceReport', () => {
  it('returns attendance summary', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee }),
    });

    const result = await service.getMonthlyAttendanceReport('emp1', 3, 2025);
    expect(result.employeeId).toBe('EMP-001');
    expect(result.employeeName).toBe('أحمد محمد');
    expect(result.month).toBe(3);
    expect(result.year).toBe(2025);
    expect(result.summary.totalDaysWorked).toBe(200);
    expect(result.summary.lateArrivals).toBe(5);
    expect(result.summary.attendanceRate).toBeGreaterThan(0);
  });

  it('returns zero summary when attendance data missing', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee, attendance: undefined }),
    });

    const result = await service.getMonthlyAttendanceReport('emp1', 1, 2025);
    expect(result.summary.totalDaysWorked).toBe(0);
    expect(result.summary.attendanceRate).toBe(0);
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(service.getMonthlyAttendanceReport('x', 1, 2025)).rejects.toThrow(
      'الموظف غير موجود'
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   6. Performance
   ═══════════════════════════════════════════════════════════════════════ */

describe('createPerformanceReview', () => {
  it('adds performance rating and returns review info', async () => {
    const empDoc = makeEmpDoc();
    empDoc.performance = { currentRating: 4, ratingHistory: [{ rating: 3 }] };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const result = await service.createPerformanceReview('emp1', {
      rating: 5,
      reviewer: 'mgr1',
      comments: 'ممتاز',
    });

    expect(empDoc.addPerformanceRating).toHaveBeenCalledWith(5, 'mgr1', 'ممتاز');
    expect(result.review.rating).toBe(5);
    expect(result.employee).toBe('EMP-001');
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.createPerformanceReview('x', { rating: 3 })).rejects.toThrow(
      'الموظف غير موجود'
    );
  });
});

describe('getPerformanceHistory', () => {
  it('returns rating data', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee }),
    });

    const result = await service.getPerformanceHistory('emp1');
    expect(result.currentRating).toBe(4);
    expect(result.ratingHistory).toHaveLength(2);
    expect(result.goals).toHaveLength(1);
  });

  it('returns defaults when performance data missing', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee, performance: undefined }),
    });

    const result = await service.getPerformanceHistory('emp1');
    expect(result.currentRating).toBe(0);
    expect(result.ratingHistory).toEqual([]);
    expect(result.goals).toEqual([]);
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(service.getPerformanceHistory('x')).rejects.toThrow('الموظف غير موجود');
  });
});

describe('setEmployeeGoals', () => {
  it('updates goals and returns them', async () => {
    const goals = [{ title: 'g1' }, { title: 'g2' }];
    mockEmployee.findByIdAndUpdate.mockResolvedValue({
      performance: { goals },
    });

    const result = await service.setEmployeeGoals('emp1', goals);
    expect(result).toEqual(goals);
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      { 'performance.goals': goals },
      { new: true }
    );
  });

  it('throws when employee not found', async () => {
    mockEmployee.findByIdAndUpdate.mockResolvedValue(null);
    await expect(service.setEmployeeGoals('x', [])).rejects.toThrow('الموظف غير موجود');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   7. Contracts
   ═══════════════════════════════════════════════════════════════════════ */

describe('getExpiringContracts', () => {
  it('returns contracts with urgency levels', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        _id: 'e1',
        contract: { endDate: new Date(now.getTime() + 5 * 86400000) },
      },
      {
        ...baseEmployee,
        _id: 'e2',
        contract: { endDate: new Date(now.getTime() + 10 * 86400000) },
      },
      {
        ...baseEmployee,
        _id: 'e3',
        contract: { endDate: new Date(now.getTime() + 20 * 86400000) },
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringContracts(30);
    expect(result).toHaveLength(3);
    expect(result[0].urgency).toBe('critical'); // ≤7 days
    expect(result[1].urgency).toBe('high'); // ≤15 days
    expect(result[2].urgency).toBe('medium'); // >15 days
  });

  it('includes daysRemaining', async () => {
    const now = new Date();
    const emps = [
      { ...baseEmployee, contract: { endDate: new Date(now.getTime() + 10 * 86400000) } },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringContracts();
    expect(result[0].daysRemaining).toBeGreaterThan(0);
  });

  it('returns fullName', async () => {
    const chain = buildChain([
      { ...baseEmployee, contract: { endDate: new Date(Date.now() + 5 * 86400000) } },
    ]);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringContracts();
    expect(result[0].fullName).toBe('أحمد محمد');
  });

  it('defaults threshold to 30 days', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);

    await service.getExpiringContracts();
    const q = mockEmployee.find.mock.calls[0][0];
    expect(q.status).toBe('active');
    expect(q['contract.endDate']).toBeDefined();
  });

  it('returns empty array when none expiring', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringContracts();
    expect(result).toEqual([]);
  });
});

describe('renewContract', () => {
  it('updates contract fields', async () => {
    const emp = makeEmpDoc();
    mockEmployee.findByIdAndUpdate.mockResolvedValue(emp);

    const result = await service.renewContract('emp1', '2026-12-31', 'full-time');
    expect(mockEmployee.findByIdAndUpdate).toHaveBeenCalledWith(
      'emp1',
      expect.objectContaining({
        'contract.endDate': '2026-12-31',
        'contract.contractType': 'full-time',
      }),
      { new: true }
    );
    expect(result).toBe(emp);
  });

  it('throws when employee not found', async () => {
    mockEmployee.findByIdAndUpdate.mockResolvedValue(null);
    await expect(service.renewContract('x', '2026-01-01', 'ft')).rejects.toThrow(
      'الموظف غير موجود'
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   8. Career Development
   ═══════════════════════════════════════════════════════════════════════ */

describe('promoteEmployee', () => {
  it('pushes promotion, updates position and salary, saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.careerDevelopment = { promotions: [] };
    empDoc.salary = { base: 8000 };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const result = await service.promoteEmployee('emp1', 'مدير', 12000, 'أداء متميز');
    expect(empDoc.careerDevelopment.promotions).toHaveLength(1);
    expect(empDoc.careerDevelopment.promotions[0].toPosition).toBe('مدير');
    expect(empDoc.careerDevelopment.promotions[0].salary).toBe(12000);
    expect(empDoc.position).toBe('مدير');
    expect(empDoc.salary.base).toBe(12000);
    expect(empDoc.save).toHaveBeenCalled();
    expect(result.promotion.toPosition).toBe('مدير');
  });

  it('records fromPosition in promotion history', async () => {
    const empDoc = makeEmpDoc();
    empDoc.position = 'مطور';
    empDoc.careerDevelopment = { promotions: [] };
    empDoc.salary = { base: 8000 };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const result = await service.promoteEmployee('emp1', 'مدير', 12000, 'ترقية');
    expect(result.promotion.fromPosition).toBe('مطور');
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.promoteEmployee('x', 'p', 1, 'r')).rejects.toThrow('الموظف غير موجود');
  });
});

describe('addCertification', () => {
  it('pushes certification and saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.careerDevelopment = { certifications: [] };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const cert = { name: 'PMP', issuedBy: 'PMI', date: '2025-01-01' };
    const result = await service.addCertification('emp1', cert);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('PMP');
    expect(empDoc.save).toHaveBeenCalled();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.addCertification('x', {})).rejects.toThrow('الموظف غير موجود');
  });
});

describe('addTraining', () => {
  it('pushes training and saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.careerDevelopment = { trainings: [] };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const training = { name: 'Agile', provider: 'Scrum.org' };
    const result = await service.addTraining('emp1', training);
    expect(result).toHaveLength(1);
    expect(empDoc.save).toHaveBeenCalled();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.addTraining('x', {})).rejects.toThrow('الموظف غير موجود');
  });
});

describe('addSkill', () => {
  it('pushes skill and saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.skills = [];
    mockEmployee.findById.mockResolvedValue(empDoc);

    const skill = { name: 'Node.js', level: 'advanced' };
    const result = await service.addSkill('emp1', skill);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Node.js');
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.addSkill('x', {})).rejects.toThrow('الموظف غير موجود');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   9. Documents
   ═══════════════════════════════════════════════════════════════════════ */

describe('addDocument', () => {
  it('pushes document with uploadDate and saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.documents = [];
    mockEmployee.findById.mockResolvedValue(empDoc);

    const doc = { name: 'contract.pdf', type: 'contract' };
    const result = await service.addDocument('emp1', doc);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('contract.pdf');
    expect(result[0].uploadDate).toBeInstanceOf(Date);
    expect(empDoc.save).toHaveBeenCalled();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.addDocument('x', {})).rejects.toThrow('الموظف غير موجود');
  });
});

describe('getDocuments', () => {
  it('returns employee documents', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ documents: [{ name: 'cv.pdf' }] }),
    };
    mockEmployee.findById.mockReturnValue(chain);

    const result = await service.getDocuments('emp1');
    expect(result).toEqual([{ name: 'cv.pdf' }]);
  });

  it('returns empty array when no documents', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ documents: undefined }),
    };
    mockEmployee.findById.mockReturnValue(chain);

    const result = await service.getDocuments('emp1');
    expect(result).toEqual([]);
  });

  it('throws when employee not found', async () => {
    const chain = { select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) };
    mockEmployee.findById.mockReturnValue(chain);

    await expect(service.getDocuments('x')).rejects.toThrow('الموظف غير موجود');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   10. Dashboard & Department Statistics
   ═══════════════════════════════════════════════════════════════════════ */

describe('getDashboard', () => {
  beforeEach(() => {
    // countDocuments calls: total, active, on-leave, then terminatedThisMonth
    mockEmployee.countDocuments
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(80) // active
      .mockResolvedValueOnce(5) // on-leave
      .mockResolvedValueOnce(2); // terminatedThisMonth

    mockEmployee.aggregate
      .mockResolvedValueOnce([{ _id: 'IT', count: 40, avgSalary: 12000 }]) // departmentStats
      .mockResolvedValueOnce([
        { _id: 'active', count: 80 },
        { _id: 'terminated', count: 20 },
      ]); // statusDistribution

    mockLeaveRequest.countDocuments.mockResolvedValue(10); // pending leaves

    // getExpiringContracts (called internally): Emp.find chain
    const expiringChain = buildChain([
      { ...baseEmployee, contract: { endDate: new Date(Date.now() + 5 * 86400000) } },
    ]);

    // recentHires: Emp.find chain
    const recentChain = buildChain([{ ...baseEmployee, _id: 'r1' }]);

    // Two find calls: first for getExpiringContracts, second for recentHires
    mockEmployee.find.mockReturnValueOnce(expiringChain).mockReturnValueOnce(recentChain);
  });

  it('returns overview with all KPIs', async () => {
    const result = await service.getDashboard();
    expect(result.overview.totalEmployees).toBe(100);
    expect(result.overview.activeEmployees).toBe(80);
    expect(result.overview.onLeave).toBe(5);
    expect(result.overview.terminatedThisMonth).toBe(2);
  });

  it('returns departmentStats', async () => {
    const result = await service.getDashboard();
    expect(result.departmentStats).toHaveLength(1);
    expect(result.departmentStats[0]._id).toBe('IT');
  });

  it('returns statusDistribution', async () => {
    const result = await service.getDashboard();
    expect(result.statusDistribution).toHaveLength(2);
  });

  it('returns pendingLeaveRequests', async () => {
    const result = await service.getDashboard();
    expect(result.pendingLeaveRequests).toBe(10);
  });

  it('returns expiring contracts count and list', async () => {
    const result = await service.getDashboard();
    expect(result.expiringContracts).toBe(1);
    expect(result.expiringContractsList).toHaveLength(1);
  });

  it('returns recentHires with fullName', async () => {
    const result = await service.getDashboard();
    expect(result.recentHires).toHaveLength(1);
    expect(result.recentHires[0].fullName).toBe('أحمد محمد');
  });

  it('calculates turnoverRate', async () => {
    const result = await service.getDashboard();
    // (100-80)/100 * 100 = 20
    expect(result.kpis.turnoverRate).toBe(20);
  });

  it('returns zero turnoverRate when no employees', async () => {
    // Reset mocks set by describe-level beforeEach to clear queued values
    mockEmployee.countDocuments.mockReset();
    mockEmployee.aggregate.mockReset();
    mockLeaveRequest.countDocuments.mockReset();
    mockEmployee.find.mockReset();

    mockEmployee.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockEmployee.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockLeaveRequest.countDocuments.mockResolvedValue(0);
    mockEmployee.find.mockReturnValueOnce(buildChain([])).mockReturnValueOnce(buildChain([]));

    const result = await service.getDashboard();
    expect(result.kpis.turnoverRate).toBe(0);
  });
});

describe('getDepartmentStatistics', () => {
  it('returns department stats with employees', async () => {
    const emps = [
      { ...baseEmployee, salary: { base: 10000 }, performance: { currentRating: 4 } },
      { ...baseEmployee, _id: 'e2', salary: { base: 12000 }, performance: { currentRating: 3 } },
    ];
    const empChain = buildChain(emps);
    mockEmployee.find.mockReturnValue(empChain);
    mockLeaveRequest.aggregate.mockResolvedValue([{ _id: 'annual', count: 5, totalDays: 20 }]);

    const result = await service.getDepartmentStatistics('IT');
    expect(result.department).toBe('IT');
    expect(result.employeeCount).toBe(2);
    expect(result.averageSalary).toBe(11000);
    expect(result.averageRating).toBe(3.5);
    expect(result.leaveStats).toHaveLength(1);
  });

  it('returns zero averages when no employees', async () => {
    const empChain = buildChain([]);
    mockEmployee.find.mockReturnValue(empChain);
    mockLeaveRequest.aggregate.mockResolvedValue([]);

    const result = await service.getDepartmentStatistics('EMPTY');
    expect(result.employeeCount).toBe(0);
    expect(result.averageSalary).toBe(0);
    expect(result.averageRating).toBe(0);
  });

  it('adds fullName to each employee', async () => {
    const emps = [{ ...baseEmployee }];
    const empChain = buildChain(emps);
    mockEmployee.find.mockReturnValue(empChain);
    mockLeaveRequest.aggregate.mockResolvedValue([]);

    const result = await service.getDepartmentStatistics('IT');
    expect(result.employees[0].fullName).toBe('أحمد محمد');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   11. Government Integration
   ═══════════════════════════════════════════════════════════════════════ */

describe('getEmployeeGovernmentSummary', () => {
  it('returns government summary for Saudi employee', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee }),
    });

    const result = await service.getEmployeeGovernmentSummary('emp1');
    expect(result.isSaudi).toBe(true);
    expect(result.gosi.registered).toBe(true);
    expect(result.gosi.subscriptionNumber).toBe('G123');
    expect(result.qiwa.hasContract).toBe(true);
    expect(result.mol.workPermitNumber).toBe('MOL1');
  });

  it('returns government summary for non-Saudi employee', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee, nationality: 'Indian' }),
    });

    const result = await service.getEmployeeGovernmentSummary('emp1');
    expect(result.isSaudi).toBe(false);
  });

  it('handles missing government data gracefully', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        ...baseEmployee,
        gosi: undefined,
        qiwa: undefined,
        mol: undefined,
        sponsorship: undefined,
      }),
    });

    const result = await service.getEmployeeGovernmentSummary('emp1');
    expect(result.gosi.registered).toBe(false);
    expect(result.gosi.status).toBe('غير مسجل');
    expect(result.qiwa.hasContract).toBe(false);
    expect(result.qiwa.contractStatus).toBe('لا يوجد');
    expect(result.mol.workPermitNumber).toBeNull();
    expect(result.sponsorship.visaExpiry).toBeNull();
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    await expect(service.getEmployeeGovernmentSummary('x')).rejects.toThrow('الموظف غير موجود');
  });

  it('detects Saudi by English string "Saudi"', async () => {
    mockEmployee.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ ...baseEmployee, nationality: 'Saudi' }),
    });
    const result = await service.getEmployeeGovernmentSummary('emp1');
    expect(result.isSaudi).toBe(true);
  });
});

describe('updateEmployeeMOLData', () => {
  it('merges MOL data and saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.mol = { workPermitNumber: 'OLD' };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const result = await service.updateEmployeeMOLData('emp1', { workPermitNumber: 'NEW' });
    expect(empDoc.mol.workPermitNumber).toBe('NEW');
    expect(empDoc.save).toHaveBeenCalled();
    expect(empDoc.toObject).toHaveBeenCalled();
  });

  it('creates mol object when none exists', async () => {
    const empDoc = makeEmpDoc();
    empDoc.mol = undefined;
    mockEmployee.findById.mockResolvedValue(empDoc);

    await service.updateEmployeeMOLData('emp1', { workPermitNumber: 'FIRST' });
    expect(empDoc.mol.workPermitNumber).toBe('FIRST');
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.updateEmployeeMOLData('x', {})).rejects.toThrow('الموظف غير موجود');
  });
});

describe('updateEmployeeSponsorshipData', () => {
  it('merges sponsorship data and saves', async () => {
    const empDoc = makeEmpDoc();
    empDoc.sponsorship = { visaExpiry: '2025-01-01' };
    mockEmployee.findById.mockResolvedValue(empDoc);

    const result = await service.updateEmployeeSponsorshipData('emp1', {
      visaExpiry: '2026-06-01',
    });
    expect(empDoc.sponsorship.visaExpiry).toBe('2026-06-01');
    expect(empDoc.save).toHaveBeenCalled();
    expect(empDoc.toObject).toHaveBeenCalled();
  });

  it('creates sponsorship object when none exists', async () => {
    const empDoc = makeEmpDoc();
    empDoc.sponsorship = undefined;
    mockEmployee.findById.mockResolvedValue(empDoc);

    await service.updateEmployeeSponsorshipData('emp1', { passportExpiry: '2027-01-01' });
    expect(empDoc.sponsorship.passportExpiry).toBe('2027-01-01');
  });

  it('throws when employee not found', async () => {
    mockEmployee.findById.mockResolvedValue(null);
    await expect(service.updateEmployeeSponsorshipData('x', {})).rejects.toThrow(
      'الموظف غير موجود'
    );
  });
});

describe('getExpiringDocumentsReport', () => {
  it('returns expiring documents sorted by daysLeft', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        contract: undefined,
        mol: { workPermitExpiry: new Date(now.getTime() + 10 * 86400000) },
        sponsorship: {
          visaExpiry: new Date(now.getTime() + 5 * 86400000),
          passportExpiry: new Date(now.getTime() + 20 * 86400000),
        },
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.totalExpiring).toBe(3);
    expect(result.thresholdDays).toBe(30);
    // sorted by daysLeft ascending
    expect(result.items[0].daysLeft).toBeLessThanOrEqual(result.items[1].daysLeft);
  });

  it('identifies work permit expiry', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        mol: { workPermitExpiry: new Date(now.getTime() + 10 * 86400000) },
        sponsorship: undefined,
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.items[0].document).toBe('تصريح العمل');
  });

  it('identifies visa expiry', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        mol: undefined,
        sponsorship: { visaExpiry: new Date(now.getTime() + 5 * 86400000) },
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.items[0].document).toBe('التأشيرة / الإقامة');
  });

  it('identifies passport expiry', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        mol: undefined,
        sponsorship: { passportExpiry: new Date(now.getTime() + 10 * 86400000) },
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.items[0].document).toBe('جواز السفر');
  });

  it('includes contract expiry when contract field selected', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        mol: undefined,
        sponsorship: undefined,
        contract: { endDate: new Date(now.getTime() + 8 * 86400000) },
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.items[0].document).toBe('العقد');
  });

  it('returns empty items when nothing expiring', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.totalExpiring).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('does not include documents beyond threshold', async () => {
    const now = new Date();
    const emps = [
      {
        ...baseEmployee,
        contract: undefined,
        mol: { workPermitExpiry: new Date(now.getTime() + 60 * 86400000) }, // 60 days out
        sponsorship: undefined,
      },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getExpiringDocumentsReport(30);
    expect(result.totalExpiring).toBe(0);
  });
});

describe('getSaudizationReport', () => {
  it('returns saudization stats', async () => {
    const emps = [
      { nationality: 'سعودي', department: 'IT' },
      { nationality: 'Saudi', department: 'IT' },
      { nationality: 'Indian', department: 'HR' },
      { nationality: 'Egyptian', department: 'IT' },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getSaudizationReport();
    expect(result.total).toBe(4);
    expect(result.saudi).toBe(2);
    expect(result.foreign).toBe(2);
    expect(result.saudizationRate).toBe(50);
  });

  it('returns per-department breakdown', async () => {
    const emps = [
      { nationality: 'سعودي', department: 'IT' },
      { nationality: 'Indian', department: 'IT' },
      { nationality: 'سعودي', department: 'HR' },
    ];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getSaudizationReport();
    expect(result.departments).toHaveLength(2);

    const it_dept = result.departments.find(d => d.department === 'IT');
    expect(it_dept.saudi).toBe(1);
    expect(it_dept.foreign).toBe(1);
    expect(it_dept.saudizationRate).toBe(50);

    const hr_dept = result.departments.find(d => d.department === 'HR');
    expect(hr_dept.saudi).toBe(1);
    expect(hr_dept.foreign).toBe(0);
    expect(hr_dept.saudizationRate).toBe(100);
  });

  it('returns zero rate when no employees', async () => {
    const chain = buildChain([]);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getSaudizationReport();
    expect(result.total).toBe(0);
    expect(result.saudizationRate).toBe(0);
    expect(result.departments).toEqual([]);
  });

  it('handles missing nationality', async () => {
    const emps = [{ department: 'IT' }];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getSaudizationReport();
    expect(result.foreign).toBe(1);
    expect(result.saudi).toBe(0);
  });

  it('uses "غير محدد" for missing department', async () => {
    const emps = [{ nationality: 'سعودي' }];
    const chain = buildChain(emps);
    mockEmployee.find.mockReturnValue(chain);

    const result = await service.getSaudizationReport();
    expect(result.departments[0].department).toBe('غير محدد');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   12. Private Helpers
   ═══════════════════════════════════════════════════════════════════════ */

describe('_calculateWorkingDays', () => {
  it('counts weekdays excluding Fri and Sat', () => {
    // Mon 2025-06-02 to Fri 2025-06-06 → Mon,Tue,Wed,Thu = 4
    const start = new Date('2025-06-02'); // Monday
    const end = new Date('2025-06-06'); // Friday (excluded)
    expect(service._calculateWorkingDays(start, end)).toBe(4);
  });

  it('returns 1 for single weekend day (minimum)', () => {
    const sat = new Date('2025-06-07'); // Saturday
    expect(service._calculateWorkingDays(sat, sat)).toBe(1);
  });

  it('counts full work week as 5 days', () => {
    // Sun 2025-06-01 to Thu 2025-06-05
    const start = new Date('2025-06-01'); // Sunday
    const end = new Date('2025-06-05'); // Thursday
    expect(service._calculateWorkingDays(start, end)).toBe(5);
  });

  it('handles two-week span', () => {
    // Sun 2025-06-01 to Thu 2025-06-12 → 10 working days
    const start = new Date('2025-06-01');
    const end = new Date('2025-06-12');
    expect(service._calculateWorkingDays(start, end)).toBe(10);
  });

  it('returns 1 for same weekday', () => {
    const mon = new Date('2025-06-02'); // Monday
    expect(service._calculateWorkingDays(mon, mon)).toBe(1);
  });
});

describe('_calculateTotalSalary', () => {
  it('adds monthly allowances and subtracts monthly deductions', () => {
    const emp = {
      salary: {
        base: 10000,
        allowances: [
          { type: 'monthly', amount: 2000 },
          { type: 'yearly', amount: 6000 },
        ],
        deductions: [{ type: 'monthly', amount: 500 }],
      },
    };
    // 10000 + 2000 - 500 = 11500
    expect(service._calculateTotalSalary(emp)).toBe(11500);
  });

  it('returns base salary when no allowances or deductions', () => {
    expect(service._calculateTotalSalary({ salary: { base: 5000 } })).toBe(5000);
  });

  it('returns 0 when salary is missing', () => {
    expect(service._calculateTotalSalary({})).toBe(0);
  });

  it('never returns negative', () => {
    const emp = {
      salary: {
        base: 100,
        allowances: [],
        deductions: [{ type: 'monthly', amount: 500 }],
      },
    };
    expect(service._calculateTotalSalary(emp)).toBe(0);
  });

  it('ignores non-monthly allowances and deductions', () => {
    const emp = {
      salary: {
        base: 8000,
        allowances: [{ type: 'yearly', amount: 12000 }],
        deductions: [{ type: 'yearly', amount: 3000 }],
      },
    };
    expect(service._calculateTotalSalary(emp)).toBe(8000);
  });
});

describe('_calculateYearsOfService', () => {
  it('calculates years from hire date to now', () => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const result = service._calculateYearsOfService(twoYearsAgo);
    expect(result).toBeCloseTo(2, 0);
  });

  it('returns 0 for null hireDate', () => {
    expect(service._calculateYearsOfService(null)).toBe(0);
  });

  it('returns 0 for undefined hireDate', () => {
    expect(service._calculateYearsOfService(undefined)).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    const result = service._calculateYearsOfService(new Date('2020-01-01'));
    const decimals = result.toString().split('.')[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });
});

describe('_getContractStatus', () => {
  it('returns "indefinite" for no contract', () => {
    const result = service._getContractStatus(null);
    expect(result.status).toBe('indefinite');
    expect(result.message).toBe('عقد غير محدد المدة');
  });

  it('returns "indefinite" for contract without endDate', () => {
    const result = service._getContractStatus({});
    expect(result.status).toBe('indefinite');
  });

  it('returns "expired" for past endDate', () => {
    const result = service._getContractStatus({ endDate: new Date('2020-01-01') });
    expect(result.status).toBe('expired');
    expect(result.message).toBe('العقد منتهي');
    expect(result.daysLeft).toBeLessThan(0);
  });

  it('returns "expiring_soon" when ≤30 days left', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);
    const result = service._getContractStatus({ endDate: futureDate });
    expect(result.status).toBe('expiring_soon');
    expect(result.message).toBe('ينتهي قريباً');
  });

  it('returns "active" when >30 days left', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const result = service._getContractStatus({ endDate: futureDate });
    expect(result.status).toBe('active');
    expect(result.message).toBe('ساري');
    expect(result.daysLeft).toBeGreaterThan(30);
  });
});
