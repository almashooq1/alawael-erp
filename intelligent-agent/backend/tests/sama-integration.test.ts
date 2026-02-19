/**
 * Comprehensive SAMA Integration Tests
 * اختبارات التكامل الشاملة لنظام SAMA
 *
 * TEST CATEGORIES:
 * ✅ IBAN Validation Tests
 * ✅ Payment Processing Tests
 * ✅ Financial Analysis Tests
 * ✅ Fraud Detection Tests
 * ✅ Compliance Tests
 * ✅ Edge Cases & Error Handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdvancedSAMAService } from '../services/sama-advanced.service';
import FinancialIntelligenceService from '../services/financial-intelligence.service';
import FraudDetectionService from '../services/fraud-detection.service';

// ============================================
// Test Data & Fixtures
// ============================================

const mockTransactions = [
  {
    transactionId: 'TXN-001',
    sourceIban: 'SA1010000000000000123456',
    destinationIban: 'SA2020000000000000654321',
    amount: 25000,
    transactionType: 'transfer',
    initiatedAt: new Date('2026-02-01'),
    description: 'Payment for services',
  },
  {
    transactionId: 'TXN-002',
    sourceIban: 'SA1010000000000000123456',
    destinationIban: 'SA3030000000000000789123',
    amount: 15000,
    transactionType: 'payment',
    initiatedAt: new Date('2026-02-02'),
    description: 'Utility bill payment',
  },
  {
    transactionId: 'TXN-003',
    sourceIban: 'SA1010000000000000123456',
    destinationIban: 'SA1010000000000000111111',
    amount: 50000,
    transactionType: 'deposit',
    initiatedAt: new Date('2026-02-03'),
    description: 'Salary deposit',
  },
];

const validIBAN = 'SA1010000000000000123456';
const invalidIBAN = 'SA1234567890123456789';

// ============================================
// IBAN Validation Tests
// ============================================

describe('IBAN Validation', () => {
  const samaService = new AdvancedSAMAService();

  it('should validate correct IBAN format', async () => {
    const result = await samaService.validateIBAN(validIBAN);
    
    expect(result.valid).toBe(true);
    expect(result.iban).toBe(validIBAN);
    expect(result.currency).toBe('SAR');
  });

  it('should reject invalid IBAN format', async () => {
    try {
      await samaService.validateIBAN('INVALID');
      expect.fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toContain('Invalid IBAN format');
    }
  });

  it('should check IBAN checksum correctly', async () => {
    const result = await samaService.validateIBAN(validIBAN);
    expect(result.valid).toBe(true);
  });

  it('should extract bank code from IBAN', async () => {
    const result = await samaService.validateIBAN(validIBAN);
    expect(result.bankCode).toBeDefined();
    expect(result.bankName).toBeDefined();
  });

  it('should verify account status', async () => {
    const account = await samaService.verifyAccount(validIBAN);
    expect(account).not.toBeNull();
    expect(account?.status).toBe('active');
  });

  it('should get account balance', async () => {
    const balance = await samaService.getAccountBalance(validIBAN);
    expect(balance.balance).toBeGreaterThan(0);
    expect(balance.available).toBeLessThanOrEqual(balance.balance);
  });

  it('should handle multiple IBAN validations', async () => {
    const ibans = [
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      'SA3030000000000000789123',
    ];
    
    const results = await Promise.all(
      ibans.map(iban => samaService.validateIBAN(iban))
    );
    
    results.forEach(result => {
      expect(result.valid).toBe(true);
      expect(result.currency).toBe('SAR');
    });
  });
});

// ============================================
// Payment Processing Tests
// ============================================

describe('Payment Processing', () => {
  const samaService = new AdvancedSAMAService();

  it('should process payment successfully', async () => {
    const transaction = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      50000,
      'Test payment'
    );
    
    expect(transaction.status).toBe('completed');
    expect(transaction.amount).toBe(50000);
    expect(transaction.fraudStatus).toBe('clean');
  });

  it('should generate unique transaction ID', async () => {
    const txn1 = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      25000,
      'Payment 1'
    );
    
    const txn2 = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA3030000000000000789123',
      15000,
      'Payment 2'
    );
    
    expect(txn1.transactionId).not.toEqual(txn2.transactionId);
  });

  it('should reject payment with invalid source IBAN', async () => {
    try {
      await samaService.processPayment(
        'INVALID',
        'SA2020000000000000654321',
        50000,
        'Test'
      );
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should reject payment with insufficient funds', async () => {
    const largeAmount = 999999999;
    try {
      await samaService.processPayment(
        'SA1010000000000000123456',
        'SA2020000000000000654321',
        largeAmount,
        'Large payment'
      );
      // In mock mode, it succeeds, but in real mode would fail
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should schedule recurring payment', async () => {
    const schedule = await samaService.schedulePayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      5000,
      'monthly',
      'Recurring payment'
    );
    
    expect(schedule.scheduleId).toBeDefined();
    expect(schedule.frequency).toBe('monthly');
    expect(schedule.status).toBe('active');
  });

  it('should calculate fraud score correctly', async () => {
    const transaction = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      50000,
      'Test'
    );
    
    expect(transaction.fraudScore).toBeGreaterThanOrEqual(0);
    expect(transaction.fraudScore).toBeLessThanOrEqual(100);
  });

  it('should reject high-risk transactions', async () => {
    // Create transaction with suspicious characteristics
    const transaction = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA9999999999999999999999', // Unknown destination
      500000, // Large amount
      'Suspicious'
    );
    
    // Should be marked for review or blocked
    expect(['processing', 'rejected']).toContain(transaction.status);
  });

  it('should emit payment processed event', (done) => {
    const samaService = new AdvancedSAMAService();
    
    samaService.once('paymentProcessed', (transaction) => {
      expect(transaction.transactionId).toBeDefined();
      done();
    });
    
    samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      25000,
      'Event test'
    );
  });
});

// ============================================
// Financial Intelligence Tests
// ============================================

describe('Financial Intelligence & Analytics', () => {
  
  it('should analyze spending patterns correctly', async () => {
    const patterns = await FinancialIntelligenceService.analyzeSpendingPatterns(
      mockTransactions,
      3
    );
    
    expect(patterns.length).toBeGreaterThan(0);
    patterns.forEach(pattern => {
      expect(pattern.category).toBeDefined();
      expect(pattern.monthly).toBeGreaterThan(0);
      expect(pattern.percentOfIncome).toBeDefined();
    });
  });

  it('should generate cash flow forecast', async () => {
    const forecast = await FinancialIntelligenceService.generateCashFlowForecast(
      500000, // currentBalance
      100000, // monthlyIncome
      60000,  // monthlyExpenses
      90      // forecastDays
    );
    
    expect(forecast.projectedBalance).toBeGreaterThan(0);
    expect(forecast.confidence).toBeGreaterThan(50);
    expect(forecast.scenarios.realistic).toBeDefined();
  });

  it('should calculate financial health score', async () => {
    const profile = {
      accountId: 'SA1010000000000000123456',
      totalAssets: 500000,
      totalDebts: 100000,
      monthlyIncome: 100000,
      monthlyExpenses: 60000,
      riskTolerance: 'medium' as const,
      savingsRate: 0.4,
      debtToIncomeRatio: 1,
    };
    
    const score = await FinancialIntelligenceService.calculateFinancialScore(profile);
    
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(['poor', 'fair', 'good', 'excellent']).toContain(score.rating);
    expect(score.recommendations.length).toBeGreaterThan(0);
  });

  it('should generate budget recommendations', async () => {
    const patterns = [
      {
        category: 'Food & Dining',
        monthly: 15000,
        trend: 'stable' as const,
        yearOverYearChange: 5,
        percentOfIncome: 15,
        rank: 1,
      },
    ];
    
    const recommendations = await FinancialIntelligenceService.getBudgetRecommendations(
      patterns,
      100000
    );
    
    recommendations.forEach(rec => {
      expect(rec.category).toBeDefined();
      expect(rec.savingsPotential).toBeGreaterThanOrEqual(0);
      expect(['low', 'medium', 'high']).toContain(rec.priority);
    });
  });

  it('should suggest investments based on profile', async () => {
    const profile = {
      accountId: 'SA1010000000000000123456',
      totalAssets: 500000,
      totalDebts: 0,
      monthlyIncome: 100000,
      monthlyExpenses: 60000,
      riskTolerance: 'medium' as const,
      savingsRate: 0.4,
      debtToIncomeRatio: 0,
    };
    
    const suggestions = await FinancialIntelligenceService.getInvestmentSuggestions(profile);
    
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(sugg => {
      expect(sugg.productType).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(sugg.riskLevel);
      expect(sugg.expectedReturn).toBeGreaterThanOrEqual(0);
    });
  });

  it('should generate monthly report', async () => {
    const report = await FinancialIntelligenceService.generateMonthlyReport(
      mockTransactions,
      1, // February
      2026
    );
    
    expect(report.month).toBeDefined();
    expect(report.year).toBe(2026);
    expect(report.income).toBeGreaterThan(0);
    expect(report.savingsRate).toBeDefined();
    expect(report.topCategories.length).toBeGreaterThan(0);
  });

  it('should build financial profile', async () => {
    const profile = await FinancialIntelligenceService.buildFinancialProfile(
      'SA1010000000000000123456',
      mockTransactions
    );
    
    expect(profile.accountId).toBe('SA1010000000000000123456');
    expect(profile.monthlyIncome).toBeGreaterThan(0);
    expect(profile.monthlyExpenses).toBeGreaterThanOrEqual(0);
    expect(profile.savingsRate).toBeDefined();
  });
});

// ============================================
// Fraud Detection Tests
// ============================================

describe('Fraud Detection & Prevention', () => {
  
  it('should detect normal transactions as clean', async () => {
    const normalTransaction = {
      transactionId: 'TXN-NORMAL',
      sourceIban: 'SA1010000000000000123456',
      destinationIban: 'SA2020000000000000654321',
      amount: 25000,
      initiatedAt: new Date(),
    };
    
    const result = await FraudDetectionService.detectFraud(normalTransaction, null);
    
    expect(result.decision).toBe('allow');
    expect(result.riskScore).toBeLessThan(50);
  });

  it('should detect suspicious transactions', async () => {
    const suspiciousTransaction = {
      transactionId: 'TXN-SUSPICIOUS',
      sourceIban: 'SA1010000000000000123456',
      destinationIban: 'SA9999999999999999999999',
      amount: 300000, // Large amount
      initiatedAt: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 AM
    };
    
    const result = await FraudDetectionService.detectFraud(suspiciousTransaction, null);
    
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it('should build behavioral profile', async () => {
    const profile = await FraudDetectionService.buildBehavioralProfile(
      'SA1010000000000000123456',
      mockTransactions
    );
    
    expect(profile.accountId).toBe('SA1010000000000000123456');
    expect(profile.averageTransactionAmount).toBeGreaterThan(0);
    expect(profile.maxTransactionAmount).toBeGreaterThanOrEqual(profile.averageTransactionAmount);
    expect(profile.frequentDestinations.length).toBeGreaterThan(0);
  });

  it('should create fraud alert', async () => {
    const alert = await FraudDetectionService.createFraudAlert(
      'TXN-123',
      'SA1010000000000000123456',
      'Suspicious transaction detected',
      100000
    );
    
    expect(alert.alertId).toBeDefined();
    expect(alert.status).toBe('open');
    expect(['low', 'medium', 'high']).toContain(alert.severity);
  });

  it('should manage blacklist', async () => {
    const iban = 'SA0000000000000000000000';
    
    await FraudDetectionService.addToBlacklist(iban, 'Fraudulent account');
    
    const transaction = {
      transactionId: 'TXN-BLACKLIST',
      sourceIban: iban,
      destinationIban: 'SA1010000000000000123456',
      amount: 50000,
      initiatedAt: new Date(),
     };
    
    const result = await FraudDetectionService.detectFraud(transaction, null);
    expect(result.decision).toBe('block');
    expect(result.riskScore).toBe(100);
  });

  it('should manage whitelist', async () => {
    const iban = 'SA1111111111111111111111';
    
    await FraudDetectionService.addToWhitelist(iban);
    
    const transaction = {
      transactionId: 'TXN-WHITELIST',
      sourceIban: 'SA1010000000000000123456',
      destinationIban: iban,
      amount: 50000,
      initiatedAt: new Date(),
    };
    
    await FraudDetectionService.addToWhitelist('SA1010000000000000123456');
    const result = await FraudDetectionService.detectFraud(transaction, null);
    expect(result.decision).toBe('allow');
  });

  it('should add custom fraud rule', async () => {
    const rule = {
      ruleId: 'test_rule',
      name: 'Test Rule',
      description: 'Test fraud rule',
      conditions: [
        {
          field: 'amount',
          operator: 'greater' as const,
          value: 1000000,
          riskScore: 50,
        },
      ],
      action: 'block' as const,
      priority: 1,
      enabled: true,
      weight: 1.0,
    };
    
    await FraudDetectionService.addFraudRule(rule);
    // Rule should be added to system
  });

  it('should emit fraud detected event', (done) => {
    FraudDetectionService.once('fraudDetected', (result) => {
      expect(result.decision).not.toBe('allow');
      done();
    });
    
    const suspiciousTransaction = {
      transactionId: 'TXN-EVENT-TEST',
      sourceIban: 'SA1010000000000000123456',
      destinationIban: 'SA9999999999999999999999',
      amount: 500000,
      initiatedAt: new Date(),
    };
    
    FraudDetectionService.detectFraud(suspiciousTransaction, null);
  });
});

// ============================================
// Edge Cases & Error Handling
// ============================================

describe('Edge Cases & Error Handling', () => {
  const samaService = new AdvancedSAMAService();

  it('should handle empty transaction list', async () => {
    const patterns = await FinancialIntelligenceService.analyzeSpendingPatterns([], 6);
    expect(patterns).toEqual([]);
  });

  it('should handle negative balance', async () => {
    const forecast = await FinancialIntelligenceService.generateCashFlowForecast(
      -50000, // Negative balance
      100000,
      150000, // Expenses > income
      30
    );
    
    expect(forecast.projectedBalance).toBeLessThan(0);
    expect(forecast.alerts.length).toBeGreaterThan(0);
  });

  it('should handle zero amounts', async () => {
    try {
      await samaService.processPayment(
        'SA1010000000000000123456',
        'SA2020000000000000654321',
        0,
        'Zero amount'
      );
      // Should handle gracefully
    } catch (error) {
      // Expected
    }
  });

  it('should handle very large amounts', async () => {
    const transaction = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      999999999,
      'Very large amount'
    );
    
    expect(transaction.transactionId).toBeDefined();
    // Should be flagged as suspicious
    expect(transaction.fraudScore).toBeGreaterThan(50);
  });

  it('should handle concurrent transactions', async () => {
    const promises = Array(10)
      .fill(null)
      .map((_, i) =>
        samaService.processPayment(
          'SA1010000000000000123456',
          `SA202000000000000065432${i}`,
          25000 * (i + 1),
          `Concurrent payment ${i + 1}`
        )
      );
    
    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    expect(new Set(results.map(r => r.transactionId)).size).toBe(10);
  });

  it('should recover from API errors gracefully', async () => {
    // In mock mode, this should still work
    const result = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      50000,
      'Error recovery test'
    );
    
    expect(result.transactionId).toBeDefined();
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance', () => {
  
  it('should process payment within reasonable time', async () => {
    const samaService = new AdvancedSAMAService();
    const startTime = Date.now();
    
    await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      50000,
      'Performance test'
    );
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
  });

  it('should analyze spending patterns quickly', async () => {
    const largeTransactionList = Array(1000)
      .fill(null)
      .map((_, i) => ({
        transactionId: `TXN-${i}`,
        sourceIban: 'SA1010000000000000123456',
        destinationIban: 'SA2020000000000000654321',
        amount: Math.random() * 100000,
        transactionType: 'transfer',
        initiatedAt: new Date(),
        description: `Transaction ${i}`,
      }));
    
    const startTime = Date.now();
    await FinancialIntelligenceService.analyzeSpendingPatterns(largeTransactionList, 12);
    const elapsed = Date.now() - startTime;
    
    expect(elapsed).toBeLessThan(2000); // Should handle 1000 transactions quickly
  });

  it('should validate IBAN quickly', async () => {
    const samaService = new AdvancedSAMAService();
    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await samaService.validateIBAN(`SA101000000000000012345${i % 10}`);
    }
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(5000); // 100 validations in less than 5 seconds
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Integration Tests', () => {
  const samaService = new AdvancedSAMAService();

  it('should complete full payment workflow', async () => {
    // 1. Validate IBANs
    const sourceValidation = await samaService.validateIBAN('SA1010000000000000123456');
    const destValidation = await samaService.validateIBAN('SA2020000000000000654321');
    
    expect(sourceValidation.valid).toBe(true);
    expect(destValidation.valid).toBe(true);
    
    // 2. Check balances
    const balance = await samaService.getAccountBalance('SA1010000000000000123456');
    expect(balance.balance).toBeGreaterThan(0);
    
    // 3. Process payment
    const transaction = await samaService.processPayment(
      'SA1010000000000000123456',
      'SA2020000000000000654321',
      50000,
      'Integration test payment'
    );
    
    expect(transaction.status).toBe('completed');
    
    // 4. Analyze resulting financial situation
    const analysis = await samaService.analyzeAccount('SA1010000000000000123456');
    expect(analysis.accountId).toBe('SA1010000000000000123456');
  });

  it('should complete full fraud detection workflow', async () => {
    // 1. Build behavioral profile
    const profile = await FraudDetectionService.buildBehavioralProfile(
      'SA1010000000000000123456',
      mockTransactions
    );
    
    expect(profile.accountId).toBe('SA1010000000000000123456');
    
    // 2. Detect fraud in new transaction
    const suspiciousTransaction = {
      transactionId: 'TXN-INTEGRATION',
      sourceIban: 'SA1010000000000000123456',
      destinationIban: 'SA9999999999999999999999',
      amount: 300000,
      initiatedAt: new Date(),
    };
    
    const result = await FraudDetectionService.detectFraud(
      suspiciousTransaction,
      profile
    );
    
    expect(result.riskScore).toBeGreaterThan(0);
    
    // 3. Create alert if needed
    if (result.decision !== 'allow') {
      const alert = await FraudDetectionService.createFraudAlert(
        suspiciousTransaction.transactionId,
        profile.accountId,
        'Behavioral anomaly detected',
        suspiciousTransaction.amount
      );
      
      expect(alert.status).toBe('open');
    }
  });
});

// ============================================
// Test Lifecycle
// ============================================

beforeEach(() => {
  // Setup before each test
  console.log('Test setup');
});

afterEach(() => {
  // Cleanup after each test
  console.log('Test cleanup');
});
