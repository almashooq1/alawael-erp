const HRServiceClass = require('../services/hrPhase6Service');
const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');
const Attendance = require('../models/attendance.model');

// Mock Mongoose Models
jest.mock('../models/employee.model');
jest.mock('../models/payroll.model');
jest.mock('../models/attendance.model');
jest.mock('../models/leave.model');
jest.mock('../models/performance.model');

// Create instance
const hrService = new HRServiceClass();

describe('HR Phase 6 Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Attendance System', () => {
    const mockEmployeeId = 'emp123';
    const mockLocation = { lat: 10, lng: 20 };

    test('checkIn should create a new attendance record', async () => {
      // Mock findOne to return null (not checked in yet)
      Attendance.findOne.mockResolvedValue(null);

      // Mock save
      const mockSave = jest.fn().mockResolvedValue({
        employeeId: mockEmployeeId,
        checkIn: new Date(),
        location: mockLocation,
      });

      // Mock constructor behavior
      Attendance.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await hrService.checkIn(mockEmployeeId, mockLocation);

      expect(Attendance.findOne).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(result.employeeId).toBe(mockEmployeeId);
    });

    test('checkOut should update existing record', async () => {
      const mockRecord = {
        save: jest.fn().mockResolvedValue({ checkOut: new Date() }),
        checkOut: null,
      };

      // Mock findOne to return existing record
      Attendance.findOne.mockResolvedValue(mockRecord);

      const result = await hrService.checkOut(mockEmployeeId);

      expect(Attendance.findOne).toHaveBeenCalled();
      expect(mockRecord.save).toHaveBeenCalled();
    });
  });

  describe('Payroll System', () => {
    test('generatePayroll should create payrolls for active employees', async () => {
      // Mock employees
      const mockEmployees = [
        {
          _id: 'emp1',
          salary: {
            base: 5000,
            allowances: [],
            deductions: [],
          },
        },
        {
          _id: 'emp2',
          salary: {
            base: 6000,
            allowances: [{ amount: 500, type: 'housing' }],
            deductions: [{ amount: 100, type: 'tax' }],
          },
        },
      ];

      Employee.find.mockResolvedValue(mockEmployees);
      // Mock findOne to return null (no existing payroll)
      Payroll.findOne.mockResolvedValue(null);

      // Mock Payroll save
      const mockSave = jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      });

      Payroll.mockImplementation(data => ({
        ...data,
        toObject: () => data,
        save: mockSave,
      }));

      const result = await hrService.generatePayroll('10', 2025);

      expect(Employee.find).toHaveBeenCalledWith({ status: 'active' });
      expect(mockSave).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(2);

      // Check calculations
      // Emp1: 5000 + 0 - 0 = 5000
      expect(result[0].totalNet).toBe(5000);
      // Emp2: 6000 + 500 - 100 = 6400
      expect(result[1].totalNet).toBe(6400);
    });
  });
});
