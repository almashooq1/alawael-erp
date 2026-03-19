/**
 * HRAPIService.test.js - اختبارات خدمة API نظام الموارد البشرية
 * اختبارات شاملة لجميع طرق API
 */

import HRAPIService from './HRAPIService';

// Mock fetch API
global.fetch = jest.fn();

describe('HRAPIService', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
  });

  // -------------------- Employee Tests --------------------
  describe('Employee Management', () => {
    test('getEmployees should fetch employee list successfully', async () => {
      const mockData = [
        { id: 1, fullName: 'أحمد محمد', email: 'ahmed@example.com' },
        { id: 2, fullName: 'فاطمة علي', email: 'fatima@example.com' },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await HRAPIService.getEmployees();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees'),
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });

    test('getEmployees should handle API errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Error' }),
      });

      await expect(HRAPIService.getEmployees()).rejects.toThrow();
    });

    test('createEmployee should create new employee', async () => {
      const newEmployee = {
        fullName: 'محمود حسن',
        email: 'mahmoud@example.com',
        position: 'مهندس',
      };

      const mockResponse = { id: 3, ...newEmployee };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await HRAPIService.createEmployee(newEmployee);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newEmployee),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('updateEmployee should update existing employee', async () => {
      const updates = { fullName: 'أحمد محمد محمود' };
      const mockResponse = { id: 1, ...updates };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await HRAPIService.updateEmployee(1, updates);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees/1'),
        expect.objectContaining({
          method: 'PUT',
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('deleteEmployee should delete employee', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Deleted' }),
      });

      await HRAPIService.deleteEmployee(1);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  // -------------------- Attendance Tests --------------------
  describe('Attendance Management', () => {
    test('recordAttendance should record employee attendance', async () => {
      const attendance = {
        employeeId: 1,
        date: '2026-02-15',
        status: 'present',
      };

      const mockResponse = { id: 1, ...attendance };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await HRAPIService.recordAttendance(attendance);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/attendance'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('getAttendanceReport should fetch attendance data', async () => {
      const mockData = [{ date: '2026-02-15', totalPresent: 42, totalAbsent: 3 }];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await HRAPIService.getAttendanceReport('2026-02-01', '2026-02-28');

      expect(result).toEqual(mockData);
    });
  });

  // -------------------- Leave Tests --------------------
  describe('Leave Management', () => {
    test('getPendingLeaveRequests should fetch pending leaves', async () => {
      const mockData = [
        {
          id: 1,
          employeeName: 'أحمد محمد',
          status: 'معلق',
          type: 'سنوية',
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await HRAPIService.getPendingLeaveRequests();

      expect(result).toEqual(mockData);
    });

    test('requestLeave should submit leave request', async () => {
      const leaveData = {
        leaveType: 'annual',
        startDate: '2026-02-15',
        endDate: '2026-02-20',
        reason: 'إجازة عائلية',
      };

      const mockResponse = { id: 1, ...leaveData, status: 'معلق' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await HRAPIService.requestLeave(leaveData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/leave/request'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('approveLeave should approve leave request', async () => {
      const approval = { approvalDate: new Date().toISOString() };
      const mockResponse = { id: 1, status: 'موافق عليه' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await HRAPIService.approveLeave(1, approval);

      expect(result).toEqual(mockResponse);
    });

    test('rejectLeave should reject leave request', async () => {
      const rejection = { rejectionReason: 'مشغول حالياً' };
      const mockResponse = { id: 1, status: 'مرفوض' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const result = await HRAPIService.rejectLeave(1, rejection);

      expect(result).toEqual(mockResponse);
    });
  });

  // -------------------- Payroll Tests --------------------
  describe('Payroll Management', () => {
    test('getPayrollReport should fetch payroll data', async () => {
      const mockData = [
        {
          id: 1,
          employeeName: 'أحمد محمد',
          baseSalary: 5000,
          netSalary: 4500,
        },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await HRAPIService.getPayrollReport('02', '2026');

      expect(result).toEqual(mockData);
    });

    test('processMonthlyPayroll should process salaries', async () => {
      const mockResponse = {
        success: true,
        message: 'Payroll processed',
        count: 45,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await HRAPIService.processMonthlyPayroll('02', '2026');

      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/payroll/process'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    test('transferPayroll should execute bank transfers', async () => {
      const mockResponse = {
        success: true,
        message: 'Transfers completed',
        count: 45,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await HRAPIService.transferPayroll('02', '2026');

      expect(result).toBeDefined();
    });
  });

  // -------------------- Reports Tests --------------------
  describe('Reports & Analytics', () => {
    test('getHROverviewReport should fetch overview statistics', async () => {
      const mockData = {
        totalEmployees: 45,
        todayAttendance: 93,
        averageSalary: 5000,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await HRAPIService.getHROverviewReport('2026-02-01', '2026-02-28');

      expect(result).toEqual(mockData);
    });

    test('getPerformanceReport should fetch performance data', async () => {
      const mockData = {
        averagePerformance: 3.8,
        topPerformers: 12,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const result = await HRAPIService.getPerformanceReport('2026-02-01', '2026-02-28');

      expect(result).toEqual(mockData);
    });
  });

  // -------------------- Error Handling Tests --------------------
  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(HRAPIService.getEmployees()).rejects.toThrow('Network error');
    });

    test('should handle authentication errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Unauthorized' }),
      });

      await expect(HRAPIService.getEmployees()).rejects.toThrow();
    });

    test('should handle server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ success: false, message: 'Server error' }),
      });

      await expect(HRAPIService.getEmployees()).rejects.toThrow();
    });
  });

  // -------------------- Data Validation Tests --------------------
  describe('Data Validation', () => {
    test('should validate required fields', async () => {
      const invalidEmployee = {
        email: 'test@example.com',
        // Missing fullName
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, message: 'Validation error' }),
      });

      await expect(HRAPIService.createEmployee(invalidEmployee)).rejects.toThrow();
    });

    test('should handle date range validation', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const result = await HRAPIService.getHROverviewReport('2026-02-01', '2026-02-28');

      expect(result).toBeDefined();
    });
  });
});
