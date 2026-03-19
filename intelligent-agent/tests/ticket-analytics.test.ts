// tests/ticket-analytics.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TicketAnalytics, Ticket } from '../src/modules/ticket-analytics';

describe('TicketAnalytics Module', () => {
  let analytics: TicketAnalytics;

  const createTicket = (id: string, overrides: Partial<Ticket> = {}): Ticket => {
    const now = Date.now();
    return {
      id,
      status: 'open',
      department: 'support',
      createdAt: now,
      updatedAt: now + 1000 * 60 * 60, // 1 hour later
      ...overrides
    };
  };

  beforeEach(() => {
    analytics = new TicketAnalytics();
  });

  // ===== INITIALIZATION =====
  describe('Initialization & Configuration', () => {
    it('should create instance with default config', () => {
      expect(analytics).toBeDefined();
      expect(analytics instanceof TicketAnalytics).toBe(true);
    });

    it('should support custom configuration', () => {
      const customAnalytics = new TicketAnalytics(undefined, {
        enableEvents: false,
        enableMetrics: false,
        slaBreach: {
          responseTimeHours: 4,
          resolutionTimeHours: 48
        }
      });
      expect(customAnalytics).toBeDefined();
    });

    it('should have event emitter capabilities', () => {
      expect(typeof analytics.on).toBe('function');
      expect(typeof analytics.emit).toBe('function');
      expect(typeof analytics.once).toBe('function');
    });

    it('should have required methods', () => {
      expect(typeof analytics.trackTicket).toBe('function');
      expect(typeof analytics.getSummary).toBe('function');
      expect(typeof analytics.getSLAMetrics).toBe('function');
      expect(typeof analytics.getDepartmentMetrics).toBe('function');
      expect(typeof analytics.getTrendData).toBe('function');
    });
  });

  // ===== TICKET TRACKING =====
  describe('Ticket Tracking', () => {
    it('should track ticket successfully', () => {
      const ticket = createTicket('T1');
      analytics.trackTicket(ticket);
      
      const summary = analytics.getSummary();
      expect(summary.total).toBe(1);
    });

    it('should throw error for invalid ticket', () => {
      const invalidTicket = { id: '', status: 'open' } as Ticket;
      expect(() => analytics.trackTicket(invalidTicket)).toThrow();
    });

    it('should handle empty department string', () => {
      const ticket = createTicket('T1', { department: '' });
      // Empty department is converted to 'unassigned' in implementation
      analytics.trackTicket(ticket);
      const summary = analytics.getSummary();
      expect(summary.total).toBe(1);
    });

    it('should track multiple tickets', () => {
      analytics.trackTicket(createTicket('T1'));
      analytics.trackTicket(createTicket('T2'));
      analytics.trackTicket(createTicket('T3'));

      const summary = analytics.getSummary();
      expect(summary.total).toBe(3);
    });
  });

  // ===== SUMMARY =====
  describe('Summary Generation', () => {
    beforeEach(() => {
      const now = Date.now();
      analytics.trackTicket(createTicket('T1', { status: 'closed', updatedAt: now + 1000 * 60 * 60 * 2 }));
      analytics.trackTicket(createTicket('T2', { status: 'open' }));
      analytics.trackTicket(createTicket('T3', { status: 'closed', updatedAt: now + 1000 * 60 * 60 * 4 }));
      analytics.trackTicket(createTicket('T4', { status: 'pending' }));
    });

    it('should generate summary with basic counts', () => {
      const summary = analytics.getSummary();

      expect(summary).toBeDefined();
      expect(summary.total).toBe(4);
      expect(summary.closed).toBe(2);
      // From beforeEach: T1(closed), T2(open), T3(closed), T4(pending) = 1 open + 1 pending = 2
      expect(summary.open).toBe(2); // open + pending calculated as open
      expect(typeof summary.avgResolutionHours).toBe('number');
    });

    it('should calculate average resolution time', () => {
      const summary = analytics.getSummary();
      expect(summary.avgResolutionHours).toBeGreaterThan(0);
    });

    it('should identify busiest departments', () => {
      analytics.trackTicket(createTicket('T5', { department: 'billing' }));
      analytics.trackTicket(createTicket('T6', { department: 'billing' }));

      const summary = analytics.getSummary();
      expect(Array.isArray(summary.busiestDepartments)).toBe(true);
      expect(summary.busiestDepartments.length).toBeGreaterThan(0);
    });

    it('should count escalated tickets', () => {
      analytics.trackTicket(createTicket('T7', { escalated: true }));
      
      const summary = analytics.getSummary();
      expect(summary.escalatedCount).toBeGreaterThan(0);
      expect(summary.escalationRate).toBeGreaterThan(0);
    });
  });

  // ===== SLA METRICS =====
  describe('SLA Metrics & Tracking', () => {
    it('should calculate SLA metrics', () => {
      const now = Date.now();
      analytics.trackTicket(createTicket('T1', {
        createdAt: now,
        updatedAt: now + 1000 * 60 * 60 * 10 // 10 hours
      }));

      const metrics = analytics.getSLAMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.total).toBe(1);
      expect(metrics.slaComplianceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.slaComplianceRate).toBeLessThanOrEqual(100);
    });

    it('should track SLA breaches', () => {
      const now = Date.now();
      analytics.trackTicket(createTicket('T1', {
        createdAt: now,
        updatedAt: now + 1000 * 60 * 60 * 30 // 30 hours - exceeds default 24h limit
      }));

      const metrics = analytics.getSLAMetrics();
      expect(metrics.breached).toBeGreaterThan(0);
      expect(metrics.breachRate).toBeGreaterThan(0);
    });

    it('should calculate average resolution time', () => {
      const metrics = analytics.getSLAMetrics();
      expect(typeof metrics.avgResolutionTimeHours).toBe('number');
    });

    it('should handle compliance calculation', () => {
      const metrics = analytics.getSLAMetrics();
      const calculated = ((metrics.total - metrics.breached) / metrics.total) * 100 || 100;
      expect(metrics.slaComplianceRate).toBeCloseTo(calculated, 1);
    });
  });

  // ===== TREND ANALYSIS =====
  describe('Trend Analysis', () => {
    beforeEach(() => {
      const now = Date.now();
      const dayMs = 1000 * 60 * 60 * 24;

      // Create tickets across different days
      analytics.trackTicket(createTicket('T1', { createdAt: now - dayMs * 2 }));
      analytics.trackTicket(createTicket('T2', { createdAt: now - dayMs * 1 }));
      analytics.trackTicket(createTicket('T3', { createdAt: now }));
    });

    it('should generate daily trend data', () => {
      const trend = analytics.getTrendData('daily');

      expect(trend.period).toBe('daily');
      expect(Array.isArray(trend.data)).toBe(true);
      expect(trend.data.length).toBeGreaterThan(0);
    });

    it('should generate hourly trend data', () => {
      const trend = analytics.getTrendData('hourly');

      expect(trend.period).toBe('hourly');
      expect(Array.isArray(trend.data)).toBe(true);
    });

    it('should generate weekly trend data', () => {
      const trend = analytics.getTrendData('weekly');

      expect(trend.period).toBe('weekly');
      expect(Array.isArray(trend.data)).toBe(true);
    });

    it('should include trend metrics', () => {
      const trend = analytics.getTrendData('daily');

      trend.data.forEach(entry => {
        expect(typeof entry.timestamp).toBe('number');
        expect(typeof entry.totalTickets).toBe('number');
        expect(typeof entry.closedTickets).toBe('number');
        expect(typeof entry.escalations).toBe('number');
      });
    });
  });

  // ===== DEPARTMENT ANALYTICS =====
  describe('Department Analytics', () => {
    beforeEach(() => {
      analytics.trackTicket(createTicket('T1', { department: 'support' }));
      analytics.trackTicket(createTicket('T2', { department: 'support' }));
      analytics.trackTicket(createTicket('T3', { department: 'billing', status: 'closed' }));
      analytics.trackTicket(createTicket('T4', { department: 'technical' }));
    });

    it('should get metrics for specific department', () => {
      const metrics = analytics.getDepartmentMetrics('support');

      expect(metrics).toBeDefined();
      expect(metrics.department).toBe('support');
      expect(metrics.totalTickets).toBe(2);
    });

    it('should calculate department-level SLA compliance', () => {
      const metrics = analytics.getDepartmentMetrics('support');

      expect(typeof metrics.slaComplianceRate).toBe('number');
      expect(metrics.slaComplianceRate).toBeGreaterThanOrEqual(0);
      expect(metrics.slaComplianceRate).toBeLessThanOrEqual(100);
    });

    it('should get all department metrics', () => {
      const allMetrics = analytics.getAllDepartmentMetrics();

      expect(Array.isArray(allMetrics)).toBe(true);
      expect(allMetrics.length).toBeGreaterThan(0);
      expect(allMetrics.some(m => m.department === 'support')).toBe(true);
    });

    it('should track escalation rate per department', () => {
      analytics.trackTicket(createTicket('T5', { department: 'support', escalated: true }));

      const metrics = analytics.getDepartmentMetrics('support');
      expect(metrics.escalationRate).toBeGreaterThan(0);
    });
  });

  // ===== PRIORITY & ESCALATION =====
  describe('Priority & Escalation Analytics', () => {
    it('should analyze priority distribution', () => {
      analytics.trackTicket(createTicket('T1', { priority: 'high' } as any));
      analytics.trackTicket(createTicket('T2', { priority: 'low' } as any));
      analytics.trackTicket(createTicket('T3', { priority: 'critical' } as any));

      const distribution = analytics.getPriorityDistribution();

      expect(distribution).toBeDefined();
      expect(distribution.high).toBe(1);
      expect(distribution.low).toBe(1);
      expect(distribution.critical).toBe(1);
    });

    it('should track escalation analytics', () => {
      analytics.trackTicket(createTicket('T1', { escalated: true, status: 'closed' }));
      analytics.trackTicket(createTicket('T2', { escalated: true, status: 'open' }));
      analytics.trackTicket(createTicket('T3', { escalated: false }));

      const analytics_data = analytics.getEscalationAnalytics();

      expect(analytics_data.totalEscalated).toBe(2);
      expect(analytics_data.resolvedEscalations).toBe(1);
      expect(analytics_data.pendingEscalations).toBe(1);
    });

    it('should calculate escalation rate', () => {
      analytics.trackTicket(createTicket('T1', { escalated: true }));
      analytics.trackTicket(createTicket('T2', { escalated: false }));
      analytics.trackTicket(createTicket('T3', { escalated: false }));

      const analytics_data = analytics.getEscalationAnalytics();
      expect(analytics_data.escalationRate).toBeCloseTo(1/3, 1);
    });

    it('should calculate time to resolve escalated tickets', () => {
      const now = Date.now();
      analytics.trackTicket(createTicket('T1', {
        escalated: true,
        status: 'closed',
        createdAt: now,
        updatedAt: now + 1000 * 60 * 60 * 6 // 6 hours
      }));

      const analytics_data = analytics.getEscalationAnalytics();
      expect(analytics_data.avgTimeToResolveEscalated).toBeGreaterThan(0);
    });
  });

  // ===== PERCENTILES =====
  describe('Resolution Time Percentiles', () => {
    beforeEach(() => {
      const now = Date.now();
      const hourMs = 1000 * 60 * 60;

      // Create closed tickets with different resolution times
      analytics.trackTicket(createTicket('T1', {
        status: 'closed',
        createdAt: now,
        updatedAt: now + hourMs * 2
      }));
      analytics.trackTicket(createTicket('T2', {
        status: 'closed',
        createdAt: now,
        updatedAt: now + hourMs * 5
      }));
      analytics.trackTicket(createTicket('T3', {
        status: 'closed',
        createdAt: now,
        updatedAt: now + hourMs * 10
      }));
    });

    it('should calculate percentiles', () => {
      const percentiles = analytics.getResolutionTimePercentiles();

      expect(percentiles.p50).toBeGreaterThanOrEqual(0);
      expect(percentiles.p75).toBeGreaterThanOrEqual(0);
      expect(percentiles.p95).toBeGreaterThanOrEqual(percentiles.p75);
      expect(percentiles.p99).toBeGreaterThanOrEqual(percentiles.p95);
    });

    it('should handle empty closed tickets', () => {
      const empty = new TicketAnalytics();
      const percentiles = empty.getResolutionTimePercentiles();

      expect(percentiles.p50).toBe(0);
      expect(percentiles.p75).toBe(0);
      expect(percentiles.p95).toBe(0);
      expect(percentiles.p99).toBe(0);
    });

    it('should sort percentiles correctly', () => {
      const percentiles = analytics.getResolutionTimePercentiles();
      expect(percentiles.p50).toBeLessThanOrEqual(percentiles.p75);
      expect(percentiles.p75).toBeLessThanOrEqual(percentiles.p95);
    });
  });

  // ===== EVENT EMISSION =====
  describe('Event Emission', () => {
    it('should emit ticketTracked event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new TicketAnalytics(undefined, { enableEvents: true });

        testAnalytics.on('ticketTracked', (data) => {
          expect(data.ticketId).toBe('T1');
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.trackTicket(createTicket('T1'));
      });
    });

    it('should emit ticketsCleared event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new TicketAnalytics(undefined, { enableEvents: true });
        testAnalytics.trackTicket(createTicket('T1', { department: 'support' }));

        testAnalytics.on('ticketsCleared', (data) => {
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.clearTickets('support');
      });
    });

    it('should emit dataCleared event', () => {
      return new Promise<void>((resolve) => {
        const testAnalytics = new TicketAnalytics(undefined, { enableEvents: true });
        testAnalytics.trackTicket(createTicket('T1'));

        testAnalytics.on('dataCleared', (data) => {
          expect(data.timestamp).toBeTruthy();
          resolve();
        });

        testAnalytics.clearAllData();
      });
    });

    it('should not emit events when disabled', () => {
      const testAnalytics = new TicketAnalytics(undefined, { enableEvents: false });
      let emitted = false;

      testAnalytics.on('ticketTracked', () => {
        emitted = true;
      });

      testAnalytics.trackTicket(createTicket('T1'));
      expect(emitted).toBe(false);
    });
  });

  // ===== INSTANCE ISOLATION =====
  describe('Instance Isolation', () => {
    it('should maintain separate data for different instances', () => {
      const analytics1 = new TicketAnalytics();
      const analytics2 = new TicketAnalytics();

      analytics1.trackTicket(createTicket('T1', { department: 'support' }));
      analytics2.trackTicket(createTicket('T2', { department: 'billing' }));

      const summary1 = analytics1.getSummary();
      const summary2 = analytics2.getSummary();

      expect(summary1.total).toBe(1);
      expect(summary2.total).toBe(1);
    });

    it('should not share SLA history', () => {
      const analytics1 = new TicketAnalytics();
      const analytics2 = new TicketAnalytics();

      analytics1.trackTicket(createTicket('T1'));
      const metrics1 = analytics1.getSLAMetrics();
      const metrics2 = analytics2.getSLAMetrics();

      expect(metrics1.total).toBe(1);
      expect(metrics2.total).toBe(0);
    });
  });

  // ===== DATA CLEARING =====
  describe('Data Management', () => {
    it('should clear tickets for specific department', () => {
      analytics.trackTicket(createTicket('T1', { department: 'support' }));
      analytics.trackTicket(createTicket('T2', { department: 'billing' }));

      analytics.clearTickets('support');

      const metrics = analytics.getDepartmentMetrics('support');
      expect(metrics.totalTickets).toBe(0);

      const deptMetrics = analytics.getDepartmentMetrics('billing');
      expect(deptMetrics.totalTickets).toBe(1);
    });

    it('should clear all tickets', () => {
      analytics.trackTicket(createTicket('T1'));
      analytics.trackTicket(createTicket('T2'));

      analytics.clearTickets();

      const summary = analytics.getSummary();
      expect(summary.total).toBe(0);
    });

    it('should clear all data including SLA history', () => {
      analytics.trackTicket(createTicket('T1'));
      analytics.clearAllData();

      const metrics = analytics.getSLAMetrics();
      expect(metrics.total).toBe(0);
    });
  });

  // ===== EDGE CASES =====
  describe('Edge Cases', () => {
    it('should handle tickets with same department', () => {
      analytics.trackTicket(createTicket('T1', { department: 'support' }));
      analytics.trackTicket(createTicket('T2', { department: 'support' }));
      analytics.trackTicket(createTicket('T3', { department: 'support' }));

      const summary = analytics.getSummary();
      expect(summary.total).toBe(3);
    });

    it('should handle rapid ticket tracking', () => {
      for (let i = 0; i < 20; i++) {
        analytics.trackTicket(createTicket(`T${i}`));
      }

      const summary = analytics.getSummary();
      expect(summary.total).toBe(20);
    });

    it('should handle mixed date formats', () => {
      const now = Date.now();
      analytics.trackTicket(createTicket('T1', {
        createdAt: now,
        updatedAt: new Date(now + 1000 * 60 * 60).toISOString() as any
      }));

      const summary = analytics.getSummary();
      expect(summary.total).toBe(1);
    });

    it('should return empty results when no data', () => {
      const summary = analytics.getSummary();
      expect(summary.total).toBe(0);
      expect(summary.busiestDepartments).toHaveLength(0);
    });

    it('should handle zero metrics calculation', () => {
      const metrics = analytics.getSLAMetrics();
      expect(metrics.avgResolutionTimeHours).toBe(0);
      expect(metrics.slaComplianceRate).toBe(100); // 100% when no violations
    });
  });
});