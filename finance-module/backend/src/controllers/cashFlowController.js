/**
 * CashFlow Controller
 * Manages cash flow data, forecasting, and reserves
 */

const { CashFlow, Forecast, Reserve, CashFlowAnalysis } = require('../models/CashFlow');

// Get cash flow summary
exports.getCashFlowSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const cashFlows = await CashFlow.find({
      'period.startDate': { $gte: new Date(startDate) },
      'period.endDate': { $lte: new Date(endDate) }
    }).sort({ 'period.startDate': -1 });

    const summary = {
      totalInflows: 0,
      totalOutflows: 0,
      netCashFlow: 0,
      periods: cashFlows.map(cf => ({
        period: cf.period,
        inflows: cf.summary.totalInflows,
        outflows: cf.summary.totalOutflows,
        netFlow: cf.summary.netCashFlow,
        closingBalance: cf.summary.closingBalance
      }))
    };

    cashFlows.forEach(cf => {
      summary.totalInflows += cf.summary.totalInflows;
      summary.totalOutflows += cf.summary.totalOutflows;
      summary.netCashFlow += cf.summary.netCashFlow;
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get detailed cash flow
exports.getCashFlow = async (req, res) => {
  try {
    const { id } = req.params;

    const cashFlow = await CashFlow.findById(id)
      .populate('modifiedBy', ['name', 'email'])
      .populate('approvals.approvedBy', ['name', 'email']);

    if (!cashFlow) {
      return res.status(404).json({ success: false, message: 'Cash flow not found' });
    }

    res.json({ success: true, data: cashFlow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create or update cash flow
exports.createCashFlow = async (req, res) => {
  try {
    const { period, inflows, outflows, openingBalance } = req.body;

    let totalInflows = 0;
    let totalOutflows = 0;

    inflows.forEach(item => totalInflows += item.amount);
    outflows.forEach(item => totalOutflows += item.amount);

    const cashFlow = new CashFlow({
      period,
      inflows,
      outflows,
      summary: {
        totalInflows,
        totalOutflows,
        netCashFlow: totalInflows - totalOutflows,
        openingBalance,
        closingBalance: openingBalance + (totalInflows - totalOutflows)
      },
      modifiedBy: req.user._id
    });

    await cashFlow.save();
    res.json({ success: true, data: cashFlow });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get forecasts
exports.getForecasts = async (req, res) => {
  try {
    const forecasts = await Forecast.find()
      .sort({ 'forecastPeriod.startDate': -1 })
      .populate('generatedBy', ['name', 'email']);

    res.json({ success: true, data: forecasts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate forecast
exports.generateForecast = async (req, res) => {
  try {
    const { startDate, endDate, scenarios, assumptions, riskFactors } = req.body;

    // Get historical data for trend analysis
    const historicalFlows = await CashFlow.find({
      'period.endDate': { $lt: new Date(startDate) }
    }).sort({ 'period.startDate': -1 }).limit(12);

    // Calculate baseline forecast
    let avgInflows = 0, avgOutflows = 0;
    historicalFlows.forEach(cf => {
      avgInflows += cf.summary.totalInflows;
      avgOutflows += cf.summary.totalOutflows;
    });
    avgInflows /= historicalFlows.length || 1;
    avgOutflows /= historicalFlows.length || 1;

    const baseline = {
      month1: { inflows: avgInflows * 1.0, outflows: avgOutflows * 1.0 },
      month2: { inflows: avgInflows * 1.02, outflows: avgOutflows * 1.01 },
      month3: { inflows: avgInflows * 1.05, outflows: avgOutflows * 1.02 }
    };

    // Calculate confidence intervals (±15%)
    const confidenceIntervals = {
      lower: {
        month1: {
          inflows: baseline.month1.inflows * 0.85,
          outflows: baseline.month1.outflows * 1.15
        },
        month2: {
          inflows: baseline.month2.inflows * 0.85,
          outflows: baseline.month2.outflows * 1.15
        },
        month3: {
          inflows: baseline.month3.inflows * 0.85,
          outflows: baseline.month3.outflows * 1.15
        }
      },
      upper: {
        month1: {
          inflows: baseline.month1.inflows * 1.15,
          outflows: baseline.month1.outflows * 0.85
        },
        month2: {
          inflows: baseline.month2.inflows * 1.15,
          outflows: baseline.month2.outflows * 0.85
        },
        month3: {
          inflows: baseline.month3.inflows * 1.15,
          outflows: baseline.month3.outflows * 0.85
        }
      }
    };

    const forecast = new Forecast({
      forecastPeriod: { startDate: new Date(startDate), endDate: new Date(endDate) },
      baseline,
      scenarios: scenarios || [
        {
          name: 'optimistic',
          month1: { inflows: baseline.month1.inflows * 1.2, outflows: baseline.month1.outflows * 0.9 },
          month2: { inflows: baseline.month2.inflows * 1.2, outflows: baseline.month2.outflows * 0.9 },
          month3: { inflows: baseline.month3.inflows * 1.2, outflows: baseline.month3.outflows * 0.9 },
          probability: 25
        },
        {
          name: 'pessimistic',
          month1: { inflows: baseline.month1.inflows * 0.8, outflows: baseline.month1.outflows * 1.1 },
          month2: { inflows: baseline.month2.inflows * 0.8, outflows: baseline.month2.outflows * 1.1 },
          month3: { inflows: baseline.month3.inflows * 0.8, outflows: baseline.month3.outflows * 1.1 },
          probability: 25
        },
        {
          name: 'conservative',
          month1: { inflows: baseline.month1.inflows * 0.95, outflows: baseline.month1.outflows * 1.05 },
          month2: { inflows: baseline.month2.inflows * 0.95, outflows: baseline.month2.outflows * 1.05 },
          month3: { inflows: baseline.month3.inflows * 0.95, outflows: baseline.month3.outflows * 1.05 },
          probability: 50
        }
      ],
      confidenceIntervals,
      riskFactors: riskFactors || [],
      assumptions: assumptions || [],
      generatedBy: req.user._id
    });

    await forecast.save();
    res.json({ success: true, data: forecast });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get reserves
exports.getReserves = async (req, res) => {
  try {
    const reserves = await Reserve.find()
      .populate('transactions.approvedBy', ['name', 'email']);

    res.json({ success: true, data: reserves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update reserve
exports.updateReserve = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentAmount, allocation } = req.body;

    const reserve = await Reserve.findByIdAndUpdate(
      id,
      {
        currentAmount,
        allocation,
        'adequacyRatio.actual': currentAmount / (await Reserve.findById(id)).targetAmount,
        lastModified: new Date()
      },
      { new: true }
    );

    res.json({ success: true, data: reserve });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record reserve transaction
exports.recordReserveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description } = req.body;

    const reserve = await Reserve.findById(id);
    if (!reserve) {
      return res.status(404).json({ success: false, message: 'Reserve not found' });
    }

    // Update current amount
    const newAmount = type === 'deposit'
      ? reserve.currentAmount + amount
      : reserve.currentAmount - amount;

    reserve.currentAmount = newAmount;
    reserve.transactions.push({
      date: new Date(),
      type,
      amount,
      description,
      approvedBy: req.user._id
    });

    // Update adequacy ratio
    reserve.adequacyRatio.actual = newAmount / reserve.targetAmount;
    if (reserve.adequacyRatio.actual < reserve.adequacyRatio.minimum) {
      reserve.adequacyRatio.status = 'below_minimum';
    } else if (reserve.adequacyRatio.actual < reserve.adequacyRatio.required) {
      reserve.adequacyRatio.status = 'insufficient';
    } else if (reserve.adequacyRatio.actual < 1) {
      reserve.adequacyRatio.status = 'adequate';
    } else {
      reserve.adequacyRatio.status = 'surplus';
    }

    await reserve.save();
    res.json({ success: true, data: reserve });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Analyze cash flow
exports.analyzeCashFlow = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const cashFlows = await CashFlow.find({
      'period.startDate': { $gte: new Date(startDate) },
      'period.endDate': { $lte: new Date(endDate) }
    }).sort({ 'period.startDate': 1 });

    // Detect patterns
    const inflows = cashFlows.map(cf => cf.summary.totalInflows);
    const outflows = cashFlows.map(cf => cf.summary.totalOutflows);

    const inflowMean = inflows.reduce((a, b) => a + b, 0) / inflows.length;
    const outflowMean = outflows.reduce((a, b) => a + b, 0) / outflows.length;

    // Calculate standard deviation
    const inflowStd = Math.sqrt(
      inflows.reduce((sq, n) => sq + Math.pow(n - inflowMean, 2), 0) / inflows.length
    );
    const outflowStd = Math.sqrt(
      outflows.reduce((sq, n) => sq + Math.pow(n - outflowMean, 2), 0) / outflows.length
    );

    // Detect anomalies
    const anomalies = [];
    cashFlows.forEach((cf, i) => {
      const inflowDeviation = Math.abs(cf.summary.totalInflows - inflowMean) / (inflowStd || 1);
      const outflowDeviation = Math.abs(cf.summary.totalOutflows - outflowMean) / (outflowStd || 1);

      if (inflowDeviation > 2 || outflowDeviation > 2) {
        anomalies.push({
          date: cf.period.startDate,
          type: 'anomaly',
          amount: cf.summary.totalInflows - cf.summary.totalOutflows,
          deviation: Math.max(inflowDeviation, outflowDeviation)
        });
      }
    });

    const analysis = new CashFlowAnalysis({
      analysisPeriod: {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      patterns: {
        trends: {
          inflowTrend: inflows[inflows.length - 1] > inflowMean ? 'increasing' : 'decreasing',
          outflowTrend: outflows[outflows.length - 1] > outflowMean ? 'increasing' : 'decreasing',
          netFlowTrend: (inflows[inflows.length - 1] - outflows[outflows.length - 1]) > 0 ? 'improving' : 'declining'
        }
      },
      anomalies,
      insights: [
        `Average monthly inflows: $${inflowMean.toFixed(2)}`,
        `Average monthly outflows: $${outflowMean.toFixed(2)}`,
        `${anomalies.length} anomalies detected in the period`
      ],
      recommendations: [
        {
          category: 'Liquidity',
          description: 'Maintain minimum cash reserves',
          potentialImpact: 'Operational stability',
          urgency: 'high'
        }
      ]
    });

    await analysis.save();
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
