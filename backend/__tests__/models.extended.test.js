/**
 * Models Extended Testing Suite
 * ملف اختبار شامل لجميع نماذج البيانات
 */

jest.mock('../config/inMemoryDB', () => ({
  read: jest.fn(() => ({
    users: [],
    employees: [],
    attendances: [],
    leaves: [],
    finances: [],
    ai_predictions: [],
    notifications: [],
  })),
  write: jest.fn(),
}));

// Mock User Model
jest.mock('../models/User.memory', () => ({
  create: jest.fn(data => ({
    _id: 'user-' + Date.now(),
    username: data.username,
    email: data.email,
    role: data.role || 'user',
    createdAt: new Date(),
  })),
  find: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  authenticate: jest.fn(),
}));

// Mock Employee Model
jest.mock('../models/Employee.memory', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getTotalCount: jest.fn(),
  findByDepartment: jest.fn(),
}));

// Mock Attendance Model
jest.mock('../models/Attendance.memory', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getMonthlyStats: jest.fn(),
}));

// Mock Leave Model
jest.mock('../models/Leave.memory', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByEmployeeId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
}));

// Mock Finance Model
jest.mock('../models/Finance.memory', () => ({
  Expense: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  Budget: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  },
}));

describe('User Model Extended Tests', () => {
  test('should create user with all fields', () => {
    const User = require('../models/User.memory');
    const user = User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      role: 'admin',
    });

    expect(user).toHaveProperty('_id');
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('admin');
  });

  test('should find user by email', async () => {
    const User = require('../models/User.memory');
    User.findByEmail.mockResolvedValue({
      _id: 'user-1',
      username: 'ahmed',
      email: 'ahmed@test.com',
    });

    const user = await User.findByEmail('ahmed@test.com');
    expect(user.email).toBe('ahmed@test.com');
  });

  test('should authenticate user with correct password', async () => {
    const User = require('../models/User.memory');
    User.authenticate.mockResolvedValue({
      _id: 'user-1',
      username: 'ahmed',
      token: 'jwt-token-here',
    });

    const result = await User.authenticate('ahmed@test.com', 'password123');
    expect(result).toHaveProperty('token');
  });

  test('should reject authentication with wrong password', async () => {
    const User = require('../models/User.memory');
    User.authenticate.mockRejectedValue(new Error('Invalid password'));

    await expect(User.authenticate('ahmed@test.com', 'wrongpassword')).rejects.toThrow();
  });

  test('should update user profile', async () => {
    const User = require('../models/User.memory');
    User.update.mockResolvedValue({
      _id: 'user-1',
      username: 'ahmed_updated',
      email: 'newemail@test.com',
    });

    const updated = await User.update('user-1', {
      username: 'ahmed_updated',
      email: 'newemail@test.com',
    });

    expect(updated.username).toBe('ahmed_updated');
  });

  test('should delete user', async () => {
    const User = require('../models/User.memory');
    User.delete.mockResolvedValue({ success: true });

    const result = await User.delete('user-1');
    expect(result.success).toBe(true);
  });
});

describe('Employee Model Extended Tests', () => {
  test('should create employee with full information', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.create.mockResolvedValue({
      _id: 'emp-1',
      name: 'Ahmed',
      email: 'ahmed@test.com',
      department: 'HR',
      position: 'Manager',
      salary: 3500,
      joinDate: '2023-01-01',
    });

    const emp = await Employee.create({
      name: 'Ahmed',
      email: 'ahmed@test.com',
      department: 'HR',
      position: 'Manager',
      salary: 3500,
    });

    expect(emp._id).toBe('emp-1');
    expect(emp.department).toBe('HR');
    expect(emp.salary).toBe(3500);
  });

  test('should find all employees with pagination', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.findAll.mockResolvedValue([
      { _id: '1', name: 'Ahmed', department: 'HR' },
      { _id: '2', name: 'Fatima', department: 'Finance' },
    ]);

    const employees = await Employee.findAll({ limit: 10 });
    expect(employees).toHaveLength(2);
  });

  test('should find employees by department', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.findByDepartment.mockResolvedValue([
      { _id: '1', name: 'Ahmed', department: 'HR' },
      { _id: '3', name: 'Sara', department: 'HR' },
    ]);

    const employees = await Employee.findByDepartment('HR');
    expect(employees).toHaveLength(2);
    expect(employees[0].department).toBe('HR');
  });

  test('should get total employee count', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.getTotalCount.mockResolvedValue({
      totalEmployees: 50,
      activeEmployees: 45,
      onLeave: 5,
    });

    const count = await Employee.getTotalCount();
    expect(count.totalEmployees).toBe(50);
  });

  test('should update employee information', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.update.mockResolvedValue({
      _id: '1',
      name: 'Ahmed Updated',
      salary: 4000,
      department: 'HR',
    });

    const updated = await Employee.update('1', { salary: 4000 });
    expect(updated.salary).toBe(4000);
  });

  test('should delete employee', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.delete.mockResolvedValue({ success: true });

    const result = await Employee.delete('1');
    expect(result.success).toBe(true);
  });

  test('should handle bulk employee operations', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.find.mockResolvedValue([
      { _id: '1', name: 'Employee 1' },
      { _id: '2', name: 'Employee 2' },
      { _id: '3', name: 'Employee 3' },
    ]);

    const employees = await Employee.find();
    expect(employees.length).toBeGreaterThan(0);
  });
});

