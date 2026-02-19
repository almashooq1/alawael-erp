/**
 * Financial Intelligence Service
 * خدمة الذكاء المالي والتنبؤ
 *
 * Features:
 * ✅ AI-Powered Financial Forecasting
 * ✅ Spending Pattern Analysis
 * ✅ Budget Optimization
 * ✅ Risk Assessment
 * ✅ Savings Recommendations
 * ✅ Investment Suggestions
 * ✅ Cash Flow Prediction
 */

import { EventEmitter } from 'events';
import { createLogger, Logger } from '../utils/logger';

// ============================================
// Types & Interfaces
// ============================================

export interface FinancialProfile {
  accountId: string;
  totalAssets: number;
  totalDebts: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  riskTolerance: 'low' | 'medium' | 'high';
  savingsRate: number;
  debtToIncomeRatio: number;
}

export interface SpendingPattern {
  category: string;
  monthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  yearOverYearChange: number;
  percentOfIncome: number;
  rank: number;
}

export interface CashFlowForecast {
  forecastDate: Date;
  periodDays: number;
  projectedBalance: number;
  projectedInflow: number;
  projectedOutflow: number;
  confidence: number; // 0-100
  scenarios: {
    optimistic: number;
    pessimistic: number;
    realistic: number;
  };
  alerts: string[];
}

export interface BudgetRecommendation {
  category: string;
  currentSpending: number;
  suggestedSpending: number;
  savingsPotential: number;
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
}

export interface InvestmentSuggestion {
  productType: 'savings' | 'investment' | 'insurance' | 'fixed-deposit';
  productName: string;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  investmentAmount: number;
  duration: number; // months
  reasoning: string;
  rating: number; // 0-5
}

export interface FinancialScore {
  accountId: string;
  score: number; // 0-100
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  expenses: {
    [category: string]: number;
  };
  savings: number;
  savingsRate: number;
  topCategories: SpendingPattern[];
  alerts: string[];
}

// ============================================
// Financial Intelligence Service
// ============================================

export class FinancialIntelligenceService extends EventEmitter {
  private logger: Logger;
  private mockMode: boolean;

  constructor() {
    super();
    this.logger = createLogger('FinancialIntelligenceService');
    this.mockMode =
      process.env.FINANCIAL_INTEL_MOCK === 'true' ||
      process.env.NODE_ENV === 'test' ||
      !!process.env.VITEST_WORKER_ID;

    this.logger.info('FinancialIntelligenceService initialized', { mockMode: this.mockMode });
  }

  // ============================================
  // Financial Profile Analysis
  // ============================================

  /**
   * Build financial profile from transaction history
   * بناء الملف الشخصي المالي من سجل المعاملات
   */
  async buildFinancialProfile(
    accountId: string,
    transactions: any[]
  ): Promise<FinancialProfile> {
    try {
      this.logger.info(`Building financial profile for: ${accountId}`);

      const profile: FinancialProfile = {
        accountId,
        totalAssets: 0,
        totalDebts: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        riskTolerance: 'medium',
        savingsRate: 0,
        debtToIncomeRatio: 0,
      };

      if (transactions.length === 0) {
        return profile;
      }

      // Calculate income and expenses
      let income = 0;
      let expenses = 0;

      transactions.forEach((txn) => {
        if (txn.transactionType === 'deposit' || txn.transactionType === 'transfer') {
          if (txn.amount > 0) {
            income += txn.amount;
          }
        } else if (
          txn.transactionType === 'withdrawal' ||
          txn.transactionType === 'payment'
        ) {
          expenses += txn.amount;
        }
      });

      profile.monthlyIncome = income / 3; // Assuming 3 months of data
      profile.monthlyExpenses = expenses / 3;
      profile.totalAssets = profile.monthlyIncome * 6; // Estimated 6-month emergency fund
      profile.savingsRate = (profile.monthlyIncome - profile.monthlyExpenses) / profile.monthlyIncome;
      profile.debtToIncomeRatio = profile.totalDebts / profile.monthlyIncome;

      this.emit('profileBuilt', profile);
      return profile;
    } catch (error: any) {
      this.logger.error('Failed to build financial profile', error);
      throw error;
    }
  }

