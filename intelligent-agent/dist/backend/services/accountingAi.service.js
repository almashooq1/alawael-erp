"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinancialForecast = exports.getAdvancedInsightsReport = exports.getFinancialInsights = exports.getFinancialSnapshot = exports.getCashFlowStatement = exports.getIncomeStatement = exports.getBalanceSheet = void 0;
const ACCOUNTING_API_BASE_URL = process.env.ACCOUNTING_API_BASE_URL || 'http://localhost:5001/api/accounting';
const ACCOUNTING_API_TOKEN = process.env.ACCOUNTING_API_TOKEN;
const normalizeNumber = (value) => (Number.isFinite(value) ? Number(value) : 0);
const buildUrl = (path, params) => {
    const base = ACCOUNTING_API_BASE_URL.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    const url = new URL(`${base}/${cleanPath}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }
    return url;
};
const fetchJson = async (url) => {
    const headers = {
        Accept: 'application/json',
    };
    if (ACCOUNTING_API_TOKEN) {
        headers.Authorization = `Bearer ${ACCOUNTING_API_TOKEN}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Accounting API error: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json());
    if (payload && payload.success === false) {
        throw new Error(payload.message || 'Accounting API returned failure');
    }
    return payload.data;
};
const getBalanceSheet = async (asOfDate) => {
    const url = buildUrl('reports/balance-sheet', { asOfDate });
    return fetchJson(url);
};
exports.getBalanceSheet = getBalanceSheet;
const getIncomeStatement = async (startDate, endDate) => {
    const url = buildUrl('reports/income-statement', { startDate, endDate });
    return fetchJson(url);
};
exports.getIncomeStatement = getIncomeStatement;
const getCashFlowStatement = async (startDate, endDate) => {
    const url = buildUrl('reports/cash-flow', { startDate, endDate });
    return fetchJson(url);
};
exports.getCashFlowStatement = getCashFlowStatement;
const getFinancialSnapshot = async (params) => {
    const [balanceSheet, incomeStatement, cashFlowStatement] = await Promise.all([
        (0, exports.getBalanceSheet)(params.asOfDate),
        (0, exports.getIncomeStatement)(params.startDate, params.endDate),
        params.includeCashFlow ? (0, exports.getCashFlowStatement)(params.startDate, params.endDate) : Promise.resolve(undefined),
    ]);
    return {
        balanceSheet,
        incomeStatement,
        cashFlowStatement,
    };
};
exports.getFinancialSnapshot = getFinancialSnapshot;
const getFinancialInsights = async (params) => {
    const snapshot = await (0, exports.getFinancialSnapshot)({
        ...params,
        includeCashFlow: true,
    });
    const totalCurrentAssets = normalizeNumber(snapshot.balanceSheet.assets?.totalCurrentAssets);
    const totalFixedAssets = normalizeNumber(snapshot.balanceSheet.assets?.totalFixedAssets);
    const totalAssets = normalizeNumber(snapshot.balanceSheet.assets?.totalAssets) ||
        totalCurrentAssets + totalFixedAssets;
    const totalCurrentLiabilities = normalizeNumber(snapshot.balanceSheet.liabilities?.totalCurrentLiabilities);
    const totalLongTermLiabilities = normalizeNumber(snapshot.balanceSheet.liabilities?.totalLongTermLiabilities);
    const totalLiabilities = normalizeNumber(snapshot.balanceSheet.liabilities?.totalLiabilities) ||
        totalCurrentLiabilities + totalLongTermLiabilities;
    const totalEquity = normalizeNumber(snapshot.balanceSheet.equity?.totalEquity);
    const totalRevenue = normalizeNumber(snapshot.incomeStatement.revenue?.totalRevenue);
    const totalExpenses = normalizeNumber(snapshot.incomeStatement.expenses?.totalExpenses);
    const netProfit = normalizeNumber(snapshot.incomeStatement.profitMetrics?.netProfit) ||
        totalRevenue - totalExpenses;
    const currentRatio = totalCurrentLiabilities > 0 ? totalCurrentAssets / totalCurrentLiabilities : 0;
    const debtToAssets = totalAssets > 0 ? totalLiabilities / totalAssets : 0;
    const netMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0;
    let riskScore = 0;
    if (currentRatio > 0 && currentRatio < 1)
        riskScore += 40;
    if (debtToAssets > 0.6)
        riskScore += 30;
    if (netMargin < 0.05)
        riskScore += 20;
    if (netProfit < 0)
        riskScore += 30;
    const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
    const recommendations = [];
    if (currentRatio > 0 && currentRatio < 1)
        recommendations.push('تحسين السيولة من خلال زيادة الأصول المتداولة أو خفض الخصوم المتداولة.');
    if (debtToAssets > 0.6)
        recommendations.push('خفض المديونية عبر إعادة هيكلة الالتزامات أو تحسين التدفقات النقدية.');
    if (netMargin < 0.05)
        recommendations.push('مراجعة هيكل التكاليف لتحسين هامش الربح.');
    if (netProfit < 0)
        recommendations.push('خفض المصروفات التشغيلية أو زيادة الإيرادات لتحويل الربحية إلى إيجابية.');
    if (snapshot.balanceSheet.balanceCheck === false) {
        recommendations.push('تحقق من توازن الميزانية العمومية (الأصول ≠ الخصوم + حقوق الملكية).');
    }
    return {
        snapshot,
        metrics: {
            totalAssets,
            totalLiabilities,
            totalEquity,
            totalRevenue,
            totalExpenses,
            netProfit,
            currentRatio,
            debtToAssets,
            netMargin,
        },
        risk: {
            score: riskScore,
            level: riskLevel,
        },
        recommendations,
    };
};
exports.getFinancialInsights = getFinancialInsights;
const getAdvancedInsightsReport = async (params) => {
    const insights = await (0, exports.getFinancialInsights)(params);
    const liquiditySignal = insights.metrics.currentRatio > 0 && insights.metrics.currentRatio < 1
        ? 'ضعيفة'
        : insights.metrics.currentRatio >= 1.2
            ? 'مستقرة'
            : 'متوسطة';
    const leverageSignal = insights.metrics.debtToAssets > 0.6
        ? 'مرتفعة'
        : insights.metrics.debtToAssets > 0.4
            ? 'متوسطة'
            : 'منخفضة';
    const profitabilitySignal = insights.metrics.netMargin < 0
        ? 'سلبية'
        : insights.metrics.netMargin < 0.05
            ? 'منخفضة'
            : insights.metrics.netMargin < 0.15
                ? 'متوسطة'
                : 'مرتفعة';
    const executiveSummary = [
        `مستوى المخاطر: ${insights.risk.level === 'high' ? 'مرتفع' : insights.risk.level === 'medium' ? 'متوسط' : 'منخفض'}.`,
        `السيولة ${liquiditySignal}، والرافعة المالية ${leverageSignal}، والربحية ${profitabilitySignal}.`,
        `صافي الربح الحالي ${insights.metrics.netProfit.toLocaleString('ar-SA')} ر.س مع هامش ${(insights.metrics.netMargin * 100).toFixed(1)}%.`,
    ];
    const alerts = [];
    if (insights.metrics.currentRatio > 0 && insights.metrics.currentRatio < 1) {
        alerts.push({ level: 'critical', message: 'نسبة السيولة أقل من 1، راجع الالتزامات قصيرة الأجل.' });
    }
    if (insights.metrics.debtToAssets > 0.6) {
        alerts.push({ level: 'warning', message: 'المديونية مرتفعة مقارنة بالأصول.' });
    }
    if (insights.metrics.netMargin < 0.05) {
        alerts.push({ level: 'warning', message: 'هامش الربح منخفض، راجع هيكل التكاليف.' });
    }
    if (insights.metrics.netProfit < 0) {
        alerts.push({ level: 'critical', message: 'صافي الربح سلبي خلال الفترة الحالية.' });
    }
    return {
        generatedAt: new Date().toISOString(),
        period: { startDate: params.startDate, endDate: params.endDate, asOfDate: params.asOfDate },
        executiveSummary,
        signals: {
            liquidity: liquiditySignal,
            leverage: leverageSignal,
            profitability: profitabilitySignal,
        },
        alerts,
        insights,
    };
};
exports.getAdvancedInsightsReport = getAdvancedInsightsReport;
const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
};
const monthLabel = (date) => date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short' });
const getFinancialForecast = async (params) => {
    const historyMonths = params.historyMonths ?? 6;
    const forecastMonths = params.forecastMonths ?? 3;
    const asOf = new Date(params.asOfDate);
    const history = [];
    for (let i = historyMonths - 1; i >= 0; i -= 1) {
        const target = new Date(asOf.getFullYear(), asOf.getMonth() - i, 1);
        const range = getMonthRange(target);
        const incomeStatement = await (0, exports.getIncomeStatement)(range.start.toISOString(), range.end.toISOString());
        const revenue = normalizeNumber(incomeStatement.revenue?.totalRevenue);
        const expenses = normalizeNumber(incomeStatement.expenses?.totalExpenses);
        history.push({
            month: monthLabel(target),
            revenue,
            expenses,
            netProfit: revenue - expenses,
        });
    }
    const calcAverageGrowth = (series) => {
        if (series.length < 2)
            return 0;
        const deltas = series.slice(1).map((value, idx) => value - series[idx]);
        return deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
    };
    const calcVolatility = (series) => {
        if (series.length < 2)
            return 0;
        const deltas = series.slice(1).map((value, idx) => value - series[idx]);
        const avg = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
        const variance = deltas.reduce((sum, value) => sum + (value - avg) ** 2, 0) / deltas.length;
        return Math.sqrt(variance);
    };
    const revenueSeries = history.map(item => item.revenue);
    const expenseSeries = history.map(item => item.expenses);
    const revenueGrowth = calcAverageGrowth(revenueSeries);
    const expenseGrowth = calcAverageGrowth(expenseSeries);
    const revenueVolatility = calcVolatility(revenueSeries);
    const expenseVolatility = calcVolatility(expenseSeries);
    const forecast = [];
    let lastRevenue = revenueSeries[revenueSeries.length - 1] ?? 0;
    let lastExpense = expenseSeries[expenseSeries.length - 1] ?? 0;
    for (let i = 1; i <= forecastMonths; i += 1) {
        const target = new Date(asOf.getFullYear(), asOf.getMonth() + i, 1);
        lastRevenue = Math.max(0, lastRevenue + revenueGrowth);
        lastExpense = Math.max(0, lastExpense + expenseGrowth);
        forecast.push({
            month: monthLabel(target),
            revenue: lastRevenue,
            expenses: lastExpense,
            netProfit: lastRevenue - lastExpense,
        });
    }
    const confidence = Math.max(0.3, 1 - (revenueVolatility + expenseVolatility) / (Math.max(...revenueSeries, 1) + Math.max(...expenseSeries, 1)));
    return {
        generatedAt: new Date().toISOString(),
        asOfDate: params.asOfDate,
        history,
        forecast,
        model: {
            historyMonths,
            forecastMonths,
            revenueGrowth,
            expenseGrowth,
            revenueVolatility,
            expenseVolatility,
            confidence: Number(confidence.toFixed(2)),
        },
    };
};
exports.getFinancialForecast = getFinancialForecast;
