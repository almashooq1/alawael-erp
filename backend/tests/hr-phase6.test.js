const HRServiceClass = require('../services/hrPhase6Service');
const hrService = new HRServiceClass();
const Employee = require('../models/employee.model');
const Payroll = require('../models/payroll.model');
const Attendance = require('../models/attendance.model');
const Leave = require('../models/leave.model');

jest.mock('../models/employee.model');
jest.mock('../models/payroll.model');
jest.mock('../models/attendance.model');
jest.mock('../models/leave.model');
jest.mock('../models/performance.model');

describe('HRPhase6Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generatePayroll', () => {
    it('should generate payroll for active employees', async () => {
      const mockEmployees = [{ _id: 'emp1', salary: { base: 1000, allowances: [], deductions: [] }, toObject: () => ({}) }];

      Employee.find.mockResolvedValue(mockEmployees);
      Payroll.findOne.mockResolvedValue(null); // No existing draft

      const saveMock = jest.fn().mockResolvedValue({ _id: 'pay1', totalNet: 1000 });
      Payroll.mockImplementation(() => ({
        save: saveMock,
        toObject: () => ({}),
      }));

      const result = await hrService.generatePayroll(1, 2026);

      expect(Employee.find).toHaveBeenCalledWith({ status: 'active' });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('checkIn', () => {
    it('should create new attendance record if none exists', async () => {
      Attendance.findOne.mockResolvedValue(null);

      const saveMock = jest.fn().mockResolvedValue({ _id: 'att1', status: 'present' });
      Attendance.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await hrService.checkIn('emp1', { lat: 0, lng: 0 });

      expect(Attendance.findOne).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(result.status).toBe('present'); // Default status in model is 'present' but mocked return matters
    });
  });

  describe('requestLeave', () => {
    it('should save a new leave request', async () => {
      const leaveData = { employeeId: 'emp1', type: 'annual' };
      const saveMock = jest.fn().mockResolvedValue({ ...leaveData, status: 'pending' });

      Leave.mockImplementation(() => ({
        save: saveMock,
      }));

      const result = await hrService.requestLeave(leaveData);
      expect(saveMock).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });
});
