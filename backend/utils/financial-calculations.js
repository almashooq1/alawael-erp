/**
 * ===================================================================
 * FINANCIAL CALCULATIONS - الحسابات المالية
 * ===================================================================
 */

/**
 * حساب ضريبة القيمة المضافة
 */
function calculateVAT(amount, rate = 0.15, includeTax = false) {
  if (includeTax) {
    // المبلغ شامل الضريبة - نستخرج الضريبة
    const taxAmount = amount - amount / (1 + rate);
    const baseAmount = amount - taxAmount;
    return {
      baseAmount: parseFloat(baseAmount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(amount.toFixed(2)),
    };
  } else {
    // المبلغ بدون ضريبة - نضيف الضريبة
    const taxAmount = amount * rate;
    const totalAmount = amount + taxAmount;
    return {
      baseAmount: parseFloat(amount.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    };
  }
}

/**
 * حساب النسب المالية
 */
function calculateFinancialRatios(balanceSheet, incomeStatement) {
  const ratios = {};

  // نسب السيولة
  if (balanceSheet.currentAssets && balanceSheet.currentLiabilities) {
    ratios.currentRatio = balanceSheet.currentAssets / balanceSheet.currentLiabilities;

    if (balanceSheet.inventory) {
      ratios.quickRatio =
        (balanceSheet.currentAssets - balanceSheet.inventory) / balanceSheet.currentLiabilities;
    }
  }

  // نسب الربحية
  if (incomeStatement.netIncome && incomeStatement.revenue) {
    ratios.profitMargin = (incomeStatement.netIncome / incomeStatement.revenue) * 100;
  }

  if (incomeStatement.netIncome && balanceSheet.totalAssets) {
    ratios.returnOnAssets = (incomeStatement.netIncome / balanceSheet.totalAssets) * 100;
  }

  if (incomeStatement.netIncome && balanceSheet.equity) {
    ratios.returnOnEquity = (incomeStatement.netIncome / balanceSheet.equity) * 100;
  }

  // نسب المديونية
  if (balanceSheet.totalLiabilities && balanceSheet.totalAssets) {
    ratios.debtToAssets = (balanceSheet.totalLiabilities / balanceSheet.totalAssets) * 100;
  }

  if (balanceSheet.totalLiabilities && balanceSheet.equity) {
    ratios.debtToEquity = (balanceSheet.totalLiabilities / balanceSheet.equity) * 100;
  }

  // نسب النشاط
  if (incomeStatement.revenue && balanceSheet.totalAssets) {
    ratios.assetTurnover = incomeStatement.revenue / balanceSheet.totalAssets;
  }

  // تقريب النتائج
  Object.keys(ratios).forEach(key => {
    ratios[key] = parseFloat(ratios[key].toFixed(2));
  });

  return ratios;
}

/**
 * حساب الإهلاك - القسط الثابت
 */
function calculateStraightLineDepreciation(cost, salvageValue, usefulLife) {
  const annualDepreciation = (cost - salvageValue) / usefulLife;
  return parseFloat(annualDepreciation.toFixed(2));
}

/**
 * حساب الإهلاك - القسط المتناقص
 */
function calculateDecliningBalanceDepreciation(bookValue, rate) {
  const depreciation = bookValue * rate;
  return parseFloat(depreciation.toFixed(2));
}

/**
 * حساب نقطة التعادل
 */
function calculateBreakEvenPoint(fixedCosts, pricePerUnit, variableCostPerUnit) {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const breakEvenUnits = fixedCosts / contributionMargin;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;

  return {
    units: Math.ceil(breakEvenUnits),
    revenue: parseFloat(breakEvenRevenue.toFixed(2)),
    contributionMargin: parseFloat(contributionMargin.toFixed(2)),
  };
}

/**
 * حساب القيمة الحالية
 */
function calculatePresentValue(futureValue, rate, periods) {
  const pv = futureValue / Math.pow(1 + rate, periods);
  return parseFloat(pv.toFixed(2));
}

/**
 * حساب القيمة المستقبلية
 */
function calculateFutureValue(presentValue, rate, periods) {
  const fv = presentValue * Math.pow(1 + rate, periods);
  return parseFloat(fv.toFixed(2));
}

/**
 * حساب صافي القيمة الحالية (NPV)
 */
function calculateNPV(cashFlows, discountRate) {
  let npv = 0;
  cashFlows.forEach((cashFlow, index) => {
    npv += cashFlow / Math.pow(1 + discountRate, index);
  });
  return parseFloat(npv.toFixed(2));
}

/**
 * حساب معدل العائد الداخلي (IRR)
 */
function calculateIRR(cashFlows, guess = 0.1) {
  const maxIterations = 1000;
  const tolerance = 0.00001;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    cashFlows.forEach((cashFlow, period) => {
      npv += cashFlow / Math.pow(1 + rate, period);
      dnpv -= (period * cashFlow) / Math.pow(1 + rate, period + 1);
    });

    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < tolerance) {
      return parseFloat((newRate * 100).toFixed(2));
    }

    rate = newRate;
  }

  return null; // لم يتم العثور على حل
}

