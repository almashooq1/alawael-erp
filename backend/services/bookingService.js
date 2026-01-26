/**
 * 🚗 نظام الحجوزات والتجهيزات
 * Booking & Scheduling Service
 *
 * يوفر إدارة كاملة للحجوزات والجدولة والتجهيزات
 */

class BookingService {
  constructor() {
    this.bookings = [];
    this.bookingCounter = 1000;
    this.initializeMockData();
  }

  initializeMockData() {
    // بيانات تجريبية أولية
    this.bookings = [
      {
        id: 1000,
        vehicleId: 'VRN-TEST-001',
        driverId: 'DRV-001',
        bookingType: 'daily-rental',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        startTime: '08:00',
        endTime: '16:00',
        purpose: 'نقل بضائع',
        passengerCount: 2,
        expectedMileage: 150,
        specialRequirements: [],
        status: 'confirmed',
        price: 500,
        insuranceType: 'standard',
        fuelPolicy: 'full-to-full',
        depositAmount: 1000,
        depositPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  // إنشاء حجز جديد
  createBooking(bookingData) {
    const booking = {
      id: ++this.bookingCounter,
      ...bookingData,
      status: 'pending',
      depositPaid: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // حساب السعر التلقائي
    booking.price = this.calculateBookingPrice(booking);
    booking.depositAmount = booking.price * 0.2; // 20% of price

    this.bookings.push(booking);
    return booking;
  }

  // حساب سعر الحجز
  calculateBookingPrice(booking) {
    let basePrice = 0;
    const days = Math.ceil(
      (new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24)
    );

    // أسعار مختلفة حسب نوع الحجز
    const rates = {
      'daily-rental': 300,
      'hourly-rental': 50,
      trip: 200,
      event: 400,
      'monthly-rental': 5000,
    };

    basePrice = (rates[booking.bookingType] || 200) * days;

    // إضافة رسوم إضافية
    if (booking.specialRequirements && booking.specialRequirements.length > 0) {
      basePrice += booking.specialRequirements.length * 100;
    }

    // رسم التأمين
    if (booking.insuranceType === 'premium') {
      basePrice += basePrice * 0.15;
    }

    return Math.round(basePrice);
  }

  // جلب جميع الحجوزات مع التصفية
  getBookings(filters = {}) {
    let results = this.bookings;

    if (filters.vehicleId) {
      results = results.filter(b => b.vehicleId === filters.vehicleId);
    }
    if (filters.status) {
      results = results.filter(b => b.status === filters.status);
    }
    if (filters.driverId) {
      results = results.filter(b => b.driverId === filters.driverId);
    }
    if (filters.startDate && filters.endDate) {
      results = results.filter(b => {
        const bookStart = new Date(b.startDate);
        const bookEnd = new Date(b.endDate);
        const filterStart = new Date(filters.startDate);
        const filterEnd = new Date(filters.endDate);
        return bookStart >= filterStart && bookEnd <= filterEnd;
      });
    }

    return {
      count: results.length,
      bookings: results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    };
  }

  // جلب تفاصيل الحجز
  getBookingDetails(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return null;

    return {
      ...booking,
      timeline: this.getBookingTimeline(bookingId),
      documents: this.getBookingDocuments(bookingId),
    };
  }

  // تحديث حالة الحجز
  updateBookingStatus(bookingId, newStatus) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return null;

    booking.status = newStatus;
    booking.updatedAt = new Date();

    return booking;
  }

  // تأكيد الحجز
  confirmBooking(bookingId, paymentDetails) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return null;

    booking.status = 'confirmed';
    booking.depositPaid = true;
    booking.paymentDetails = paymentDetails;
    booking.confirmationNumber = `BK-${Date.now()}-${bookingId}`;
    booking.updatedAt = new Date();

    return booking;
  }

  // إلغاء الحجز
  cancelBooking(bookingId, reason) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return null;

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancellationDate = new Date();
    booking.refundAmount = this.calculateRefund(booking);
    booking.updatedAt = new Date();

    return booking;
  }

  // حساب المبلغ المسترد
  calculateRefund(booking) {
    const daysUntilBooking = Math.ceil(
      (new Date(booking.startDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilBooking > 7) {
      return booking.depositAmount * 0.9; // 90% إذا كان قبل أسبوع
    } else if (daysUntilBooking > 3) {
      return booking.depositAmount * 0.5; // 50% إذا كان قبل 3 أيام
    }
    return 0; // لا استرجاع إذا كان قريب جداً
  }

  // جدول الحجوزات (التقويم)
  getBookingCalendar(vehicleId, month) {
    const vehicleBookings = this.bookings.filter(
      b => b.vehicleId === vehicleId && b.status !== 'cancelled'
    );

    const calendar = {};
    vehicleBookings.forEach(booking => {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        if (!calendar[key]) {
          calendar[key] = [];
        }
        calendar[key].push({
          bookingId: booking.id,
          type: booking.bookingType,
          status: booking.status,
          driver: booking.driverId,
        });
      }
    });

    return calendar;
  }

  // التحقق من توفر المركبة
  checkVehicleAvailability(vehicleId, startDate, endDate) {
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    const conflicts = this.bookings.filter(booking => {
      if (booking.vehicleId !== vehicleId || booking.status === 'cancelled') return false;

      const bookStart = new Date(booking.startDate);
      const bookEnd = new Date(booking.endDate);

      return !(newEnd <= bookStart || newStart >= bookEnd);
    });

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map(b => ({
        bookingId: b.id,
        startDate: b.startDate,
        endDate: b.endDate,
        driver: b.driverId,
      })),
    };
  }

  // خدمات إضافية
  addAdditionalServices(bookingId, services) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return null;

    if (!booking.additionalServices) {
      booking.additionalServices = [];
    }

    const serviceRates = {
      wifi: 50,
      'phone-charger': 20,
      'gps-device': 100,
      'child-seat': 150,
      'wheelchair-ramp': 200,
      'roof-rack': 80,
      'winter-tires': 120,
      'premium-insurance': 300,
    };

    services.forEach(service => {
      if (serviceRates[service]) {
        booking.additionalServices.push({
          name: service,
          price: serviceRates[service],
          addedAt: new Date(),
        });
      }
    });

    // إعادة حساب السعر الإجمالي
    const servicesCost = booking.additionalServices.reduce((sum, s) => sum + s.price, 0);
    booking.totalPrice = booking.price + servicesCost;

    booking.updatedAt = new Date();
    return booking;
  }