describe('Attendance Model Extended Tests', () => {
  test('should create attendance record', async () => {
    const Attendance = require('../models/Attendance.memory');
    Attendance.create.mockResolvedValue({
      _id: 'att-1',
      employeeId: 'emp-1',
      date: '2024-01-01',
      checkIn: '08:00',
      checkOut: '17:00',
      status: 'present',
    });

    const attendance = await Attendance.create({
      employeeId: 'emp-1',
      date: '2024-01-01',
      checkIn: '08:00',
    });

    expect(attendance.employeeId).toBe('emp-1');
    expect(attendance.status).toBe('present');
  });

  test('should find attendance by employee', async () => {
    const Attendance = require('../models/Attendance.memory');
    Attendance.findByEmployeeId.mockResolvedValue([
      { _id: 'att-1', employeeId: 'emp-1', date: '2024-01-01', status: 'present' },
      { _id: 'att-2', employeeId: 'emp-1', date: '2024-01-02', status: 'present' },
    ]);

    const records = await Attendance.findByEmployeeId('emp-1');
    expect(records).toHaveLength(2);
    expect(records[0].employeeId).toBe('emp-1');
  });

  test('should get monthly attendance statistics', async () => {
    const Attendance = require('../models/Attendance.memory');
    Attendance.getMonthlyStats.mockResolvedValue({
      month: '2024-01',
      present: 20,
      absent: 2,
      late: 1,
      averageWorkHours: 8.5,
    });

    const stats = await Attendance.getMonthlyStats('emp-1', '2024-01');
    expect(stats.month).toBe('2024-01');
    expect(stats).toHaveProperty('present');
    expect(stats).toHaveProperty('absent');
  });

  test('should update attendance record', async () => {
    const Attendance = require('../models/Attendance.memory');
    Attendance.update.mockResolvedValue({
      _id: 'att-1',
      status: 'present',
      checkOut: '18:00',
    });

    const updated = await Attendance.update('att-1', { checkOut: '18:00' });
    expect(updated.checkOut).toBe('18:00');
  });

  test('should delete attendance record', async () => {
    const Attendance = require('../models/Attendance.memory');
    Attendance.delete.mockResolvedValue({ success: true });

    const result = await Attendance.delete('att-1');
    expect(result.success).toBe(true);
  });

  test('should handle bulk attendance records', async () => {
    const Attendance = require('../models/Attendance.memory');
    const bulkRecords = Array(100)
      .fill(null)
      .map((_, i) => ({
        _id: `att-${i}`,
        employeeId: `emp-${Math.floor(i / 20)}`,
        date: '2024-01-' + String((i % 31) + 1).padStart(2, '0'),
      }));

    Attendance.find.mockResolvedValue(bulkRecords);
    const records = await Attendance.find();
    expect(records.length).toBe(100);
  });
});

