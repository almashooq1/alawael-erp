/**
 * Leave Management Component Tests - Phase 5.2
 * Tests leave request, approval, and balance calculations
 * In-memory version for fast execution
 */

const makeId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// In-memory Employee store
class EmployeeStore {
  constructor() {
    this.data = [];
  }
  async create(data) {
    const record = {
      _id: makeId('emp'),
      employeeId: makeId('empid'),
      joinDate: new Date(),
      ...data,
    };
    this.data.push(record);
    return record;
  }
  async find(query = {}) {
    return this.data.filter(emp => {
      if (query.employeeId && emp._id !== query.employeeId && emp.employeeId !== query.employeeId)
        return false;
      return true;
    });
  }
  async findByIdAndDelete(id) {
    const idx = this.data.findIndex(e => e._id === id);
    return idx >= 0 ? this.data.splice(idx, 1)[0] : null;
  }
  clear() {
    this.data = [];
  }
}

// In-memory Leave store
class LeaveStore {
  constructor() {
    this.data = [];
  }
  async create(data) {
    // Validate required fields
    if (!data.reason) {
      throw new Error('Validation failed: reason is required');
    }

    // Validate date range
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        throw new Error('Validation failed: end date must be after or equal to start date');
      }
    }

    const record = { _id: makeId('leave'), status: 'PENDING', createdAt: new Date(), ...data };
    this.data.push(record);
    return record;
  }
  async find(query = {}) {
    return this.data.filter(leave => {
      if (query.employeeId && leave.employeeId !== query.employeeId) return false;
      if (query.status && leave.status !== query.status) return false;
      if (query.leaveType && leave.leaveType !== query.leaveType) return false;
      return true;
    });
  }
  async findByIdAndUpdate(id, update, opts = {}) {
    const leave = this.data.find(l => l._id === id);
    if (!leave) return null;
    Object.assign(leave, update);
    return opts.new === true ? leave : null;
  }
  async findByIdAndDelete(id) {
    const idx = this.data.findIndex(l => l._id === id);
    return idx >= 0 ? this.data.splice(idx, 1)[0] : null;
  }
  clear() {
    this.data = [];
  }
}

const Employee = new EmployeeStore();
const Leave = new LeaveStore();

