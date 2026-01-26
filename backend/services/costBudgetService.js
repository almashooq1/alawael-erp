/**
 * 💰 نظام إدارة التكاليف والميزانيات
 * Cost & Budget Management Service
 *
 * إدارة شاملة للتكاليف والميزانيات والتنبؤ المالي
 */

class CostBudgetService {
  constructor() {
    this.budgets = [];
    this.costs = [];
    this.budgetCounter = 7000;
    this.costCounter = 6000;
    this.initializeMockData();
  }

  initializeMockData() {
    // ميزانيات نموذجية
    this.budgets = [
      {
        id: 7000,
        vehicleId: 'VRN-TEST-001',
        period: '2026-01',
        type: 'monthly',
        totalBudget: 5000,
        categories: {
          fuel: 1500,
          maintenance: 1000,
          insurance: 500,
          repairs: 800,
          other: 1200,
        },
        spent: 2300,
        alerts: [],
        createdAt: new Date(),
      },
    ];

    this.costs = [
      {
        id: 6000,
        vehicleId: 'VRN-TEST-001',
        category: 'fuel',
        amount: 250,
        date: new Date(),
        description: 'تعبئة وقود',
        receipt: 'RCP-001',
        approver: 'ADMIN-001',
        approved: true,
      },
    ];
  }

  // إنشاء ميزانية جديدة
  createBudget(budgetData) {
    const budget = {
      id: ++this.budgetCounter,
      ...budgetData,
      spent: 0,
      remaining: budgetData.totalBudget,
      alerts: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.budgets.push(budget);
    return budget;
  }

  // تسجيل تكلفة
  recordCost(costData) {
    const cost = {
      id: ++this.costCounter,
      ...costData,
      date: costData.date || new Date(),
      approved: false,
      createdAt: new Date(),
    };

    this.costs.push(cost);

    // تحديث الميزانية
    this.updateBudgetSpending(costData.vehicleId, costData.amount);

    return cost;
  }

  // تحديث الإنفاق
  updateBudgetSpending(vehicleId, amount) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const budget = this.budgets.find(b => b.vehicleId === vehicleId && b.period === currentMonth);

    if (budget) {
      budget.spent += amount;
      budget.remaining = budget.totalBudget - budget.spent;
      budget.utilization = (budget.spent / budget.totalBudget) * 100;

      // تحديث الإنذارات
      if (budget.utilization > 90) {
        this.addBudgetAlert(budget.id, 'critical', 'تم استهلاك 90% من الميزانية');
      } else if (budget.utilization > 75) {
        this.addBudgetAlert(budget.id, 'warning', 'تم استهلاك 75% من الميزانية');
      }

      budget.updatedAt = new Date();
    }
  }

  // إضافة تنبيه ميزانية
  addBudgetAlert(budgetId, severity, message) {
    const budget = this.budgets.find(b => b.id === budgetId);
    if (!budget) return null;

    const alert = {
      severity,
      message,
      createdAt: new Date(),
    };

    if (!budget.alerts) budget.alerts = [];
    budget.alerts.push(alert);

    return alert;
  }

  // جلب الميزانيات
  getBudgets(filters = {}) {
    let results = this.budgets;

    if (filters.vehicleId) {
      results = results.filter(b => b.vehicleId === filters.vehicleId);
    }
    if (filters.period) {
      results = results.filter(b => b.period === filters.period);
    }
    if (filters.type) {
      results = results.filter(b => b.type === filters.type);
    }

    return {
      count: results.length,
      budgets: results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    };
  }

  // جلب التكاليف
  getCosts(filters = {}) {
    let results = this.costs;

    if (filters.vehicleId) {
      results = results.filter(c => c.vehicleId === filters.vehicleId);
    }
    if (filters.category) {
      results = results.filter(c => c.category === filters.category);
    }
    if (filters.approved !== undefined) {
      results = results.filter(c => c.approved === filters.approved);
    }
    if (filters.startDate && filters.endDate) {
      results = results.filter(c => {
        const costDate = new Date(c.date);
        return costDate >= new Date(filters.startDate) && costDate <= new Date(filters.endDate);
      });
    }

    return {
      count: results.length,
      costs: results.sort((a, b) => new Date(b.date) - new Date(a.date)),
    };
  }