  /**
   * Analyze spending patterns
   * تحليل أنماط الإنفاق
   */
  async analyzeSpendingPatterns(
    transactions: any[],
    periodMonths: number = 6
  ): Promise<SpendingPattern[]> {
    try {
      this.logger.info(`Analyzing spending patterns for ${periodMonths} months`);

      const categoriesMap = new Map<string, number>();

      transactions.forEach((txn) => {
        if (txn.transactionType === 'payment' || txn.transactionType === 'withdrawal') {
          const category = this.categorizeTransaction(txn.description);
          const current = categoriesMap.get(category) || 0;
          categoriesMap.set(category, current + txn.amount);
        }
      });

      const totalExpenses = Array.from(categoriesMap.values()).reduce((a, b) => a + b, 0);

      const patterns: SpendingPattern[] = Array.from(categoriesMap.entries()).map(
        ([category, amount], index) => ({
          category,
          monthly: amount / periodMonths,
          trend: this.calculateTrend(amount, totalExpenses),
          yearOverYearChange: Math.random() * 20 - 10, // Mock data
          percentOfIncome: (amount / totalExpenses) * 100,
          rank: index + 1,
        })
      );

      return patterns.sort((a, b) => b.monthly - a.monthly);
    } catch (error: any) {
      this.logger.error('Failed to analyze spending patterns', error);
      throw error;
    }
  }

  /**
   * Generate cash flow forecast
   * توليد توقعات التدفق النقدي
   */
  async generateCashFlowForecast(
    currentBalance: number,
    monthlyIncome: number,
    monthlyExpenses: number,
    forecastDays: number = 90
  ): Promise<CashFlowForecast> {
    try {
      this.logger.info(`Generating cash flow forecast for ${forecastDays} days`);

      const dailyNetFlow = (monthlyIncome - monthlyExpenses) / 30;
      const projectedBalance = currentBalance + dailyNetFlow * forecastDays;

      const forecast: CashFlowForecast = {
        forecastDate: new Date(),
        periodDays: forecastDays,
        projectedBalance,
        projectedInflow: monthlyIncome * (forecastDays / 30),
        projectedOutflow: monthlyExpenses * (forecastDays / 30),
        confidence: this.calculateForecastConfidence(forecastDays),
        scenarios: {
          optimistic: projectedBalance * 1.15,
          pessimistic: projectedBalance * 0.85,
          realistic: projectedBalance,
        },
        alerts: this.generateForecastAlerts(projectedBalance, monthlyIncome, monthlyExpenses),
      };

      this.emit('forecastGenerated', forecast);
      return forecast;
    } catch (error: any) {
      this.logger.error('Failed to generate cash flow forecast', error);
      throw error;
    }
  }

  /**
   * Get budget recommendations
   * الحصول على توصيات الميزانية
   */
  async getBudgetRecommendations(
    spendingPatterns: SpendingPattern[],
    monthlyIncome: number
  ): Promise<BudgetRecommendation[]> {
    try {
      this.logger.info('Generating budget recommendations');

      const recommendations: BudgetRecommendation[] = [];

      spendingPatterns.forEach((pattern) => {
        const optimalPercentage = this.getOptimalCategoryPercentage(pattern.category);
        const currentPercentage = pattern.percentOfIncome;

        if (currentPercentage > optimalPercentage * 1.2) {
          const currentSpending = pattern.monthly;
          const suggestedSpending = (monthlyIncome * optimalPercentage) / 100;
          const savingsPotential = currentSpending - suggestedSpending;

          recommendations.push({
            category: pattern.category,
            currentSpending,
            suggestedSpending,
            savingsPotential,
            reasoning: `Your ${pattern.category} spending is ${Math.round(
              currentPercentage - optimalPercentage
            )}% higher than recommended.`,
            priority: savingsPotential > 5000 ? 'high' : 'medium',
          });
        }
      });

      return recommendations.sort((a, b) => b.savingsPotential - a.savingsPotential);
    } catch (error: any) {
      this.logger.error('Failed to generate budget recommendations', error);
      throw error;
    }
  }

