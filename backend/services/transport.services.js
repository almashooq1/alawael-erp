/**
 * خدمات نظام النقل والمواصلات
 * Transport Services
 */

const {
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
} = require('../models/transport.models');
const { v4: uuidv4 } = require('uuid');

// ==================== خدمات إدارة الحافلات ====================
class BusService {
  // إضافة حافلة جديدة
  async createBus(busData) {
    try {
      const bus = new Bus({
        ...busData,
        busNumber: `BUS-${Date.now()}`,
      });
      return await bus.save();
    } catch (error) {
      throw new Error(`خطأ في إضافة الحافلة: ${error.message}`);
    }
  }

  // الحصول على جميع الحافلات
  async getAllBuses(filters = {}) {
    try {
      const query = { ...filters };
      return await Bus.find(query)
        .populate('driver', 'firstName lastName phone')
        .populate('assistant', 'firstName lastName phone')
        .populate('currentRoute', 'routeName routeCode');
    } catch (error) {
      throw new Error(`خطأ في جلب الحافلات: ${error.message}`);
    }
  }

  // الحصول على حافلة واحدة
  async getBusById(busId) {
    try {
      return await Bus.findById(busId).populate('driver').populate('assistant').populate('currentRoute');
    } catch (error) {
      throw new Error(`خطأ في جلب الحافلة: ${error.message}`);
    }
  }

  // تحديث بيانات الحافلة
  async updateBus(busId, updateData) {
    try {
      return await Bus.findByIdAndUpdate(busId, updateData, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`خطأ في تحديث الحافلة: ${error.message}`);
    }
  }

  // حذف حافلة
  async deleteBus(busId) {
    try {
      return await Bus.findByIdAndDelete(busId);
    } catch (error) {
      throw new Error(`خطأ في حذف الحافلة: ${error.message}`);
    }
  }

  // تحديث موقع الحافلة (GPS)
  async updateBusLocation(busId, latitude, longitude) {
    try {
      return await Bus.findByIdAndUpdate(
        busId,
        {
          'gpsTracker.lastLocation': {
            latitude,
            longitude,
            timestamp: new Date(),
          },
        },
        { new: true },
      );
    } catch (error) {
      throw new Error(`خطأ في تحديث الموقع: ${error.message}`);
    }
  }

  // إضافة جدول صيانة
  async addMaintenanceSchedule(busId, maintenanceData) {
    try {
      return await Bus.findByIdAndUpdate(busId, { $push: { maintenanceSchedule: maintenanceData } }, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`خطأ في إضافة جدول الصيانة: ${error.message}`);
    }
  }
}

// ==================== خدمات إدارة السائقين ====================
class DriverService {
  // إضافة سائق جديد
  async createDriver(driverData) {
    try {
      const driver = new Driver({
        ...driverData,
        employeeId: `DRV-${Date.now()}`,
      });
      return await driver.save();
    } catch (error) {
      throw new Error(`خطأ في إضافة السائق: ${error.message}`);
    }
  }

  // الحصول على جميع السائقين
  async getAllDrivers(filters = {}) {
    try {
      const query = { ...filters };
      return await Driver.find(query).populate('assignedBus', 'busNumber licensePlate').populate('routes', 'routeName routeCode');
    } catch (error) {
      throw new Error(`خطأ في جلب السائقين: ${error.message}`);
    }
  }

  // الحصول على سائق واحد
  async getDriverById(driverId) {
    try {
      return await Driver.findById(driverId).populate('assignedBus').populate('routes');
    } catch (error) {
      throw new Error(`خطأ في جلب السائق: ${error.message}`);
    }
  }

  // تحديث بيانات السائق
  async updateDriver(driverId, updateData) {
    try {
      return await Driver.findByIdAndUpdate(driverId, updateData, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`خطأ في تحديث السائق: ${error.message}`);
    }
  }

  // حذف سائق
  async deleteDriver(driverId) {
    try {
      return await Driver.findByIdAndDelete(driverId);
    } catch (error) {
      throw new Error(`خطأ في حذف السائق: ${error.message}`);
    }
  }

  // تسجيل الحضور والغياب
  async recordAttendance(driverId, attendanceData) {
    try {
      return await Driver.findByIdAndUpdate(driverId, { $push: { attendance: attendanceData } }, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`خطأ في تسجيل الحضور: ${error.message}`);
    }
  }

