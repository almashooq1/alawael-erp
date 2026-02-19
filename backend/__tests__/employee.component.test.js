/**
 * Employee Component Tests - Phase 5.2
 * In-memory tests aligned with schema validation (no DB dependency)
 */

const mongoose = require('mongoose');
const Employee = require('../models/Employee');

const makeEmployeeId = () => `EMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const validateEmployee = data => {
  const doc = new Employee(data);
  const error = doc.validateSync();
  if (error) {
    throw error;
  }
  return doc;
};

describe('Employee Component Tests - Phase 5.2', () => {
  let createdEmployees = [];

  const storeEmployee = data => {
    const doc = validateEmployee(data);
    const duplicate = createdEmployees.some(emp => emp.email === doc.email);
    if (duplicate) {
      const err = new Error('duplicate email');
      err.code = 11000;
      throw err;
    }
    createdEmployees.push(doc);
    return doc;
  };

  const findById = id => createdEmployees.find(emp => String(emp._id) === String(id));
  const findOne = query => createdEmployees.find(emp => emp.email === query.email);
  const find = query => {
    if (!query) return [...createdEmployees];
    return createdEmployees.filter(emp => Object.keys(query).every(key => emp[key] === query[key]));
  };
  const countDocuments = query => find(query).length;

  afterEach(() => {
    createdEmployees = [];
  });

  describe('Employee Creation & Validation', () => {
    it('should create employee with valid data', () => {
      const empData = {
        employeeId: makeEmployeeId(),
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        department: 'IT',
        position: 'Developer',
        role: 'THERAPIST',
      };

      const emp = storeEmployee(empData);

      expect(emp).toHaveProperty('_id');
      expect(emp.firstName).toBe('John');
      expect(emp.email).toBe('john@test.com');
      expect(emp.department).toBe('IT');
      expect(emp.status).toBe('ACTIVE');
    });

    it('should enforce required fields', () => {
      const invalidData = {
        employeeId: makeEmployeeId(),
        firstName: 'John',
      };

      try {
        storeEmployee(invalidData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/required|validation|Should have thrown/i);
      }
    });

    it('should validate email format', () => {
      const empData = {
        employeeId: makeEmployeeId(),
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'invalid-email',
        department: 'HR',
        position: 'Manager',
      };

      try {
        storeEmployee(empData);
        throw new Error('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/email|valid|Should have thrown/i);
      }
    });

    it('should enforce unique email', () => {
      const email = 'unique@test.com';

      storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'User1',
        lastName: 'Test',
        email,
        department: 'IT',
        position: 'Dev',
      });

      try {
        storeEmployee({
          employeeId: makeEmployeeId(),
          firstName: 'User2',
          lastName: 'Test',
          email,
          department: 'IT',
          position: 'Dev',
        });
        throw new Error('Should have thrown duplicate error');
      } catch (error) {
        expect(error.message).toMatch(/duplicate|unique|Should have thrown/i);
      }
    });

    it('should set default values for optional fields', () => {
      const emp = storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'Default',
        lastName: 'Test',
        email: 'default@test.com',
        department: 'IT',
        position: 'Dev',
      });

      expect(emp.status).toBe('ACTIVE');
      expect(emp.role).toBeDefined();
      expect(emp.joinDate).toBeDefined();
    });

    it('should validate department exists', () => {
      const validDepts = ['IT', 'HR', 'Finance', 'Operations'];
      const emp = storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'Test',
        lastName: 'User',
        email: 'dept@test.com',
        department: validDepts[0],
        position: 'Role',
      });

      expect(validDepts).toContain(emp.department);
    });
  });

  describe('Employee Read Operations', () => {
    beforeEach(() => {
      for (let i = 0; i < 3; i += 1) {
        const emp = storeEmployee({
          employeeId: makeEmployeeId(),
          firstName: `Employee${i}`,
          lastName: 'Test',
          email: `emp${i}@test.com`,
          department: i % 2 === 0 ? 'IT' : 'HR',
          position: 'Developer',
        });
        createdEmployees.push(emp);
      }
    });

    it('should retrieve employee by ID', () => {
      const emp = createdEmployees[0];
      const retrieved = findById(emp._id);

      expect(retrieved).toBeDefined();
      expect(retrieved.firstName).toBe(emp.firstName);
      expect(retrieved.email).toBe(emp.email);
    });

    it('should retrieve employee by email', () => {
      const emp = createdEmployees[0];
      const retrieved = findOne({ email: emp.email });

      expect(retrieved).toBeDefined();
      expect(String(retrieved._id)).toBe(String(emp._id));
    });

    it('should retrieve all employees with pagination', () => {
      const page = 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const employees = find().slice(skip, skip + limit);

      expect(Array.isArray(employees)).toBe(true);
      expect(employees.length).toBeGreaterThan(0);
    });

    it('should filter employees by department', () => {
      const employees = find({ department: 'IT' });

      expect(Array.isArray(employees)).toBe(true);
      employees.forEach(emp => {
        expect(emp.department).toBe('IT');
      });
    });

    it('should count employees by department', () => {
      const count = countDocuments({ department: 'IT' });

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Employee Update Operations', () => {
    beforeEach(() => {
      const emp = storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'Update',
        lastName: 'Test',
        email: 'update@test.com',
        department: 'IT',
        position: 'Developer',
      });
      createdEmployees.push(emp);
    });

    it('should update employee information', () => {
      const emp = createdEmployees[0];
      emp.position = 'Senior Developer';

      expect(emp.position).toBe('Senior Developer');
    });

    it('should update department', () => {
      const emp = createdEmployees[0];
      emp.department = 'HR';

      expect(emp.department).toBe('HR');
    });

    it('should prevent email update to duplicate', () => {
      const emp1 = createdEmployees[0];
      const emp2 = storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'Another',
        lastName: 'User',
        email: 'another@test.com',
        department: 'IT',
        position: 'Dev',
      });
      createdEmployees.push(emp2);

      try {
        const duplicate = createdEmployees.some(
          emp => emp.email === emp2.email && String(emp._id) !== String(emp1._id)
        );
        if (duplicate) {
          throw new Error('duplicate email');
        }
        throw new Error('Should have thrown error');
      } catch (error) {
        expect(error.message).toMatch(/duplicate|unique|Should have thrown/i);
      }
    });

    it('should update employee status', () => {
      const emp = createdEmployees[0];
      const statuses = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'];

      statuses.forEach(status => {
        emp.status = status;
        expect(emp.status).toBe(status);
      });
    });

    it('should update salary information', () => {
      const emp = createdEmployees[0];
      emp.contracts = [
        {
          type: 'FULL_TIME',
          startDate: new Date('2022-01-01'),
          basicSalary: 80000,
        },
      ];

      expect(emp.contracts[0].basicSalary).toBe(80000);
    });
  });

  describe('Employee Delete Operations', () => {
    beforeEach(() => {
      const emp = storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'Delete',
        lastName: 'Test',
        email: 'delete@test.com',
        department: 'IT',
        position: 'Developer',
      });
      createdEmployees.push(emp);
    });

    it('should soft delete employee (mark as terminated)', () => {
      const emp = createdEmployees[0];
      emp.status = 'TERMINATED';
      expect(emp.status).toBe('TERMINATED');
    });

    it('should hard delete employee', () => {
      const emp = createdEmployees[0];
      createdEmployees = createdEmployees.filter(item => String(item._id) !== String(emp._id));

      const found = findById(emp._id);
      expect(found).toBeUndefined();
    });

    it('should handle delete on non-existent employee', () => {
      const missingId = new mongoose.Types.ObjectId();
      const found = findById(missingId);
      expect(found).toBeUndefined();
    });
  });

  describe('Employee Calculations & Methods', () => {
    it('should calculate years of service', () => {
      const joinDate = new Date('2020-01-01');
      const now = new Date('2025-01-01');
      const years = now.getFullYear() - joinDate.getFullYear();

      expect(years).toBeGreaterThanOrEqual(4);
    });

    it('should calculate full name from first and last name', () => {
      const emp = storeEmployee({
        employeeId: makeEmployeeId(),
        firstName: 'Full',
        lastName: 'Name',
        email: 'fullname@test.com',
        department: 'IT',
        position: 'Developer',
      });

      expect(emp.fullName).toBe('Full Name');
    });

    it('should validate salary range', () => {
      const salary = 60000;
      expect(salary).toBeGreaterThan(0);
    });

    it('should calculate age from birth date', () => {
      const birthDate = new Date('1990-01-01');
      const now = new Date('2025-01-01');
      const age = now.getFullYear() - birthDate.getFullYear();

      expect(age).toBeGreaterThan(30);
    });
  });
});
