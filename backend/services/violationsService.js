/**
 * =====================================================
 * VIOLATIONS SERVICE - خدمة المخالفات المرورية
 * =====================================================
 * إدارة المخالفات المرورية للمركبات والسائقين
 */

const mockDB = {
  violations: [],
  violationTypes: [
    { code: 'SPEED', name: 'تجاوز السرعة', points: 3, fine: 300 },
    { code: 'RED_LIGHT', name: 'تجاوز الإشارة الحمراء', points: 6, fine: 500 },
    { code: 'MOBILE', name: 'استخدام الجوال أثناء القيادة', points: 4, fine: 500 },
    { code: 'SEATBELT', name: 'عدم ربط حزام الأمان', points: 2, fine: 150 },
    { code: 'PARKING', name: 'مخالفة مواقف', points: 1, fine: 100 },
    { code: 'WRONG_LANE', name: 'القيادة في المسار الخاطئ', points: 3, fine: 300 },
    { code: 'RECKLESS', name: 'قيادة متهورة', points: 6, fine: 1000 },
    { code: 'LICENSE', name: 'قيادة بدون رخصة', points: 10, fine: 3000 },
    { code: 'INSURANCE', name: 'القيادة بدون تأمين', points: 6, fine: 1000 },
    { code: 'REGISTRATION', name: 'انتهاء الاستمارة', points: 3, fine: 500 },
  ],
};

