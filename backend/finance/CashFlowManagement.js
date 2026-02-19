/**
 * ===================================================================
 * ADVANCED CASH FLOW MANAGEMENT
 * إدارة التدفقات النقدية المتقدمة
 * ===================================================================
 * نسخة: 1.0 - احترافية
 * التاريخ: فبراير 2026
 */

const EventEmitter = require('events');

class CashFlowManagement extends EventEmitter {
  constructor(financialSystem) {
    super();
    this.fs = financialSystem;
    this.cashFlows = new Map();
    this.forecastModels = new Map();
    this.liquidityReserves = new Map();
    this.paymentSchedules = new Map();
    this.cashFlowAnalytics = new Map();
  }

  // ===================================================================
  // 1. تسجيل التدفقات النقدية - Cash Flow Recording
  // ===================================================================

  recordIncomingCashFlow(dataIn) {
    const {
      source, // customer, investment, loan, other
      amount,
      date,
      description,
      relatedInvoiceId = null,
      category = 'general',
    } = dataIn;

    if (amount <= 0) throw new Error('المبلغ يجب أن يكون موجباً');
    if (!source) throw new Error('مصدر التدفق مطلوب');

    const cashFlow = {
      id: `CF_IN_${Date.now()}`,
      type: 'inflow',
      source,
      amount: this.fs.roundNumber(amount),
      date: new Date(date),
      description,
      category,
      relatedInvoiceId,
      status: 'completed',
      recordedAt: new Date(),
    };

    this.cashFlows.set(cashFlow.id, cashFlow);

    // تحديث الحساب النقدي
    this.updateCashAccount(amount, true);

    this.emit('cashflow:inflow', cashFlow);
    return cashFlow;
  }

  recordOutgoingCashFlow(dataOut) {
    const {
      purpose, // payroll, supplier, tax, rent, utility, other
      amount,
      date,
      description,
      relatedExpenseId = null,
      category = 'general',
      approvalRequired = false,
    } = dataOut;

    if (amount <= 0) throw new Error('المبلغ يجب أن يكون موجباً');
    if (!purpose) throw new Error('غرض التدفق مطلوب');

    // التحقق من الأموال المتاحة
    const availableCash = this.getAvailableCash();
    if (amount > availableCash && !approvalRequired) {
      throw new Error('الأموال المتاحة غير كافية');
    }

    const cashFlow = {
      id: `CF_OUT_${Date.now()}`,
      type: 'outflow',
      purpose,
      amount: this.fs.roundNumber(amount),
      date: new Date(date),
      description,
      category,
      relatedExpenseId,
      status: approvalRequired ? 'pending_approval' : 'completed',
      requiresApproval: approvalRequired,
      recordedAt: new Date(),
    };

    this.cashFlows.set(cashFlow.id, cashFlow);

    if (!approvalRequired) {
      this.updateCashAccount(-amount, false);
    }

    this.emit('cashflow:outflow', cashFlow);
    return cashFlow;
  }

  approveCashOutflow(flowId, approver) {
    const flow = this.cashFlows.get(flowId);
    if (!flow) throw new Error('التدفق غير موجود');
    if (flow.type !== 'outflow') throw new Error('يمكن المصادقة على التدفقات الصادرة فقط');

    if (flow.status !== 'pending_approval') {
      throw new Error('التدفق في حالة غير صحيحة للمصادقة');
    }

    // التحقق من الأموال المتاحة مرة أخرى
    const availableCash = this.getAvailableCash();
    if (flow.amount > availableCash) {
      throw new Error('الأموال المتاحة غير كافية للمصادقة');
    }

    flow.status = 'approved';
    flow.approvedBy = approver;
    flow.approvedAt = new Date();

    this.updateCashAccount(-flow.amount, false);
    this.emit('cashflow:approved', flow);

    return flow;
  }

  rejectCashOutflow(flowId, reason) {
    const flow = this.cashFlows.get(flowId);
    if (!flow) throw new Error('التدفق غير موجود');

    if (flow.status !== 'pending_approval') {
      throw new Error('يمكن رفض التدفقات المعلقة فقط');
    }

    flow.status = 'rejected';
    flow.rejectionReason = reason;
    flow.rejectedAt = new Date();

    this.emit('cashflow:rejected', flow);
    return flow;
  }

  updateCashAccount(amount, isInflow) {
    // تحديث حساب الخزينة
    const cashAccountId = this.fs.getCashAccountId?.() || 1001; // حساب النقد الافتراضي
    const account = this.fs.accounts.get(cashAccountId);

    if (!account) {
      throw new Error('حساب النقد غير موجود');
    }

    if (isInflow) {
      this.fs.updateAccountBalance(cashAccountId, amount, true); // debit
    } else {
      this.fs.updateAccountBalance(cashAccountId, amount, false); // credit
    }
  }