  // تسجيل الانتهاكات
  async recordViolation(driverId, violationData) {
    try {
      return await Driver.findByIdAndUpdate(driverId, { $push: { violations: violationData } }, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`خطأ في تسجيل الانتهاك: ${error.message}`);
    }
  }

  // التحقق من صلاحية الرخصة
  async verifyLicenseValidity(driverId) {
    try {
      const driver = await Driver.findById(driverId);
      if (!driver) throw new Error('السائق غير موجود');

      const isValid = new Date(driver.licenseExpiry) > new Date();
      return {
        isValid,
        expiryDate: driver.licenseExpiry,
        daysRemaining: Math.floor((new Date(driver.licenseExpiry) - new Date()) / (1000 * 60 * 60 * 24)),
      };
    } catch (error) {
      throw new Error(`خطأ في التحقق من الرخصة: ${error.message}`);
    }
  }
}

// ==================== خدمات إدارة المسارات ====================
class RouteService {
  // إضافة مسار جديد
  async createRoute(routeData) {
    try {
      const route = new Route({
        ...routeData,
        routeCode: `ROUTE-${Date.now()}`,
      });
      return await route.save();
    } catch (error) {
      throw new Error(`خطأ في إضافة المسار: ${error.message}`);
    }
  }

  // الحصول على جميع المسارات
  async getAllRoutes(filters = {}) {
    try {
      return await Route.find(filters)
        .populate('morningShift.assignedBus', 'busNumber')
        .populate('morningShift.assignedDriver', 'firstName lastName')
        .populate('eveningShift.assignedBus', 'busNumber')
        .populate('eveningShift.assignedDriver', 'firstName lastName');
    } catch (error) {
      throw new Error(`خطأ في جلب المسارات: ${error.message}`);
    }
  }

  // الحصول على مسار واحد
  async getRouteById(routeId) {
    try {
      return await Route.findById(routeId)
        .populate('morningShift.assignedBus')
        .populate('morningShift.assignedDriver')
        .populate('eveningShift.assignedBus')
        .populate('eveningShift.assignedDriver')
        .populate('stops.pickupStudents', 'firstName lastName')
        .populate('stops.dropoffStudents', 'firstName lastName');
    } catch (error) {
      throw new Error(`خطأ في جلب المسار: ${error.message}`);
    }
  }

  // تحديث مسار
  async updateRoute(routeId, updateData) {
    try {
      return await Route.findByIdAndUpdate(routeId, updateData, { new: true, runValidators: true });
    } catch (error) {
      throw new Error(`خطأ في تحديث المسار: ${error.message}`);
    }
  }

  // حساب الرسوم بناءً على المسافة
  async calculateRouteFee(routeDistance) {
    try {
      const baseRate = 50; // رسم أساسي
      const perKmRate = 10; // رسم لكل كيلومتر
      return baseRate + routeDistance * perKmRate;
    } catch (error) {
      throw new Error(`خطأ في حساب الرسوم: ${error.message}`);
    }
  }

  // الحصول على المحطات النشطة
  async getActiveStops(routeId) {
    try {
      const route = await Route.findById(routeId);
      return route?.stops || [];
    } catch (error) {
      throw new Error(`خطأ في جلب المحطات: ${error.message}`);
    }
  }
}

// ==================== خدمات تسجيل الطالب في النقل ====================
class StudentTransportService {
  // تسجيل طالب في النقل
  async registerStudent(studentData) {
    try {
      const registration = new StudentTransport({
        ...studentData,
        registrationNumber: `STR-${Date.now()}`,
        status: 'waiting_approval',
      });
      return await registration.save();
    } catch (error) {
      throw new Error(`خطأ في تسجيل الطالب: ${error.message}`);
    }
  }

