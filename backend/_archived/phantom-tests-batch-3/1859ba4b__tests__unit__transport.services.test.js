/**
 * Unit tests for transport.services.js
 * Multi-class export with Mongoose models (Bus, Driver, Route, etc.)
 * All methods are async with try/catch wrapping errors as 'حدث خطأ داخلي'
 */

/* ── Mongoose is globally mocked by jest.setup.js ── */

jest.mock('../../models/transport.models', () => {
  function mkModel(name) {
    const Constructor = jest.fn().mockImplementation(function (data) {
      Object.assign(this, data);
      this.save = jest.fn().mockResolvedValue(this);
    });
    Constructor.modelName = name;
    Constructor.find = jest.fn().mockReturnThis();
    Constructor.findById = jest.fn().mockReturnThis();
    Constructor.findByIdAndUpdate = jest.fn().mockReturnThis();
    Constructor.findByIdAndDelete = jest.fn().mockResolvedValue({ _id: 'del' });
    Constructor.countDocuments = jest.fn().mockResolvedValue(0);
    Constructor.aggregate = jest.fn().mockResolvedValue([]);
    Constructor.populate = jest.fn().mockReturnThis();
    Constructor.sort = jest.fn().mockReturnThis();
    Constructor.then = undefined; // prevent promise-like behavior in chains
    return Constructor;
  }

  const Bus = mkModel('Bus');
  const Driver = mkModel('Driver');
  const BusAssistant = mkModel('BusAssistant');
  const Route = mkModel('Route');
  const StudentTransport = mkModel('StudentTransport');
  const TransportAttendance = mkModel('TransportAttendance');
  const TransportPayment = mkModel('TransportPayment');
  const TransportComplaint = mkModel('TransportComplaint');
  const TripReport = mkModel('TripReport');
  const TransportNotification = mkModel('TransportNotification');

  return {
    Bus,
    Driver,
    BusAssistant,
    Route,
    StudentTransport,
    TransportAttendance,
    TransportPayment,
    TransportComplaint,
    TripReport,
    TransportNotification,
  };
});

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

const {
  Bus,
  Driver,
  Route,
  StudentTransport,
  TransportAttendance,
  TransportPayment,
  TransportComplaint,
  TransportNotification,
} = require('../../models/transport.models');

const {
  BusService,
  DriverService,
  RouteService,
  StudentTransportService,
  AttendanceService,
  PaymentService,
  ComplaintService,
  NotificationService,
} = require('../../services/transport.services');