  // ===================================================================
  // 2. تحليل التدفقات النقدية - Cash Flow Analysis
  // ===================================================================

  analyzeCashFlow(startDate, endDate) {
    const analysis = {
      period: { startDate, endDate },
      inflows: {
        total: 0,
        bySource: {},
        byCategory: {},
        count: 0,
      },
      outflows: {
        total: 0,
        byPurpose: {},
        byCategory: {},
        count: 0,
      },
      netCashFlow: 0,
      operatingActivities: {
        inflows: 0,
        outflows: 0,
        net: 0,
      },
      investingActivities: {
        inflows: 0,
        outflows: 0,
        net: 0,
      },
      financingActivities: {
        inflows: 0,
        outflows: 0,
        net: 0,
      },
    };

    for (const flow of this.cashFlows.values()) {
      if (flow.date < startDate || flow.date > endDate || flow.status !== 'completed') {
        continue;
      }

      if (flow.type === 'inflow') {
        analysis.inflows.total += flow.amount;
        analysis.inflows.bySource[flow.source] =
          (analysis.inflows.bySource[flow.source] || 0) + flow.amount;
        analysis.inflows.byCategory[flow.category] =
          (analysis.inflows.byCategory[flow.category] || 0) + flow.amount;
        analysis.inflows.count++;

        // تصنيف النشاط
        if (['customer', 'other'].includes(flow.source)) {
          analysis.operatingActivities.inflows += flow.amount;
        } else if (flow.source === 'investment') {
          analysis.investingActivities.inflows += flow.amount;
        } else if (flow.source === 'loan') {
          analysis.financingActivities.inflows += flow.amount;
        }
      } else {
        analysis.outflows.total += flow.amount;
        analysis.outflows.byPurpose[flow.purpose] =
          (analysis.outflows.byPurpose[flow.purpose] || 0) + flow.amount;
        analysis.outflows.byCategory[flow.category] =
          (analysis.outflows.byCategory[flow.category] || 0) + flow.amount;
        analysis.outflows.count++;

        // تصنيف النشاط
        if (['payroll', 'supplier', 'utility', 'rent', 'other'].includes(flow.purpose)) {
          analysis.operatingActivities.outflows += flow.amount;
        } else if (['investment'].includes(flow.purpose)) {
          analysis.investingActivities.outflows += flow.amount;
        } else if (['loan', 'dividend'].includes(flow.purpose)) {
          analysis.financingActivities.outflows += flow.amount;
        }
      }
    }

    // حساب النتائج
    analysis.netCashFlow = analysis.inflows.total - analysis.outflows.total;
    analysis.operatingActivities.net =
      analysis.operatingActivities.inflows - analysis.operatingActivities.outflows;
    analysis.investingActivities.net =
      analysis.investingActivities.inflows - analysis.investingActivities.outflows;
    analysis.financingActivities.net =
      analysis.financingActivities.inflows - analysis.financingActivities.outflows;

    // تحويل إلى أرقام مستديرة
    analysis.inflows.total = this.fs.roundNumber(analysis.inflows.total);
    analysis.outflows.total = this.fs.roundNumber(analysis.outflows.total);
    analysis.netCashFlow = this.fs.roundNumber(analysis.netCashFlow);

    return analysis;
  }

  // ===================================================================
  // 3. التنبؤ بالتدفقات النقدية - Cash Flow Forecasting
  // ===================================================================

