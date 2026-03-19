import { describe, it, expect, beforeEach } from 'vitest';
import { UserAnalytics } from '../src/modules/user-analytics';

describe('UserAnalytics', () => {
  let ua: UserAnalytics;

  beforeEach(() => {
    ua = new UserAnalytics();
  });

  describe('Initialization & Configuration', () => {
    it('should create instance with default configuration', () => {
      expect(ua).toBeDefined();
      expect(ua instanceof UserAnalytics).toBe(true);
    });

    it('should accept enableEvents configuration', () => {
      const custom = new UserAnalytics({ enableEvents: false });
      expect(custom).toBeDefined();
    });

    it('should accept maxEventHistory configuration', () => {
      const custom = new UserAnalytics({ maxEventHistory: 5000 });
      expect(custom).toBeDefined();
    });

    it('should accept enableSessions configuration', () => {
      const custom = new UserAnalytics({ enableSessions: true });
      expect(custom).toBeDefined();
    });

    it('should accept sessionTimeout configuration', () => {
      const custom = new UserAnalytics({ sessionTimeout: 60 * 60 * 1000 });
      expect(custom).toBeDefined();
    });

    it('should initialize with no events', () => {
      expect(ua.getEvents().length).toBe(0);
    });
  });

  describe('Event Tracking', () => {
    it('should track event with user ID and event name', () => {
      const event = ua.track('USER1', 'login');
      
      expect(event).toHaveProperty('id');
      expect(event.userId).toBe('USER1');
      expect(event.event).toBe('login');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should track event with details', () => {
      const event = ua.track('USER1', 'purchase', { productId: 'P123', amount: 99.99 });
      
      expect(event.details).toEqual({ productId: 'P123', amount: 99.99 });
    });

    it('should throw error for missing user ID', () => {
      expect(() => ua.track('', 'event')).toThrow('User ID is required');
    });

    it('should throw error for missing event name', () => {
      expect(() => ua.track('USER1', '')).toThrow('Event name is required');
    });

    it('should track multiple events for same user', () => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      ua.track('USER1', 'logout');
      
      const events = ua.getEvents('USER1');
      expect(events.length).toBe(3);
      expect(events[0].event).toBe('login');
      expect(events[2].event).toBe('logout');
    });

    it('should track events for different users', () => {
      ua.track('USER1', 'login');
      ua.track('USER2', 'login');
      ua.track('USER1', 'logout');
      
      const all = ua.getEvents();
      expect(all.length).toBe(3);
    });

    it('should maintain max event history per user', () => {
      const limited = new UserAnalytics({ maxEventHistory: 5 });
      
      for (let i = 0; i < 10; i++) {
        limited.track('USER1', `event${i}`);
      }
      
      const events = limited.getEvents('USER1');
      expect(events.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Event Retrieval & Filtering', () => {
    beforeEach(() => {
      ua.track('USER1', 'login', { ip: '192.168.1.1' });
      ua.track('USER1', 'browse', { page: 'home' });
      ua.track('USER2', 'login', { ip: '192.168.1.2' });
      ua.track('USER1', 'purchase', { amount: 100 });
      ua.track('USER1', 'logout', { duration: 300 });
    });

    it('should get all events for specific user', () => {
      const events = ua.getEvents('USER1');
      expect(events.length).toBe(4);
      expect(events.every(e => e.userId === 'USER1')).toBe(true);
    });

    it('should get all events without filter', () => {
      const events = ua.getEvents();
      expect(events.length).toBe(5);
    });

    it('should filter events by type', () => {
      const events = ua.getEvents('USER1', { event: 'login' });
      expect(events.length).toBe(1);
      expect(events[0].event).toBe('login');
    });

    it('should filter events by time range', () => {
      const now = Date.now();
      const recentEvents = ua.getEvents('USER1', { since: now - 1000 });
      
      expect(recentEvents.length).toBeGreaterThan(0);
      expect(recentEvents.every(e => e.timestamp >= now - 1000)).toBe(true);
    });

    it('should filter events when user ID is provided', () => {
      const events = ua.getEvents('USER1', {});
      expect(events.every(e => e.userId === 'USER1')).toBe(true);
    });
  });

  describe('Event Counting', () => {
    beforeEach(() => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      ua.track('USER2', 'login');
      ua.track('USER2', 'logout');
    });

    it('should count events for user', () => {
      const counts = ua.getEventCounts('USER1');
      
      expect(counts.login).toBe(2);
      expect(counts.browse).toBe(1);
    });

    it('should count all events', () => {
      const counts = ua.getEventCounts();
      
      expect(counts.login).toBe(3);
      expect(counts.logout).toBe(1);
      expect(counts.browse).toBe(1);
    });

    it('should return empty object for user with no events', () => {
      const counts = ua.getEventCounts('NONEXISTENT');
      expect(counts).toEqual({});
    });
  });

  describe('Event Statistics', () => {
    beforeEach(() => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      ua.track('USER1', 'login');
      ua.track('USER1', 'purchase');
    });

    it('should calculate event statistics for user', () => {
      const stats = ua.getEventStats('USER1') as any;
      
      expect(stats.userId).toBe('USER1');
      expect(stats.totalEvents).toBe(4);
      expect(stats.uniqueEvents).toBe(3); // login, browse, purchase
      expect(stats.eventCounts.login).toBe(2);
    });

    it('should include first and last seen timestamps', () => {
      const stats = ua.getEventStats('USER1') as any;
      
      expect(stats.firstSeen).toBeLessThanOrEqual(stats.lastSeen);
    });

    it('should return stats for all users', () => {
      ua.track('USER2', 'login');
      ua.track('USER2', 'logout');

      const allStats = ua.getEventStats() as any;
      
      expect(allStats.USER1).toBeDefined();
      expect(allStats.USER2).toBeDefined();
    });

    it('should calculate active days', () => {
      const stats = ua.getEventStats('USER1') as any;
      
      expect(stats.activeDays).toBeDefined();
      expect(stats.activeDays).toBeGreaterThan(0);
    });

    it('should calculate average events per day', () => {
      const stats = ua.getEventStats('USER1') as any;
      
      expect(stats.averageEventsPerDay).toBeDefined();
      expect(stats.averageEventsPerDay).toBeGreaterThan(0);
    });
  });

  describe('Active Users', () => {
    beforeEach(() => {
      ua.track('USER1', 'login');
      ua.track('USER2', 'login');
      ua.track('USER3', 'login');
      ua.track('USER1', 'logout');
    });

    it('should get active users in time window', () => {
      const active = ua.getActiveUsers(60000); // Last 60 seconds
      
      expect(active.length).toBeGreaterThan(0);
      expect(active).toContain('USER1');
      expect(active).toContain('USER2');
      expect(active).toContain('USER3');
    });

    it('should return empty array for future time window', () => {
      const active = ua.getActiveUsers(-1000); // Future time
      
      expect(active.length).toBe(0);
    });

    it('should return all users without time filter', () => {
      const active = ua.getActiveUsers();
      
      expect(active.length).toBe(3);
    });
  });

  describe('User Retention', () => {
    it('should handle retention calculation', () => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'activity');
      
      const retention = ua.getUserRetention(1);
      expect(typeof retention).toBe('number');
      expect(retention).toBeGreaterThanOrEqual(0);
      expect(retention).toBeLessThanOrEqual(100);
    });

    it('should throw error for invalid days', () => {
      expect(() => ua.getUserRetention(0)).toThrow('Days must be greater than 0');
      expect(() => ua.getUserRetention(-1)).toThrow('Days must be greater than 0');
    });

    it('should return 0 for no users', () => {
      const retention = ua.getUserRetention(1);
      expect(retention).toBe(0);
    });
  });

  describe('Session Management', () => {
    it('should create session on first event', () => {
      ua.track('USER1', 'login');
      const session = ua.getCurrentSession('USER1');
      
      expect(session).toBeDefined();
      expect(session?.userId).toBe('USER1');
      expect(session?.eventCount).toBe(1);
    });

    it('should track events in session', () => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      ua.track('USER1', 'purchase');
      
      const session = ua.getCurrentSession('USER1');
      
      expect(session?.eventCount).toBe(3);
      expect(session?.events).toContain('login');
      expect(session?.events).toContain('browse');
      expect(session?.events).toContain('purchase');
    });

    it('should return null for user with no session', () => {
      const session = ua.getCurrentSession('NONEXISTENT');
      expect(session).toBeNull();
    });

    it('should throw error for empty user ID', () => {
      expect(() => ua.getCurrentSession('')).toThrow('User ID is required');
    });

    it('should manage sessions for user', () => {
      ua.track('USER1', 'login');
      const session = ua.getCurrentSession('USER1');
      
      expect(session).toBeDefined();
      const sessions = ua.getSessions('USER1');
      expect(Array.isArray(sessions)).toBe(true);
    });
  });

  describe('Event Timeline', () => {
    beforeEach(() => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      ua.track('USER1', 'purchase');
    });

    it('should generate event timeline for specific event', () => {
      const timeline = ua.getEventTimeline('USER1', 'login');
      
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('timestamp');
      expect(timeline[0]).toHaveProperty('count');
    });

    it('should generate event timeline for all events', () => {
      const timeline = ua.getEventTimeline('USER1');
      
      expect(timeline.length).toBeGreaterThan(0);
    });

    it('should sort timeline by timestamp', () => {
      const timeline = ua.getEventTimeline('USER1');
      
      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].timestamp).toBeGreaterThanOrEqual(timeline[i - 1].timestamp);
      }
    });

    it('should throw error for empty user ID', () => {
      expect(() => ua.getEventTimeline('')).toThrow('User ID is required');
    });
  });

  describe('Date Range Filtering', () => {
    let startTime: number;
    let endTime: number;

    beforeEach(() => {
      startTime = Date.now();
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      endTime = Date.now() + 1000;
    });

    it('should filter events by date range', () => {
      const events = ua.filterByDateRange('USER1', startTime - 1000, endTime + 1000);
      
      expect(events.length).toBe(2);
      expect(events.every(e => e.timestamp >= startTime - 1000)).toBe(true);
    });

    it('should return empty array for out of range dates', () => {
      const events = ua.filterByDateRange('USER1', endTime + 1000, endTime + 2000);
      
      expect(events.length).toBe(0);
    });

    it('should throw error for invalid time range', () => {
      expect(() => ua.filterByDateRange('USER1', endTime, startTime)).toThrow('Start time must be before end time');
    });

    it('should throw error for negative timestamps', () => {
      expect(() => ua.filterByDateRange('USER1', -1, 100)).toThrow('Timestamps must be non-negative');
    });
  });

  describe('Reporting', () => {
    beforeEach(() => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'login');
      ua.track('USER1', 'browse');
      ua.track('USER1', 'purchase');
    });

    it('should generate basic report', () => {
      const report = ua.generateReport('USER1');
      
      expect(report).toContain('login: 2');
      expect(report).toContain('browse: 1');
      expect(report).toContain('purchase: 1');
    });

    it('should generate report without user ID', () => {
      const report = ua.generateReport();
      
      expect(report).toContain('login');
      expect(report).toContain('browse');
      expect(report).toContain('purchase');
    });

    it('should handle no events for user', () => {
      const report = ua.generateReport('NONEXISTENT');
      
      expect(report).toContain('No events found');
    });

    it('should generate detailed report', () => {
      const report = ua.generateDetailedReport('USER1');
      
      expect(report).toContain('User Analytics Report');
      expect(report).toContain('Total Events: 4');
      expect(report).toContain('Unique Event Types: 3');
      expect(report).toContain('First Seen');
      expect(report).toContain('Last Seen');
    });

    it('should throw error for empty user ID in detailed report', () => {
      expect(() => ua.generateDetailedReport('')).toThrow('User ID is required');
    });
  });

  describe('Event Emission', () => {
    it('should emit eventTracked event', () => {
      return new Promise<void>((resolve) => {
        ua.once('eventTracked', (data) => {
          expect(data).toHaveProperty('event');
          expect(data.event.event).toBe('login');
          resolve();
        });
        ua.track('USER1', 'login');
      });
    });

    it('should emit eventsCleared event', () => {
      ua.track('USER1', 'login');
      return new Promise<void>((resolve) => {
        ua.once('eventsCleared', (data) => {
          expect(data).toHaveProperty('userId');
          resolve();
        });
        ua.clearEvents('USER1');
      });
    });

    it('should not emit events when disabled', () => {
      const noEventUA = new UserAnalytics({ enableEvents: false });
      let emitted = false;

      noEventUA.once('eventTracked', () => {
        emitted = true;
      });

      noEventUA.track('USER1', 'login');
      expect(emitted).toBe(false);
    });
  });

  describe('Instance Isolation', () => {
    it('should not share events between instances', () => {
      const ua1 = new UserAnalytics();
      const ua2 = new UserAnalytics();

      ua1.track('USER1', 'login');
      ua2.track('USER1', 'logout');

      expect(ua1.getEvents('USER1').length).toBe(1);
      expect(ua2.getEvents('USER1').length).toBe(1);
      expect(ua1.getEvents('USER1')[0].event).toBe('login');
      expect(ua2.getEvents('USER1')[0].event).toBe('logout');
    });

    it('should not share sessions between instances', () => {
      const ua1 = new UserAnalytics({ enableSessions: true });
      const ua2 = new UserAnalytics({ enableSessions: true });

      ua1.track('USER1', 'login');
      ua2.track('USER1', 'login');

      const session1 = ua1.getCurrentSession('USER1');
      const session2 = ua2.getCurrentSession('USER1');

      expect(session1?.id).not.toBe(session2?.id);
    });
  });

  describe('Event Clearing', () => {
    it('should clear events for specific user', () => {
      ua.track('USER1', 'login');
      ua.track('USER1', 'logout');
      ua.track('USER2', 'login');

      ua.clearEvents('USER1');

      expect(ua.getEvents('USER1').length).toBe(0);
      expect(ua.getEvents('USER2').length).toBe(1);
    });

    it('should clear all events', () => {
      ua.track('USER1', 'login');
      ua.track('USER2', 'login');

      ua.clearEvents();

      expect(ua.getEvents().length).toBe(0);
    });

    it('should return without error for empty user ID', () => {
      expect(() => ua.clearEvents('')).not.toThrow();
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data including sessions', () => {
      ua.track('USER1', 'login');
      ua.track('USER2', 'logout');

      ua.clearAllData();

      expect(ua.getEvents().length).toBe(0);
      expect(ua.getCurrentSession('USER1')).toBeNull();
      expect(ua.getActiveUsers()).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle events with null details', () => {
      const event = ua.track('USER1', 'login', null as any);
      
      expect(event.details).toBeNull();
    });

    it('should handle very large event details', () => {
      const largeDetails = { data: 'x'.repeat(10000) };
      const event = ua.track('USER1', 'bigdata', largeDetails);
      
      expect(event.details.data.length).toBe(10000);
    });

    it('should handle rapid successive events', () => {
      for (let i = 0; i < 100; i++) {
        ua.track('USER1', `event${i}`);
      }
      
      const events = ua.getEvents('USER1');
      expect(events.length).toBe(100);
    });

    it('should handle events with special characters in names', () => {
      ua.track('USER1', 'event:special-chars_123');
      const counts = ua.getEventCounts('USER1');
      
      expect(counts['event:special-chars_123']).toBe(1);
    });
  });
});
