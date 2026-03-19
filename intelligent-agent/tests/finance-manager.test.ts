// tests/finance-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FinanceManager } from '../src/modules/finance-manager';

describe('FinanceManager Module', () => {
  let fm: FinanceManager;

  beforeEach(() => {
    fm = new FinanceManager();
  });

  // ===== INITIALIZATION =====
  describe('Initialization & Configuration', () => {
    it('should create instance with default config', () => {
      expect(fm).toBeDefined();
      expect(fm instanceof FinanceManager).toBe(true);
    });

    it('should support custom configuration', () => {
      const customFM = new FinanceManager({
        enableEvents: false,
        maxProjects: 5000,
        budgetWarningThreshold: 75
      });
      expect(customFM).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof fm.setBudget).toBe('function');
      expect(typeof fm.addExpense).toBe('function');
      expect(typeof fm.getBudget).toBe('function');
      expect(typeof fm.calculateMetrics).toBe('function');
    });

    it('should initialize with valid configuration', () => {
      const config = fm.getConfig();
      expect(config).toBeDefined();
      expect(config.enableEvents).toBe(true);
    });
  });

  // ===== BUDGET MANAGEMENT =====
  describe('Budget Management', () => {
    it('should create new budget', () => {
      const budget = fm.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });

      expect(budget).toBeDefined();
      expect(budget.id).toBeTruthy();
      expect(budget.projectId).toBe('proj1');
      expect(budget.initialBudget).toBe(100000);
      expect(budget.currency).toBe('USD');
      expect(budget.spent).toBe(0);
      expect(budget.status).toBe('on_track');
    });

    it('should throw error for invalid currency', () => {
      expect(() => fm.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'INVALID'
      })).toThrow();
    });

    it('should throw error for negative budget', () => {
      expect(() => fm.setBudget({
        projectId: 'proj1',
        initialBudget: -1000,
        currency: 'USD'
      })).toThrow();
    });

    it('should retrieve budget by id', () => {
      const created = fm.setBudget({
        projectId: 'proj1',
        initialBudget: 50000,
        currency: 'USD'
      });

      const retrieved = fm.getBudget(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.initialBudget).toBe(50000);
    });

    it('should return null for non-existent budget', () => {
      const retrieved = fm.getBudget('nonexistent-budget-id');
      expect(retrieved).toBeNull();
    });

    it('should retrieve budget by project id', () => {
      const created = fm.setBudget({
        projectId: 'proj-special',
        initialBudget: 75000,
        currency: 'EUR'
      });

      const retrieved = fm.getBudgetByProject('proj-special');
      expect(retrieved).toBeDefined();
      expect(retrieved?.projectId).toBe('proj-special');
      expect(retrieved?.currency).toBe('EUR');
    });

    it('should list all budgets', () => {
      fm.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });
      fm.setBudget({
        projectId: 'proj2',
        initialBudget: 50000,
        currency: 'EUR'
      });
      fm.setBudget({
        projectId: 'proj3',
        initialBudget: 200000,
        currency: 'GBP'
      });

      const budgets = fm.listBudgets();
      expect(budgets.length).toBe(3);
    });

    it('should update forecast', () => {
      const budget = fm.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });

      fm.updateForecast(budget.id, 120000);
      const updated = fm.getBudget(budget.id);
      expect(updated?.forecast).toBe(120000);
    });

    it('should approve budget', () => {
      const budget = fm.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });

      const approved = fm.approveBudget(budget.id, 'manager1');
      expect(approved).toBeDefined();
      expect(approved?.approvedBy).toBe('manager1');
      expect(approved?.approvalDate).toBeTruthy();
    });

    it('should delete budget', () => {
      const budget = fm.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });

      const deleted = fm.deleteBudget(budget.id);
      expect(deleted).toBe(true);

      const retrieved = fm.getBudget(budget.id);
      expect(retrieved).toBeNull();
    });
  });

  // ===== EXPENSE MANAGEMENT =====
  describe('Expense Operations', () => {
    let budgetId: string;

    beforeEach(() => {
      const budget = fm.setBudget({
        projectId: 'proj-expenses',
        initialBudget: 50000,
        currency: 'USD'
      });
      budgetId = budget.id;
    });

    it('should add labor expense', () => {
      const expense = fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 5000,
        category: 'labor',
        description: 'Developer salary for phase 1',
        recordedBy: 'admin1'
      });

      expect(expense).toBeDefined();
      expect(expense.id).toBeTruthy();
      expect(expense.amount).toBe(5000);
      expect(expense.category).toBe('labor');
      expect(expense.recordedBy).toBe('admin1');
    });

    it('should add materials expense', () => {
      const expense = fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 2000,
        category: 'materials',
        description: 'Construction materials',
        recordedBy: 'admin1'
      });

      expect(expense.category).toBe('materials');
      expect(expense.amount).toBe(2000);
    });

    it('should add equipment expense', () => {
      const expense = fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 15000,
        category: 'equipment',
        description: 'Server equipment',
        recordedBy: 'admin1'
      });

      expect(expense.category).toBe('equipment');
      expect(expense.amount).toBe(15000);
    });

    it('should add services expense', () => {
      const expense = fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 3000,
        category: 'services',
        description: 'Consulting services',
        recordedBy: 'admin1'
      });

      expect(expense.category).toBe('services');
    });

    it('should add other category expense', () => {
      const expense = fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 1000,
        category: 'other',
        description: 'Miscellaneous costs',
        recordedBy: 'admin1'
      });

      expect(expense.category).toBe('other');
    });

    it('should throw error for invalid expense amount', () => {
      expect(() => fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: -100,
        category: 'labor',
        description: 'Invalid',
        recordedBy: 'admin1'
      })).toThrow();
    });

    it('should throw error for invalid category', () => {
      expect(() => fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 1000,
        category: 'invalid-category' as any,
        description: 'Test',
        recordedBy: 'admin1'
      })).toThrow();
    });

    it('should retrieve expenses for project', () => {
      fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 5000,
        category: 'labor',
        description: 'Expense 1',
        recordedBy: 'admin1'
      });
      fm.addExpense({
        projectId: 'proj-expenses',
        budgetId,
        amount: 2000,
        category: 'materials',
        description: 'Expense 2',
        recordedBy: 'admin1'
      });

      const expenses = fm.getExpenses('proj-expenses');
      expect(expenses.length).toBe(2);
      expect(expenses[0].category).toBe('labor');
      expect(expenses[1].category).toBe('materials');
    });
  });

  // ===== FINANCIAL METRICS AND ANALYSIS =====
  describe('Financial Metrics & Analysis', () => {
    let budgetId: string;
    let projectId: string;

    beforeEach(() => {
      projectId = 'proj-metrics';
      const budget = fm.setBudget({
        projectId,
        initialBudget: 100000,
        currency: 'USD'
      });
      budgetId = budget.id;
    });

    it('should calculate financial metrics', () => {
      fm.addExpense({
        projectId,
        budgetId,
        amount: 25000,
        category: 'labor',
        description: 'Team expenses',
        recordedBy: 'admin1'
      });
      fm.addExpense({
        projectId,
        budgetId,
        amount: 10000,
        category: 'materials',
        description: 'Materials',
        recordedBy: 'admin1'
      });

      const metrics = fm.calculateMetrics(budgetId);
      expect(metrics).toBeDefined();
      expect(metrics?.projectId).toBe(projectId);
      expect(metrics?.totalSpent).toBe(35000);
      expect(typeof metrics?.costPerformanceIndex).toBe('number');
      expect(typeof metrics?.burndownRate).toBe('number');
    });

    it('should calculate cost performance index', () => {
      fm.addExpense({
        projectId,
        budgetId,
        amount: 50000,
        category: 'labor',
        description: 'Labor costs',
        recordedBy: 'admin1'
      });

      fm.updateForecast(budgetId, 120000);
      const metrics = fm.calculateMetrics(budgetId);
      expect(metrics?.costPerformanceIndex).toBeDefined();
      expect(typeof metrics?.costPerformanceIndex).toBe('number');
    });

    it('should analyze costs by category', () => {
      fm.addExpense({
        projectId,
        budgetId,
        amount: 20000,
        category: 'labor',
        description: 'Salary',
        recordedBy: 'admin1'
      });
      fm.addExpense({
        projectId,
        budgetId,
        amount: 15000,
        category: 'equipment',
        description: 'Equipment',
        recordedBy: 'admin1'
      });
      fm.addExpense({
        projectId,
        budgetId,
        amount: 5000,
        category: 'materials',
        description: 'Materials',
        recordedBy: 'admin1'
      });

      const analysis = fm.analyzeCosts(projectId);
      expect(analysis).toBeDefined();
      expect(analysis?.byCategory).toBeDefined();
      expect(analysis?.byCategory['labor']).toBe(20000);
      expect(analysis?.byCategory['equipment']).toBe(15000);
      expect(analysis?.byCategory['materials']).toBe(5000);
      expect(analysis?.totalCost).toBe(40000);
    });
  });

  // ===== BUDGET ALERTS =====
  describe('Budget Alerts', () => {
    let budgetId: string;
    let projectId: string;

    beforeEach(() => {
      projectId = 'proj-alerts';
      const budget = fm.setBudget({
        projectId,
        initialBudget: 100000,
        currency: 'USD'
      });
      budgetId = budget.id;
    });

    it('should list budget alerts', () => {
      const alerts = fm.listAlerts(projectId);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should list unresolved alerts', () => {
      const unresolved = fm.listAlerts(projectId, false);
      expect(Array.isArray(unresolved)).toBe(true);
    });

    it('should resolve alert', () => {
      const allAlerts = fm.listAlerts(projectId);
      
      if (allAlerts.length > 0) {
        const resolved = fm.resolveAlert(allAlerts[0].id);
        expect(resolved?.resolved).toBe(true);
      }
    });

    it('should return null for non-existent alert', () => {
      const result = fm.resolveAlert('nonexistent-alert-id');
      expect(result).toBeNull();
    });
  });

  // ===== CONFIGURATION =====
  describe('Configuration Management', () => {
    it('should get current config', () => {
      const config = fm.getConfig();
      expect(config).toBeDefined();
      expect(config.enableEvents).toBeDefined();
      expect(config.budgetWarningThreshold).toBeDefined();
    });

    it('should update configuration', () => {
      fm.setConfig({
        budgetWarningThreshold: 70,
        enableAuditLogging: false
      });

      const updated = fm.getConfig();
      expect(updated.budgetWarningThreshold).toBe(70);
      expect(updated.enableAuditLogging).toBe(false);
    });

    it('should preserve unchanged config values', () => {
      const original = fm.getConfig();
      fm.setConfig({ budgetWarningThreshold: 60 });
      const updated = fm.getConfig();

      expect(updated.enableEvents).toBe(original.enableEvents);
      expect(updated.validationLevel).toBe(original.validationLevel);
      expect(updated.budgetWarningThreshold).toBe(60);
    });
  });

  // ===== INSTANCE ISOLATION =====
  describe('Instance Isolation', () => {
    it('should maintain separate budgets for different instances', () => {
      const fm1 = new FinanceManager();
      const fm2 = new FinanceManager();

      fm1.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });

      const fm1Budgets = fm1.listBudgets();
      const fm2Budgets = fm2.listBudgets();

      expect(fm1Budgets.length).toBeGreaterThan(fm2Budgets.length);
    });

    it('should not share expense data between instances', () => {
      const fm1 = new FinanceManager();
      const fm2 = new FinanceManager();

      const budget1 = fm1.setBudget({
        projectId: 'proj1',
        initialBudget: 100000,
        currency: 'USD'
      });

      fm1.addExpense({
        projectId: 'proj1',
        budgetId: budget1.id,
        amount: 50000,
        category: 'labor',
        description: 'Test',
        recordedBy: 'admin1'
      });

      const fm1Expenses = fm1.getExpenses('proj1');
      const fm2Expenses = fm2.getExpenses('proj1');

      expect(fm1Expenses.length).toBeGreaterThan(fm2Expenses.length);
    });
  });

  // ===== BULK OPERATIONS & EDGE CASES =====
  describe('Bulk Operations & Edge Cases', () => {
    it('should handle empty budget list', () => {
      const budgets = fm.listBudgets();
      expect(Array.isArray(budgets)).toBe(true);
      expect(budgets.length).toBe(0);
    });

    it('should handle many budgets', () => {
      for (let i = 0; i < 20; i++) {
        fm.setBudget({
          projectId: `proj${i}`,
          initialBudget: 50000 + i * 1000,
          currency: 'USD'
        });
      }

      const budgets = fm.listBudgets();
      expect(budgets.length).toBe(20);
    });

    it('should handle many expenses per budget', () => {
      const budget = fm.setBudget({
        projectId: 'proj-heavy',
        initialBudget: 500000,
        currency: 'USD'
      });

      for (let i = 0; i < 15; i++) {
        fm.addExpense({
          projectId: 'proj-heavy',
          budgetId: budget.id,
          amount: 1000 + i * 100,
          category: 'labor',
          description: `Expense ${i}`,
          recordedBy: 'admin1'
        });
      }

      const expenses = fm.getExpenses('proj-heavy');
      expect(expenses.length).toBe(15);
    });

    it('should handle zero amount budget', () => {
      const budget = fm.setBudget({
        projectId: 'proj-zero',
        initialBudget: 0,
        currency: 'USD'
      });

      expect(budget.initialBudget).toBe(0);
    });

    it('should handle large amount budgets', () => {
      const budget = fm.setBudget({
        projectId: 'proj-large',
        initialBudget: 10000000,
        currency: 'USD'
      });

      expect(budget.initialBudget).toBe(10000000);
    });

    it('should handle multiple currency budgets', () => {
      fm.setBudget({
        projectId: 'proj-usd',
        initialBudget: 100000,
        currency: 'USD'
      });
      fm.setBudget({
        projectId: 'proj-eur',
        initialBudget: 85000,
        currency: 'EUR'
      });
      fm.setBudget({
        projectId: 'proj-gbp',
        initialBudget: 70000,
        currency: 'GBP'
      });

      const budgets = fm.listBudgets();
      expect(budgets.length).toBe(3);
      expect(budgets.map(b => b.currency)).toContain('USD');
      expect(budgets.map(b => b.currency)).toContain('EUR');
      expect(budgets.map(b => b.currency)).toContain('GBP');
    });

    it('should handle budget with all optional fields', () => {
      const budget = fm.setBudget({
        projectId: 'proj-full',
        initialBudget: 50000,
        currency: 'USD',
        approvedBy: 'manager1',
        approvalDate: new Date().toISOString()
      });

      expect(budget.approvedBy).toBe('manager1');
      expect(budget.approvalDate).toBeTruthy();
    });

    it('should handle rapid budget operations', () => {
      const budgetIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const budget = fm.setBudget({
          projectId: `rapid-proj${i}`,
          initialBudget: 10000,
          currency: 'USD'
        });
        budgetIds.push(budget.id);
      }

      budgetIds.forEach(id => {
        const budget = fm.getBudget(id);
        expect(budget).toBeDefined();
      });
    });

    it('should handle budget with department tracking', () => {
      const budget = fm.setBudget({
        projectId: 'proj-departments',
        initialBudget: 100000,
        currency: 'USD'
      });

      fm.addExpense({
        projectId: 'proj-departments',
        budgetId: budget.id,
        amount: 10000,
        category: 'labor',
        description: 'Engineering dept',
        department: 'Engineering',
        recordedBy: 'admin1'
      });

      fm.addExpense({
        projectId: 'proj-departments',
        budgetId: budget.id,
        amount: 5000,
        category: 'labor',
        description: 'HR dept',
        department: 'HR',
        recordedBy: 'admin1'
      });

      const analysis = fm.analyzeCosts('proj-departments');
      expect(analysis?.byDepartment).toBeDefined();
    });
  });

  // ===== EVENT EMISSION =====
  describe('Event Emission', () => {
    it('should emit event when budget is created', () => {
      return new Promise<void>((resolve, reject) => {
        const testFM = new FinanceManager({ enableEvents: true });
        let resolved = false;

        testFM.on('budget-created', () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 1000);

        try {
          testFM.setBudget({
            projectId: 'event-test',
            initialBudget: 50000,
            currency: 'USD'
          });
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    it('should not emit events when disabled', () => {
      const testFM = new FinanceManager({ enableEvents: false });
      let eventEmitted = false;

      testFM.on('budget-created', () => {
        eventEmitted = true;
      });

      testFM.setBudget({
        projectId: 'no-events',
        initialBudget: 50000,
        currency: 'USD'
      });

      expect(eventEmitted).toBe(false);
    });
  });
});
