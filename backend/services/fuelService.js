/**
 * =====================================================
 * FUEL TRACKING SERVICE - خدمة تتبع الوقود
 * =====================================================
 * إدارة تعبئة الوقود وحساب الاستهلاك والكفاءة
 */

const mockDB = {
  fuelRecords: [],
  fuelPrices: {
    91: 2.33, // سعر بنزين 91
    95: 2.48, // سعر بنزين 95
    diesel: 2.1, // سعر ديزل
  },
};

class FuelService {
  /**
   * تسجيل تعبئة وقود
   */
  async recordFuelFill(data) {
    const record = {
      id: `FUEL-${Date.now()}`,
      vehicleId: data.vehicleId,
      driverId: data.driverId || null,
      date: data.date || new Date().toISOString(),
      mileage: data.mileage,
      liters: data.liters,
      fuelType: data.fuelType || '95',
      pricePerLiter: data.pricePerLiter || mockDB.fuelPrices[data.fuelType || '95'],
      totalCost: data.liters * (data.pricePerLiter || mockDB.fuelPrices[data.fuelType || '95']),
      station: data.station || 'غير محدد',
      location: data.location || null,
      isFull: data.isFull !== false, // افتراض التعبئة الكاملة
      receiptNumber: data.receiptNumber || null,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    };

    // حساب معدل الاستهلاك إذا توفرت البيانات السابقة
    const lastRecord = this.getLastFuelRecord(data.vehicleId);
    if (lastRecord && lastRecord.mileage && data.mileage > lastRecord.mileage) {
      const distance = data.mileage - lastRecord.mileage;
      record.fuelEfficiency = (distance / data.liters).toFixed(2); // كم/لتر
      record.distanceSinceLastFill = distance;
    }

    mockDB.fuelRecords.push(record);
    return { success: true, data: record };
  }

  /**
   * الحصول على آخر تعبئة لمركبة
   */
  getLastFuelRecord(vehicleId) {
    const records = mockDB.fuelRecords
      .filter(r => r.vehicleId === vehicleId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return records[0] || null;
  }

  /**
   * الحصول على سجلات الوقود لمركبة
   */
  async getFuelHistory(vehicleId, options = {}) {
    let records = mockDB.fuelRecords.filter(r => r.vehicleId === vehicleId);

    // تطبيق الفلاتر
    if (options.startDate) {
      records = records.filter(r => new Date(r.date) >= new Date(options.startDate));
    }

    if (options.endDate) {
      records = records.filter(r => new Date(r.date) <= new Date(options.endDate));
    }

    if (options.fuelType) {
      records = records.filter(r => r.fuelType === options.fuelType);
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
        summary: this.calculateFuelSummary(records),
      },
    };
  }

  /**
   * حساب ملخص استهلاك الوقود
   */
  calculateFuelSummary(records) {
    if (records.length === 0) {
      return {
        totalRecords: 0,
        totalLiters: 0,
        totalCost: 0,
        averageFuelEfficiency: 0,
        averageCostPerFill: 0,
      };
    }

    const totalLiters = records.reduce((sum, r) => sum + r.liters, 0);
    const totalCost = records.reduce((sum, r) => sum + r.totalCost, 0);

    const recordsWithEfficiency = records.filter(r => r.fuelEfficiency);
    const averageFuelEfficiency =
      recordsWithEfficiency.length > 0
        ? (
            recordsWithEfficiency.reduce((sum, r) => sum + parseFloat(r.fuelEfficiency), 0) /
            recordsWithEfficiency.length
          ).toFixed(2)
        : 0;

    return {
      totalRecords: records.length,
      totalLiters: totalLiters.toFixed(2),
      totalCost: totalCost.toFixed(2),
      averageFuelEfficiency: parseFloat(averageFuelEfficiency),
      averageCostPerFill: (totalCost / records.length).toFixed(2),
      totalDistance: records.reduce((sum, r) => sum + (r.distanceSinceLastFill || 0), 0),
    };
  }

  /**
   * حساب كفاءة استهلاك الوقود لفترة محددة
   */
  async calculateFuelEfficiency(vehicleId, options = {}) {
    const history = await this.getFuelHistory(vehicleId, options);
    const records = history.data.records;

    if (records.length < 2) {
      return {
        success: false,
        error: 'يجب وجود سجلين على الأقل لحساب الكفاءة',
      };
    }

    const recordsWithEfficiency = records.filter(r => r.fuelEfficiency);

    if (recordsWithEfficiency.length === 0) {
      return {
        success: false,
        error: 'لا توجد بيانات كافية لحساب الكفاءة',
      };
    }

    const efficiencies = recordsWithEfficiency.map(r => parseFloat(r.fuelEfficiency));

    return {
      success: true,
      data: {
        vehicleId,
        period: {
          start: options.startDate,
          end: options.endDate,
        },
        averageEfficiency: (efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length).toFixed(
          2
        ),
        bestEfficiency: Math.max(...efficiencies).toFixed(2),
        worstEfficiency: Math.min(...efficiencies).toFixed(2),
        totalRecords: recordsWithEfficiency.length,
        trend: this.calculateEfficiencyTrend(recordsWithEfficiency),
      },
    };
  }

