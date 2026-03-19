import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceManager } from '../src/modules/performance-manager';

describe('PerformanceManager', () => {
  let pm: PerformanceManager;

  beforeEach(() => {
    pm = new PerformanceManager();
  });

  describe('Initialization & Configuration', () => {
    it('should create instance with default configuration', () => {
      expect(pm).toBeDefined();
      expect(pm instanceof PerformanceManager).toBe(true);
    });

    it('should accept enableEvents configuration', () => {
      const custom = new PerformanceManager({ enableEvents: false });
      expect(custom).toBeDefined();
    });

    it('should accept maxHistoryRecords configuration', () => {
      const custom = new PerformanceManager({ maxHistoryRecords: 500 });
      expect(custom).toBeDefined();
    });

    it('should accept enableAnalytics configuration', () => {
      const custom = new PerformanceManager({ enableAnalytics: false });
      expect(custom).toBeDefined();
    });

    it('should initialize with no KPIs', () => {
      expect(pm.listKPIs().length).toBe(0);
    });
  });

  describe('KPI Management', () => {
    it('should create KPI with valid data', () => {
      const kpi = pm.createKPI({
        name: 'Sales Target',
        target: 100000,
        unit: 'USD'
      });
      
      expect(kpi).toHaveProperty('id');
      expect(kpi.name).toBe('Sales Target');
      expect(kpi.target).toBe(100000);
      expect(kpi.unit).toBe('USD');
    });

    it('should throw error for missing KPI name', () => {
      expect(() => pm.createKPI({
        name: '',
        target: 100,
        unit: 'units'
      })).toThrow('KPI name is required');
    });

    it('should throw error for non-numeric target', () => {
      expect(() => pm.createKPI({
        name: 'KPI',
        target: 'not-a-number' as any,
        unit: 'units'
      })).toThrow('KPI target must be a valid number');
    });

    it('should throw error for missing unit', () => {
      expect(() => pm.createKPI({
        name: 'KPI',
        target: 100,
        unit: ''
      })).toThrow('KPI unit is required');
    });

    it('should accept weight between 0 and 1', () => {
      const kpi = pm.createKPI({
        name: 'KPI',
        target: 100,
        unit: 'units',
        weight: 0.5
      });
      expect(kpi.weight).toBe(0.5);
    });

    it('should throw error for invalid weight', () => {
      expect(() => pm.createKPI({
        name: 'KPI',
        target: 100,
        unit: 'units',
        weight: 1.5
      })).toThrow('KPI weight must be between 0 and 1');
    });

    it('should list all KPIs', () => {
      pm.createKPI({ name: 'KPI1', target: 100, unit: 'units' });
      pm.createKPI({ name: 'KPI2', target: 200, unit: 'units' });
      
      const list = pm.listKPIs();
      expect(list.length).toBe(2);
    });

    it('should get KPI by ID', () => {
      const created = pm.createKPI({ name: 'Test', target: 100, unit: 'units' });
      const retrieved = pm.getKPI(created.id);
      
      expect(retrieved).toEqual(created);
    });

    it('should throw error when getting with missing ID', () => {
      expect(() => pm.getKPI('')).toThrow('KPI ID is required');
    });

    it('should return undefined for non-existent KPI', () => {
      expect(pm.getKPI('nonexistent')).toBeUndefined();
    });

    it('should update KPI', () => {
      const kpi = pm.createKPI({ name: 'Original', target: 100, unit: 'units' });
      const updated = pm.updateKPI(kpi.id, { name: 'Updated', target: 200 });
      
      expect(updated?.name).toBe('Updated');
      expect(updated?.target).toBe(200);
    });

    it('should return null when updating non-existent KPI', () => {
      expect(pm.updateKPI('nonexistent', { name: 'Test' })).toBeNull();
    });

    it('should delete KPI', () => {
      const kpi = pm.createKPI({ name: 'Test', target: 100, unit: 'units' });
      const deleted = pm.deleteKPI(kpi.id);
      
      expect(deleted).toBe(true);
      expect(pm.getKPI(kpi.id)).toBeUndefined();
    });

    it('should return false when deleting non-existent KPI', () => {
      expect(pm.deleteKPI('nonexistent')).toBe(false);
    });
  });

  describe('Performance Records', () => {
    let kpiId: string;

    beforeEach(() => {
      const kpi = pm.createKPI({ name: 'Sales', target: 100, unit: 'K' });
      kpiId = kpi.id;
    });

    it('should add performance record', () => {
      const record = pm.addPerformanceRecord({
        userId: 'USER1',
        kpiId,
        value: 95,
        date: '2025-02-28'
      });
      
      expect(record).toHaveProperty('id');
      expect(record.userId).toBe('USER1');
      expect(record.status).toBe('atrisk');
    });

    it('should mark record as ontrack if value >= target', () => {
      const record = pm.addPerformanceRecord({
        userId: 'USER1',
        kpiId,
        value: 100,
        date: '2025-02-28'
      });
      
      expect(record.status).toBe('ontrack');
    });

    it('should throw error for missing user ID', () => {
      expect(() => pm.addPerformanceRecord({
        userId: '',
        kpiId,
        value: 100,
        date: '2025-02-28'
      })).toThrow('User ID is required');
    });

    it('should throw error for non-numeric value', () => {
      expect(() => pm.addPerformanceRecord({
        userId: 'USER1',
        kpiId,
        value: 'not-a-number' as any,
        date: '2025-02-28'
      })).toThrow('Performance value must be a valid number');
    });

    it('should throw error for non-existent KPI', () => {
      expect(() => pm.addPerformanceRecord({
        userId: 'USER1',
        kpiId: 'nonexistent',
        value: 100,
        date: '2025-02-28'
      })).toThrow('KPI not found');
    });

    it('should get performance records for user', () => {
      pm.addPerformanceRecord({
        userId: 'USER1',
        kpiId,
        value: 95,
        date: '2025-02-28'
      });
      pm.addPerformanceRecord({
        userId: 'USER1',
        kpiId,
        value: 100,
        date: '2025-02-27'
      });
      
      const records = pm.getPerformanceRecords('USER1');
      expect(records.length).toBe(2);
    });

    it('should return all records without userId filter', () => {
      pm.addPerformanceRecord({ userId: 'USER1', kpiId, value: 95, date: '2025' });
      pm.addPerformanceRecord({ userId: 'USER2', kpiId, value: 105, date: '2025' });
      
      const all = pm.getPerformanceRecords();
      expect(all.length).toBe(2);
    });
  });

  describe('Goal Management', () => {
    let kpiId: string;

    beforeEach(() => {
      const kpi = pm.createKPI({ name: 'Sales', target: 100, unit: 'K' });
      kpiId = kpi.id;
    });

    it('should create goal', () => {
      const goal = pm.createGoal({
        userId: 'USER1',
        kpiId,
        target: 50,
        deadline: '2025-12-31',
        status: 'active'
      });
      
      expect(goal).toHaveProperty('id');
      expect(goal.progress).toBe(0);
      expect(goal.status).toBe('active');
    });

    it('should throw error for missing user ID', () => {
      expect(() => pm.createGoal({
        userId: '',
        kpiId,
        target: 50,
        deadline: '2025-12-31',
        status: 'active'
      })).toThrow('User ID is required');
    });

    it('should throw error for non-numeric target', () => {
      expect(() => pm.createGoal({
        userId: 'USER1',
        kpiId,
        target: 'not-a-number' as any,
        deadline: '2025-12-31',
        status: 'active'
      })).toThrow('Goal target must be a valid number');
    });

    it('should list goals for user', () => {
      pm.createGoal({ userId: 'USER1', kpiId, target: 50, deadline: '2025', status: 'active' });
      pm.createGoal({ userId: 'USER1', kpiId, target: 75, deadline: '2025', status: 'active' });
      pm.createGoal({ userId: 'USER2', kpiId, target: 100, deadline: '2025', status: 'active' });
      
      const userGoals = pm.listGoals('USER1');
      expect(userGoals.length).toBe(2);
    });

    it('should update goal status', () => {
      const goal = pm.createGoal({
        userId: 'USER1',
        kpiId,
        target: 50,
        deadline: '2025-12-31',
        status: 'active'
      });
      
      const updated = pm.updateGoal(goal.id, { status: 'completed', progress: 100 });
      
      expect(updated?.status).toBe('completed');
      expect(updated?.progress).toBe(100);
    });

    it('should throw error for invalid goal status', () => {
      const goal = pm.createGoal({
        userId: 'USER1',
        kpiId,
        target: 50,
        deadline: '2025-12-31',
        status: 'active'
      });
      
      expect(() => pm.updateGoal(goal.id, { status: 'invalid' as any })).toThrow('Invalid goal status');
    });

    it('should throw error for invalid progress', () => {
      const goal = pm.createGoal({
        userId: 'USER1',
        kpiId,
        target: 50,
        deadline: '2025-12-31',
        status: 'active'
      });
      
      expect(() => pm.updateGoal(goal.id, { progress: 150 })).toThrow('Goal progress must be between 0 and 100');
    });

    it('should delete goal', () => {
      const goal = pm.createGoal({
        userId: 'USER1',
        kpiId,
        target: 50,
        deadline: '2025-12-31',
        status: 'active'
      });
      
      expect(pm.deleteGoal(goal.id)).toBe(true);
      expect(pm.getGoal(goal.id)).toBeNull();
    });
  });

  describe('Performance Reviews', () => {
    it('should add review', () => {
      const review = pm.addReview({
        userId: 'USER1',
        period: '2025-Q1',
        score: 85,
        feedback: 'Good performance',
        reviewerId: 'MANAGER1',
        date: '2025-02-28'
      });
      
      expect(review).toHaveProperty('id');
      expect(review.score).toBe(85);
    });

    it('should throw error for score < 0', () => {
      expect(() => pm.addReview({
        userId: 'USER1',
        period: '2025-Q1',
        score: -5,
        feedback: 'Bad',
        reviewerId: 'MANAGER1',
        date: '2025-02-28'
      })).toThrow('Review score must be between 0 and 100');
    });

    it('should throw error for score > 100', () => {
      expect(() => pm.addReview({
        userId: 'USER1',
        period: '2025-Q1',
        score: 105,
        feedback: 'Bad',
        reviewerId: 'MANAGER1',
        date: '2025-02-28'
      })).toThrow('Review score must be between 0 and 100');
    });

    it('should get reviews for user', () => {
      pm.addReview({
        userId: 'USER1',
        period: '2025-Q1',
        score: 80,
        feedback: 'Good',
        reviewerId: 'MGR1',
        date: '2025-02-28'
      });
      pm.addReview({
        userId: 'USER1',
        period: '2025-Q2',
        score: 85,
        feedback: 'Better',
        reviewerId: 'MGR1',
        date: '2025-02-28'
      });
      
      const reviews = pm.getReviews('USER1');
      expect(reviews.length).toBe(2);
    });
  });

  describe('Analytics & Aggregation', () => {
    let kpiId: string;

    beforeEach(() => {
      const kpi = pm.createKPI({ name: 'Sales', target: 100, unit: 'K' });
      kpiId = kpi.id;
    });

    it('should calculate performance summary', () => {
      // Create goals
      pm.createGoal({ userId: 'USER1', kpiId, target: 50, deadline: '2025', status: 'completed' });
      pm.createGoal({ userId: 'USER1', kpiId, target: 100, deadline: '2025', status: 'active' });
      pm.createGoal({ userId: 'USER1', kpiId, target: 75, deadline: '2025', status: 'missed' });
      
      // Add reviews
      pm.addReview({
        userId: 'USER1',
        period: 'Q1',
        score: 90,
        feedback: 'Great',
        reviewerId: 'MGR1',
        date: '2025'
      });

      const summary = pm.getPerformanceSummary('USER1');

      expect(summary.userId).toBe('USER1');
      expect(summary.completedGoals).toBe(1);
      expect(summary.activeGoals).toBe(1);
      expect(summary.missedGoals).toBe(1);
      expect(summary.averageScore).toBe(90);
    });

    it('should determine improving trend', () => {
      // Add 3+ reviews with increasing scores
      pm.addReview({ userId: 'USER1', period: 'Q1', score: 70, feedback: 'OK', reviewerId: 'MGR', date: '2025' });
      pm.addReview({ userId: 'USER1', period: 'Q2', score: 75, feedback: 'Better', reviewerId: 'MGR', date: '2025' });
      pm.addReview({ userId: 'USER1', period: 'Q3', score: 85, feedback: 'Good', reviewerId: 'MGR', date: '2025' });

      const summary = pm.getPerformanceSummary('USER1');
      expect(summary.overallTrend).toBe('improving');
    });

    it('should return empty comparison for KPI with no records', () => {
      const comparison = pm.getKPIComparison(kpiId);
      expect(typeof comparison).toBe('object');
    });

    it('should throw error for non-existent KPI in comparison', () => {
      expect(() => pm.getKPIComparison('nonexistent')).toThrow('KPI not found');
    });
  });

  describe('Event Emission', () => {
    it('should emit kpiCreated event', () => {
      return new Promise<void>((resolve) => {
        pm.once('kpiCreated', (data) => {
          expect(data).toHaveProperty('kpi');
          expect(data.kpi.name).toBe('Sales');
          resolve();
        });
        pm.createKPI({ name: 'Sales', target: 100, unit: 'K' });
      });
    });

    it('should emit goalCreated event', () => {
      const kpi = pm.createKPI({ name: 'Sales', target: 100, unit: 'K' });
      return new Promise<void>((resolve) => {
        pm.once('goalCreated', (data) => {
          expect(data).toHaveProperty('goal');
          resolve();
        });
        pm.createGoal({
          userId: 'USER1',
          kpiId: kpi.id,
          target: 50,
          deadline: '2025',
          status: 'active'
        });
      });
    });

    it('should not emit events when disabled', () => {
      const pmNoEvents = new PerformanceManager({ enableEvents: false });
      let emitted = false;

      pmNoEvents.once('kpiCreated', () => {
        emitted = true;
      });

      pmNoEvents.createKPI({ name: 'Test', target: 100, unit: 'units' });
      expect(emitted).toBe(false);
    });
  });

  describe('Instance Isolation', () => {
    it('should not share data between instances', () => {
      const pm1 = new PerformanceManager();
      const pm2 = new PerformanceManager();

      const kpi1 = pm1.createKPI({ name: 'KPI1', target: 100, unit: 'units' });
      const kpi2 = pm2.createKPI({ name: 'KPI2', target: 200, unit: 'units' });

      expect(pm1.listKPIs().length).toBe(1);
      expect(pm2.listKPIs().length).toBe(1);
      expect(pm1.getKPI(kpi1.id)).toBeDefined();
      expect(pm2.getKPI(kpi1.id)).toBeUndefined();
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', () => {
      const kpi = pm.createKPI({ name: 'Sales', target: 100, unit: 'K' });
      pm.createGoal({ userId: 'USER1', kpiId: kpi.id, target: 50, deadline: '2025', status: 'active' });
      pm.addPerformanceRecord({ userId: 'USER1', kpiId: kpi.id, value: 80, date: '2025' });

      pm.clearAllData();

      expect(pm.listKPIs().length).toBe(0);
      expect(pm.listGoals().length).toBe(0);
      expect(pm.getPerformanceRecords().length).toBe(0);
    });
  });
});
