const Supplier = require('../models/Supplier.model');
const PurchaseOrder = require('../models/PurchaseOrder.model');

/**
 * Advanced Supplier Analytics Service
 * خدمة تحليل الموردين والأداء المتقدمة
 */
class SupplierAnalyticsService {
  
  /**
   * تقييم أداء المورد الشامل
   */
  async evaluateSupplierPerformance(supplierId) {
    try {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      // الحصول على جميع الأوامر للمورد
      const orders = await PurchaseOrder.find({
        'supplier.supplierId': supplierId,
      });

      // حساب مقاييس الأداء
      const metrics = {
        totalOrders: orders.length,
        completedOrders: orders.filter(o => 
          o.status === 'FULLY_RECEIVED' || o.status === 'PAID' || o.status === 'CLOSED'
        ).length,
        onTimeOrders: 0,
        delayedOrders: 0,
        partialDeliveries: 0,
        defectiveOrders: 0,
        totalValueOrdered: 0,
        averageDeliveryTime: 0,
        qualityIssues: [],
      };

      let totalDeliveryTime = 0;
      let onTimeCount = 0;

      for (const order of orders) {
        metrics.totalValueOrdered += order.summary.grandTotal || 0;

        if (order.reception?.actualReceiptDate && order.requiredDeliveryDate) {
          const deliveryTime = 
            (order.reception.actualReceiptDate - order.requiredDeliveryDate) / (1000 * 60 * 60 * 24);
          
          totalDeliveryTime += Math.max(deliveryTime, 0);

          if (deliveryTime <= 0) {
            onTimeCount++;
          } else {
            metrics.delayedOrders++;
          }
        }

        // جودة
        if (order.reception?.qualityIssues?.length > 0) {
          metrics.defectiveOrders++;
          metrics.qualityIssues.push(...order.reception.qualityIssues);
        }

        // استقبالات جزئية
        if (order.status === 'PARTIALLY_RECEIVED') {
          metrics.partialDeliveries++;
        }
      }

      metrics.onTimeOrders = onTimeCount;
      metrics.onTimePercentage = orders.length > 0 
        ? (onTimeCount / orders.length) * 100
        : 0;
      metrics.averageDeliveryTime = orders.length > 0 
        ? totalDeliveryTime / orders.length
        : 0;

      // تحديث بيانات المورد
      supplier.performance.totalOrders = metrics.totalOrders;
      supplier.performance.completedOrders = metrics.completedOrders;
      supplier.performance.onTimeOrders = metrics.onTimeOrders;
      supplier.performance.onTimePercentage = metrics.onTimePercentage;
      supplier.calculateOverallRating();

      await supplier.save();

      return {
        success: true,
        data: {
          supplier: {
            id: supplier._id,
            name: supplier.name,
            code: supplier.code,
          },
          metrics,
          rating: supplier.performance.overallRating,
          trustworthy: supplier.isTrustworthy(),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تحليل التكاليف والأسعار
   */
  async analyzeCostTrends(supplierId, days = 90) {
    try {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const orders = await PurchaseOrder.find({
        'supplier.supplierId': supplierId,
        createdAt: { $gte: startDate },
      }).sort({ createdAt: 1 });

      const analysis = {
        totalOrders: orders.length,
        totalSpent: 0,
        averageOrderValue: 0,
        lowestOrderValue: Infinity,
        highestOrderValue: 0,
        priceByProduct: {},
        costTrend: [],
        savingsOpportunity: 0,
      };

      let monthlyData = {};

      for (const order of orders) {
        const value = order.summary.grandTotal;
        analysis.totalSpent += value;
        analysis.lowestOrderValue = Math.min(analysis.lowestOrderValue, value);
        analysis.highestOrderValue = Math.max(analysis.highestOrderValue, value);

        // جمع شهري
        const month = order.createdAt.toISOString().substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { count: 0, total: 0 };
        }
        monthlyData[month].count++;
        monthlyData[month].total += value;

        // تحليل حسب المنتج
        for (const item of order.items) {
          if (!analysis.priceByProduct[item.itemCode]) {
            analysis.priceByProduct[item.itemCode] = {
              itemName: item.itemName,
              prices: [],
              average: 0,
            };
          }
          analysis.priceByProduct[item.itemCode].prices.push(item.unitPrice);
        }
      }

      // حساب المتوسطات
      analysis.averageOrderValue = orders.length > 0 
        ? analysis.totalSpent / orders.length
        : 0;

      // بناء اتجاه التكاليف
      analysis.costTrend = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        count: data.count,
        totalSpent: data.total,
        averagePerOrder: data.total / data.count,
      }));

      // تحليل فرص التوفير
      for (const code in analysis.priceByProduct) {
        const product = analysis.priceByProduct[code];
        const prices = product.prices;
        product.average = prices.reduce((a, b) => a + b, 0) / prices.length;

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        if (maxPrice > minPrice * 1.1) { // إذا كان هناك فرق أكثر من 10%
          product.savingsPotential = {
            currentAverage: product.average,
            lowestPrice: minPrice,
            potentialSavings: (product.average - minPrice) * (orders.length / 4), // توقع التكرار
          };
          analysis.savingsOpportunity += product.savingsPotential.potentialSavings;
        }
      }

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * مقارنة الموردين
   */
  async compareSuppliers(categoryFilter = null) {
    try {
      let query = { status: 'ACTIVE' };
      if (categoryFilter) {
        query.category = categoryFilter;
      }

      const suppliers = await Supplier.find(query);

      const comparison = suppliers.map(supplier => ({
        supplierId: supplier._id,
        name: supplier.name,
        code: supplier.code,
        category: supplier.category,
        overallRating: supplier.performance.overallRating,
        qualityRating: supplier.performance.qualityRating,
        deliveryRating: supplier.performance.deliveryRating,
        serviceRating: supplier.performance.serviceRating,
        priceCompetitiveness: supplier.performance.priceCompetitiveness,
        onTimePercentage: supplier.performance.onTimePercentage,
        totalOrders: supplier.performance.totalOrders,
        trustworthy: supplier.isTrustworthy(),
        isPreferred: supplier.isPreferredVendor,
      }));

      // ترتيب حسب التقييم
      comparison.sort((a, b) => b.overallRating - a.overallRating);

      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تقرير الأداء الشامل للمورد
   */
  async generateSupplierReport(supplierId, period = 'quarterly') {
    try {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      const daysPerPeriod = {
        monthly: 30,
        quarterly: 90,
        annual: 365,
      };

      const days = daysPerPeriod[period] || 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const performance = await this.evaluateSupplierPerformance(supplierId);
      const costAnalysis = await this.analyzeCostTrends(supplierId, days);

      const report = {
        reportDate: new Date(),
        supplier: {
          id: supplier._id,
          name: supplier.name,
          code: supplier.code,
          status: supplier.status,
        },
        period,
        performance: performance.data,
        financialAnalysis: costAnalysis.data,
        
        // ملخص التوصيات
        recommendations: [],
        
        // الإجراءات المقترحة
        actionItems: [],
      };

      // توليد التوصيات
      if (performance.data.metrics.onTimePercentage < 80) {
        report.recommendations.push(
          'Supplier has delivery delays. Consider discussing improvement plan.'
        );
        report.actionItems.push({
          action: 'SCHEDULE_MEETING',
          priority: 'HIGH',
          description: 'Review delivery performance and establish improvement targets',
        });
      }

      if (performance.data.metrics.defectiveOrders > 0) {
        report.recommendations.push(
          'Quality issues detected. Request quality improvement plan.'
        );
        report.actionItems.push({
          action: 'QUALITY_AUDIT',
          priority: 'HIGH',
          description: 'Conduct supplier quality audit',
        });
      }

      if (costAnalysis.data.savingsOpportunity > 0) {
        report.recommendations.push(
          `Potential cost savings of ${costAnalysis.data.savingsOpportunity.toFixed(2)} identified`
        );
        report.actionItems.push({
          action: 'NEGOTIATE_PRICING',
          priority: 'MEDIUM',
          description: 'Negotiate better pricing for bulk orders',
        });
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تحديد الموردين الأفضل
   */
  async identifyBestSuppliers(limit = 5, category = null) {
    try {
      const comparison = await this.compareSuppliers(category);
      if (!comparison.success) return comparison;

      const topSuppliers = comparison.data
        .filter(s => s.trustworthy)
        .slice(0, limit);

      return {
        success: true,
        data: topSuppliers,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تحليل المخاطر للمورد
   */
  async analyzeSupplierRisk(supplierId) {
    try {
      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return { success: false, message: 'Supplier not found' };
      }

      let riskScore = 0;
      const riskFactors = [];

      // عدم الالتزام بالوقت
      const onTimePercentage = supplier.performance.onTimePercentage || 0;
      if (onTimePercentage < 80) {
        riskScore += 20;
        riskFactors.push('Delivery delays');
      }

      // مشاكل الجودة
      if (supplier.performance.defectiveItems > 5) {
        riskScore += 20;
        riskFactors.push('Quality issues');
      }

      // التصنيف المنخفض
      if (supplier.performance.overallRating < 3) {
        riskScore += 25;
        riskFactors.push('Low rating');
      }

      // الحالة غير المستقرة
      if (supplier.status === 'UNDER_REVIEW') {
        riskScore += 15;
        riskFactors.push('Supplier under review');
      }

      // عدم التنويع
      if (supplier.performance.totalOrders < 5) {
        riskScore += 10;
        riskFactors.push('Limited order history');
      }

      let riskLevel = 'LOW';
      if (riskScore >= 60) riskLevel = 'CRITICAL';
      else if (riskScore >= 40) riskLevel = 'HIGH';
      else if (riskScore >= 20) riskLevel = 'MEDIUM';

      return {
        success: true,
        data: {
          supplierId,
          supplierName: supplier.name,
          riskScore,
          riskLevel,
          riskFactors,
          mitigationActions: this.generateMitigationActions(riskLevel, riskFactors),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * توليد إجراءات تخفيف المخاطر
   */
  generateMitigationActions(riskLevel, factors) {
    const actions = [];

    if (riskLevel === 'CRITICAL') {
      actions.push('Reduce order volume immediately');
      actions.push('Activate backup supplier');
      actions.push('Schedule urgent meeting');
    } else if (riskLevel === 'HIGH') {
      actions.push('Increase monitoring frequency');
      actions.push('Prepare alternative suppliers');
      actions.push('Request improvement plan');
    }

    if (factors.includes('Delivery delays')) {
      actions.push('Discuss shorter lead times');
      actions.push('Implement performance incentives');
    }

    if (factors.includes('Quality issues')) {
      actions.push('Request quality certificates');
      actions.push('Implement incoming inspection');
    }

    return actions;
  }

  /**
   * تقرير تنويع الموردين
   */
  async supplierDiversificationReport() {
    try {
      const suppliers = await Supplier.find({ status: 'ACTIVE' });
      
      const categories = {};
      let totalSpend = 0;

      for (const supplier of suppliers) {
        if (!categories[supplier.category]) {
          categories[supplier.category] = {
            suppliers: [],
            totalSpend: 0,
            concentration: 0,
          };
        }

        const orders = await PurchaseOrder.find({
          'supplier.supplierId': supplier._id,
        });

        const categorySpend = orders.reduce((sum, o) => 
          sum + (o.summary.grandTotal || 0), 0
        );

        categories[supplier.category].suppliers.push({
          name: supplier.name,
          spend: categorySpend,
        });

        categories[supplier.category].totalSpend += categorySpend;
        totalSpend += categorySpend;
      }

      // حساب التركيز
      for (const category in categories) {
        const cat = categories[category];
        if (cat.suppliers.length > 0) {
          const topSupplier = Math.max(...cat.suppliers.map(s => s.spend));
          cat.concentration = (topSupplier / cat.totalSpend) * 100;
        }
      }

      return {
        success: true,
        data: {
          totalSuppliers: suppliers.length,
          categories,
          overallRecommendation: totalSpend > 0 ? 
            'Consider adding more suppliers for better risk mitigation' : 
            'Insufficient data',
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new SupplierAnalyticsService();