  /**
   * حساب اتجاه كفاءة الوقود
   */
  calculateEfficiencyTrend(records) {
    if (records.length < 3) return 'مستقر';

    const recentRecords = records.slice(0, Math.floor(records.length / 2));
    const olderRecords = records.slice(Math.floor(records.length / 2));

    const recentAvg =
      recentRecords.reduce((sum, r) => sum + parseFloat(r.fuelEfficiency), 0) /
      recentRecords.length;
    const olderAvg =
      olderRecords.reduce((sum, r) => sum + parseFloat(r.fuelEfficiency), 0) / olderRecords.length;

    const difference = (((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1);

    if (Math.abs(difference) < 5) return 'مستقر';
    return difference > 0 ? `تحسن ${difference}%` : `تراجع ${Math.abs(difference)}%`;
  }

  /**
   * الحصول على تحليل تكاليف الوقود
   */
  async getFuelCostAnalysis(vehicleId, options = {}) {
    const history = await this.getFuelHistory(vehicleId, options);
    const records = history.data.records;

    if (records.length === 0) {
      return {
        success: false,
        error: 'لا توجد سجلات',
      };
    }

    const byMonth = {};
    const byFuelType = {};
    const byStation = {};

    records.forEach(r => {
      // تجميع حسب الشهر
      const month = new Date(r.date).toISOString().slice(0, 7);
      if (!byMonth[month]) {
        byMonth[month] = { liters: 0, cost: 0, count: 0 };
      }
      byMonth[month].liters += r.liters;
      byMonth[month].cost += r.totalCost;
      byMonth[month].count++;

      // تجميع حسب نوع الوقود
      if (!byFuelType[r.fuelType]) {
        byFuelType[r.fuelType] = { liters: 0, cost: 0, count: 0 };
      }
      byFuelType[r.fuelType].liters += r.liters;
      byFuelType[r.fuelType].cost += r.totalCost;
      byFuelType[r.fuelType].count++;

      // تجميع حسب المحطة
      if (!byStation[r.station]) {
        byStation[r.station] = { liters: 0, cost: 0, count: 0 };
      }
      byStation[r.station].liters += r.liters;
      byStation[r.station].cost += r.totalCost;
      byStation[r.station].count++;
    });

    return {
      success: true,
      data: {
        totalCost: records.reduce((sum, r) => sum + r.totalCost, 0).toFixed(2),
        totalLiters: records.reduce((sum, r) => sum + r.liters, 0).toFixed(2),
        averageCostPerMonth:
          Object.values(byMonth).reduce((sum, m) => sum + m.cost, 0) / Object.keys(byMonth).length,
        byMonth,
        byFuelType,
        byStation,
        mostUsedStation:
          Object.entries(byStation).sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'N/A',
        recommendedFuelType: this.getRecommendedFuelType(byFuelType),
      },
    };
  }

  /**
   * التوصية بنوع الوقود الأنسب
   */
  getRecommendedFuelType(byFuelType) {
    const types = Object.entries(byFuelType).map(([type, data]) => ({
      type,
      costPerLiter: data.cost / data.liters,
    }));

    types.sort((a, b) => a.costPerLiter - b.costPerLiter);

    return types[0]?.type || 'N/A';
  }

  /**
   * مقارنة كفاءة الوقود بين فترتين
   */
  async compareFuelEfficiency(vehicleId, period1, period2) {
    const data1 = await this.calculateFuelEfficiency(vehicleId, period1);
    const data2 = await this.calculateFuelEfficiency(vehicleId, period2);

    if (!data1.success || !data2.success) {
      return {
        success: false,
        error: 'بيانات غير كافية للمقارنة',
      };
    }

    const diff = (
      ((data2.data.averageEfficiency - data1.data.averageEfficiency) /
        data1.data.averageEfficiency) *
      100
    ).toFixed(1);

    return {
      success: true,
      data: {
        period1: {
          ...period1,
          efficiency: data1.data.averageEfficiency,
        },
        period2: {
          ...period2,
          efficiency: data2.data.averageEfficiency,
        },
        difference: diff,
        improvement: diff > 0,
        analysis:
          diff > 0 ? `تحسنت الكفاءة بنسبة ${diff}%` : `تراجعت الكفاءة بنسبة ${Math.abs(diff)}%`,
      },
    };
  }

  /**
   * تنبيهات الوقود
   */
  async getFuelAlerts(vehicleId) {
    const alerts = [];
    const lastRecord = this.getLastFuelRecord(vehicleId);

    if (!lastRecord) {
      return { success: true, data: { alerts: [] } };
    }

    // تنبيه إذا كانت الكفاءة منخفضة
    if (lastRecord.fuelEfficiency && parseFloat(lastRecord.fuelEfficiency) < 8) {
      alerts.push({
        type: 'low_efficiency',
        severity: 'warning',
        message: `كفاءة الوقود منخفضة: ${lastRecord.fuelEfficiency} كم/لتر`,
        recommendation: 'ينصح بفحص المحرك والإطارات',
      });
    }

    // تنبيه إذا كانت التكلفة عالية
    const history = await this.getFuelHistory(vehicleId, { limit: 10 });
    const avgCost = parseFloat(history.data.summary.averageCostPerFill);

    if (lastRecord.totalCost > avgCost * 1.3) {
      alerts.push({
        type: 'high_cost',
        severity: 'info',
        message: `تكلفة التعبئة أعلى من المعدل بنسبة ${((lastRecord.totalCost / avgCost - 1) * 100).toFixed(1)}%`,
        recommendation: 'تحقق من الأسعار في محطات أخرى',
      });
    }

    return { success: true, data: { alerts, count: alerts.length } };
  }

  /**
   * تحديث الأسعار الافتراضية للوقود
   */
  updateFuelPrices(prices) {
    mockDB.fuelPrices = { ...mockDB.fuelPrices, ...prices };
    return { success: true, data: mockDB.fuelPrices };
  }

  /**
   * الحصول على الأسعار الحالية
   */
  getCurrentPrices() {
    return { success: true, data: mockDB.fuelPrices };
  }
}

module.exports = new FuelService();