  /**
   * Get investment suggestions
   * الحصول على اقتراحات الاستثمار
   */
  async getInvestmentSuggestions(profile: FinancialProfile): Promise<InvestmentSuggestion[]> {
    try {
      this.logger.info('Generating investment suggestions');

      const suggestions: InvestmentSuggestion[] = [];
      const availableAmount = profile.monthlyIncome - profile.monthlyExpenses;

      // Fixed Deposit (Low Risk)
      suggestions.push({
        productType: 'fixed-deposit',
        productName: 'Fixed Deposit - 12 Months',
        expectedReturn: 0.035,
        riskLevel: 'low',
        investmentAmount: availableAmount * 0.3,
        duration: 12,
        reasoning: 'Safe option with guaranteed returns',
        rating: 4,
      });

      // Savings Account (Very Low Risk)
      suggestions.push({
        productType: 'savings',
        productName: 'Premium Savings Account',
        expectedReturn: 0.02,
        riskLevel: 'low',
        investmentAmount: availableAmount * 0.2,
        duration: 12,
        reasoning: 'Liquid savings with competitive rates',
        rating: 3.5,
      });

      // Investment (Medium Risk) - only for medium/high risk tolerance
      if (profile.riskTolerance !== 'low') {
        suggestions.push({
          productType: 'investment',
          productName: 'Balanced Mutual Fund',
          expectedReturn: 0.07,
          riskLevel: 'medium',
          investmentAmount: availableAmount * 0.25,
          duration: 36,
          reasoning: 'Diversified portfolio with moderate growth',
          rating: 4.2,
        });
      }

      // Insurance (If needed)
      if (profile.totalAssets / profile.totalDebts < 3) {
        suggestions.push({
          productType: 'insurance',
          productName: 'Term Life Insurance',
          expectedReturn: 0,
          riskLevel: 'low',
          investmentAmount: profile.monthlyIncome * 0.1,
          duration: 240,
          reasoning: 'Financial protection for dependents',
          rating: 4.5,
        });
      }

      this.emit('suggestionsGenerated', suggestions);
      return suggestions;
    } catch (error: any) {
      this.logger.error('Failed to generate investment suggestions', error);
      throw error;
    }
  }

  /**
   * Calculate financial health score
   * حساب درجة الصحة المالية
   */
  async calculateFinancialScore(profile: FinancialProfile): Promise<FinancialScore> {
    try {
      this.logger.info(`Calculating financial score for: ${profile.accountId}`);

      let score = 50; // Base score
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      // Savings rate (max +20 points)
      if (profile.savingsRate > 0.2) {
        score += Math.min(20, profile.savingsRate * 100);
        strengths.push('Good savings rate');
      } else if (profile.savingsRate < 0) {
        score -= 15;
        weaknesses.push('Spending exceeds income');
      }

      // Debt to income ratio (max +15 points)
      if (profile.debtToIncomeRatio < 0.3) {
        score += 15;
        strengths.push('Low debt levels');
      } else if (profile.debtToIncomeRatio > 0.5) {
        score -= 10;
        weaknesses.push('High debt to income ratio');
      }

      // Emergency fund (max +15 points)
      const emergencyFundMonths = profile.totalAssets / profile.monthlyExpenses;
      if (emergencyFundMonths >= 6) {
        score += 15;
        strengths.push('Adequate emergency fund');
      } else if (emergencyFundMonths < 3) {
        score -= 10;
        weaknesses.push('Insufficient emergency reserves');
      }

      // Cap score
      score = Math.min(100, Math.max(0, score));

      const rating: 'poor' | 'fair' | 'good' | 'excellent' =
        score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';

      const recommendations: string[] = [];
      if (profile.savingsRate < 0.1) {
        recommendations.push('Increase your savings rate to 10% of income');
      }
      if (profile.debtToIncomeRatio > 0.4) {
        recommendations.push('Work on reducing debt levels');
      }
      if (emergencyFundMonths < 6) {
        recommendations.push('Build emergency fund to 6 months of expenses');
      }

      const financialScore: FinancialScore = {
        accountId: profile.accountId,
        score,
        rating,
        strengths,
        weaknesses,
        recommendations,
      };

      this.emit('scoreCalculated', financialScore);
      return financialScore;
    } catch (error: any) {
      this.logger.error('Failed to calculate financial score', error);
      throw error;
    }
  }

