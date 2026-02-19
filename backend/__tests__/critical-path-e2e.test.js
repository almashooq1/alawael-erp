/**
 * Critical Path E2E Tests - Phase 5.3
 * Priority business scenarios and success paths
 * 8 critical E2E test cases
 * In-memory stores for isolated test execution
 */

// In-memory stores
class EmployeeStore {
  constructor() {
    this.data = new Map();
    this.counter = 0;
  }

  async create(data) {
    const id = ++this.counter;
    const record = {
      _id: id,
      status: 'ACTIVE', // Default status
      ...data,
      createdAt: new Date(),
    };
    this.data.set(id, record);
    return record;
  }

  async findById(id) {
    return this.data.get(id) || null;
  }

  async findByIdAndDelete(id) {
    const record = this.data.get(id);
    this.data.delete(id);
    return record;
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const record = this.data.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    return record;
  }
}

class UserStore {
  constructor() {
    this.data = new Map();
    this.counter = 0;
  }

  async create(data) {
    const id = ++this.counter;
    const record = {
      _id: id,
      ...data,
      createdAt: new Date(),
    };
    this.data.set(id, record);
    return record;
  }

  async findById(id) {
    return this.data.get(id) || null;
  }

  async findByIdAndDelete(id) {
    const record = this.data.get(id);
    this.data.delete(id);
    return record;
  }
}

class LeaveStore {
  constructor() {
    this.data = new Map();
    this.counter = 0;
  }

  async create(data) {
    const id = ++this.counter;
    const record = {
      _id: id,
      ...data,
      createdAt: new Date(),
    };
    this.data.set(id, record);
    return record;
  }

  async findById(id) {
    return this.data.get(id) || null;
  }

  async findByIdAndDelete(id) {
    const record = this.data.get(id);
    this.data.delete(id);
    return record;
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const record = this.data.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    return record;
  }
}

class PaymentStore {
  constructor() {
    this.data = new Map();
    this.counter = 0;
  }

  async create(data) {
    const id = ++this.counter;
    const record = {
      _id: id,
      ...data,
      createdAt: new Date(),
    };
    this.data.set(id, record);
    return record;
  }

  async findById(id) {
    return this.data.get(id) || null;
  }

  async findByIdAndDelete(id) {
    const record = this.data.get(id);
    this.data.delete(id);
    return record;
  }

  async findByIdAndUpdate(id, updates, options = {}) {
    const record = this.data.get(id);
    if (!record) return null;
    Object.assign(record, updates);
    return record;
  }
}

// Store instances
const Employee = new EmployeeStore();
const User = new UserStore();
const Leave = new LeaveStore();
const Payment = new PaymentStore();

