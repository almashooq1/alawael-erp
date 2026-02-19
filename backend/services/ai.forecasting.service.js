const Inventory = require('../models/Inventory.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');
const Supplier = require('../models/Supplier.model');

/**
 * Advanced AI & Forecasting Service
 * خدمة الذكاء الاصطناعي والتنبؤ
 */
class AIForecastingService {

  /**
   * التنبؤ بالطلب المتقدم
   * متقدم من predictShortages()
   */
  async advancedDemandForecast(productCode, days = 90) {
    try {
      const inventory = await Inventory.findOne({ productCode });
      if (!inventory) {
        return { success: false, message: 'Product not found' };
      }

      // جمع البيانات التاريخية
      const historicalOrders = await PurchaseOrder.find({
        'items.itemCode': productCode,
        createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      });

      // حساب القيم الإحصائية
      const consumptionData = [];
      const weeklyConsumption = {};

      for (const order of historicalOrders) {
        for (const item of order.items) {
          if (item.itemCode === productCode) {
            const week = Math.floor(
              (Date.now() - order.createdAt) / (7 * 24 * 60 * 60 * 1000)
            );
            if (!weeklyConsumption[week]) {
              weeklyConsumption[week] = 0;
            }
            weeklyConsumption[week] += item.quantity;
            consumptionData.push(item.quantity);
          }
        }
      }

      // معالجة البيانات الناقصة
      const weeklyArray = Object.values(weeklyConsumption).sort((a, b) => a - b);

      // حساب المتوسطات والانحراف المعياري
      const average = consumptionData.length > 0
        ? consumptionData.reduce((a, b) => a + b, 0) / consumptionData.length
        : 0;

      const variance = consumptionData.length > 0
        ? consumptionData.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / consumptionData.length
        : 0;

      const stdDeviation = Math.sqrt(variance);

      // كشف الموسمية
      const seasonality = this.detectSeasonality(weeklyArray);

      // حساب معدل النمو
      const growthRate = this.calculateGrowthRate(weeklyArray);

      // التنبؤ المتقدم
      const forecast = {
        productCode,
        productName: inventory.productName,
        
        // الإحصائيات التاريخية
        historical: {
          averageConsumption: average,
          stdDeviation,
          minConsumption: Math.min(...consumptionData),
          maxConsumption: Math.max(...consumptionData),
          totalOrders: historicalOrders.length,
        },

        // معاملات النموذج
        seasonalityIndex: seasonality,
        growthRate: growthRate,

        // التنبؤات
        forecast: {
          nextWeek: this.calculateForecast(average, stdDeviation, growthRate, seasonality, 1),
          nextMonth: this.calculateForecast(average, stdDeviation, growthRate, seasonality, 4),
          nextQuarter: this.calculateForecast(average, stdDeviation, growthRate, seasonality, 12),
        },

        // مستويات الثقة
        confidenceLevel: 0.95,
        confidenceInterval: {
          lower: average - (2 * stdDeviation),
          upper: average + (2 * stdDeviation),
        },

        // المخاطر والفرص
        risks: this.identifyForecastRisks(
          inventory, 
          average, 
          consumptionData
        ),
      };

      return {
        success: true,
        data: forecast,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * الكشف عن الموسمية
   */
  detectSeasonality(weeklyData) {
    if (weeklyData.length < 4) return 1.0;

    // حساب المتوسط المتحرك
    const movingAvg = [];
    for (let i = 2; i < weeklyData.length - 2; i++) {
      const avg = (weeklyData[i - 2] + weeklyData[i - 1] + 
                   weeklyData[i] + weeklyData[i + 1] + weeklyData[i + 2]) / 5;
      movingAvg.push(avg);
    }

    // معدل الموسمية
    const avgValue = weeklyData.reduce((a, b) => a + b, 0) / weeklyData.length;
    if (avgValue === 0) return 1.0;

    const seasonalIndices = movingAvg.map(val => (weeklyData[movingAvg.indexOf(val)] || val) / val);
    const seasonalityFactor = seasonalIndices.reduce((a, b) => a + b, 0) / seasonalIndices.length;

    return Math.max(0.8, Math.min(1.2, seasonalityFactor));
  }

  /**
   * حساب معدل النمو
   */
  calculateGrowthRate(data) {
    if (data.length < 2) return 0;

    let totalGrowth = 0;
    let count = 0;

    for (let i = 1; i < data.length; i++) {
      if (data[i - 1] > 0) {
        totalGrowth += (data[i] - data[i - 1]) / data[i - 1];
        count++;
      }
    }

    return count > 0 ? totalGrowth / count : 0;
  }

  /**
   * حساب التنبؤ بالطلب
   */
  calculateForecast(average, stdDeviation, growthRate, seasonality, periods) {
    const baseForcast = average * (1 + growthRate) * seasonality;
    const adjustedValue = baseForcast * Math.pow(1 + growthRate, periods);

    return {
      predicted: Math.round(adjustedValue),
      confidenceRange: {
        lower: Math.round(adjustedValue - (1.96 * stdDeviation)),
        upper: Math.round(adjustedValue + (1.96 * stdDeviation)),
      },
    };
  }

  /**
   * تحديد مخاطر التنبؤ
   */
  identifyForecastRisks(inventory, averageConsumption, consumptionData) {
    const risks = [];

    // قلة البيانات
    if (consumptionData.length < 5) {
      risks.push({
        type: 'LOW_DATA_POINTS',
        severity: 'MEDIUM',
        description: 'Limited historical data for accurate forecasting',
        recommendation: 'Collect more data before relying on forecast',
      });
    }

    // عدم الاستقرار
    const stdDev = Math.sqrt(
      consumptionData.reduce((sum, val) => 
        sum + Math.pow(val - averageConsumption, 2), 0) / consumptionData.length
    );
    
    const coefficientOfVariation = stdDev / (averageConsumption || 1);
    if (coefficientOfVariation > 0.5) {
      risks.push({
        type: 'HIGH_VOLATILITY',
        severity: 'HIGH',
        description: 'Consumption pattern is highly volatile',
        recommendation: 'Increase safety stock and reorder frequency',
      });
    }

    // الاتجاهات المفقودة
    if (averageConsumption === 0) {
      risks.push({
        type: 'NO_CONSUMPTION',
        severity: 'HIGH',
        description: 'No recent consumption history',
        recommendation: 'Item may be obsolete or not in demand',
      });
    }

    return risks;
  }

  /**
   * التنبؤ بنفاد المخزون
   */
  async predictStockOutRisk() {
    try {
      const inventory = await Inventory.find({ isActive: true });
      const atRiskItems = [];

      for (const item of inventory) {
        if (item.monthlyConsumption && item.monthlyConsumption > 0) {
          const daysRemaining = (item.quantity / item.monthlyConsumption) * 30;

          if (daysRemaining < 30) {
            const forecast = await this.advancedDemandForecast(item.productCode, 60);
            
            if (forecast.success) {
              atRiskItems.push({
                productCode: item.productCode,
                productName: item.productName,
                currentStock: item.quantity,
                monthlyConsumption: item.monthlyConsumption,
                daysRemaining: Math.round(daysRemaining),
                status: daysRemaining < 7 ? 'CRITICAL' : 
                        daysRemaining < 15 ? 'WARNING' : 'MONITOR',
                urgency: daysRemaining < 7 ? 'URGENT' : 
                         daysRemaining < 15 ? 'HIGH' : 'MEDIUM',
                recommendation: this.getStockoutRecommendation(item, daysRemaining),
                forecastData: forecast.data,
              });
            }
          }
        }
      }

      // ترتيب حسب الإلحاح
      atRiskItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

      return {
        success: true,
        data: {
          totalAtRisk: atRiskItems.length,
          critical: atRiskItems.filter(i => i.status === 'CRITICAL').length,
          warning: atRiskItems.filter(i => i.status === 'WARNING').length,
          items: atRiskItems,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * توصيات نفاد المخزون
   */
  getStockoutRecommendation(item, daysRemaining) {
    if (daysRemaining < 7) {
      return 'Place emergency order immediately with preferred supplier';
    } else if (daysRemaining < 15) {
      return 'Prepare purchase order and contact suppliers for expedited delivery';
    } else {
      return 'Schedule regular purchase order to maintain stock levels';
    }
  }

  /**
   * تحليل أنماط الشراء
   */
  async analyzePurchasePatterns(days = 90) {
    try {
      const orders = await PurchaseOrder.find({
        createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      });

      const patterns = {
        totalOrders: orders.length,
        averageOrderValue: 0,
        frequencyByDay: {},
        frequencyByDepartment: {},
        averageLeadTime: 0,
        mostOrderedItems: {},
        supplierFrequency: {},
      };

      let totalValue = 0;
      let totalLeadTime = 0;
      let leadTimeCount = 0;

      for (const order of orders) {
        totalValue += order.summary.grandTotal || 0;

        // التكرار حسب اليوم
        const day = order.createdAt.getDay();
        if (!patterns.frequencyByDay[day]) {
          patterns.frequencyByDay[day] = 0;
        }
        patterns.frequencyByDay[day]++;

        // وقت التسليم
        if (order.requiredDeliveryDate && order.createdAt) {
          const leadTime = (order.requiredDeliveryDate - order.createdAt) / (24 * 60 * 60 * 1000);
          totalLeadTime += leadTime;
          leadTimeCount++;
        }

        // المنتجات الأكثر طلباً
        for (const item of order.items) {
          if (!patterns.mostOrderedItems[item.itemCode]) {
            patterns.mostOrderedItems[item.itemCode] = {
              name: item.itemName,
              frequency: 0,
              totalQuantity: 0,
            };
          }
          patterns.mostOrderedItems[item.itemCode].frequency++;
          patterns.mostOrderedItems[item.itemCode].totalQuantity += item.quantity;
        }

        // تكرار الموردين
        if (order.supplier?.supplierId) {
          if (!patterns.supplierFrequency[order.supplier.supplierId]) {
            patterns.supplierFrequency[order.supplier.supplierId] = {
              name: order.supplier.supplierName,
              frequency: 0,
            };
          }
          patterns.supplierFrequency[order.supplier.supplierId].frequency++;
        }
      }

      patterns.averageOrderValue = orders.length > 0 ? totalValue / orders.length : 0;
      patterns.averageLeadTime = leadTimeCount > 0 ? totalLeadTime / leadTimeCount : 0;

      return {
        success: true,
        data: {
          period: `${days} days`,
          patterns,
          insights: this.derivePurchaseInsights(patterns),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * استخلاص الرؤى من أنماط الشراء
   */
  derivePurchaseInsights(patterns) {
    const insights = [];

    // أيام الذروة
    let peakDay = 0;
    let peakCount = 0;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const day in patterns.frequencyByDay) {
      if (patterns.frequencyByDay[day] > peakCount) {
        peakCount = patterns.frequencyByDay[day];
        peakDay = day;
      }
    }

    if (peakCount > 0) {
      insights.push(
        `Peak ordering day is ${days[peakDay]} with ${peakCount} orders`
      );
    }

    // أكثر المنتجات طلباً
    const topItems = Object.entries(patterns.mostOrderedItems)
      .sort((a, b) => b['1'].frequency - a['1'].frequency)
      .slice(0, 3);

    if (topItems.length > 0) {
      insights.push(
        `Top 3 ordered items: ${topItems.map(i => `${i['1'].name} (${i['1'].frequency} times)`).join(', ')}`
      );
    }

    // الموردين الأكثر استخداماً
    const topSuppliers = Object.entries(patterns.supplierFrequency)
      .sort((a, b) => b['1'].frequency - a['1'].frequency)
      .slice(0, 3);

    if (topSuppliers.length > 0) {
      insights.push(
        `Top suppliers: ${topSuppliers.map(s => `${s['1'].name} (${s['1'].frequency} orders)`).join(', ')}`
      );
    }

    return insights;
  }

  /**
   * توصيات الشراء الذكية
   */
  async getSmartPurchasingRecommendations() {
    try {
      const lowStockItems = await Inventory.find({
        $expr: { $lte: ['$quantity', '$reorderPoint'] },
      });

      const recommendations = [];

      for (const item of lowStockItems) {
        const forecast = await this.advancedDemandForecast(item.productCode, 60);
        
        if (forecast.success) {
          const recommendedQuantity = this.calculateOptimalOrderQuantity(
            item,
            forecast.data
          );

          recommendations.push({
            productCode: item.productCode,
            productName: item.productName,
            currentStock: item.quantity,
            reorderPoint: item.reorderPoint,
            recommendedQuantity,
            estimatedCost: recommendedQuantity * item.unitCost,
            urgency: item.quantity <= (item.reorderPoint / 2) ? 'CRITICAL' : 'HIGH',
            bestSupplier: item.preferredSupplier,
            actionNeeded: item.quantity <= 0 ? 'EMERGENCY_ORDER' : 'ROUTINE_PO',
          });
        }
      }

      return {
        success: true,
        data: {
          totalRecommendations: recommendations.length,
          recommendations: recommendations.sort((a, b) => {
            const urgencyOrder = { 'CRITICAL': 0, 'HIGH': 1 };
            return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
          }),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * حساب كمية الطلب الأمثل (EOQ)
   */
  calculateOptimalOrderQuantity(inventory, forecast) {
    // استخدام اقتصادية الأمر (EOQ) formula
    const annualDemand = (forecast.historical.averageConsumption || 1) * 12;
    const orderingCost = 50; // تكلفة الطلب (يمكن تخصيصها)
    const holdingCost = (inventory.unitCost || 1) * 0.25; // تكلفة الاحتفاظ بالمخزون

    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
    
    // تطبيق هامش أمان
    return Math.ceil(eoq * 1.2);
  }

  /**
   * محاكاة السيناريوهات
   */
  async simulateScenarios(productCode, scenarios = {}) {
    try {
      const inventory = await Inventory.findOne({ productCode });
      if (!inventory) {
        return { success: false, message: 'Product not found' };
      }

      const forecast = await this.advancedDemandForecast(productCode, 90);
      if (!forecast.success) return forecast;

      const results = [];

      // السيناريو 1: الطلب المتوقع
      results.push({
        name: 'Expected Demand',
        demand: forecast.data.forecast.nextMonth.predicted,
        currentStock: inventory.quantity,
        outcome: inventory.quantity >= forecast.data.forecast.nextMonth.predicted 
          ? 'SAFE' : 'AT_RISK',
        actionRequired: inventory.quantity < forecast.data.forecast.nextMonth.predicted,
      });

      // السيناريو 2: الطلب العالي
      results.push({
        name: 'High Demand',
        demand: forecast.data.forecast.nextMonth.upper,
        currentStock: inventory.quantity,
        outcome: inventory.quantity >= forecast.data.forecast.nextMonth.upper 
          ? 'SAFE' : 'AT_RISK',
        actionRequired: true,
        recommendation: 'Increase stock levels',
      });

      // السيناريو 3: الطلب المنخفض
      results.push({
        name: 'Low Demand',
        demand: forecast.data.forecast.nextMonth.lower,
        currentStock: inventory.quantity,
        outcome: inventory.quantity >= forecast.data.forecast.nextMonth.lower 
          ? 'SAFE' : 'OVERSTOCK',
        actionRequired: false,
      });

      return {
        success: true,
        data: {
          productCode,
          productName: inventory.productName,
          scenarios: results,
          recommendation: this.getScenarioRecommendation(results),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * توصيات السيناريو
   */
  getScenarioRecommendation(scenarios) {
    const atRiskCount = scenarios.filter(s => s.outcome === 'AT_RISK').length;

    if (atRiskCount === scenarios.length) {
      return 'CRITICAL: Likely to face stock-out in multiple scenarios. Order immediately.';
    } else if (atRiskCount >= scenarios.length / 2) {
      return 'HIGH RISK: Stock-out possible in several scenarios. Place purchase order.';
    } else if (scenarios.some(s => s.outcome === 'OVERSTOCK')) {
      return 'MONITOR: May have excess stock. Review demand and adjust orders.';
    } else {
      return 'NORMAL: Stock levels appear adequate under expected scenarios.';
    }
  }
}

module.exports = new AIForecastingService();