  // الحصول على تسجيلات الطلاب
  async getStudentRegistrations(filters = {}) {
    try {
      return await StudentTransport.find(filters)
        .populate('studentId', 'firstName lastName studentId')
        .populate('currentRoute', 'routeName routeCode')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`خطأ في جلب التسجيلات: ${error.message}`);
    }
  }

  // الموافقة على التسجيل
  async approveRegistration(registrationId, adminId) {
    try {
      return await StudentTransport.findByIdAndUpdate(
        registrationId,
        {
          status: 'active',
          approalDate: new Date(),
          approvedBy: adminId,
        },
        { new: true },
      );
    } catch (error) {
      throw new Error(`خطأ في الموافقة: ${error.message}`);
    }
  }

  // إلغاء التسجيل
  async cancelRegistration(registrationId, reason) {
    try {
      return await StudentTransport.findByIdAndUpdate(
        registrationId,
        {
          status: 'inactive',
          notes: reason,
        },
        { new: true },
      );
    } catch (error) {
      throw new Error(`خطأ في إلغاء التسجيل: ${error.message}`);
    }
  }

  // تحديث رسوم الطالب
  async updateStudentFee(registrationId, monthlyFee) {
    try {
      return await StudentTransport.findByIdAndUpdate(registrationId, { monthlyFee }, { new: true });
    } catch (error) {
      throw new Error(`خطأ في تحديث الرسوم: ${error.message}`);
    }
  }

  // الحصول على الطلاب في مسار معين
  async getStudentsInRoute(routeId) {
    try {
      return await StudentTransport.find({
        currentRoute: routeId,
        status: 'active',
      }).populate('studentId');
    } catch (error) {
      throw new Error(`خطأ في جلب الطلاب: ${error.message}`);
    }
  }
}

// ==================== خدمات الحضور والغياب ====================
class AttendanceService {
  // تسجيل حضور الطالب
  async recordAttendance(attendanceData) {
    try {
      const attendance = new TransportAttendance({
        ...attendanceData,
      });
      await attendance.save();

      // تحديث سجل الطالب
      await StudentTransport.findByIdAndUpdate(
        attendanceData.studentTransportId,
        { $push: { attendanceRecords: attendanceData } },
        { new: true },
      );

      return attendance;
    } catch (error) {
      throw new Error(`خطأ في تسجيل الحضور: ${error.message}`);
    }
  }

  // الحصول على سجل الحضور
  async getAttendanceRecords(studentTransportId, month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      return await TransportAttendance.find({
        studentTransportId,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    } catch (error) {
      throw new Error(`خطأ في جلب السجل: ${error.message}`);
    }
  }

  // حساب معدل الحضور
  async calculateAttendanceRate(studentTransportId, month, year) {
    try {
      const records = await this.getAttendanceRecords(studentTransportId, month, year);
      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const rate = total > 0 ? ((present / total) * 100).toFixed(2) : 0;

      return {
        total,
        present,
        absent: total - present,
        attendanceRate: rate + '%',
      };
    } catch (error) {
      throw new Error(`خطأ في حساب معدل الحضور: ${error.message}`);
    }
  }
}

// ==================== خدمات الدفعات ====================
class PaymentService {
  // تسجيل دفعة
  async recordPayment(paymentData) {
    try {
      const payment = new TransportPayment({
        ...paymentData,
        paymentId: `PAY-${Date.now()}`,
      });
      await payment.save();

      // تحديث رصيد الطالب
      const registration = await StudentTransport.findById(paymentData.studentTransportId);
      const newBalance = registration.monthlyFee - paymentData.amount;

      await StudentTransport.findByIdAndUpdate(paymentData.studentTransportId, {
        paidAmount: (registration.paidAmount || 0) + paymentData.amount,
        balanceDue: newBalance > 0 ? newBalance : 0,
        paymentStatus: newBalance > 0 ? 'partial' : 'paid',
      });

      return payment;
    } catch (error) {
      throw new Error(`خطأ في تسجيل الدفعة: ${error.message}`);
    }
  }

  // الحصول على سجل الدفعات
  async getPaymentRecords(studentTransportId) {
    try {
      return await TransportPayment.find({ studentTransportId }).sort({ paymentDate: -1 });
    } catch (error) {
      throw new Error(`خطأ في جلب سجل الدفعات: ${error.message}`);
    }
  }

  // الحصول على الحسابات المتأخرة
  async getOverdueAccounts() {
    try {
      return await StudentTransport.find({
        status: 'active',
        paymentStatus: { $in: ['partial', 'unpaid', 'overdue'] },
      }).populate('studentId');
    } catch (error) {
      throw new Error(`خطأ في جلب الحسابات المتأخرة: ${error.message}`);
    }
  }

  // تقرير الإيرادات
  async getRevenueReport(month, year) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const payments = await TransportPayment.find({
        paymentDate: {
          $gte: startDate,
          $lte: endDate,
        },
        status: 'completed',
      });

      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const paymentCount = payments.length;