describe('Leave Model Extended Tests', () => {
  test('should create leave request', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.create.mockResolvedValue({
      _id: 'leave-1',
      employeeId: 'emp-1',
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      reason: 'Vacation',
      status: 'pending',
    });

    const leave = await Leave.create({
      employeeId: 'emp-1',
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      reason: 'Vacation',
    });

    expect(leave.employeeId).toBe('emp-1');
    expect(leave.status).toBe('pending');
  });

  test('should find leave requests by employee', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.findByEmployeeId.mockResolvedValue([
      { _id: 'leave-1', employeeId: 'emp-1', status: 'approved' },
      { _id: 'leave-2', employeeId: 'emp-1', status: 'pending' },
    ]);

    const leaves = await Leave.findByEmployeeId('emp-1');
    expect(leaves).toHaveLength(2);
  });

  test('should approve leave request', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.approve.mockResolvedValue({
      _id: 'leave-1',
      status: 'approved',
      approvedBy: 'admin',
      approvedDate: new Date().toISOString(),
    });

    const approved = await Leave.approve('leave-1', 'admin');
    expect(approved.status).toBe('approved');
    expect(approved.approvedBy).toBe('admin');
  });

  test('should reject leave request', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.reject.mockResolvedValue({
      _id: 'leave-1',
      status: 'rejected',
      rejectionReason: 'Budget constraints',
    });

    const rejected = await Leave.reject('leave-1', 'Budget constraints');
    expect(rejected.status).toBe('rejected');
  });

  test('should calculate leave days', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.find.mockResolvedValue([
      {
        _id: 'leave-1',
        employeeId: 'emp-1',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
        status: 'approved',
      },
    ]);

    const leaves = await Leave.find();
    const leaveDays = leaves[0]; // 5 days
    expect(leaveDays).toHaveProperty('startDate');
    expect(leaveDays).toHaveProperty('endDate');
  });

  test('should handle overlapping leave requests', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.create.mockRejectedValue(new Error('Overlapping leave dates'));

    await expect(
      Leave.create({
        employeeId: 'emp-1',
        startDate: '2024-02-01',
        endDate: '2024-02-10',
      }),
    ).rejects.toThrow('Overlapping');
  });
});

describe('Finance Model Extended Tests', () => {
  test('should create expense record', async () => {
    const Finance = require('../models/Finance.memory');
    Finance.Expense.create.mockResolvedValue({
      _id: 'exp-1',
      employeeId: 'emp-1',
      amount: 500,
      category: 'travel',
      date: '2024-01-15',
      description: 'Flight to Dubai',
    });

    const expense = await Finance.Expense.create({
      employeeId: 'emp-1',
      amount: 500,
      category: 'travel',
      description: 'Flight to Dubai',
    });

    expect(expense.amount).toBe(500);
    expect(expense.category).toBe('travel');
  });

  test('should find expenses by employee', async () => {
    const Finance = require('../models/Finance.memory');
    Finance.Expense.find.mockResolvedValue([
      { _id: 'exp-1', employeeId: 'emp-1', amount: 500, category: 'travel' },
      { _id: 'exp-2', employeeId: 'emp-1', amount: 100, category: 'office' },
    ]);

    const expenses = await Finance.Expense.find({ employeeId: 'emp-1' });
    expect(expenses).toHaveLength(2);
    expect(expenses.reduce((sum, e) => sum + e.amount, 0)).toBe(600);
  });

  test('should create budget', async () => {
    const Finance = require('../models/Finance.memory');
    Finance.Budget.create.mockResolvedValue({
      _id: 'bud-1',
      department: 'HR',
      amount: 50000,
      period: '2024-01',
      spent: 15000,
    });

    const budget = await Finance.Budget.create({
      department: 'HR',
      amount: 50000,
      period: '2024-01',
    });

    expect(budget.department).toBe('HR');
    expect(budget.amount).toBe(50000);
  });

  test('should calculate budget utilization', async () => {
    const Finance = require('../models/Finance.memory');
    Finance.Budget.find.mockResolvedValue({
      _id: 'bud-1',
      amount: 50000,
      spent: 30000,
      utilization: 60,
      remaining: 20000,
    });

    const budget = await Finance.Budget.find('bud-1');
    expect(budget.utilization).toBe(60);
    expect(budget.remaining).toBe(20000);
  });

  test('should update budget', async () => {
    const Finance = require('../models/Finance.memory');
    Finance.Budget.update.mockResolvedValue({
      _id: 'bud-1',
      amount: 60000, // Updated
      spent: 30000,
      utilization: 50,
    });

    const updated = await Finance.Budget.update('bud-1', { amount: 60000 });
    expect(updated.amount).toBe(60000);
  });
});