  createCashFlowForecast(forecastData) {
    const {
      name,
      startDate,
      forecastMonths = 12,
      method = 'linear', // linear, seasonal, regression
      baselineData = null,
    } = forecastData;

    const forecast = {
      id: `FORECAST_${Date.now()}`,
      name,
      startDate: new Date(startDate),
      forecastMonths,
      method,
      predictions: [],
      confidence: null,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    // توليد التنبؤات بناءً على الطريقة المختارة
    if (method === 'linear') {
      forecast.predictions = this.generateLinearForecast(startDate, forecastMonths);
    } else if (method === 'seasonal') {
      forecast.predictions = this.generateSeasonalForecast(startDate, forecastMonths);
    } else if (method === 'regression') {
      forecast.predictions = this.generateRegressionForecast(
        startDate,
        forecastMonths,
        baselineData
      );
    }

    // حساب مستوى الثقة
    forecast.confidence = this.calculateForecastConfidence(forecast);

    this.forecastModels.set(forecast.id, forecast);
    this.emit('forecast:created', forecast);

    return forecast;
  }

  generateLinearForecast(startDate, months) {
    const predictions = [];
    const start = new Date(startDate);
    const historicalData = this.getHistoricalCashFlowData(12);

    // حساب الاتجاه الخطي
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const flow of historicalData) {
      if (flow.type === 'inflow') {
        totalInflow += flow.amount;
      } else {
        totalOutflow += flow.amount;
      }
    }

    const avgMonthlyInflow = historicalData.length > 0 ? totalInflow / 12 : 0;
    const avgMonthlyOutflow = historicalData.length > 0 ? totalOutflow / 12 : 0;

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(start);
      forecastDate.setMonth(forecastDate.getMonth() + i);

      predictions.push({
        month: forecastDate.toISOString().substring(0, 7),
        expectedInflow: this.fs.roundNumber(avgMonthlyInflow),
        expectedOutflow: this.fs.roundNumber(avgMonthlyOutflow),
        expectedNetFlow: this.fs.roundNumber(avgMonthlyInflow - avgMonthlyOutflow),
      });
    }