  // جلب تفاصيل الميزانية
  getBudgetDetails(budgetId) {
    const budget = this.budgets.find(b => b.id === budgetId);
    if (!budget) return null;

    const categoryBreakdown = {};
    Object.keys(budget.categories).forEach(cat => {
      categoryBreakdown[cat] = {
        budgeted: budget.categories[cat],
        spent: this.calculateCategorySpending(budget.vehicleId, budget.period, cat),
        remaining:
          budget.categories[cat] -
          this.calculateCategorySpending(budget.vehicleId, budget.period, cat),
      };
    });

    return {
      ...budget,
      categoryBreakdown,
      alerts: budget.alerts || [],
      costHistory: this.getCosts({
        vehicleId: budget.vehicleId,
        startDate: `${budget.period}-01`,
        endDate: `${budget.period}-31`,
      }),
    };
  }

  // حساب الإنفاق حسب الفئة
  calculateCategorySpending(vehicleId, period, category) {
    return this.costs
      .filter(
        c =>
          c.vehicleId === vehicleId &&
          c.category === category &&
          new Date(c.date).toISOString().substring(0, 7) === period
      )
      .reduce((sum, c) => sum + c.amount, 0);
  }

  // موافقة على التكلفة
  approveCost(costId, approver) {
    const cost = this.costs.find(c => c.id === costId);
    if (!cost) return null;

    cost.approved = true;
    cost.approver = approver;
    cost.approvalDate = new Date();

    return cost;
  }

  // رفض التكلفة
  rejectCost(costId, reason) {
    const cost = this.costs.find(c => c.id === costId);
    if (!cost) return null;

    cost.approved = false;
    cost.rejectionReason = reason;

    return cost;
  }

  // تحليل التكاليف
  analyzeCosts(vehicleId, startDate, endDate) {
    const vehicleCosts = this.costs.filter(
      c =>
        c.vehicleId === vehicleId &&
        new Date(c.date) >= new Date(startDate) &&
        new Date(c.date) <= new Date(endDate) &&
        c.approved
    );

    const categoryTotals = {};
    const monthlyTotals = {};
    let totalCost = 0;

    vehicleCosts.forEach(cost => {
      // إجمالي حسب الفئة
      categoryTotals[cost.category] = (categoryTotals[cost.category] || 0) + cost.amount;

      // إجمالي حسب الشهر
      const month = new Date(cost.date).toISOString().substring(0, 7);
      monthlyTotals[month] = (monthlyTotals[month] || 0) + cost.amount;

      totalCost += cost.amount;
    });

    const averageMonthlyCost =
      Object.keys(monthlyTotals).length > 0 ? totalCost / Object.keys(monthlyTotals).length : 0;

    return {
      vehicleId,
      period: { startDate, endDate },
      totalCost: Math.round(totalCost),
      averageMonthlyCost: Math.round(averageMonthlyCost),
      categoryBreakdown: categoryTotals,
      monthlyBreakdown: monthlyTotals,
      costTrend: this.calculateCostTrend(vehicleId, startDate, endDate),
      predictions: this.predictFutureCosts(vehicleId),
    };
  }

  // حساب اتجاه التكاليف
  calculateCostTrend(vehicleId, startDate, endDate) {
    const costs = this.costs.filter(
      c =>
        c.vehicleId === vehicleId &&
        new Date(c.date) >= new Date(startDate) &&
        new Date(c.date) <= new Date(endDate) &&
        c.approved
    );

    if (costs.length < 2) return 'insufficient-data';

    const midPoint = Math.floor(costs.length / 2);
    const firstHalf = costs.slice(0, midPoint).reduce((sum, c) => sum + c.amount, 0);
    const secondHalf = costs.slice(midPoint).reduce((sum, c) => sum + c.amount, 0);

    if (secondHalf > firstHalf * 1.1) {
      return {
        trend: 'increasing',
        change: Math.round(((secondHalf - firstHalf) / firstHalf) * 100),
      };
    } else if (secondHalf < firstHalf * 0.9) {
      return {
        trend: 'decreasing',
        change: Math.round(((firstHalf - secondHalf) / firstHalf) * 100),
      };
    } else {
      return { trend: 'stable', change: 0 };
    }
  }