      return {
        month,
        year,
        totalRevenue,
        paymentCount,
        averagePayment: paymentCount > 0 ? (totalRevenue / paymentCount).toFixed(2) : 0,
        payments,
      };
    } catch (error) {
      throw new Error(`خطأ في تقرير الإيرادات: ${error.message}`);
    }
  }
}

// ==================== خدمات الشكاوى ====================
class ComplaintService {
  // إضافة شكوى
  async createComplaint(complaintData) {
    try {
      const complaint = new TransportComplaint({
        ...complaintData,
        complaintId: `COMP-${Date.now()}`,
        status: 'open',
      });
      return await complaint.save();
    } catch (error) {
      throw new Error(`خطأ في إضافة الشكوى: ${error.message}`);
    }
  }

  // الحصول على الشكاوى
  async getComplaints(filters = {}) {
    try {
      return await TransportComplaint.find(filters)
        .populate('complainant')
        .populate('studentTransport')
        .populate('route')
        .populate('bus')
        .populate('assignedTo')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`خطأ في جلب الشكاوى: ${error.message}`);
    }
  }

  // تحديث حالة الشكوى
  async updateComplaintStatus(complaintId, status, resolution = null) {
    try {
      return await TransportComplaint.findByIdAndUpdate(
        complaintId,
        {
          status,
          resolution,
          resolutionDate: status === 'resolved' ? new Date() : null,
        },
        { new: true },
      );
    } catch (error) {
      throw new Error(`خطأ في تحديث الشكوى: ${error.message}`);
    }
  }

  // إحصائيات الشكاوى
  async getComplaintStatistics() {
    try {
      const total = await TransportComplaint.countDocuments();
      const open = await TransportComplaint.countDocuments({ status: 'open' });
      const investigating = await TransportComplaint.countDocuments({ status: 'investigating' });
      const resolved = await TransportComplaint.countDocuments({ status: 'resolved' });

      const byType = await TransportComplaint.aggregate([
        {
          $group: {
            _id: '$complaintType',
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        total,
        open,
        investigating,
        resolved,
        byType,
      };
    } catch (error) {
      throw new Error(`خطأ في إحصائيات الشكاوى: ${error.message}`);
    }
  }
}

// ==================== خدمات التنبيهات ====================
class NotificationService {
  // إرسال تنبيه
  async sendNotification(notificationData) {
    try {
      const notification = new TransportNotification({
        ...notificationData,
        notificationId: `NOTIF-${Date.now()}`,
        sendDate: new Date(),
      });
      return await notification.save();
    } catch (error) {
      throw new Error(`خطأ في إرسال التنبيه: ${error.message}`);
    }
  }

  // الحصول على التنبيهات
  async getNotifications(recipientId) {
    try {
      return await TransportNotification.find({
        $or: [{ recipient: recipientId }, { recipientType: 'all' }],
      }).sort({ sendDate: -1 });
    } catch (error) {
      throw new Error(`خطأ في جلب التنبيهات: ${error.message}`);
    }
  }

  // تحديد التنبيه كمقروء
  async markAsRead(notificationId) {
    try {
      return await TransportNotification.findByIdAndUpdate(
        notificationId,
        {
          isRead: true,
          readDate: new Date(),
        },
        { new: true },
      );
    } catch (error) {
      throw new Error(`خطأ في تحديث التنبيه: ${error.message}`);
    }
  }

  // إرسال تنبيه تأخير الحافلة
  async sendBusDelayNotification(busId, delayMinutes, routeId) {
    try {
      const route = await Route.findById(routeId);
      const students = await StudentTransport.find({
        currentRoute: routeId,
        status: 'active',
      });

      for (const student of students) {
        await this.sendNotification({
          recipientType: 'parent',
          recipient: student.parentContact,
          title: 'تأخر الحافلة',
          message: `حافلة المسار ${route.routeName} تأخرت ${delayMinutes} دقائق`,
          notificationType: 'bus_delay',
          relatedRoute: routeId,
          relatedBus: busId,
          priority: delayMinutes > 15 ? 'high' : 'medium',
        });
      }

      return true;
    } catch (error) {
      throw new Error(`خطأ في إرسال تنبيه التأخير: ${error.message}`);
    }
  }
}

module.exports = {
  BusService: new BusService(),
  DriverService: new DriverService(),
  RouteService: new RouteService(),
  StudentTransportService: new StudentTransportService(),
  AttendanceService: new AttendanceService(),
  PaymentService: new PaymentService(),
  ComplaintService: new ComplaintService(),
  NotificationService: new NotificationService(),
};