  /**
   * Generate monthly report
   * إنشاء تقرير شهري
   */
  async generateMonthlyReport(
    transactions: any[],
    month: number,
    year: number
  ): Promise<MonthlyReport> {
    try {
      this.logger.info(`Generating monthly report for ${month}/${year}`);

      const monthTransactions = transactions.filter((txn) => {
        const txnDate = new Date(txn.initiatedAt);
        return txnDate.getMonth() === month && txnDate.getFullYear() === year;
      });

      let income = 0;
      const expenses: Record<string, number> = {};

      monthTransactions.forEach((txn) => {
        if (txn.transactionType === 'deposit') {
          income += txn.amount;
        } else if (txn.transactionType === 'payment' || txn.transactionType === 'withdrawal') {
          const category = this.categorizeTransaction(txn.description);
          expenses[category] = (expenses[category] || 0) + txn.amount;
        }
      });

      const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
      const savings = income - totalExpenses;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;

      const topCategories = Object.entries(expenses)
        .map(([category, amount]) => ({
          category,
          monthly: amount,
          trend: 'stable' as const,
          yearOverYearChange: 0,
          percentOfIncome: (amount / income) * 100,
          rank: 0,
        }))
        .sort((a, b) => b.monthly - a.monthly)
        .slice(0, 5)
        .map((cat, idx) => ({ ...cat, rank: idx + 1 }));

      const alerts = this.generateMonthlyAlerts(income, savings, savingsRate);

      const report: MonthlyReport = {
        month: new Date(year, month).toLocaleDateString('ar-SA', { month: 'long' }),
        year,
        income,
        expenses,
        savings,
        savingsRate,
        topCategories,
        alerts,
      };

      this.emit('reportGenerated', report);
      return report;
    } catch (error: any) {
      this.logger.error('Failed to generate monthly report', error);
      throw error;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Categorize transaction based on description
   * تصنيف المعاملة بناءً على الوصف
   */
  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();

    const categories = {
      'Food & Dining': ['food', 'restaurant', 'coffee', 'grocery', 'supermarket'],
      'Transportation': ['uber', 'taxi', 'petrol', 'gas', 'transport', 'flight', 'hotel'],
      'Entertainment': ['movie', 'game', 'book', 'spotify', 'netflix', 'concert'],
      'Shopping': ['shop', 'mall', 'store', 'amazon', 'clothes', 'shoes'],
      'Utilities': ['electricity', 'water', 'internet', 'phone', 'utility'],
      'Healthcare': ['doctor', 'pharmacy', 'hospital', 'medical'],
      'Salary': ['salary', 'income', 'bonus', 'allowance'],
      'Other': [],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => desc.includes(keyword))) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Get optimal spending percentage for category
   * الحصول على نسبة الإنفاق الموصى بها للفئة
   */
  private getOptimalCategoryPercentage(category: string): number {
    const percentages: Record<string, number> = {
      'Food & Dining': 10,
      'Transportation': 15,
      'Entertainment': 5,
      'Shopping': 10,
      'Utilities': 10,
      'Healthcare': 5,
      'Savings': 20,
      'Other': 25,
    };

    return percentages[category] || 10;
  }

  /**
   * Calculate trend direction
   * حساب اتجاه الاتجاه
   */
  private calculateTrend(current: number, total: number): 'increasing' | 'decreasing' | 'stable' {
    const percentage = (current / total) * 100;
    if (percentage > 40) return 'increasing';
    if (percentage < 20) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate forecast confidence based on period
   * حساب ثقة التنبؤ بناءً على الفترة
   */
  private calculateForecastConfidence(days: number): number {
    if (days <= 30) return 95;
    if (days <= 60) return 85;
    if (days <= 90) return 75;
    return Math.max(50, 90 - days / 10);
  }

  /**
   * Generate forecast alerts
   * إنشاء تنبيهات التنبؤ
   */
  private generateForecastAlerts(
    projectedBalance: number,
    monthlyIncome: number,
    monthlyExpenses: number
  ): string[] {
    const alerts: string[] = [];

    if (projectedBalance < 0) {
      alerts.push('Warning: Projected negative balance');
    }
    if (projectedBalance < monthlyExpenses) {
      alerts.push('Alert: Balance may not cover monthly expenses');
    }
    if (monthlyExpenses > monthlyIncome * 1.1) {
      alerts.push('Warning: Expenses exceed income');
    }

    return alerts;
  }

  /**
   * Generate monthly alerts
   * إنشاء تنبيهات شهرية
   */
  private generateMonthlyAlerts(
    income: number,
    savings: number,
    savingsRate: number
  ): string[] {
    const alerts: string[] = [];

    if (savingsRate < 0) {
      alerts.push('Alert: You spent more than you earned this month');
    }
    if (savingsRate < 10) {
      alerts.push('Warning: Savings rate is below recommended 10%');
    }
    if (savings > income * 0.3) {
      alerts.push('Good: You saved more than 30% of income');
    }

    return alerts;
  }

  /**
   * Get service status
   * الحصول على حالة الخدمة
   */
  getStatus(): {
    operational: boolean;
    mockMode: boolean;
  } {
    return {
      operational: true,
      mockMode: this.mockMode,
    };
  }
}

export default new FinancialIntelligenceService();