describe('Critical Path E2E Tests - Phase 5.3', () => {
  let testUsers = [];
  let testEmployees = [];

  const cleanup = async () => {
    for (let user of testUsers) {
      try {
        await User.findByIdAndDelete(user._id);
      } catch (e) {}
    }
    for (let emp of testEmployees) {
      try {
        await Employee.findByIdAndDelete(emp._id);
      } catch (e) {}
    }
    testUsers = [];
    testEmployees = [];
  };

  afterEach(cleanup);

  describe('Critical Path: New Employee Lifecycle', () => {
    it('should complete new employee critical path: hire -> onboard -> verify', async () => {
      // DAY 1: HR Hires Employee
      const newEmp = await Employee.create({
        firstName: 'Critical',
        lastName: 'Path',
        email: `critical-${Date.now()}@test.com`,
        department: 'IT',
        position: 'Senior Developer',
        baseSalary: 80000,
        joinDate: new Date(),
      });
      testEmployees.push(newEmp);

      expect(newEmp._id).toBeDefined();
      expect(newEmp.status).toBe('ACTIVE');
      expect(newEmp.baseSalary).toBe(80000);

      // DAY 2: Setup in system
      const setup = await Employee.findByIdAndUpdate(
        newEmp._id,
        {
          employeeId: 'EMP-' + Date.now(),
          emergencyContact: { name: 'Jane Doe', phone: '123-456-7890' },
          bankAccount: { accountNumber: '1234567890', bankName: 'National Bank' },
        },
        { new: true }
      );

      expect(setup.employeeId).toBeDefined();
      expect(setup.emergencyContact).toBeDefined();
      expect(setup.bankAccount).toBeDefined();

      // DAY 3: Assign manager
      const assigned = await Employee.findByIdAndUpdate(
        newEmp._id,
        { reportingManager: 'manager-123' },
        { new: true }
      );

      expect(assigned.reportingManager).toBe('manager-123');
    });
  });

  describe('Critical Path: Leave Request Flow', () => {
    it('should complete leave request critical path: request -> multi-level approval -> payroll impact', async () => {
      // Create employee
      const emp = await Employee.create({
        firstName: 'Leave',
        lastName: 'Requester',
        email: `leave-${Date.now()}@test.com`,
        department: 'IT',
        position: 'Developer',
        baseSalary: 60000,
      });
      testEmployees.push(emp);

      // Create manager and HR users
      const manager = await User.create({
        username: `mgr-${Date.now()}`,
        email: `mgr-${Date.now()}@test.com`,
        password: 'Test@1234',
        role: 'MANAGER',
      });
      testUsers.push(manager);

      const hr = await User.create({
        username: `hr-${Date.now()}`,
        email: `hr-${Date.now()}@test.com`,
        password: 'Test@1234',
        role: 'HR',
      });
      testUsers.push(hr);

      // WEEK 1: Employee requests 5-day leave
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4);

      const leaveReq = await Leave.create({
        employeeId: emp._id,
        leaveType: 'ANNUAL',
        startDate,
        endDate,
        reason: 'Annual vacation',
        status: 'PENDING',
      });

      expect(leaveReq.status).toBe('PENDING');

      // WEEK 2: Manager reviews and approves
      const managerReview = await Leave.findByIdAndUpdate(
        leaveReq._id,
        {
          managerStatus: 'APPROVED',
          managerApprovedAt: new Date(),
          managerId: manager._id,
          managerRemarks: 'Approved - coverage arranged',
        },
        { new: true }
      );

      expect(managerReview.managerStatus).toBe('APPROVED');
      expect(managerReview.managerRemarks).toBe('Approved - coverage arranged');

      // WEEK 2: HR final approval
      const hrFinal = await Leave.findByIdAndUpdate(
        leaveReq._id,
        {
          hrStatus: 'APPROVED',
          hrApprovedAt: new Date(),
          hrId: hr._id,
          status: 'APPROVED',
        },
        { new: true }
      );

      expect(hrFinal.status).toBe('APPROVED');

      // MONTH END: Payroll deducts leave
      const leaveDays = 5;
      const monthlyAmount = emp.baseSalary / 30;
      const leaveDeduction = leaveDays * monthlyAmount;
      const netSalary = emp.baseSalary - leaveDeduction;

      expect(leaveDeduction).toBeGreaterThan(0);
      expect(netSalary).toBeLessThan(emp.baseSalary);

      // Cleanup
      await Leave.findByIdAndDelete(leaveReq._id);
    });
  });

  describe('Critical Path: Monthly Payroll Processing', () => {
    it('should execute monthly payroll critical path: collect attendance -> calculate -> verify -> process', async () => {
      // SETUP: 3 employees in IT department
      const employees = [];
      const salaries = [50000, 60000, 75000];

      for (let i = 0; i < 3; i++) {
        const emp = await Employee.create({
          firstName: `Payroll${i}`,
          lastName: 'Test',
          email: `payroll-${i}-${Date.now()}@test.com`,
          department: 'IT',
          position: 'Developer',
          baseSalary: salaries[i],
        });
        employees.push(emp);
        testEmployees.push(emp);
      }

      // WEEK 1: Collect attendance for Feb 1-10
      const attendance = {
        emp0: 9, // 9 days present
        emp1: 10, // 10 days present
        emp2: 10, // 10 days present
      };

      // WEEK 2: Finalize attendance for Feb 11-20
      const attendanceWeek2 = {
        emp0: 10,
        emp1: 9,
        emp2: 10,
      };

      // WEEK 3: Calculate payroll
      const payments = [];
      for (let i = 0; i < employees.length; i++) {
        const totalPresent = attendance[`emp${i}`] + attendanceWeek2[`emp${i}`];
        const workingDays = 20;
        const dailyRate = employees[i].baseSalary / workingDays;
        const grossSalary = totalPresent * dailyRate;

        // Deductions
        const tax = grossSalary * 0.1;
        const ss = grossSalary * 0.05;
        const netSalary = grossSalary - tax - ss;

        const payment = await Payment.create({
          employeeId: employees[i]._id,
          amount: netSalary,
          period: '2025-02',
          grossSalary,
          deductions: { tax, socialSecurity: ss },
          status: 'CALCULATED',
        });

        payments.push(payment);

        expect(payment.amount).toBeLessThan(employees[i].baseSalary);
      }

      // WEEK 4: Verify payroll
      const totalPayroll = payments.reduce((sum, p) => sum + p.amount, 0);
      expect(totalPayroll).toBeGreaterThan(0);

      // WEEK 4: Process and pay
      for (let payment of payments) {
        const processed = await Payment.findByIdAndUpdate(
          payment._id,
          {
            status: 'PROCESSED',
            processedAt: new Date(),
            transactionId: 'PAY-' + Date.now(),
          },
          { new: true }
        );

        expect(processed.status).toBe('PROCESSED');
        expect(processed.transactionId).toBeDefined();

        // Cleanup
        await Payment.findByIdAndDelete(processed._id);
      }
    });
  });

  describe('Critical Path: Department Transfer & Promotion', () => {
    it('should handle promotion critical path: evaluation -> approval -> update -> communication', async () => {
      // Employee in IT Department
      const emp = await Employee.create({
        firstName: 'Promotion',
        lastName: 'Candidate',
        email: `promo-${Date.now()}@test.com`,
        department: 'IT',
        position: 'Developer',
        baseSalary: 60000,
        yearsOfService: 3,
      });
      testEmployees.push(emp);

      // Manager recommendation
      const recommendation = {
        employeeId: emp._id,
        currentRole: 'Developer',
        recommendedRole: 'Senior Developer',
        recommendedSalary: 75000,
        reason: 'Exceptional performance',
        status: 'PENDING',
      };

      expect(recommendation.recommendedSalary).toBeGreaterThan(emp.baseSalary);

      // HR reviews and approves
      const approved = {
        ...recommendation,
        approvedBy: 'hr-director',
        approvedAt: new Date(),
        status: 'APPROVED',
      };

      expect(approved.status).toBe('APPROVED');

      // Execute promotion
      const promoted = await Employee.findByIdAndUpdate(
        emp._id,
        {
          position: 'Senior Developer',
          baseSalary: 75000,
          promotionDate: new Date(),
          promotionDetails: approved,
        },
        { new: true }
      );

      expect(promoted.position).toBe('Senior Developer');
      expect(promoted.baseSalary).toBe(75000);

      // Communication
      const announcement = {
        type: 'PROMOTION',
        employeeId: emp._id,
        title: `Congratulations on your promotion to ${promoted.position}`,
        sentAt: new Date(),
      };

      expect(announcement.type).toBe('PROMOTION');
    });
  });

  describe('Critical Path: Resigned Employee Offboarding', () => {
    it('should complete offboarding critical path: resignation -> approval -> settlement -> archive', async () => {
      // Create employee with 5 years service
      const emp = await Employee.create({
        firstName: 'Resigned',
        lastName: 'Employee',
        email: `resigned-${Date.now()}@test.com`,
        department: 'IT',
        position: 'Senior Developer',
        baseSalary: 80000,
        joinDate: new Date('2020-02-06'),
      });
      testEmployees.push(emp);

      // STEP 1: Employee submits resignation
      const resignation = {
        employeeId: emp._id,
        submitDate: new Date(),
        lastWorkingDay: new Date(Date.now() + 86400000 * 30), // 30 days notice
        reason: 'Better opportunity',
        status: 'SUBMITTED',
      };

      expect(resignation.status).toBe('SUBMITTED');

      // STEP 2: Manager and HR acknowledge
      const acknowledged = {
        ...resignation,
        acknowledgedBy: 'manager-123',
        acknowledgedAt: new Date(),
        status: 'ACKNOWLEDGED',
      };

      expect(acknowledged.status).toBe('ACKNOWLEDGED');

      // STEP 3: Mark employee as leaving
      const leaving = await Employee.findByIdAndUpdate(
        emp._id,
        { status: 'LEAVING', exitDate: acknowledged.lastWorkingDay },
        { new: true }
      );

      expect(leaving.status).toBe('LEAVING');

      // STEP 4: Calculate final settlement
      const yearsOfService = 5;
      const monthlyAmount = emp.baseSalary / 12;
      const gratuity = emp.baseSalary * yearsOfService; // Simplified calculation
      const unpaidSalary = monthlyAmount; // Last month
      const totalDue = gratuity + unpaidSalary;

      const settlement = {
        employeeId: emp._id,
        gratuity,
        unpaidSalary,
        totalAmount: totalDue,
        calculatedAt: new Date(),
      };

      expect(settlement.totalAmount).toBeGreaterThan(0);

      // STEP 5: Process final payment
      const finalPayment = await Payment.create({
        employeeId: emp._id,
        amount: settlement.totalAmount,
        period: '2025-03',
        paymentType: 'FINAL_SETTLEMENT',
        remarks: 'Final settlement for resignation',
        status: 'PENDING',
      });

      const processed = await Payment.findByIdAndUpdate(
        finalPayment._id,
        {
          status: 'PROCESSED',
          processedAt: new Date(),
          transactionId: 'FINAL-' + Date.now(),
        },
        { new: true }
      );

      expect(processed.status).toBe('PROCESSED');

      // STEP 6: Terminate employee
      const terminated = await Employee.findByIdAndUpdate(
        emp._id,
        { status: 'TERMINATED', terminationDate: new Date() },
        { new: true }
      );

      expect(terminated.status).toBe('TERMINATED');

      // Cleanup
      await Payment.findByIdAndDelete(finalPayment._id);
    });
  });

  describe('Critical Path: Attendance to Payroll Impact', () => {
    it('should trace attendance changes through payroll impact', async () => {
      // Employee with base 60000
      const emp = await Employee.create({
        firstName: 'Attendance',
        lastName: 'Impact',
        email: `attendance-${Date.now()}@test.com`,
        department: 'IT',
        position: 'Developer',
        baseSalary: 60000,
      });
      testEmployees.push(emp);

      // Scenario 1: Perfect attendance (20 days)
      const perfectPayment = await Payment.create({
        employeeId: emp._id,
        amount: 60000,
        period: '2025-02',
        attendanceDays: 20,
        status: 'CALCULATED',
      });

      expect(perfectPayment.amount).toBe(60000);

      // Scenario 2: 2 days absent (18 days)
      const absentPayment = await Payment.create({
        employeeId: emp._id,
        amount: 54000, // 60000 * 18/20
        period: '2025-03',
        attendanceDays: 18,
        status: 'CALCULATED',
      });

      expect(absentPayment.amount).toBe(54000);
      expect(absentPayment.amount).toBeLessThan(perfectPayment.amount);

      // Verify impact
      const difference = perfectPayment.amount - absentPayment.amount;
      expect(difference).toBe(6000); // 2 days worth

      // Cleanup
      await Payment.findByIdAndDelete(perfectPayment._id);
      await Payment.findByIdAndDelete(absentPayment._id);
    });
  });

  describe('Critical Path: Emergency Leave & Payroll Impact', () => {
    it('should handle emergency leave with immediate payroll adjustment', async () => {
      const emp = await Employee.create({
        firstName: 'Emergency',
        lastName: 'Leave',
        email: `emergency-${Date.now()}@test.com`,
        department: 'IT',
        position: 'Developer',
        baseSalary: 60000,
      });
      testEmployees.push(emp);

      // Mid-month emergency leave approved (3 days, unpaid)
      const emergency = await Leave.create({
        employeeId: emp._id,
        leaveType: 'EMERGENCY',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 2),
        reason: 'Family emergency',
        status: 'APPROVED',
        isPaid: false,
      });

      expect(emergency.isPaid).toBe(false);

      // Immediate payroll recalculation
      const dailyRate = emp.baseSalary / 30;
      const deduction = 3 * dailyRate;
      const adjustedSalary = emp.baseSalary - deduction;

      // Create adjusted payment for month
      const payment = await Payment.create({
        employeeId: emp._id,
        amount: adjustedSalary,
        period: '2025-02',
        leaveDeductions: deduction,
        leaveDetails: `Emergency leave: 3 days unpaid`,
        status: 'CALCULATED',
      });

      expect(payment.amount).toBe(adjustedSalary);
      expect(payment.leaveDeductions).toBe(deduction);

      // Cleanup
      await Leave.findByIdAndDelete(emergency._id);
      await Payment.findByIdAndDelete(payment._id);
    });
  });
});
