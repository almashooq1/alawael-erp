describe('Memory Models - Simplified Tests', () => {
  const Employee = require('../models/Employee.memory');
  const Attendance = require('../models/Attendance.memory');
  const Leave = require('../models/Leave.memory');

  beforeAll(() => {
    // Clear database at start of test suite to handle contamination from other suites
    const db = require('../config/inMemoryDB');
    db.write({
      users: [],
      employees: [],
      attendances: [],
      leaves: [],
      performance: [],
    });
  });

  beforeEach(() => {
    // Reset in-memory database before each test
    const db = require('../config/inMemoryDB');
    db.write({
      users: [],
      employees: [],
      attendances: [],
      leaves: [],
      performance: [],
    });
  });

  describe('Employee Model', () => {
    it('should create new employee', async () => {
      const employee = await Employee.create({
        name: 'Ahmed Hassan',
        email: 'ahmed@example.com',
        department: 'IT',
        position: 'Developer',
        salary: 5000,
      });

      expect(employee._id).toBeDefined();
      expect(employee.name).toBe('Ahmed Hassan');
      expect(employee.email).toBe('ahmed@example.com');
      expect(employee.createdAt).toBeDefined();
    });

    it('should find all employees', async () => {
      await Employee.create({ name: 'Employee 1', department: 'IT' });
      await Employee.create({ name: 'Employee 2', department: 'HR' });

      const employees = await Employee.find();

      expect(employees.length).toBeGreaterThanOrEqual(2);
    });

    it('should find employee by ID', async () => {
      const created = await Employee.create({
        name: 'Test Employee',
        department: 'IT',
      });
      const found = await Employee.findById(created._id);

      expect(found._id).toBe(created._id);
      expect(found.name).toBe('Test Employee');
    });

    it('should update employee', async () => {
      const created = await Employee.create({
        name: 'Original Name',
        department: 'IT',
      });
      const updated = await Employee.updateById(created._id, {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
    });

    it('should delete employee', async () => {
      const created = await Employee.create({
        name: 'To Delete',
        department: 'IT',
      });
      const deleted = await Employee.deleteById(created._id);

      expect(deleted).toBe(true);
      const found = await Employee.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Attendance Model', () => {
    it('should create attendance record', async () => {
      const attendance = await Attendance.create({
        employeeId: 1,
        checkIn: new Date(),
      });

      expect(attendance._id).toBeDefined();
      expect(attendance.employeeId).toBe(1);
      expect(attendance.createdAt).toBeDefined();
    });

    it('should find attendance records', async () => {
      await Attendance.create({
        employeeId: 1,
        checkIn: new Date(),
      });
      const records = await Attendance.find();

      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe('Leave Model', () => {
    it('should create leave request', async () => {
      const leave = await Leave.create({
        employeeId: 1,
        type: 'annual',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
      });

      expect(leave._id).toBeDefined();
      expect(leave.status).toBe('pending');
      expect(leave.type).toBe('annual');
    });

    it('should find pending leaves', async () => {
      await Leave.create({
        employeeId: 1,
        type: 'annual',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
      });

      const pendingLeaves = await Leave.find({ status: 'pending' });

      expect(pendingLeaves.length).toBeGreaterThan(0);
      expect(pendingLeaves[0].status).toBe('pending');
    });

    it('should update leave status', async () => {
      const created = await Leave.create({
        employeeId: 1,
        type: 'annual',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
      });
      const updated = await Leave.updateStatus(created._id, 'approved');

      expect(updated.status).toBe('approved');
    });
  });
});