class ViolationsService {
  /**
   * تسجيل مخالفة جديدة
   */
  async createViolation(data) {
    const violationType = mockDB.violationTypes.find(v => v.code === data.type);

    if (!violationType) {
      return {
        success: false,
        error: 'نوع المخالفة غير معروف',
      };
    }

    const violation = {
      id: `VIO-${Date.now()}`,
      vehicleId: data.vehicleId,
      driverId: data.driverId || null,
      type: data.type,
      typeName: violationType.name,
      violationNumber: data.violationNumber || `V-${Date.now()}`,
      date: data.date || new Date().toISOString(),
      location: data.location || 'غير محدد',
      speed: data.speed || null,
      speedLimit: data.speedLimit || null,
      points: data.points || violationType.points,
      fine: data.fine || violationType.fine,
      status: data.status || 'pending', // pending, paid, appealed, dismissed
      paidDate: null,
      paidAmount: null,
      appealStatus: null,
      appealDate: null,
      appealNotes: null,
      officer: data.officer || null,
      camera: data.camera || null,
      notes: data.notes || '',
      attachments: data.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDB.violations.push(violation);
    return { success: true, data: violation };
  }

  /**
   * الحصول على المخالفات
   */
  async getViolations(filters = {}) {
    let violations = [...mockDB.violations];

    // تطبيق الفلاتر
    if (filters.vehicleId) {
      violations = violations.filter(v => v.vehicleId === filters.vehicleId);
    }

    if (filters.driverId) {
      violations = violations.filter(v => v.driverId === filters.driverId);
    }

    if (filters.status) {
      violations = violations.filter(v => v.status === filters.status);
    }

    if (filters.type) {
      violations = violations.filter(v => v.type === filters.type);
    }

    if (filters.startDate) {
      violations = violations.filter(v => new Date(v.date) >= new Date(filters.startDate));
    }

    if (filters.endDate) {
      violations = violations.filter(v => new Date(v.date) <= new Date(filters.endDate));
    }

    // الترتيب
    violations.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedViolations = violations.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        violations: paginatedViolations,
        total: violations.length,
        page,
        totalPages: Math.ceil(violations.length / limit),
        summary: this.calculateViolationsSummary(violations),
      },
    };
  }

  /**
   * حساب ملخص المخالفات
   */
  calculateViolationsSummary(violations) {
    return {
      total: violations.length,
      pending: violations.filter(v => v.status === 'pending').length,
      paid: violations.filter(v => v.status === 'paid').length,
      appealed: violations.filter(v => v.status === 'appealed').length,
      totalFines: violations.reduce((sum, v) => sum + v.fine, 0),
      totalPoints: violations.reduce((sum, v) => sum + v.points, 0),
      unpaidFines: violations
        .filter(v => v.status === 'pending')
        .reduce((sum, v) => sum + v.fine, 0),
    };
  }

  /**
   * تحديث حالة مخالفة
   */
  async updateViolationStatus(violationId, status, data = {}) {
    const violation = mockDB.violations.find(v => v.id === violationId);

    if (!violation) {
      return {
        success: false,
        error: 'المخالفة غير موجودة',
      };
    }

    violation.status = status;
    violation.updatedAt = new Date().toISOString();

    if (status === 'paid') {
      violation.paidDate = data.paidDate || new Date().toISOString();
      violation.paidAmount = data.paidAmount || violation.fine;
    }

    if (status === 'appealed') {
      violation.appealStatus = 'under_review';
      violation.appealDate = new Date().toISOString();
      violation.appealNotes = data.appealNotes || '';
    }

    return { success: true, data: violation };
  }

  /**
   * الحصول على نقاط المخالفات للسائق
   */
  async getDriverViolationPoints(driverId) {
    const violations = mockDB.violations.filter(
      v => v.driverId === driverId && v.status !== 'dismissed'
    );

    // حساب النقاط الحالية (آخر 12 شهر)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const recentViolations = violations.filter(v => new Date(v.date) >= oneYearAgo);

    const currentPoints = recentViolations.reduce((sum, v) => sum + v.points, 0);

    // تصنيف الحالة
    let status = 'safe';
    if (currentPoints >= 24) status = 'suspended';
    else if (currentPoints >= 18) status = 'critical';
    else if (currentPoints >= 12) status = 'warning';

    return {
      success: true,
      data: {
        driverId,
        currentPoints,
        status,
        statusDescription: this.getPointsStatusDescription(status),
        recentViolations: recentViolations.length,
        totalViolations: violations.length,
        pointsHistory: this.getPointsHistory(violations),
      },
    };
  }

  /**
   * وصف حالة النقاط
   */
  getPointsStatusDescription(status) {
    const descriptions = {
      safe: 'آمن - أقل من 12 نقطة',
      warning: 'تحذير - من 12 إلى 17 نقطة',
      critical: 'خطر - من 18 إلى 23 نقطة',
      suspended: 'موقوف - 24 نقطة أو أكثر',
    };
    return descriptions[status];
  }

  /**
   * تاريخ النقاط
   */
  getPointsHistory(violations) {
    const history = {};

    violations.forEach(v => {
      const month = new Date(v.date).toISOString().slice(0, 7);
      if (!history[month]) {
        history[month] = { violations: 0, points: 0 };
      }
      history[month].violations++;
      history[month].points += v.points;
    });

    return history;
  }

  /**
   * الحصول على إحصائيات المخالفات
   */
  async getViolationStatistics(filters = {}) {
    const result = await this.getViolations(filters);
    const violations = mockDB.violations;

    const stats = {
      ...result.data.summary,
      byType: {},
      byMonth: {},
      byLocation: {},
      topVehicles: this.getTopViolatingVehicles(),
      topDrivers: this.getTopViolatingDrivers(),
      averageFine:
        violations.length > 0
          ? violations.reduce((sum, v) => sum + v.fine, 0) / violations.length
          : 0,
    };

    // تجميع حسب النوع
    violations.forEach(v => {
      if (!stats.byType[v.type]) {
        stats.byType[v.type] = { count: 0, totalFine: 0, totalPoints: 0 };
      }
      stats.byType[v.type].count++;
      stats.byType[v.type].totalFine += v.fine;
      stats.byType[v.type].totalPoints += v.points;
    });

    // تجميع حسب الشهر
    violations.forEach(v => {
      const month = new Date(v.date).toISOString().slice(0, 7);
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { count: 0, totalFine: 0, totalPoints: 0 };
      }
      stats.byMonth[month].count++;
      stats.byMonth[month].totalFine += v.fine;
      stats.byMonth[month].totalPoints += v.points;
    });

    return { success: true, data: stats };
  }

  /**
   * المركبات الأكثر مخالفات
   */
  getTopViolatingVehicles(limit = 5) {
    const vehicleCounts = {};

    mockDB.violations.forEach(v => {
      if (!vehicleCounts[v.vehicleId]) {
        vehicleCounts[v.vehicleId] = { count: 0, points: 0, fines: 0 };
      }
      vehicleCounts[v.vehicleId].count++;
      vehicleCounts[v.vehicleId].points += v.points;
      vehicleCounts[v.vehicleId].fines += v.fine;
    });

    return Object.entries(vehicleCounts)
      .map(([vehicleId, data]) => ({ vehicleId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * السائقون الأكثر مخالفات
   */
  getTopViolatingDrivers(limit = 5) {
    const driverCounts = {};

    mockDB.violations.forEach(v => {
      if (v.driverId) {
        if (!driverCounts[v.driverId]) {
          driverCounts[v.driverId] = { count: 0, points: 0, fines: 0 };
        }
        driverCounts[v.driverId].count++;
        driverCounts[v.driverId].points += v.points;
        driverCounts[v.driverId].fines += v.fine;
      }
    });

    return Object.entries(driverCounts)
      .map(([driverId, data]) => ({ driverId, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * الحصول على أنواع المخالفات
   */
  getViolationTypes() {
    return {
      success: true,
      data: mockDB.violationTypes,
    };
  }

  /**
   * تنبيهات المخالفات
   */
  async getViolationAlerts(vehicleId = null, driverId = null) {
    const alerts = [];

    if (driverId) {
      const points = await this.getDriverViolationPoints(driverId);

      if (points.data.status === 'suspended') {
        alerts.push({
          type: 'driver_suspended',
          severity: 'critical',
          message: `السائق ${driverId} موقوف عن القيادة - ${points.data.currentPoints} نقطة`,
          action: 'يجب إيقاف السائق فوراً',
        });
      } else if (points.data.status === 'critical') {
        alerts.push({
          type: 'driver_critical',
          severity: 'warning',
          message: `السائق ${driverId} في وضع حرج - ${points.data.currentPoints} نقطة`,
          action: 'توخي الحذر الشديد',
        });
      }
    }

    const unpaidViolations = mockDB.violations.filter(v => {
      if (vehicleId && v.vehicleId !== vehicleId) return false;
      if (driverId && v.driverId !== driverId) return false;
      return v.status === 'pending';
    });

    if (unpaidViolations.length > 0) {
      const totalFines = unpaidViolations.reduce((sum, v) => sum + v.fine, 0);
      alerts.push({
        type: 'unpaid_violations',
        severity: 'info',
        message: `${unpaidViolations.length} مخالفة غير مدفوعة بقيمة ${totalFines} ريال`,
        action: 'ينصح بالسداد لتجنب العقوبات',
      });
    }

    return {
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
    };
  }
}

module.exports = new ViolationsService();