    return predictions;
  }

  generateSeasonalForecast(startDate, months) {
    const predictions = [];
    const start = new Date(startDate);
    const historicalData = this.getHistoricalCashFlowData(24); // سنتان للموسمية

    // تحليل الموسمية حسب الشهر
    const monthlyData = {};
    for (let m = 0; m < 12; m++) {
      monthlyData[m] = { inflow: 0, outflow: 0, count: 0 };
    }

    for (const flow of historicalData) {
      const month = flow.date.getMonth();
      if (flow.type === 'inflow') {
        monthlyData[month].inflow += flow.amount;
      } else {
        monthlyData[month].outflow += flow.amount;
      }
      monthlyData[month].count++;
    }

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(start);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const month = forecastDate.getMonth();

      const avgInflow =
        monthlyData[month].count > 0 ? monthlyData[month].inflow / monthlyData[month].count : 0;
      const avgOutflow =
        monthlyData[month].count > 0 ? monthlyData[month].outflow / monthlyData[month].count : 0;

      predictions.push({
        month: forecastDate.toISOString().substring(0, 7),
        expectedInflow: this.fs.roundNumber(avgInflow),
        expectedOutflow: this.fs.roundNumber(avgOutflow),
        expectedNetFlow: this.fs.roundNumber(avgInflow - avgOutflow),
      });
    }

    return predictions;
  }

  generateRegressionForecast(startDate, months, baselineData) {
    // نموذج انحدار بسيط
    const predictions = [];
    const start = new Date(startDate);
    const historicalData = baselineData || this.getHistoricalCashFlowData(12);

    // حساب معاملات الانحدار
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    const n = historicalData.length;

    for (let i = 0; i < historicalData.length; i++) {
      const x = i;
      const y =
        historicalData[i].type === 'inflow' ? historicalData[i].amount : -historicalData[i].amount;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(start);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const x = historicalData.length + i;
      const predicted = intercept + slope * x;

      predictions.push({
        month: forecastDate.toISOString().substring(0, 7),
        predictedNetFlow: this.fs.roundNumber(predicted),
        confidence: this.calculateConfidenceScore(historicalData.length, i),
      });
    }

    return predictions;
  }

  getHistoricalCashFlowData(months) {
    const data = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    for (const flow of this.cashFlows.values()) {
      if (flow.date >= startDate && flow.date <= endDate && flow.status === 'completed') {
        data.push(flow);
      }
    }

    return data.sort((a, b) => a.date - b.date);
  }

  calculateForecastConfidence(forecast) {
    if (forecast.predictions.length === 0) return 0;

    // حساب الانحراف المعياري من المتوسط
    const flows = this.getHistoricalCashFlowData(12);
    if (flows.length === 0) return 0.5; // ثقة افتراضية

    const netFlows = flows.map(f => (f.type === 'inflow' ? f.amount : -f.amount));
    const average = netFlows.reduce((a, b) => a + b, 0) / netFlows.length;
    const variance =
      netFlows.reduce((sum, flow) => sum + Math.pow(flow - average, 2), 0) / netFlows.length;
    const stdDev = Math.sqrt(variance);

    // الثقة تقل مع زيادة التقلب
    const confidence = Math.max(0.3, 1 - (stdDev / (average || 1)) * 0.5);

    return this.fs.roundNumber(confidence);
  }

  calculateConfidenceScore(historicalPoints, forecastMonthsAhead) {
    // الثقة تقل مع الابتعاد عن الحاضر
    const maxConfidence = Math.min(historicalPoints / 12, 1); // كحد أقصى 100%
    const decayFactor = Math.pow(0.95, forecastMonthsAhead); // تراجع 5% كل شهر

    return this.fs.roundNumber(maxConfidence * decayFactor);
  }

  // ===================================================================
  // 4. إدارة الاحتياطيات النقدية - Liquidity Reserve Management
  // ===================================================================

  createLiquidityReserve(reserveData) {
    const {
      name,
      targetAmount,
      minBalance = targetAmount * 0.8,
      maxBalance = targetAmount * 1.2,
      purpose = 'operational',
    } = reserveData;

    const reserve = {
      id: `RESERVE_${Date.now()}`,
      name,
      targetAmount: this.fs.roundNumber(targetAmount),
      currentBalance: 0,
      minBalance: this.fs.roundNumber(minBalance),
      maxBalance: this.fs.roundNumber(maxBalance),
      purpose,
      transactions: [],
      createdAt: new Date(),
      status: 'active',
    };

    this.liquidityReserves.set(reserve.id, reserve);
    return reserve;
  }

  depositToReserve(reserveId, amount, reference) {
    const reserve = this.liquidityReserves.get(reserveId);
    if (!reserve) throw new Error('الاحتياطي غير موجود');

    if (reserve.currentBalance + amount > reserve.maxBalance) {
      throw new Error(`الايداع سيتجاوز الحد الأقصى للاحتياطي (${reserve.maxBalance})`);
    }

    const transaction = {
      id: `TXN_${Date.now()}`,
      type: 'deposit',
      amount: this.fs.roundNumber(amount),
      reference,
      date: new Date(),
      balanceAfter: this.fs.roundNumber(reserve.currentBalance + amount),
    };

    reserve.currentBalance = this.fs.roundNumber(reserve.currentBalance + amount);
    reserve.transactions.push(transaction);

    this.emit('reserve:deposited', { reserve, transaction });
    return transaction;
  }

  withdrawFromReserve(reserveId, amount, purpose) {
    const reserve = this.liquidityReserves.get(reserveId);
    if (!reserve) throw new Error('الاحتياطي غير موجود');

    if (reserve.currentBalance < amount) {
      throw new Error('الرصيد غير كافي للسحب');
    }

    if (reserve.currentBalance - amount < reserve.minBalance) {
      throw new Error(`السحب سيقلل الرصيد عن الحد الأدنى (${reserve.minBalance})`);
    }

    const transaction = {
      id: `TXN_${Date.now()}`,
      type: 'withdrawal',
      amount: this.fs.roundNumber(amount),
      purpose,
      date: new Date(),
      balanceAfter: this.fs.roundNumber(reserve.currentBalance - amount),
    };

    reserve.currentBalance = this.fs.roundNumber(reserve.currentBalance - amount);
    reserve.transactions.push(transaction);

    this.emit('reserve:withdrawn', { reserve, transaction });
    return transaction;
  }

  // ===================================================================
  // 5. جدول السداد والدفعات - Payment Schedule Management
  // ===================================================================

  createPaymentSchedule(scheduleData) {
    const {
      name,
      totalAmount,
      recipients, // array of {recipientId, amount, date}
      frequency = 'monthly', // monthly, weekly, quarterly
      startDate,
      endDate,
      isrecurring = false,
    } = scheduleData;

    const schedule = {
      id: `SCHEDULE_${Date.now()}`,
      name,
      totalAmount: this.fs.roundNumber(totalAmount),
      recipients,
      frequency,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isRecurring,
      payments: [],
      status: 'scheduled',
      createdAt: new Date(),
    };

    // إنشاء قائمة الدفعات
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      for (const recipient of recipients) {
        schedule.payments.push({
          id: `PAY_${Date.now()}_${Math.random()}`,
          recipientId: recipient.recipientId,
          amount: this.fs.roundNumber(recipient.amount),
          scheduledDate: new Date(currentDate),
          actualDate: null,
          status: 'pending',
        });
      }

      // الانتقال إلى الفترة التالية
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'monthly') {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else if (frequency === 'quarterly') {
        currentDate.setMonth(currentDate.getMonth() + 3);
      }
    }

    this.paymentSchedules.set(schedule.id, schedule);
    return schedule;
  }

  executePaymentSchedule(scheduleId, paymentId) {
    const schedule = this.paymentSchedules.get(scheduleId);
    if (!schedule) throw new Error('جدول السداد غير موجود');

    const payment = schedule.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error('الدفعة غير موجودة');

    if (payment.status !== 'pending') {
      throw new Error('الدفعة في حالة غير صحيحة للتنفيذ');
    }

    payment.status = 'executed';
    payment.actualDate = new Date();

    // تسجيل التدفق النقدي
    this.recordOutgoingCashFlow({
      purpose: 'payroll',
      amount: payment.amount,
      date: new Date(),
      description: `الدفع من جدول: ${schedule.name}`,
      relatedExpenseId: paymentId,
    });

    this.emit('payment:executed', { schedule, payment });
    return payment;
  }

  // ===================================================================
  // 6. معلومات عامة - General Information
  // ===================================================================

  getAvailableCash() {
    const cashAccountId = this.fs.getCashAccountId?.() || 1001;
    return this.fs.getAccountBalance(cashAccountId);
  }

  getCashFlowSummary() {
    const summary = {
      totalInflows: 0,
      totalOutflows: 0,
      netFlow: 0,
      averageDailyFlow: 0,
      bestDay: null,
      worstDay: null,
      cashVelocity: 0, // كم مرة يتحرك النقد
    };

    const flows = Array.from(this.cashFlows.values()).filter(f => f.status === 'completed');

    for (const flow of flows) {
      if (flow.type === 'inflow') {
        summary.totalInflows += flow.amount;
      } else {
        summary.totalOutflows += flow.amount;
      }
    }

    summary.netFlow = this.fs.roundNumber(summary.totalInflows - summary.totalOutflows);
    summary.averageDailyFlow =
      flows.length > 0 ? this.fs.roundNumber(summary.netFlow / flows.length) : 0;

    // حساب أفضل وأسوأ يوم
    const dailyFlows = {};
    for (const flow of flows) {
      const dayKey = flow.date.toISOString().substring(0, 10);
      if (!dailyFlows[dayKey]) {
        dailyFlows[dayKey] = 0;
      }
      dailyFlows[dayKey] += flow.type === 'inflow' ? flow.amount : -flow.amount;
    }

    let maxDay = { amount: -Infinity };
    let minDay = { amount: Infinity };

    for (const [day, amount] of Object.entries(dailyFlows)) {
      if (amount > maxDay.amount) {
        maxDay = { day, amount };
      }
      if (amount < minDay.amount) {
        minDay = { day, amount };
      }
    }

    summary.bestDay = maxDay.day ? maxDay : null;
    summary.worstDay = minDay.day ? minDay : null;

    // حساب سرعة تحرك النقد
    const totalTransactions = flows.length;
    const totalAmount = summary.totalInflows + summary.totalOutflows;
    summary.cashVelocity =
      totalAmount > 0 ? this.fs.roundNumber(totalTransactions / (totalAmount / 1000)) : 0;

    return summary;
  }

  generateCashFlowStatement(startDate, endDate) {
    const statement = {
      period: { startDate, endDate },
      operatingActivities: {
        receipts: 0,
        payments: 0,
        netCash: 0,
      },
      investingActivities: {
        receipts: 0,
        payments: 0,
        netCash: 0,
      },
      financingActivities: {
        receipts: 0,
        payments: 0,
        netCash: 0,
      },
      netChangeInCash: 0,
      beginningCash: 0,
      endingCash: 0,
    };

    // جمع البيانات من التدفقات
    const analysis = this.analyzeCashFlow(startDate, endDate);

    statement.operatingActivities.receipts = this.fs.roundNumber(
      analysis.operatingActivities.inflows
    );
    statement.operatingActivities.payments = this.fs.roundNumber(
      analysis.operatingActivities.outflows
    );
    statement.operatingActivities.netCash = this.fs.roundNumber(analysis.operatingActivities.net);

    statement.investingActivities.receipts = this.fs.roundNumber(
      analysis.investingActivities.inflows
    );
    statement.investingActivities.payments = this.fs.roundNumber(
      analysis.investingActivities.outflows
    );
    statement.investingActivities.netCash = this.fs.roundNumber(analysis.investingActivities.net);

    statement.financingActivities.receipts = this.fs.roundNumber(
      analysis.financingActivities.inflows
    );
    statement.financingActivities.payments = this.fs.roundNumber(
      analysis.financingActivities.outflows
    );
    statement.financingActivities.netCash = this.fs.roundNumber(analysis.financingActivities.net);

    statement.netChangeInCash = this.fs.roundNumber(
      statement.operatingActivities.netCash +
        statement.investingActivities.netCash +
        statement.financingActivities.netCash
    );

    return statement;
  }
}

module.exports = CashFlowManagement;
