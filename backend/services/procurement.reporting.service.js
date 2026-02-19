const PurchaseOrder = require('../models/PurchaseOrder.model');
const PurchaseRequest = require('../models/PurchaseRequest.model');
const Supplier = require('../models/Supplier.model');
const Inventory = require('../models/Inventory.model');
const Contract = require('../models/Contract.model');

/**
 * Advanced Procurement Reporting Service
 * خدمة التقارير المتقدمة للمشتريات
 */
class ProcurementReportingService {

  /**
   * تقرير النفقات الشامل
   */
  async generateSpendingReport(startDate, endDate, filters = {}) {
    try {
      const query = {
        createdAt: { $gte: startDate, $lte: endDate },
      };

      if (filters.supplierId) {
        query['supplier.supplierId'] = filters.supplierId;
      }

      const orders = await PurchaseOrder.find(query);

      // حساب الإحصائيات
      const stats = {
        totalSpend: 0,
        totalOrders: orders.length,
        averageOrderValue: 0,
        highestOrder: 0,
        lowestOrder: Infinity,
        spendByCategory: {},
        spendBySupplier: {},
        spendByStatus: {},
        monthlyTrend: {},
      };

      for (const order of orders) {
        const amount = order.summary.grandTotal || 0;
        stats.totalSpend += amount;
        stats.highestOrder = Math.max(stats.highestOrder, amount);
        stats.lowestOrder = Math.min(stats.lowestOrder, amount);

        // حسب الحالة
        if (!stats.spendByStatus[order.status]) {
          stats.spendByStatus[order.status] = 0;
        }
        stats.spendByStatus[order.status] += amount;

        // حسب الموردين
        const supplierName = order.supplier?.supplierName || 'Unknown';
        if (!stats.spendBySupplier[supplierName]) {
          stats.spendBySupplier[supplierName] = {
            amount: 0,
            orderCount: 0,
          };
        }
        stats.spendBySupplier[supplierName].amount += amount;
        stats.spendBySupplier[supplierName].orderCount++;

        // الاتجاه الشهري
        const month = order.createdAt.toISOString().substring(0, 7);
        if (!stats.monthlyTrend[month]) {
          stats.monthlyTrend[month] = {
            spend: 0,
            orderCount: 0,
            averageValue: 0,
          };
        }
        stats.monthlyTrend[month].spend += amount;
        stats.monthlyTrend[month].orderCount++;
        stats.monthlyTrend[month].averageValue = 
          stats.monthlyTrend[month].spend / stats.monthlyTrend[month].orderCount;

        // حسب المنتجات
        for (const item of order.items) {
          const category = item.category || 'Other';
          if (!stats.spendByCategory[category]) {
            stats.spendByCategory[category] = {
              amount: 0,
              itemCount: 0,
              itemNames: new Set(),
            };
          }
          stats.spendByCategory[category].amount += item.unitPrice * item.quantity;
          stats.spendByCategory[category].itemCount++;
          stats.spendByCategory[category].itemNames.add(item.itemName);
        }
      }

      stats.averageOrderValue = orders.length > 0 
        ? stats.totalSpend / orders.length
        : 0;

      // تحويل Sets إلى Arrays
      for (const category in stats.spendByCategory) {
        stats.spendByCategory[category].itemNames = 
          Array.from(stats.spendByCategory[category].itemNames);
      }

      // التصنيفات (Pareto Analysis)
      const pareto = this.analyzeParetoDistribution(stats.spendBySupplier);

      return {
        success: true,
        data: {
          period: { startDate, endDate },
          summary: stats,
          paretoAnalysis: pareto,
          insights: this.generateSpendingInsights(stats),
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تحليل قانون باريتو (80/20)
   */
  analyzeParetoDistribution(suppliers) {
    const sorted = Object.entries(suppliers)
      .sort((a, b) => b['1'].amount - a['1'].amount);

    let cumulativeSpend = 0;
    let totalSpend = sorted.reduce((sum, item) => sum + item['1'].amount, 0);

    const result = {
      topSuppliers: [],
      strategyRecommendation: '',
    };

    for (const [name, data] of sorted) {
      cumulativeSpend += data.amount;
      const percentage = (cumulativeSpend / totalSpend) * 100;

      result.topSuppliers.push({
        supplier: name,
        spend: data.amount,
        orderCount: data.orderCount,
        percentageOfTotal: ((data.amount / totalSpend) * 100).toFixed(2),
        cumulativePercentage: percentage.toFixed(2),
      });

      if (percentage >= 80 && result.topSuppliers.length <= 5) {
        break;
      }
    }

    // التوصيات على أساس Pareto
    const topCount = result.topSuppliers.length;
    const topSpend = result.topSuppliers.reduce((sum, s) => sum + s.spend, 0);
    const percentage = (topSpend / totalSpend) * 100;

    if (percentage >= 80) {
      result.strategyRecommendation = 
        `${topCount} suppliers account for ${percentage.toFixed(1)}% of spend. ` +
        'Focus on strengthening these relationships and negotiating better terms.';
    }

    return result;
  }

  /**
   * استخلاص الرؤى من الإنفاق
   */
  generateSpendingInsights(stats) {
    const insights = [];

    // أعلى موردين
    const topSupplier = Object.entries(stats.spendBySupplier)
      .sort((a, b) => b['1'].amount - a['1'].amount)[0];
    if (topSupplier) {
      insights.push(
        `Top supplier: ${topSupplier[0]} with ${topSupplier[1].orderCount} orders ` +
        `totaling $${topSupplier[1].amount.toFixed(2)}`
      );
    }

    // نطاق الطلب
    if (stats.highestOrder > stats.lowestOrder * 5) {
      insights.push(
        'Wide variation in order values detected. Consider standardizing order sizes.'
      );
    }

    // متوسط قيمة الطلب
    if (stats.averageOrderValue > 10000) {
      insights.push(
        `High average order value: $${stats.averageOrderValue.toFixed(2)}. ` +
        'Monitor for consolidation opportunities.'
      );
    }

    return insights;
  }

  /**
   * تقرير أداء الموردين
   */
  async generateSupplierPerformanceReport(startDate, endDate) {
    try {
      const suppliers = await Supplier.find();
      const orders = await PurchaseOrder.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const report = {
        reportDate: new Date(),
        period: { startDate, endDate },
        suppliers: [],
      };

      for (const supplier of suppliers) {
        const supplierOrders = orders.filter(o => 
          o.supplier?.supplierId === supplier._id.toString()
        );

        if (supplierOrders.length === 0) continue;

        // حساب المقاييس
        let onTimeCount = 0;
        let totalDefects = 0;
        let totalQualityIssues = 0;
        let totalSpend = 0;

        for (const order of supplierOrders) {
          totalSpend += order.summary.grandTotal || 0;

          if (order.requiredDeliveryDate && order.reception?.actualReceiptDate) {
            if (order.reception.actualReceiptDate <= order.requiredDeliveryDate) {
              onTimeCount++;
            }
          }

          if (order.reception?.qualityIssues?.length > 0) {
            totalQualityIssues += order.reception.qualityIssues.length;
          }
        }

        const metrics = {
          supplier: {
            id: supplier._id,
            name: supplier.name,
            code: supplier.code,
            status: supplier.status,
          },
          orderMetrics: {
            totalOrders: supplierOrders.length,
            onTimeDeliveries: onTimeCount,
            onTimePercentage: (onTimeCount / supplierOrders.length * 100).toFixed(1),
            totalQualityIssues,
            averageQualityScore: 100 - ((totalQualityIssues / supplierOrders.length) * 10),
          },
          financialMetrics: {
            totalSpend,
            averageOrderValue: (totalSpend / supplierOrders.length).toFixed(2),
            percentageOfSpend: 0, // سيتم حسابه لاحقاً
          },
          rating: supplier.performance.overallRating,
          recommendation: this.getSupplierRecommendation(supplier, supplierOrders),
        };

        report.suppliers.push(metrics);
      }

      // حساب النسب المئوية للإنفاق
      const totalSpendAll = report.suppliers.reduce((sum, s) => 
        sum + s.financialMetrics.totalSpend, 0
      );

      for (const supplier of report.suppliers) {
        supplier.financialMetrics.percentageOfSpend = 
          ((supplier.financialMetrics.totalSpend / totalSpendAll) * 100).toFixed(2);
      }

      // ترتيب حسب الأداء
      report.suppliers.sort((a, b) => b.rating - a.rating);

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * توصيات الموردين
   */
  getSupplierRecommendation(supplier, orders) {
    const onTimeCount = orders.filter(o => {
      if (o.requiredDeliveryDate && o.reception?.actualReceiptDate) {
        return o.reception.actualReceiptDate <= o.requiredDeliveryDate;
      }
      return false;
    }).length;

    const onTimePercentage = (onTimeCount / orders.length) * 100;

    if (supplier.performance.overallRating < 2.5 || onTimePercentage < 60) {
      return 'REVIEW: Poor performance. Consider finding alternative supplier.';
    } else if (supplier.performance.overallRating < 3.5 || onTimePercentage < 80) {
      return 'CAUTION: Moderate performance. Monitor closely and discuss improvements.';
    } else if (supplier.isPreferredVendor) {
      return 'EXCELLENT: Strong performer. Recommend for strategic partnerships.';
    } else {
      return 'GOOD: Reliable supplier. Consider for framework agreements.';
    }
  }

  /**
   * تقرير الأداء التشغيلي
   */
  async generateOperationalPerformanceReport(startDate, endDate) {
    try {
      const orders = await PurchaseOrder.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const requests = await PurchaseRequest.find({
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const report = {
        period: { startDate, endDate },
        processes: {
          procurement: {
            totalRequests: requests.length,
            approvedRequests: requests.filter(r => r.status === 'APPROVED').length,
            rejectedRequests: requests.filter(r => r.status === 'REJECTED').length,
            averageApprovalTime: this.calculateAverageApprovalTime(requests),
            pendinApprovalCount: requests.filter(r => r.status === 'PENDING_APPROVAL').length,
          },
          ordering: {
            totalOrders: orders.length,
            issuedOrders: orders.filter(o => o.status !== 'DRAFT').length,
            averageOrderProcessingTime: this.calculateOrderProcessingTime(orders),
            onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(orders),
          },
          inventory: {
            outstandingDeliveries: orders.filter(o => 
              !['CLOSED', 'CANCELLED'].includes(o.status)
            ).length,
            fullyReceivedOrders: orders.filter(o => o.status === 'FULLY_RECEIVED').length,
            partiallyReceivedOrders: orders.filter(o => o.status === 'PARTIALLY_RECEIVED').length,
          },
          payment: {
            invoicedOrders: orders.filter(o => o.invoicing?.invoiceNumber).length,
            paidOrders: orders.filter(o => o.invoicing?.paymentStatus === 'FULLY_PAID').length,
            outstandingPayments: orders.filter(o => 
              o.invoicing?.paymentStatus === 'NOT_PAID' || 
              o.invoicing?.paymentStatus === 'PARTIALLY_PAID'
            ).length,
          },
        },
        kpis: {},
      };

      // حساب KPIs
      report.kpis = this.calculateProcurementKPIs(report.processes);

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * حساب متوسط وقت الموافقة
   */
  calculateAverageApprovalTime(requests) {
    if (requests.length === 0) return 0;

    let totalTime = 0;
    let count = 0;

    for (const request of requests) {
      if (request.approvalworkflow && request.approvalworkflow.length > 0) {
        const lastApproval = request.approvalworkflow[request.approvalworkflow.length - 1];
        if (lastApproval.approvalDate) {
          totalTime += (lastApproval.approvalDate - request.createdAt) / (1000 * 60 * 60);
          count++;
        }
      }
    }

    return count > 0 ? (totalTime / count).toFixed(2) : 0;
  }

  /**
   * حساب وقت معالجة الطلب
   */
  calculateOrderProcessingTime(orders) {
    if (orders.length === 0) return 0;

    let totalTime = 0;

    for (const order of orders) {
      if (order.orderDate && order.requiredDeliveryDate) {
        totalTime += (order.requiredDeliveryDate - order.orderDate) / (1000 * 60 * 60 * 24);
      }
    }

    return (totalTime / orders.length).toFixed(2);
  }

  /**
   * حساب معدل التسليم في الوقت المحدد
   */
  calculateOnTimeDeliveryRate(orders) {
    if (orders.length === 0) return 0;

    let onTimeCount = 0;

    for (const order of orders) {
      if (order.reception?.actualReceiptDate && order.requiredDeliveryDate) {
        if (order.reception.actualReceiptDate <= order.requiredDeliveryDate) {
          onTimeCount++;
        }
      }
    }

    return ((onTimeCount / orders.length) * 100).toFixed(2);
  }

  /**
   * حساب مؤشرات الأداء الرئيسية
   */
  calculateProcurementKPIs(processes) {
    return {
      approvalEfficiency: {
        name: 'Approval Efficiency',
        value: ((processes.procurement.approvedRequests / 
                (processes.procurement.approvedRequests + processes.procurement.rejectedRequests)) * 100).toFixed(1),
        unit: '%',
        target: 85,
        status: 'METRIC',
      },
      orderFulfillmentRate: {
        name: 'Order Fulfillment Rate',
        value: ((processes.ordering.issuedOrders / processes.ordering.totalOrders) * 100).toFixed(1),
        unit: '%',
        target: 95,
        status: 'METRIC',
      },
      onTimeDeliveryKPI: {
        name: 'On-Time Delivery Rate',
        value: processes.inventory.fullyReceivedOrders > 0 ? 
          ((processes.ordering.onTimeDeliveryRate) / 100 * 100).toFixed(1) : 'N/A',
        unit: '%',
        target: 90,
      },
      paymentTimeliness: {
        name: 'Payment Timeliness',
        value: ((processes.payment.paidOrders / 
                (processes.payment.paidOrders + processes.payment.outstandingPayments)) * 100).toFixed(1),
        unit: '%',
        target: 95,
      },
      cycleTime: {
        name: 'Procurement Cycle Time',
        value: processes.ordering.averageOrderProcessingTime,
        unit: 'days',
        target: 7,
      },
    };
  }

  /**
   * تقرير التنبيهات والمشاكل
   */
  async generateAlertAndIssueReport() {
    try {
      const alerts = [];

      // الطلبات المعلقة بلا موافقة
      const pendingApprovals = await PurchaseRequest.find({
        status: 'PENDING_APPROVAL',
      });

      for (const request of pendingApprovals) {
        const daysPending = (Date.now() - request.createdAt) / (1000 * 60 * 60 * 24);
        if (daysPending > 3) {
          alerts.push({
            type: 'PENDING_APPROVAL',
            severity: daysPending > 7 ? 'CRITICAL' : 'HIGH',
            message: `Purchase request ${request.requestNumber} pending approval for ${daysPending.toFixed(0)} days`,
            relatedId: request._id,
            actionRequired: true,
          });
        }
      }

      // الأوامر المتأخرة
      const lateOrders = await PurchaseOrder.find({
        requiredDeliveryDate: { $lt: new Date() },
        status: { $nin: ['FULLY_RECEIVED', 'CLOSED', 'CANCELLED'] },
      });

      for (const order of lateOrders) {
        const daysLate = (Date.now() - order.requiredDeliveryDate) / (1000 * 60 * 60 * 24);
        alerts.push({
          type: 'LATE_DELIVERY',
          severity: daysLate > 14 ? 'CRITICAL' : daysLate > 7 ? 'HIGH' : 'MEDIUM',
          message: `Order ${order.orderNumber} is ${daysLate.toFixed(0)} days late`,
          relatedId: order._id,
          actionRequired: true,
        });
      }

      // المستحقات الدفع المتأخرة
      const overduePayments = await PurchaseOrder.find({
        'invoicing.paymentDueDate': { $lt: new Date() },
        'invoicing.paymentStatus': { $in: ['NOT_PAID', 'PARTIALLY_PAID'] },
      });

      for (const order of overduePayments) {
        const daysOverdue = (Date.now() - order.invoicing.paymentDueDate) / (1000 * 60 * 60 * 24);
        alerts.push({
          type: 'OVERDUE_PAYMENT',
          severity: daysOverdue > 30 ? 'CRITICAL' : daysOverdue > 15 ? 'HIGH' : 'MEDIUM',
          message: `Payment for ${order.orderNumber} is ${daysOverdue.toFixed(0)} days overdue`,
          relatedId: order._id,
          actionRequired: true,
          dueAmount: order.invoicing.amountDue,
        });
      }

      // ترتيب حسب الخطورة
      alerts.sort((a, b) => {
        const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      return {
        success: true,
        data: {
          totalAlerts: alerts.length,
          criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length,
          alerts,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * تقرير التنبيهات والمشاكل
   */
  async generateComplianceAndRiskReport() {
    try {
      const contracts = await Contract.find({ status: 'ACTIVE' });
      const suppliers = await Supplier.find({ status: 'ACTIVE' });

      const report = {
        reportDate: new Date(),
        contractCompliance: {
          activeContracts: contracts.length,
          expiringWithin30Days: 0,
          expiringWithin60Days: 0,
          expiredContracts: 0,
        },
        supplierCompliance: {
          activeSuppliershop: suppliers.length,
          suspendedSuppliers: 0,
          underReviewSuppliers: 0,
          certificationIssues: 0,
        },
        riskAssessment: [],
      };

      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      // تحليل العقود
      for (const contract of contracts) {
        if (contract.endDate < today) {
          report.contractCompliance.expiredContracts++;
        } else if (contract.endDate < in30Days) {
          report.contractCompliance.expiringWithin30Days++;
        } else if (contract.endDate < in60Days) {
          report.contractCompliance.expiringWithin60Days++;
        }
      }

      // تحليل الموردين
      for (const supplier of suppliers) {
        if (supplier.status === 'SUSPENDED') {
          report.supplierCompliance.suspendedSuppliers++;
        } else if (supplier.status === 'UNDER_REVIEW') {
          report.supplierCompliance.underReviewSuppliers++;
        }

        // التحقق من الشهادات
        if (supplier.certifications && supplier.certifications.length === 0) {
          report.supplierCompliance.certificationIssues++;
        }
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new ProcurementReportingService();
