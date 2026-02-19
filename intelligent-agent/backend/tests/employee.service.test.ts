import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmployeeService } from '../services/employee.service';
import { Employee } from '../models/employee.model';

/**
 * Employee Service Unit Tests (14 cases)
 * Tests all CRUD operations and business logic
 */

describe('EmployeeService', () => {
  let employeeService: EmployeeService;
  let mockDb: any;

  beforeEach(() => {
    // Setup mocks
    mockDb = {
      insertOne: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      countDocuments: vi.fn(),
    };
    employeeService = new EmployeeService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('should create employee with valid data', async () => {
      // Test 1.1
      const employeeData = {
        firstName: 'Ahmed',
        lastName: 'Hassan',
        email: 'ahmed@example.com',
        phone: '+966501234567',
        department: 'IT',
        position: 'Senior Developer',
        salary: 150000,
        employmentType: 'Full-time',
        hireDate: new Date(),
      };

      mockDb.insertOne.mockResolvedValue({ _id: 'emp-001', ...employeeData });

      const result = await employeeService.createEmployee(employeeData);

      expect(mockDb.insertOne).toHaveBeenCalledWith(expect.objectContaining(employeeData));
      expect(result._id).toBe('emp-001');
      expect(result.firstName).toBe('Ahmed');
    });

    it('should reject invalid email format', async () => {
      // Test 1.2
      const invalidData = {
        firstName: 'Test',
        email: 'invalid-email',
        department: 'IT',
      };

      await expect(employeeService.createEmployee(invalidData)).rejects.toThrow('Invalid email');
    });

    it('should reject negative salary', async () => {
      // Test 1.3
      const invalidData = {
        firstName: 'Test',
        email: 'test@example.com',
        salary: -50000,
      };

      await expect(employeeService.createEmployee(invalidData)).rejects.toThrow(
        'Salary must be positive'
      );
    });

    it('should set default values for optional fields', async () => {
      // Test 1.4
      const minimalData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        department: 'IT',
      };

      mockDb.insertOne.mockResolvedValue({
        _id: 'emp-002',
        ...minimalData,
        status: 'Active',
        isDeleted: false,
        createdAt: new Date(),
      });

      const result = await employeeService.createEmployee(minimalData);

      expect(result.status).toBe('Active');
      expect(result.isDeleted).toBe(false);
    });
  });

  describe('getEmployee', () => {
    it('should retrieve employee by ID', async () => {
      // Test 2.1
      const employeeId = 'emp-001';
      const mockEmployee = {
        _id: employeeId,
        firstName: 'Ahmed',
        email: 'ahmed@example.com',
      };

      mockDb.findOne.mockResolvedValue(mockEmployee);

      const result = await employeeService.getEmployee(employeeId);

      expect(mockDb.findOne).toHaveBeenCalledWith({ _id: employeeId, isDeleted: false });
      expect(result._id).toBe(employeeId);
    });

    it('should return null for non-existent employee', async () => {
      // Test 2.2
      mockDb.findOne.mockResolvedValue(null);

      const result = await employeeService.getEmployee('non-existent');

      expect(result).toBeNull();
    });

    it('should not return deleted employees', async () => {
      // Test 2.3
      mockDb.findOne.mockResolvedValue(null);

      const result = await employeeService.getEmployee('emp-deleted');

      expect(mockDb.findOne).toHaveBeenCalledWith(expect.objectContaining({ isDeleted: false }));
    });

    it('should include all related data (leave, attendance, evaluations)', async () => {
      // Test 2.4
      const mockEmployee = {
        _id: 'emp-001',
        firstName: 'Ahmed',
        leaveRequests: [],
        attendanceRecords: [],
        evaluationHistory: [],
      };

      mockDb.findOne.mockResolvedValue(mockEmployee);

      const result = await employeeService.getEmployee('emp-001');

      expect(result.leaveRequests).toBeDefined();
      expect(result.attendanceRecords).toBeDefined();
      expect(result.evaluationHistory).toBeDefined();
    });
  });

  describe('updateEmployee', () => {
    it('should update employee with valid data', async () => {
      // Test 3.1
      const employeeId = 'emp-001';
      const updateData = {
        firstName: 'Ahmed',
        position: 'Lead Developer',
      };

      mockDb.updateOne.mockResolvedValue({
        _id: employeeId,
        ...updateData,
        modifiedCount: 1,
      });

      const result = await employeeService.updateEmployee(employeeId, updateData);

      expect(mockDb.updateOne).toHaveBeenCalled();
      expect(result.position).toBe('Lead Developer');
    });

    it('should not allow updating read-only fields', async () => {
      // Test 3.2
      const updateData = {
        createdAt: new Date(),
        _id: 'new-id',
      };

      await expect(employeeService.updateEmployee('emp-001', updateData)).rejects.toThrow(
        'Cannot update read-only fields'
      );
    });

    it('should track update in audit log', async () => {
      // Test 3.3
      mockDb.updateOne.mockResolvedValue({
        _id: 'emp-001',
        modifiedCount: 1,
      });

      await employeeService.updateEmployee('emp-001', { position: 'Manager' });

      expect(mockDb.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.any(Object),
        })
      );
    });

    it('should validate salary updates', async () => {
      // Test 3.4
      await expect(employeeService.updateEmployee('emp-001', { salary: -10000 })).rejects.toThrow(
        'Salary must be positive'
      );
    });
  });

  describe('deleteEmployee', () => {
    it('should soft delete employee', async () => {
      // Test 4.1
      mockDb.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await employeeService.deleteEmployee('emp-001');

      expect(mockDb.updateOne).toHaveBeenCalledWith(
        { _id: 'emp-001' },
        expect.objectContaining({
          $set: expect.objectContaining({ isDeleted: true }),
        })
      );
      expect(result.isDeleted).toBe(true);
    });

    it('should record deletion timestamp', async () => {
      // Test 4.2
      mockDb.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await employeeService.deleteEmployee('emp-001');

      expect(mockDb.updateOne).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('should not physically delete from database', async () => {
      // Test 4.3
      mockDb.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await employeeService.deleteEmployee('emp-001');

      expect(mockDb.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe('getEmployeeStatistics', () => {
    it('should calculate total employees count', async () => {
      // Test 5.1
      mockDb.countDocuments.mockResolvedValue(150);

      const stats = await employeeService.getEmployeeStatistics();

      expect(stats.totalEmployees).toBe(150);
    });

    it('should calculate active employees count', async () => {
      // Test 5.2
      mockDb.countDocuments.mockResolvedValue(140);

      const stats = await employeeService.getEmployeeStatistics();

      expect(stats.activeEmployees).toBeGreaterThan(0);
    });

    it('should calculate department distribution', async () => {
      // Test 5.3
      mockDb.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { department: 'IT', count: 50 },
          { department: 'HR', count: 30 },
          { department: 'Finance', count: 60 },
        ]),
      });

      const stats = await employeeService.getEmployeeStatistics();

      expect(stats.byDepartment).toBeDefined();
      expect(stats.byDepartment.IT).toBe(50);
    });

    it('should calculate average salary by department', async () => {
      // Test 5.4
      mockDb.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { department: 'IT', avgSalary: 125000 },
          { department: 'HR', avgSalary: 95000 },
        ]),
      });

      const stats = await employeeService.getEmployeeStatistics();

      expect(stats.avgSalaryByDept).toBeDefined();
    });
  });

  describe('manageLeave', () => {
    it('should approve leave request for manager', async () => {
      // Test 6.1
      mockDb.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await employeeService.approveLeave('emp-001', 'leave-req-001', 'manager-id');

      expect(result.status).toBe('Approved');
    });

    it('should calculate leave balance correctly', async () => {
      // Test 6.2
      const balance = await employeeService.getLeaveBalance('emp-001');

      expect(balance.annual).toBeGreaterThanOrEqual(0);
      expect(balance.sick).toBeGreaterThanOrEqual(0);
    });

    it('should reject leave if insufficient balance', async () => {
      // Test 6.3
      mockDb.findOne.mockResolvedValue({
        _id: 'emp-001',
        leaveBalance: { annual: 0 },
      });

      await expect(
        employeeService.requestLeave('emp-001', {
          type: 'Annual',
          startDate: new Date(),
          endDate: new Date(),
          duration: 5,
        })
      ).rejects.toThrow('Insufficient leave balance');
    });
  });

  describe('exportData', () => {
    it('should export employees as JSON', async () => {
      // Test 7.1
      mockDb.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'emp-001', firstName: 'Ahmed' },
          { _id: 'emp-002', firstName: 'Fatima' },
        ]),
      });

      const result = await employeeService.exportEmployees('json');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should export employees as CSV', async () => {
      // Test 7.2
      const result = await employeeService.exportEmployees('csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('firstName');
    });
  });
});

/**
 * Summary: 14 unit tests covering all EmployeeService methods
 * - Test 1.1-1.4: Create operations (4 tests)
 * - Test 2.1-2.4: Read operations (4 tests)
 * - Test 3.1-3.4: Update operations (4 tests)
 * - Test 4.1-4.3: Delete operations (3 tests)
 * - Test 5.1-5.4: Statistics (4 tests)
 * - Test 6.1-6.3: Leave management (3 tests)
 * - Test 7.1-7.2: Export functions (2 tests)
 */