  // التنبؤ بالتكاليف المستقبلية
  predictFutureCosts(vehicleId) {
    const recentCosts = this.costs
      .filter(c => c.vehicleId === vehicleId && c.approved)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12);

    if (recentCosts.length === 0) return {};

    const averageMonthlyCost =
      recentCosts.reduce((sum, c) => sum + c.amount, 0) / recentCosts.length;

    return {
      nextMonthPredicted: Math.round(averageMonthlyCost),
      nextQuarterPredicted: Math.round(averageMonthlyCost * 3),
      nextYearPredicted: Math.round(averageMonthlyCost * 12),
      confidence: 'medium',
    };
  }

  // مقارنة الميزانيات
  compareBudgets(vehicleId1, vehicleId2, period) {
    const budget1 = this.budgets.find(b => b.vehicleId === vehicleId1 && b.period === period);
    const budget2 = this.budgets.find(b => b.vehicleId === vehicleId2 && b.period === period);

    return {
      vehicle1: {
        vehicleId: vehicleId1,
        budget: budget1 ? budget1.totalBudget : 0,
        spent: budget1 ? budget1.spent : 0,
        utilization: budget1 ? Math.round((budget1.spent / budget1.totalBudget) * 100) : 0,
      },
      vehicle2: {
        vehicleId: vehicleId2,
        budget: budget2 ? budget2.totalBudget : 0,
        spent: budget2 ? budget2.spent : 0,
        utilization: budget2 ? Math.round((budget2.spent / budget2.totalBudget) * 100) : 0,
      },
    };
  }

  // تقرير الميزانية
  getBudgetReport(vehicleId, period) {
    const budget = this.budgets.find(b => b.vehicleId === vehicleId && b.period === period);
    if (!budget) return null;

    const details = this.getBudgetDetails(budget.id);

    return {
      ...details,
      report: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.spent,
        remainingBudget: budget.remaining,
        utilizationPercentage: Math.round((budget.spent / budget.totalBudget) * 100),
        forecast: this.predictFutureCosts(vehicleId),
        recommendations: this.getBudgetRecommendations(budget),
      },
    };
  }

  // توصيات الميزانية
  getBudgetRecommendations(budget) {
    const recommendations = [];

    if (budget.utilization > 90) {
      recommendations.push('⚠️ تحذير: تم استهلاك معظم الميزانية، يرجى التحكم في النفقات');
    }

    if (budget.utilization > 100) {
      recommendations.push('🔴 طارئ: تم تجاوز الميزانية، يحتاج إلى تدخل فوري');
    }

    const maintenanceSpending = this.calculateCategorySpending(
      budget.vehicleId,
      budget.period,
      'maintenance'
    );
    if (maintenanceSpending > budget.categories.maintenance) {
      recommendations.push('🔧 تكاليف الصيانة تتجاوز المخطط، يرجى مراجعة الجدول الدوري');
    }

    const fuelSpending = this.calculateCategorySpending(budget.vehicleId, budget.period, 'fuel');
    if (fuelSpending > budget.categories.fuel) {
      recommendations.push('⛽ استهلاك الوقود أعلى من المتوقع، يرجى فحص كفاءة المركبة');
    }

    return recommendations;
  }

  // توازن الميزانية
  rebalanceBudget(budgetId, newAllocations) {
    const budget = this.budgets.find(b => b.id === budgetId);
    if (!budget) return null;

    // التحقق من أن المجموع يساوي الميزانية الإجمالية
    const totalAllocated = Object.values(newAllocations).reduce((sum, val) => sum + val, 0);

    if (totalAllocated !== budget.totalBudget) {
      return null; // يجب أن يساوي المجموع الميزانية الإجمالية
    }

    budget.categories = newAllocations;
    budget.updatedAt = new Date();

    return budget;
  }
}

module.exports = new CostBudgetService();
