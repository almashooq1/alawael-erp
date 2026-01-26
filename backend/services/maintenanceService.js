/**
 * =====================================================
 * MAINTENANCE SERVICE - خدمة إدارة الصيانة
 * =====================================================
 * إدارة صيانة المركبات والجدولة والتكاليف
 */

const mockDB = {
  maintenanceRecords: [],
  maintenanceSchedules: [],
  maintenanceTypes: [
    { id: 'oil-change', name: 'تغيير الزيت', intervalKm: 5000 },
    { id: 'tire-rotation', name: 'تبديل الإطارات', intervalKm: 10000 },
    { id: 'brake-check', name: 'فحص الفرامل', intervalKm: 15000 },
    { id: 'full-service', name: 'صيانة شاملة', intervalKm: 20000 },
    { id: 'ac-service', name: 'صيانة المكيف', intervalMonths: 12 },
    { id: 'battery-check', name: 'فحص البطارية', intervalMonths: 6 },
  ],
};

class MaintenanceService {
  /**
   * إنشاء سجل صيانة جديد
   */
  async createMaintenanceRecord(data) {
    const record = {
      id: `MAINT-${Date.now()}`,
      vehicleId: data.vehicleId,
      type: data.type,
      date: data.date || new Date().toISOString(),
      mileage: data.mileage,
      description: data.description,
      cost: data.cost || 0,
      parts: data.parts || [],
      labor: data.labor || 0,
      mechanic: data.mechanic || 'غير محدد',
      status: data.status || 'completed',
      notes: data.notes || '',
      nextServiceDue: this.calculateNextService(data),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDB.maintenanceRecords.push(record);
    return { success: true, data: record };
  }

  /**
   * حساب موعد الصيانة التالية
   */
  calculateNextService(data) {
    const maintenanceType = mockDB.maintenanceTypes.find(t => t.id === data.type);
    if (!maintenanceType) return null;

    const nextService = {
      type: data.type,
      dueDate: null,
      dueMileage: null,
    };

    if (maintenanceType.intervalKm) {
      nextService.dueMileage = (data.mileage || 0) + maintenanceType.intervalKm;
    }

    if (maintenanceType.intervalMonths) {
      const dueDate = new Date(data.date || Date.now());
      dueDate.setMonth(dueDate.getMonth() + maintenanceType.intervalMonths);
      nextService.dueDate = dueDate.toISOString();
    }

    return nextService;
  }

  /**
   * الحصول على سجلات الصيانة لمركبة
   */
  async getMaintenanceHistory(vehicleId, options = {}) {
    let records = mockDB.maintenanceRecords.filter(r => r.vehicleId === vehicleId);

    // تطبيق الفلاتر
    if (options.type) {
      records = records.filter(r => r.type === options.type);
    }

    if (options.startDate) {
      records = records.filter(r => new Date(r.date) >= new Date(options.startDate));
    }

    if (options.endDate) {
      records = records.filter(r => new Date(r.date) <= new Date(options.endDate));
    }

    // الترتيب
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        records: paginatedRecords,
        total: records.length,
        page,
        totalPages: Math.ceil(records.length / limit),
        summary: this.calculateMaintenanceSummary(records),
      },
    };
  }

  /**
   * حساب ملخص الصيانة
   */
  calculateMaintenanceSummary(records) {
    return {
      totalRecords: records.length,
      totalCost: records.reduce((sum, r) => sum + (r.cost || 0), 0),
      totalLabor: records.reduce((sum, r) => sum + (r.labor || 0), 0),
      averageCost:
        records.length > 0
          ? records.reduce((sum, r) => sum + (r.cost || 0), 0) / records.length
          : 0,
      lastMaintenance:
        records.length > 0 ? records.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null,
    };
  }

  /**
   * جدولة صيانة قادمة
   */
  async scheduleMaintenanceService(data) {
    const schedule = {
      id: `SCHED-${Date.now()}`,
      vehicleId: data.vehicleId,
      type: data.type,
      scheduledDate: data.scheduledDate,
      estimatedCost: data.estimatedCost || 0,
      priority: data.priority || 'normal',
      status: 'scheduled',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };

    mockDB.maintenanceSchedules.push(schedule);
    return { success: true, data: schedule };
  }

  /**
   * الحصول على الصيانات المجدولة
   */
  async getScheduledMaintenance(vehicleId = null) {
    let schedules = mockDB.maintenanceSchedules;

    if (vehicleId) {
      schedules = schedules.filter(s => s.vehicleId === vehicleId);
    }

    schedules = schedules.filter(s => s.status === 'scheduled');
    schedules.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    return {
      success: true,
      data: {
        schedules,
        total: schedules.length,
        upcoming: schedules.filter(
          s => new Date(s.scheduledDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ),
        overdue: schedules.filter(s => new Date(s.scheduledDate) < new Date()),
      },
    };
  }

  /**
   * الحصول على توصيات الصيانة
   */
  async getMaintenanceRecommendations(vehicleId, currentMileage) {
    const recommendations = [];
    const history = await this.getMaintenanceHistory(vehicleId);

    for (const type of mockDB.maintenanceTypes) {
      const lastService = history.data.records.find(r => r.type === type.id);

      if (!lastService) {
        recommendations.push({
          type: type.id,
          name: type.name,
          priority: 'high',
          reason: 'لم يتم إجراء هذه الصيانة مسبقاً',
          recommended: true,
        });
        continue;
      }

      if (type.intervalKm && currentMileage) {
        const kmSinceLastService = currentMileage - lastService.mileage;
        if (kmSinceLastService >= type.intervalKm) {
          recommendations.push({
            type: type.id,
            name: type.name,
            priority: 'high',
            reason: `مضى ${kmSinceLastService} كم منذ آخر صيانة`,
            recommended: true,
            overdue: kmSinceLastService > type.intervalKm * 1.2,
          });
        } else if (kmSinceLastService >= type.intervalKm * 0.8) {
          recommendations.push({
            type: type.id,
            name: type.name,
            priority: 'medium',
            reason: `قريب من موعد الصيانة (${kmSinceLastService}/${type.intervalKm} كم)`,
            recommended: true,
          });
        }
      }

      if (type.intervalMonths) {
        const monthsSinceLastService = Math.floor(
          (Date.now() - new Date(lastService.date)) / (30 * 24 * 60 * 60 * 1000)
        );

        if (monthsSinceLastService >= type.intervalMonths) {
          recommendations.push({
            type: type.id,
            name: type.name,
            priority: 'high',
            reason: `مضى ${monthsSinceLastService} شهر منذ آخر صيانة`,
            recommended: true,
            overdue: monthsSinceLastService > type.intervalMonths * 1.2,
          });
        }
      }
    }

    return {
      success: true,
      data: {
        vehicleId,
        currentMileage,
        recommendations,
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        overdue: recommendations.filter(r => r.overdue).length,
      },
    };
  }

  /**
   * تحديث سجل صيانة
   */
  async updateMaintenanceRecord(recordId, updates) {
    const index = mockDB.maintenanceRecords.findIndex(r => r.id === recordId);
    if (index === -1) {
      return { success: false, error: 'سجل الصيانة غير موجود' };
    }

    mockDB.maintenanceRecords[index] = {
      ...mockDB.maintenanceRecords[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return { success: true, data: mockDB.maintenanceRecords[index] };
  }

  /**
   * حذف سجل صيانة
   */
  async deleteMaintenanceRecord(recordId) {
    const index = mockDB.maintenanceRecords.findIndex(r => r.id === recordId);
    if (index === -1) {
      return { success: false, error: 'سجل الصيانة غير موجود' };
    }

    const deleted = mockDB.maintenanceRecords.splice(index, 1)[0];
    return { success: true, data: deleted };
  }

  /**
   * إحصائيات الصيانة
   */
  async getMaintenanceStatistics(options = {}) {
    let records = mockDB.maintenanceRecords;

    if (options.startDate) {
      records = records.filter(r => new Date(r.date) >= new Date(options.startDate));
    }

    if (options.endDate) {
      records = records.filter(r => new Date(r.date) <= new Date(options.endDate));
    }

    const stats = {
      totalRecords: records.length,
      totalCost: records.reduce((sum, r) => sum + (r.cost || 0), 0),
      averageCost: 0,
      byType: {},
      byMonth: {},
      mostExpensive: null,
      mostFrequent: null,
    };

    if (records.length > 0) {
      stats.averageCost = stats.totalCost / records.length;
      stats.mostExpensive = records.sort((a, b) => (b.cost || 0) - (a.cost || 0))[0];
    }

    // تجميع حسب النوع
    records.forEach(r => {
      if (!stats.byType[r.type]) {
        stats.byType[r.type] = { count: 0, totalCost: 0 };
      }
      stats.byType[r.type].count++;
      stats.byType[r.type].totalCost += r.cost || 0;
    });

    // تجميع حسب الشهر
    records.forEach(r => {
      const month = new Date(r.date).toISOString().slice(0, 7);
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { count: 0, totalCost: 0 };
      }
      stats.byMonth[month].count++;
      stats.byMonth[month].totalCost += r.cost || 0;
    });

    // الأكثر تكراراً
    const typeCounts = Object.entries(stats.byType).map(([type, data]) => ({
      type,
      count: data.count,
    }));
    stats.mostFrequent = typeCounts.sort((a, b) => b.count - a.count)[0];

    return { success: true, data: stats };
  }

  /**
   * الحصول على أنواع الصيانة المتاحة
   */
  getMaintenanceTypes() {
    return {
      success: true,
      data: mockDB.maintenanceTypes,
    };
  }
}

module.exports = new MaintenanceService();