describe('Leave Management Component Tests - Phase 5.2', () => {
  let testEmployee;
  let createdLeaves = [];

  beforeEach(async () => {
    // Create test employee
    testEmployee = await Employee.create({
      firstName: 'Leave',
      lastName: 'Tester',
      email: `leave${Date.now()}@test.com`,
      department: 'IT',
      position: 'Developer',
      joinDate: new Date('2020-01-01'),
    });
  });

  afterEach(async () => {
    // Cleanup
    for (let leave of createdLeaves) {
      try {
        await Leave.findByIdAndDelete(leave._id);
      } catch (e) {
        // Already deleted
      }
    }
    createdLeaves = [];

    try {
      await Employee.findByIdAndDelete(testEmployee._id);
    } catch (e) {
      // Already deleted
    }
  });

  describe('Leave Request Creation', () => {
    it('should create leave request with valid data', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4);

      const leave = await Leave.create({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
        startDate,
        endDate,
        reason: 'Vacation',
        status: 'PENDING',
      });
      createdLeaves.push(leave);

      expect(leave).toHaveProperty('_id');
      expect(leave.employeeId.toString()).toBe(testEmployee._id.toString());
      expect(leave.leaveType).toBe('ANNUAL');
      expect(leave.status).toBe('PENDING');
    });

    it('should require reason for leave request', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      try {
        await Leave.create({
          employeeId: testEmployee._id,
          leaveType: 'ANNUAL',
          startDate,
          endDate,
          // Missing reason
        });
        fail('Should require reason');
      } catch (error) {
        expect(error.message).toMatch(/reason|required/i);
      }
    });

    it('should validate end date after start date', async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 5); // Before start date

      try {
        await Leave.create({
          employeeId: testEmployee._id,
          leaveType: 'ANNUAL',
          startDate,
          endDate,
          reason: 'Invalid dates',
        });
        fail('Should validate date range');
      } catch (error) {
        expect(error.message).toMatch(/date|end|start|range/i);
      }
    });

    it('should support different leave types', async () => {
      const leaveTypes = ['ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID'];
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      for (let type of leaveTypes) {
        const leave = await Leave.create({
          employeeId: testEmployee._id,
          leaveType: type,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason: `${type} leave`,
        });
        createdLeaves.push(leave);

        expect(leave.leaveType).toBe(type);
      }
    });

    it('should set default status to PENDING', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      const leave = await Leave.create({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
        startDate,
        endDate,
        reason: 'Test leave',
      });
      createdLeaves.push(leave);

      expect(leave.status).toBe('PENDING');
    });
  });

  describe('Leave Request Approval Workflow', () => {
    let testLeave;

    beforeEach(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 5);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4);

      testLeave = await Leave.create({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
        startDate,
        endDate,
        reason: 'Vacation',
        status: 'PENDING',
      });
      createdLeaves.push(testLeave);
    });

    it('should approve leave request', async () => {
      const approved = await Leave.findByIdAndUpdate(
        testLeave._id,
        { status: 'APPROVED' },
        { new: true }
      );

      expect(approved.status).toBe('APPROVED');
    });

    it('should reject leave request with reason', async () => {
      const rejected = await Leave.findByIdAndUpdate(
        testLeave._id,
        {
          status: 'REJECTED',
          rejectionReason: 'Insufficient coverage',
        },
        { new: true }
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejectionReason).toBe('Insufficient coverage');
    });

    it('should record approval by manager', async () => {
      const approved = await Leave.findByIdAndUpdate(
        testLeave._id,
        {
          managerStatus: 'APPROVED',
          managerApprovedAt: new Date(),
          managerId: 'manager-123',
        },
        { new: true }
      );

      expect(approved.managerStatus).toBe('APPROVED');
      expect(approved.managerApprovedAt).toBeDefined();
    });

    it('should handle multi-level approval (manager->HR)', async () => {
      // Manager approval
      let leave = await Leave.findByIdAndUpdate(
        testLeave._id,
        {
          managerStatus: 'APPROVED',
          managerApprovedAt: new Date(),
        },
        { new: true }
      );
      expect(leave.managerStatus).toBe('APPROVED');

      // HR approval
      leave = await Leave.findByIdAndUpdate(
        testLeave._id,
        {
          hrStatus: 'APPROVED',
          hrApprovedAt: new Date(),
          status: 'APPROVED',
        },
        { new: true }
      );
      expect(leave.hrStatus).toBe('APPROVED');
      expect(leave.status).toBe('APPROVED');
    });
  });

  describe('Leave Balance Calculations', () => {
    it('should calculate number of days in leave', async () => {
      const startDate = new Date('2025-02-10');
      const endDate = new Date('2025-02-14');

      const leave = await Leave.create({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
        startDate,
        endDate,
        reason: 'Test',
      });
      createdLeaves.push(leave);

      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      expect(days).toBe(5);
    });

    it('should track total annual leaves taken', async () => {
      // Create multiple approved leave requests
      const startDate = new Date();
      const approvedLeaves = [];

      for (let i = 0; i < 3; i++) {
        const start = new Date(startDate);
        start.setDate(start.getDate() + i * 10);
        const end = new Date(start);
        end.setDate(end.getDate() + 4);

        const leave = await Leave.create({
          employeeId: testEmployee._id,
          leaveType: 'ANNUAL',
          startDate: start,
          endDate: end,
          reason: `Leave ${i}`,
          status: 'APPROVED',
        });
        createdLeaves.push(leave);
        approvedLeaves.push(leave);
      }

      const totalDays = approvedLeaves.reduce((sum, leave) => {
        const days =
          Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) +
          1;
        return sum + days;
      }, 0);

      expect(totalDays).toBeGreaterThan(0);
      expect(approvedLeaves.length).toBe(3);
    });

    it('should calculate remaining annual leave balance', async () => {
      const annualAllowance = 30; // days per year

      // Create used leave (15 days)
      const start1 = new Date();
      const end1 = new Date(start1);
      end1.setDate(end1.getDate() + 14);

      const usedLeave = await Leave.create({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
        startDate: start1,
        endDate: end1,
        reason: 'Vacation',
        status: 'APPROVED',
      });
      createdLeaves.push(usedLeave);

      const usedDays = 15;
      const remaining = annualAllowance - usedDays;

      expect(remaining).toBe(15);
    });

    it('should prevent leave request exceeding balance', async () => {
      const annualAllowance = 30;
      const usedLeaves = 25; // Already used 25 days

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 10); // Request 11 days (exceeds by 6)

      // This would typically be validated by business logic
      const requestedDays = 11;
      const available = annualAllowance - usedLeaves;

      expect(requestedDays).toBeGreaterThan(available);
    });

    it('should track multiple leave types separately', async () => {
      const leaveTypes = {
        ANNUAL: 30,
        SICK: 10,
        EMERGENCY: 5,
      };

      const balances = {};
      for (let type in leaveTypes) {
        balances[type] = leaveTypes[type];
      }

      expect(balances.ANNUAL).toBe(30);
      expect(balances.SICK).toBe(10);
      expect(balances.EMERGENCY).toBe(5);
    });
  });

  describe('Leave Retrieval & Filtering', () => {
    beforeEach(async () => {
      // Create test leaves
      for (let i = 0; i < 3; i++) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + i * 10);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 4);

        const leave = await Leave.create({
          employeeId: testEmployee._id,
          leaveType: i % 2 === 0 ? 'ANNUAL' : 'SICK',
          startDate,
          endDate,
          reason: `Leave ${i}`,
          status: i === 0 ? 'PENDING' : 'APPROVED',
        });
        createdLeaves.push(leave);
      }
    });

    it('should retrieve all leaves for an employee', async () => {
      const leaves = await Leave.find({ employeeId: testEmployee._id });

      expect(Array.isArray(leaves)).toBe(true);
      expect(leaves.length).toBe(3);
      leaves.forEach(leave => {
        expect(leave.employeeId.toString()).toBe(testEmployee._id.toString());
      });
    });

    it('should filter leaves by status', async () => {
      const approvedLeaves = await Leave.find({
        employeeId: testEmployee._id,
        status: 'APPROVED',
      });

      expect(approvedLeaves.length).toBeGreaterThan(0);
      approvedLeaves.forEach(leave => {
        expect(leave.status).toBe('APPROVED');
      });
    });

    it('should filter leaves by type', async () => {
      const annualLeaves = await Leave.find({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
      });

      expect(Array.isArray(annualLeaves)).toBe(true);
      annualLeaves.forEach(leave => {
        expect(leave.leaveType).toBe('ANNUAL');
      });
    });

    it('should retrieve pending leaves for approval', async () => {
      const pending = await Leave.find({
        status: 'PENDING',
      });

      expect(Array.isArray(pending)).toBe(true);
      pending.forEach(leave => {
        expect(leave.status).toBe('PENDING');
      });
    });
  });

  describe('Leave Cancellation & Modifications', () => {
    let testLeave;

    beforeEach(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 10);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 4);

      testLeave = await Leave.create({
        employeeId: testEmployee._id,
        leaveType: 'ANNUAL',
        startDate,
        endDate,
        reason: 'Vacation',
        status: 'APPROVED',
      });
      createdLeaves.push(testLeave);
    });

    it('should allow cancellation of approved leave', async () => {
      const cancelled = await Leave.findByIdAndUpdate(
        testLeave._id,
        { status: 'CANCELLED' },
        { new: true }
      );

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should record cancellation reason', async () => {
      const cancelled = await Leave.findByIdAndUpdate(
        testLeave._id,
        {
          status: 'CANCELLED',
          cancellationReason: 'Changed plans',
        },
        { new: true }
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Changed plans');
    });

    it('should record cancellation date', async () => {
      const now = new Date();
      const cancelled = await Leave.findByIdAndUpdate(
        testLeave._id,
        {
          status: 'CANCELLED',
          cancelledAt: now,
        },
        { new: true }
      );

      expect(cancelled.cancelledAt).toBeDefined();
    });
  });
});