/**
 * حساب فترة الاسترداد
 */
function calculatePaybackPeriod(initialInvestment, annualCashFlows) {
  let cumulativeCashFlow = 0;

  for (let year = 0; year < annualCashFlows.length; year++) {
    cumulativeCashFlow += annualCashFlows[year];

    if (cumulativeCashFlow >= initialInvestment) {
      // حساب الكسر من السنة
      const previousCumulative = cumulativeCashFlow - annualCashFlows[year];
      const remainingAmount = initialInvestment - previousCumulative;
      const fraction = remainingAmount / annualCashFlows[year];

      return parseFloat((year + fraction).toFixed(2));
    }
  }

  return null; // لم يتم الاسترداد
}

/**
 * حساب الخصم التجاري
 */
function calculateTradeDiscount(listPrice, discountRate) {
  const discountAmount = listPrice * discountRate;
  const netPrice = listPrice - discountAmount;

  return {
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    netPrice: parseFloat(netPrice.toFixed(2)),
  };
}

/**
 * حساب متوسط التكلفة المرجح
 */
function calculateWeightedAverageCost(items) {
  let totalCost = 0;
  let totalQuantity = 0;

  items.forEach(item => {
    totalCost += item.quantity * item.unitCost;
    totalQuantity += item.quantity;
  });

  const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;

  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    totalQuantity,
    averageCost: parseFloat(averageCost.toFixed(2)),
  };
}

/**
 * حساب نسبة النمو
 */
function calculateGrowthRate(oldValue, newValue) {
  const growthRate = ((newValue - oldValue) / oldValue) * 100;
  return parseFloat(growthRate.toFixed(2));
}

/**
 * تحليل التباين
 */
function calculateVariance(actual, budget) {
  const variance = actual - budget;
  const variancePercentage = budget !== 0 ? (variance / budget) * 100 : 0;

  return {
    variance: parseFloat(variance.toFixed(2)),
    variancePercentage: parseFloat(variancePercentage.toFixed(2)),
    status: variance >= 0 ? 'favorable' : 'unfavorable',
  };
}

/**
 * حساب رأس المال العامل
 */
function calculateWorkingCapital(currentAssets, currentLiabilities) {
  const workingCapital = currentAssets - currentLiabilities;
  return parseFloat(workingCapital.toFixed(2));
}

/**
 * تنسيق العملة
 */
function formatCurrency(amount, currency = 'SAR', locale = 'ar-SA') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * تنسيق النسبة المئوية
 */
function formatPercentage(value, decimals = 2) {
  return `${value.toFixed(decimals)}%`;
}

module.exports = {
  calculateVAT,
  calculateFinancialRatios,
  calculateStraightLineDepreciation,
  calculateDecliningBalanceDepreciation,
  calculateBreakEvenPoint,
  calculatePresentValue,
  calculateFutureValue,
  calculateNPV,
  calculateIRR,
  calculatePaybackPeriod,
  calculateTradeDiscount,
  calculateWeightedAverageCost,
  calculateGrowthRate,
  calculateVariance,
  calculateWorkingCapital,
  formatCurrency,
  formatPercentage,
};