/* ── Make chainable populate/sort resolve properly ── */
function chainResolves(model, value) {
  model.populate.mockReturnThis();
  model.sort.mockReturnThis();
  // Make the chain thenable (promise-like)
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    then: resolve => resolve(value),
  };
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Transport Services', () => {
  /* ═══════════════════════════════════════════════════
   * BusService
   * ═══════════════════════════════════════════════════ */
  describe('BusService', () => {
    it('createBus — saves new bus', async () => {
      const result = await BusService.createBus({ name: 'Bus A' });
      expect(Bus).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('getAllBuses — calls find with populate chain', async () => {
      const busData = [{ _id: 'b1', busNumber: 'BUS-1' }];
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r(busData) };
      Bus.find.mockReturnValue(chain);
      const result = await BusService.getAllBuses({ status: 'active' });
      expect(Bus.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
      expect(result).toEqual(busData);
    });

    it('getBusById — calls findById with populate', async () => {
      const bus = { _id: 'b1' };
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r(bus) };
      Bus.findById.mockReturnValue(chain);
      const result = await BusService.getBusById('b1');
      expect(result).toEqual(bus);
    });

    it('updateBus — calls findByIdAndUpdate', async () => {
      Bus.findByIdAndUpdate.mockResolvedValue({ _id: 'b1', name: 'Updated' });
      const result = await BusService.updateBus('b1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('deleteBus — calls findByIdAndDelete', async () => {
      Bus.findByIdAndDelete.mockResolvedValue({ _id: 'b1' });
      const result = await BusService.deleteBus('b1');
      expect(result._id).toBe('b1');
    });

    it('updateBusLocation — updates GPS', async () => {
      Bus.findByIdAndUpdate.mockResolvedValue({ _id: 'b1' });
      const result = await BusService.updateBusLocation('b1', 24.7, 46.7);
      expect(Bus.findByIdAndUpdate).toHaveBeenCalledWith(
        'b1',
        expect.objectContaining({ 'gpsTracker.lastLocation': expect.any(Object) }),
        { new: true }
      );
    });

    it('addMaintenanceSchedule — pushes maintenance', async () => {
      Bus.findByIdAndUpdate.mockResolvedValue({ _id: 'b1' });
      await BusService.addMaintenanceSchedule('b1', { type: 'oil' });
      expect(Bus.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('createBus — throws on error', async () => {
      Bus.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      await expect(BusService.createBus({})).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  /* ═══════════════════════════════════════════════════
   * DriverService
   * ═══════════════════════════════════════════════════ */
  describe('DriverService', () => {
    it('createDriver — saves new driver', async () => {
      const result = await DriverService.createDriver({ firstName: 'Test' });
      expect(Driver).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('getAllDrivers — calls find with populate', async () => {
      const data = [{ _id: 'd1' }];
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r(data) };
      Driver.find.mockReturnValue(chain);
      const result = await DriverService.getAllDrivers();
      expect(result).toEqual(data);
    });

    it('getDriverById — calls findById', async () => {
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r({ _id: 'd1' }) };
      Driver.findById.mockReturnValue(chain);
      const result = await DriverService.getDriverById('d1');
      expect(result._id).toBe('d1');
    });

    it('updateDriver — calls findByIdAndUpdate', async () => {
      Driver.findByIdAndUpdate.mockResolvedValue({ _id: 'd1' });
      const result = await DriverService.updateDriver('d1', { name: 'X' });
      expect(result).toBeDefined();
    });

    it('deleteDriver — calls findByIdAndDelete', async () => {
      Driver.findByIdAndDelete.mockResolvedValue({ _id: 'd1' });
      const result = await DriverService.deleteDriver('d1');
      expect(result._id).toBe('d1');
    });

    it('recordAttendance — pushes attendance', async () => {
      Driver.findByIdAndUpdate.mockResolvedValue({ _id: 'd1' });
      await DriverService.recordAttendance('d1', { date: '2024-01-01' });
      expect(Driver.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('recordViolation — pushes violation', async () => {
      Driver.findByIdAndUpdate.mockResolvedValue({ _id: 'd1' });
      await DriverService.recordViolation('d1', { type: 'speeding' });
      expect(Driver.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('verifyLicenseValidity — returns validity info', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30);
      Driver.findById.mockResolvedValue({ licenseExpiry: futureDate });
      const result = await DriverService.verifyLicenseValidity('d1');
      expect(result.isValid).toBe(true);
      expect(result.daysRemaining).toBeGreaterThan(0);
    });

    it('verifyLicenseValidity — throws for missing driver', async () => {
      Driver.findById.mockResolvedValue(null);
      await expect(DriverService.verifyLicenseValidity('d1')).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  /* ═══════════════════════════════════════════════════
   * RouteService
   * ═══════════════════════════════════════════════════ */
  describe('RouteService', () => {
    it('createRoute — saves route', async () => {
      const result = await RouteService.createRoute({ routeName: 'Route A' });
      expect(Route).toHaveBeenCalled();
    });

    it('getAllRoutes — returns routes with populate', async () => {
      const data = [{ _id: 'r1' }];
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r(data) };
      Route.find.mockReturnValue(chain);
      const result = await RouteService.getAllRoutes();
      expect(result).toEqual(data);
    });

    it('getRouteById — returns route', async () => {
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r({ _id: 'r1' }) };
      Route.findById.mockReturnValue(chain);
      const result = await RouteService.getRouteById('r1');
      expect(result._id).toBe('r1');
    });

    it('updateRoute — calls findByIdAndUpdate', async () => {
      Route.findByIdAndUpdate.mockResolvedValue({ _id: 'r1' });
      const result = await RouteService.updateRoute('r1', { name: 'X' });
      expect(result).toBeDefined();
    });

    it('calculateRouteFee — calculates correctly', async () => {
      const fee = await RouteService.calculateRouteFee(10);
      expect(fee).toBe(50 + 10 * 10); // base 50 + 10km * 10
    });

    it('getActiveStops — returns stops', async () => {
      Route.findById.mockResolvedValue({ stops: [{ name: 'Stop A' }] });
      const result = await RouteService.getActiveStops('r1');
      expect(result).toHaveLength(1);
    });

    it('getActiveStops — returns empty if no route', async () => {
      Route.findById.mockResolvedValue(null);
      const result = await RouteService.getActiveStops('r1');
      expect(result).toEqual([]);
    });
  });

  /* ═══════════════════════════════════════════════════
   * StudentTransportService
   * ═══════════════════════════════════════════════════ */
  describe('StudentTransportService', () => {
    it('registerStudent — creates registration', async () => {
      const result = await StudentTransportService.registerStudent({ studentId: 's1' });
      expect(StudentTransport).toHaveBeenCalled();
    });

    it('getStudentRegistrations — returns with populate/sort', async () => {
      const data = [{ _id: 'st1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        then: r => r(data),
      };
      StudentTransport.find.mockReturnValue(chain);
      const result = await StudentTransportService.getStudentRegistrations();
      expect(result).toEqual(data);
    });

    it('approveRegistration — updates status to active', async () => {
      StudentTransport.findByIdAndUpdate.mockResolvedValue({ status: 'active' });
      const result = await StudentTransportService.approveRegistration('r1', 'admin1');
      expect(result.status).toBe('active');
    });

    it('cancelRegistration — updates status to inactive', async () => {
      StudentTransport.findByIdAndUpdate.mockResolvedValue({ status: 'inactive' });
      const result = await StudentTransportService.cancelRegistration('r1', 'reason');
      expect(result.status).toBe('inactive');
    });

    it('updateStudentFee — updates fee', async () => {
      StudentTransport.findByIdAndUpdate.mockResolvedValue({ monthlyFee: 500 });
      const result = await StudentTransportService.updateStudentFee('r1', 500);
      expect(result.monthlyFee).toBe(500);
    });

    it('getStudentsInRoute — returns active students in route', async () => {
      const data = [{ _id: 'st1' }];
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r(data) };
      StudentTransport.find.mockReturnValue(chain);
      const result = await StudentTransportService.getStudentsInRoute('route1');
      expect(result).toEqual(data);
    });
  });

  /* ═══════════════════════════════════════════════════
   * AttendanceService
   * ═══════════════════════════════════════════════════ */
  describe('AttendanceService', () => {
    it('recordAttendance — saves and updates student', async () => {
      StudentTransport.findByIdAndUpdate.mockResolvedValue({});
      const result = await AttendanceService.recordAttendance({
        studentTransportId: 'st1',
        date: '2024-01-01',
        status: 'present',
      });
      expect(TransportAttendance).toHaveBeenCalled();
      expect(StudentTransport.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('getAttendanceRecords — queries by date range', async () => {
      TransportAttendance.find.mockResolvedValue([{ status: 'present' }]);
      const result = await AttendanceService.getAttendanceRecords('st1', 1, 2024);
      expect(TransportAttendance.find).toHaveBeenCalledWith(
        expect.objectContaining({
          studentTransportId: 'st1',
        })
      );
    });

    it('calculateAttendanceRate — returns rate', async () => {
      TransportAttendance.find.mockResolvedValue([
        { status: 'present' },
        { status: 'present' },
        { status: 'absent' },
      ]);
      const result = await AttendanceService.calculateAttendanceRate('st1', 1, 2024);
      expect(result.total).toBe(3);
      expect(result.present).toBe(2);
      expect(result.absent).toBe(1);
      expect(result.attendanceRate).toBe('66.67%');
    });

    it('calculateAttendanceRate — returns 0 when no records', async () => {
      TransportAttendance.find.mockResolvedValue([]);
      const result = await AttendanceService.calculateAttendanceRate('st1', 1, 2024);
      expect(result.attendanceRate).toBe(0 + '%');
    });
  });

  /* ═══════════════════════════════════════════════════
   * PaymentService
   * ═══════════════════════════════════════════════════ */
  describe('PaymentService', () => {
    it('recordPayment — saves payment and updates student balance', async () => {
      StudentTransport.findById.mockResolvedValue({ monthlyFee: 1000, paidAmount: 0 });
      StudentTransport.findByIdAndUpdate.mockResolvedValue({});
      const result = await PaymentService.recordPayment({
        studentTransportId: 'st1',
        amount: 500,
      });
      expect(TransportPayment).toHaveBeenCalled();
      expect(StudentTransport.findByIdAndUpdate).toHaveBeenCalledWith(
        'st1',
        expect.objectContaining({
          paymentStatus: 'partial',
        })
      );
    });

    it('recordPayment — sets status to paid when fully paid', async () => {
      StudentTransport.findById.mockResolvedValue({ monthlyFee: 1000, paidAmount: 0 });
      StudentTransport.findByIdAndUpdate.mockResolvedValue({});
      await PaymentService.recordPayment({ studentTransportId: 'st1', amount: 1000 });
      expect(StudentTransport.findByIdAndUpdate).toHaveBeenCalledWith(
        'st1',
        expect.objectContaining({
          paymentStatus: 'paid',
          balanceDue: 0,
        })
      );
    });

    it('getPaymentRecords — returns sorted payments', async () => {
      const data = [{ amount: 500 }];
      const chain = { sort: jest.fn().mockReturnThis(), then: r => r(data) };
      TransportPayment.find.mockReturnValue(chain);
      const result = await PaymentService.getPaymentRecords('st1');
      expect(result).toEqual(data);
    });

    it('getOverdueAccounts — returns overdue students', async () => {
      const data = [{ _id: 'st1' }];
      const chain = { populate: jest.fn().mockReturnThis(), then: r => r(data) };
      StudentTransport.find.mockReturnValue(chain);
      const result = await PaymentService.getOverdueAccounts();
      expect(result).toEqual(data);
    });

    it('getRevenueReport — calculates revenue', async () => {
      TransportPayment.find.mockResolvedValue([
        { amount: 500, status: 'completed' },
        { amount: 300, status: 'completed' },
      ]);
      const result = await PaymentService.getRevenueReport(1, 2024);
      expect(result.totalRevenue).toBe(800);
      expect(result.paymentCount).toBe(2);
    });
  });

  /* ═══════════════════════════════════════════════════
   * ComplaintService
   * ═══════════════════════════════════════════════════ */
  describe('ComplaintService', () => {
    it('createComplaint — saves complaint', async () => {
      const result = await ComplaintService.createComplaint({ type: 'delay' });
      expect(TransportComplaint).toHaveBeenCalled();
    });

    it('getComplaints — returns with populate/sort', async () => {
      const data = [{ _id: 'c1' }];
      const chain = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        then: r => r(data),
      };
      TransportComplaint.find.mockReturnValue(chain);
      const result = await ComplaintService.getComplaints();
      expect(result).toEqual(data);
    });

    it('updateComplaintStatus — updates status', async () => {
      TransportComplaint.findByIdAndUpdate.mockResolvedValue({ status: 'resolved' });
      const result = await ComplaintService.updateComplaintStatus('c1', 'resolved', 'fixed');
      expect(result.status).toBe('resolved');
    });

    it('getComplaintStatistics — returns stats', async () => {
      TransportComplaint.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);
      TransportComplaint.aggregate.mockResolvedValue([{ _id: 'delay', count: 4 }]);
      const result = await ComplaintService.getComplaintStatistics();
      expect(result.total).toBe(10);
      expect(result.open).toBe(5);
      expect(result.investigating).toBe(2);
      expect(result.resolved).toBe(3);
    });
  });

  /* ═══════════════════════════════════════════════════
   * NotificationService
   * ═══════════════════════════════════════════════════ */
  describe('NotificationService', () => {
    it('sendNotification — saves notification', async () => {
      const result = await NotificationService.sendNotification({ title: 'Test' });
      expect(TransportNotification).toHaveBeenCalled();
    });

    it('getNotifications — returns sorted notifications', async () => {
      const data = [{ _id: 'n1' }];
      const chain = { sort: jest.fn().mockReturnThis(), then: r => r(data) };
      TransportNotification.find.mockReturnValue(chain);
      const result = await NotificationService.getNotifications('user1');
      expect(result).toEqual(data);
    });

    it('markAsRead — updates read status', async () => {
      TransportNotification.findByIdAndUpdate.mockResolvedValue({ isRead: true });
      const result = await NotificationService.markAsRead('n1');
      expect(result.isRead).toBe(true);
    });

    it('sendBusDelayNotification — sends to all students on route', async () => {
      Route.findById.mockResolvedValue({ routeName: 'Route A' });
      StudentTransport.find.mockReturnValue({
        then: r => r([{ parentContact: 'p1' }, { parentContact: 'p2' }]),
      });
      const result = await NotificationService.sendBusDelayNotification('b1', 20, 'r1');
      expect(result).toBe(true);
      // Two students -> two notification saves
      expect(TransportNotification).toHaveBeenCalledTimes(2);
    });
  });
});