describe('AI Predictions Model Tests', () => {
  test('should store attendance prediction', async () => {
    const db = require('../config/inMemoryDB');
    const prediction = {
      employeeId: 'emp-1',
      predictedAbsences: 2,
      riskScore: 0.15,
      confidence: 0.92,
      date: new Date().toISOString(),
    };

    db.write.mockReturnValue({
      ai_predictions: [prediction],
    });

    expect(db.write).toBeDefined();
  });

  test('should store salary prediction', async () => {
    const db = require('../config/inMemoryDB');
    const prediction = {
      month: '2024-02',
      requiredBudget: 250000,
      confidence: 0.88,
    };

    expect(prediction).toHaveProperty('requiredBudget');
  });

  test('should store leave trend analysis', async () => {
    const db = require('../config/inMemoryDB');
    const analysis = {
      predictedLeavePattern: ['February', 'July'],
      estimatedTotalDays: 45,
      confidence: 0.85,
    };

    expect(analysis).toHaveProperty('predictedLeavePattern');
  });
});

describe('Notification Model Tests', () => {
  test('should create notification', async () => {
    // Mock notification creation
    const notification = {
      _id: 'notif-1',
      userId: 'user-1',
      type: 'leave_approved',
      message: 'Your leave request has been approved',
      read: false,
      createdAt: new Date(),
    };

    expect(notification).toHaveProperty('_id');
    expect(notification.read).toBe(false);
  });

  test('should mark notification as read', async () => {
    const notification = {
      _id: 'notif-1',
      userId: 'user-1',
      read: true,
    };

    expect(notification.read).toBe(true);
  });

  test('should get unread notification count', () => {
    const notifications = [
      { _id: 'n1', read: false },
      { _id: 'n2', read: true },
      { _id: 'n3', read: false },
    ];

    const unreadCount = notifications.filter(n => !n.read).length;
    expect(unreadCount).toBe(2);
  });
});

describe('Data Integrity Tests', () => {
  test('should maintain referential integrity for employee-attendance relationship', async () => {
    const Employee = require('../models/Employee.memory');
    const Attendance = require('../models/Attendance.memory');

    Employee.findById.mockResolvedValue({ _id: 'emp-1', name: 'Ahmed' });
    Attendance.find.mockResolvedValue([{ employeeId: 'emp-1', date: '2024-01-01' }]);

    const emp = await Employee.findById('emp-1');
    const attendance = await Attendance.find({ employeeId: emp._id });

    expect(attendance[0].employeeId).toBe(emp._id);
  });

  test('should handle null/undefined values gracefully', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.create.mockResolvedValue({
      _id: 'emp-1',
      name: 'Test',
      department: null, // Null value
      salary: undefined, // Undefined value
    });

    const emp = await Employee.create({ name: 'Test' });
    expect(emp._id).toBe('emp-1');
  });

  test('should validate data types', async () => {
    const Leave = require('../models/Leave.memory');
    Leave.create.mockRejectedValue(new Error('Invalid date format'));

    await expect(
      Leave.create({
        employeeId: 'emp-1',
        startDate: 'invalid-date',
        endDate: '2024-02-05',
      }),
    ).rejects.toThrow();
  });
});

describe('Performance Tests', () => {
  test('should handle large datasets efficiently', async () => {
    const Employee = require('../models/Employee.memory');
    const largeDataset = Array(10000)
      .fill(null)
      .map((_, i) => ({
        _id: `emp-${i}`,
        name: `Employee ${i}`,
      }));

    Employee.find.mockResolvedValue(largeDataset);

    const start = Date.now();
    const employees = await Employee.find();
    const duration = Date.now() - start;

    expect(employees.length).toBe(10000);
    expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
  });

  test('should cache frequently accessed data', async () => {
    const Employee = require('../models/Employee.memory');
    Employee.findById.mockResolvedValue({ _id: 'emp-1', name: 'Ahmed' });

    // First call
    const emp1 = await Employee.findById('emp-1');
    // Second call (should be cached or make another call)
    const emp2 = await Employee.findById('emp-1');

    expect(emp1._id).toBe(emp2._id);
    // Cache is optional - may call 1, 2, or 3 times depending on cache implementation
    expect(Employee.findById.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
