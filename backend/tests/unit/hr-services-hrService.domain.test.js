/**
 * Functional unit tests for domains/hr/services/hrService.js
 * Tests the HR facade delegation pattern and export shape.
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockEmpAffairs = {
  createEmployee: jest.fn(),
  getEmployeeById: jest.fn(),
  getAllEmployees: jest.fn(),
  updateEmployee: jest.fn(),
  deactivateEmployee: jest.fn(),
  searchEmployees: jest.fn(),
  getEmployeeProfile: jest.fn(),
  requestLeave: jest.fn(),
  approveLeave: jest.fn(),
  rejectLeave: jest.fn(),
  cancelLeave: jest.fn(),
  getLeaveBalance: jest.fn(),
  getEmployeeLeaves: jest.fn(),
  checkIn: jest.fn(),
  checkOut: jest.fn(),
  getAttendanceRecords: jest.fn(),
  getPayslip: jest.fn(),
  createContract: jest.fn(),
  renewContract: jest.fn(),
};

jest.mock('../../services/employeeAffairs.service', () => mockEmpAffairs);

const hrService = require('../../domains/hr/services/hrService');

describe('hrService facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('export shape', () => {
    test('exports employee namespace with all methods', () => {
      expect(hrService.employee).toBeDefined();
      expect(typeof hrService.employee.create).toBe('function');
      expect(typeof hrService.employee.getById).toBe('function');
      expect(typeof hrService.employee.getAll).toBe('function');
      expect(typeof hrService.employee.update).toBe('function');
      expect(typeof hrService.employee.search).toBe('function');
    });

    test('exports leave, attendance, payroll namespaces', () => {
      expect(hrService.leave).toBeDefined();
      expect(hrService.attendance).toBeDefined();
      expect(hrService.payroll).toBeDefined();
    });

    test('exports performance and training namespaces', () => {
      expect(hrService.performance).toBeDefined();
      expect(hrService.training).toBeDefined();
    });

    test('exports all remaining sub-domain namespaces', () => {
      [
        'contracts',
        'complaints',
        'loans',
        'letters',
        'promotions',
        'overtime',
        'dashboard',
      ].forEach(ns => {
        expect(hrService[ns]).toBeDefined();
      });
    });

    test('flat alias createEmployee matches employee.create', () => {
      expect(hrService.createEmployee).toBe(hrService.employee.create);
    });

    test('flat alias getEmployeeById matches employee.getById', () => {
      expect(hrService.getEmployeeById).toBe(hrService.employee.getById);
    });

    test('flat alias checkIn matches attendance.checkIn', () => {
      expect(hrService.checkIn).toBe(hrService.attendance.checkIn);
    });

    test('flat alias checkOut matches attendance.checkOut', () => {
      expect(hrService.checkOut).toBe(hrService.attendance.checkOut);
    });

    test('flat alias requestLeave matches leave.request', () => {
      expect(hrService.requestLeave).toBe(hrService.leave.request);
    });

    test('flat alias approveLeave matches leave.approve', () => {
      expect(hrService.approveLeave).toBe(hrService.leave.approve);
    });
  });

  describe('employee delegation', () => {
    test('employee.create delegates to empAffairs.createEmployee', () => {
      mockEmpAffairs.createEmployee.mockReturnValue('emp1');
      const result = hrService.employee.create('arg1', 'arg2');
      expect(mockEmpAffairs.createEmployee).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('emp1');
    });

    test('employee.getById delegates to empAffairs.getEmployeeById', () => {
      mockEmpAffairs.getEmployeeById.mockReturnValue({ id: '123' });
      const result = hrService.employee.getById('123');
      expect(mockEmpAffairs.getEmployeeById).toHaveBeenCalledWith('123');
      expect(result).toEqual({ id: '123' });
    });

    test('employee.getAll delegates to empAffairs.getAllEmployees', () => {
      mockEmpAffairs.getAllEmployees.mockReturnValue([{ id: 'e1' }]);
      const result = hrService.employee.getAll({ active: true });
      expect(mockEmpAffairs.getAllEmployees).toHaveBeenCalledWith({ active: true });
      expect(result).toEqual([{ id: 'e1' }]);
    });

    test('employee.update delegates to empAffairs.updateEmployee', () => {
      hrService.employee.update('id1', { name: 'Ali' });
      expect(mockEmpAffairs.updateEmployee).toHaveBeenCalledWith('id1', { name: 'Ali' });
    });

    test('employee.search delegates to empAffairs.searchEmployees', () => {
      hrService.employee.search('Ahmed');
      expect(mockEmpAffairs.searchEmployees).toHaveBeenCalledWith('Ahmed');
    });

    test('employee.deactivate delegates to empAffairs.deactivateEmployee', () => {
      hrService.employee.deactivate('emp1', 'reason');
      expect(mockEmpAffairs.deactivateEmployee).toHaveBeenCalledWith('emp1', 'reason');
    });
  });

  describe('leave delegation', () => {
    test('leave.request delegates to empAffairs.requestLeave', () => {
      hrService.leave.request('emp1', { type: 'annual' });
      expect(mockEmpAffairs.requestLeave).toHaveBeenCalledWith('emp1', { type: 'annual' });
    });

    test('leave.approve delegates to empAffairs.approveLeave', () => {
      hrService.leave.approve('leave1', 'mgr1');
      expect(mockEmpAffairs.approveLeave).toHaveBeenCalledWith('leave1', 'mgr1');
    });

    test('leave.reject delegates to empAffairs.rejectLeave', () => {
      hrService.leave.reject('leave1', 'reason');
      expect(mockEmpAffairs.rejectLeave).toHaveBeenCalledWith('leave1', 'reason');
    });

    test('leave.getBalance delegates to empAffairs.getLeaveBalance', () => {
      hrService.leave.getBalance('emp1');
      expect(mockEmpAffairs.getLeaveBalance).toHaveBeenCalledWith('emp1');
    });
  });

  describe('attendance delegation', () => {
    test('attendance.checkIn delegates to empAffairs.checkIn', () => {
      hrService.attendance.checkIn('emp1', { lat: 0 });
      expect(mockEmpAffairs.checkIn).toHaveBeenCalledWith('emp1', { lat: 0 });
    });

    test('attendance.checkOut delegates to empAffairs.checkOut', () => {
      hrService.attendance.checkOut('emp1', { lat: 0 });
      expect(mockEmpAffairs.checkOut).toHaveBeenCalledWith('emp1', { lat: 0 });
    });

    test('attendance.getRecords delegates to empAffairs.getAttendanceRecords', () => {
      hrService.attendance.getRecords('emp1', {});
      expect(mockEmpAffairs.getAttendanceRecords).toHaveBeenCalledWith('emp1', {});
    });
  });

  describe('payroll delegation', () => {
    test('payroll.getSlip delegates to empAffairs.getPayslip', () => {
      hrService.payroll.getSlip('emp1', '2024-01');
      expect(mockEmpAffairs.getPayslip).toHaveBeenCalledWith('emp1', '2024-01');
    });
  });

  describe('empty delegates (phase2/phase3/hrAdvanced/hrDashboard)', () => {
    test('leave.getReport returns undefined via emptyDelegate', () => {
      const result = hrService.leave.getReport('emp1');
      expect(result).toBeUndefined();
    });

    test('performance.createReview returns undefined via emptyDelegate', () => {
      const result = hrService.performance.createReview({});
      expect(result).toBeUndefined();
    });

    test('dashboard.getSummary returns undefined via emptyDelegate', () => {
      const result = hrService.dashboard.getSummary('branch1');
      expect(result).toBeUndefined();
    });

    test('training.createProgram returns undefined via emptyDelegate', () => {
      const result = hrService.training.createProgram({});
      expect(result).toBeUndefined();
    });

    test('overtime.submit returns undefined via emptyDelegate', () => {
      const result = hrService.overtime.submit({});
      expect(result).toBeUndefined();
    });
  });

  describe('flat alias integration', () => {
    test('createEmployee flat alias delegates via facade', () => {
      mockEmpAffairs.createEmployee.mockReturnValue({ _id: 'new1' });
      const result = hrService.createEmployee({ name: 'Sara' });
      expect(result).toEqual({ _id: 'new1' });
      expect(mockEmpAffairs.createEmployee).toHaveBeenCalledWith({ name: 'Sara' });
    });

    test('getHRDashboardSummary flat alias returns undefined (emptyDelegate)', () => {
      const result = hrService.getHRDashboardSummary('b1');
      expect(result).toBeUndefined();
    });

    test('calculatePayroll flat alias returns undefined (emptyDelegate)', () => {
      const result = hrService.calculatePayroll('emp1', '2024-03');
      expect(result).toBeUndefined();
    });
  });

  describe('file exists placeholder', () => {
    test('module loads without errors', () => {
      expect(hrService).toBeDefined();
      expect(typeof hrService).toBe('object');
    });
  });
});