  // سجل تعديلات الحجز
  getBookingTimeline(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return [];

    const timeline = [
      {
        event: 'booking-created',
        date: booking.createdAt,
        description: 'تم إنشاء الحجز',
      },
    ];

    if (booking.status === 'confirmed') {
      timeline.push({
        event: 'booking-confirmed',
        date: booking.updatedAt,
        description: 'تم تأكيد الحجز',
      });
    }

    if (booking.status === 'cancelled') {
      timeline.push({
        event: 'booking-cancelled',
        date: booking.cancellationDate,
        description: `تم إلغاء الحجز: ${booking.cancellationReason}`,
      });
    }

    return timeline;
  }

  // المستندات المطلوبة
  getBookingDocuments(bookingId) {
    return {
      required: ['رخصة القيادة', 'الهوية الوطنية', 'تأمين', 'عقد الإيجار'],
      optional: ['تصريح عمل', 'تصريح دخول'],
      uploaded: [],
    };
  }

  // إحصائيات الحجوزات
  getBookingStatistics() {
    return {
      total: this.bookings.length,
      byStatus: {
        pending: this.bookings.filter(b => b.status === 'pending').length,
        confirmed: this.bookings.filter(b => b.status === 'confirmed').length,
        completed: this.bookings.filter(b => b.status === 'completed').length,
        cancelled: this.bookings.filter(b => b.status === 'cancelled').length,
      },
      revenue: {
        total: this.bookings
          .filter(b => b.status === 'confirmed')
          .reduce((sum, b) => sum + b.price, 0),
        pending: this.bookings
          .filter(b => b.status === 'pending')
          .reduce((sum, b) => sum + b.price, 0),
      },
      averageBookingPrice:
        Math.round(this.bookings.reduce((sum, b) => sum + b.price, 0) / this.bookings.length) || 0,
    };
  }

  // تقرير الاستخدام
  getUtilizationReport(vehicleId, startDate, endDate) {
    const vehicleBookings = this.bookings.filter(
      b =>
        b.vehicleId === vehicleId &&
        b.status !== 'cancelled' &&
        new Date(b.startDate) >= new Date(startDate) &&
        new Date(b.endDate) <= new Date(endDate)
    );

    const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const bookedDays = vehicleBookings.reduce((sum, b) => {
      return sum + Math.ceil((new Date(b.endDate) - new Date(b.startDate)) / (1000 * 60 * 60 * 24));
    }, 0);

    return {
      vehicleId,
      period: { startDate, endDate },
      totalDays,
      bookedDays,
      availableDays: totalDays - bookedDays,
      utilizationRate: Math.round((bookedDays / totalDays) * 100),
      totalRevenue: vehicleBookings.reduce((sum, b) => sum + b.price, 0),
      bookingCount: vehicleBookings.length,
      averageBookingDuration: Math.round(bookedDays / vehicleBookings.length) || 0,
    };
  }
}

module.exports = new BookingService();
