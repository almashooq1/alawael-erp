/**
 * System Integration Bus — Tests
 *
 * Tests the unified event bus: initialization, publish/subscribe,
 * pattern matching, middleware pipeline, domain registration,
 * statistics, and health checks.
 */

'use strict';

const {
  SystemIntegrationBus,
  DELIVERY,
  PRIORITY,
  createEventEnvelope,
} = require('../../integration/systemIntegrationBus');

describe('SystemIntegrationBus', () => {
  let bus;

  beforeEach(() => {
    bus = new SystemIntegrationBus();
    bus.initialize(); // no external infra in test
  });

  afterEach(() => {
    bus.removeAllListeners();
  });

  // ─── Initialization ──────────────────────────────────────────────────

  describe('initialization', () => {
    it('should initialize with default config', () => {
      expect(bus._initialized).toBe(true);
    });

    it('should initialize with external infrastructure', () => {
      const bus2 = new SystemIntegrationBus();
      const mockEventStore = { appendEvents: jest.fn(), queryEvents: jest.fn() };
      const mockMQ = { publish: jest.fn(), subscribe: jest.fn() };
      bus2.initialize({ eventStore: mockEventStore, messageQueue: mockMQ });
      expect(bus2._initialized).toBe(true);
      expect(bus2._eventStore).toBe(mockEventStore);
      expect(bus2._messageQueue).toBe(mockMQ);
    });

    it('should return self for chaining', () => {
      const bus2 = new SystemIntegrationBus();
      const result = bus2.initialize();
      expect(result).toBe(bus2);
    });
  });

  // ─── Domain Registration ─────────────────────────────────────────────

  describe('registerDomain', () => {
    it('should register a domain with events', () => {
      bus.registerDomain('hr', {
        version: '1.0.0',
        events: ['employee.hired', 'employee.terminated'],
      });

      const stats = bus.getStats();
      expect(stats.registeredDomains).toBeGreaterThanOrEqual(1);
    });

    it('should register multiple domains', () => {
      bus.registerDomain('hr', { events: ['employee.hired'] });
      bus.registerDomain('finance', { events: ['invoice.created'] });

      const stats = bus.getStats();
      expect(stats.registeredDomains).toBeGreaterThanOrEqual(2);
    });

    it('should be retrievable via getRegisteredDomains', () => {
      bus.registerDomain('hr', { version: '2.0.0', events: ['employee.hired'] });
      
      const domains = bus.getRegisteredDomains();
      expect(domains.hr).toBeDefined();
      expect(domains.hr.version).toBe('2.0.0');
    });
  });

  // ─── Publish / Subscribe ─────────────────────────────────────────────

  describe('publish / subscribe', () => {
    it('should deliver events to exact-match subscribers', async () => {
      const handler = jest.fn();
      bus.subscribe('hr.employee.hired', handler);

      await bus.publish('hr', 'employee.hired', { name: 'John' });

      // Subscribers dispatched via setImmediate
      await new Promise(r => setTimeout(r, 50));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'hr',
          eventType: 'employee.hired',
          payload: expect.objectContaining({ name: 'John' }),
        })
      );
    });

    it('should deliver events to wildcard .* subscribers', async () => {
      const handler = jest.fn();
      bus.subscribe('hr.*', handler);

      await bus.publish('hr', 'employee.hired', { name: 'A' });
      await bus.publish('hr', 'salary.changed', { amount: 5000 });

      await new Promise(r => setTimeout(r, 50));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should deliver events to domain-scoped subscribers', async () => {
      const handler = jest.fn();
      bus.subscribeDomain('finance', handler);

      await bus.publish('finance', 'invoice.created', { amount: 100 });
      await bus.publish('finance', 'payment.received', { amount: 200 });
      await bus.publish('hr', 'employee.hired', { name: 'X' }); // should not match

      await new Promise(r => setTimeout(r, 50));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should NOT deliver to non-matching subscribers', async () => {
      const handler = jest.fn();
      bus.subscribe('medical.record.created', handler);

      await bus.publish('hr', 'employee.hired', { name: 'Y' });

      await new Promise(r => setTimeout(r, 50));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should include metadata in event envelope', async () => {
      const handler = jest.fn();
      bus.subscribe('hr.employee.hired', handler);

      await bus.publish('hr', 'employee.hired', { name: 'Z' }, {
        correlationId: 'corr-123',
        userId: 'user-456',
        source: 'test',
      });

      await new Promise(r => setTimeout(r, 50));

      const event = handler.mock.calls[0][0];
      expect(event.metadata).toBeDefined();
      expect(event.metadata.correlationId).toBe('corr-123');
      expect(event.metadata.userId).toBe('user-456');
      expect(event.metadata.source).toBe('test');
    });

    it('should handle multiple subscribers for same pattern', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      bus.subscribe('hr.employee.hired', handler1);
      bus.subscribe('hr.employee.hired', handler2);

      await bus.publish('hr', 'employee.hired', { name: 'A' });

      await new Promise(r => setTimeout(r, 50));

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not throw when subscriber handler errors', async () => {
      bus.subscribe('hr.employee.hired', () => {
        throw new Error('Handler exploded');
      });

      // Should not throw
      await bus.publish('hr', 'employee.hired', { name: 'A' });
      await new Promise(r => setTimeout(r, 50));
    });

    it('should deliver events to global * subscriber', async () => {
      const handler = jest.fn();
      bus.subscribeAll(handler);

      await bus.publish('hr', 'test', {});
      await bus.publish('finance', 'test', {});

      await new Promise(r => setTimeout(r, 50));

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should return unsubscribe function', async () => {
      const handler = jest.fn();
      const unsub = bus.subscribe('hr.test', handler);

      await bus.publish('hr', 'test', {});
      await new Promise(r => setTimeout(r, 50));
      expect(handler).toHaveBeenCalledTimes(1);

      unsub(); // unsubscribe

      await bus.publish('hr', 'test', {});
      await new Promise(r => setTimeout(r, 50));
      expect(handler).toHaveBeenCalledTimes(1); // still 1
    });
  });

  // ─── Middleware Pipeline ─────────────────────────────────────────────

  describe('middleware', () => {
    it('should run middleware before publishing', async () => {
      const mw = jest.fn((event) => event);
      bus.use(mw);

      const handler = jest.fn();
      bus.subscribe('hr.test', handler);

      await bus.publish('hr', 'test', { x: 1 });
      await new Promise(r => setTimeout(r, 50));

      expect(mw).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow middleware to modify events', async () => {
      bus.use((event) => {
        event.payload.enriched = true;
        return event;
      });

      const handler = jest.fn();
      bus.subscribe('hr.test', handler);

      await bus.publish('hr', 'test', { x: 1 });
      await new Promise(r => setTimeout(r, 50));

      const delivered = handler.mock.calls[0][0];
      expect(delivered.payload.enriched).toBe(true);
    });

    it('should support multiple middleware in order', async () => {
      const order = [];
      bus.use((event) => { order.push(1); return event; });
      bus.use((event) => { order.push(2); return event; });

      bus.subscribe('test.event', jest.fn());
      await bus.publish('test', 'event', {});

      expect(order).toEqual([1, 2]);
    });

    it('should drop event when middleware returns null', async () => {
      bus.use(() => null);

      const handler = jest.fn();
      bus.subscribe('hr.test', handler);

      const result = await bus.publish('hr', 'test', {});
      await new Promise(r => setTimeout(r, 50));

      expect(result).toBeNull();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─── Event Envelope ──────────────────────────────────────────────────

  describe('createEventEnvelope', () => {
    it('should create envelope with all required fields', () => {
      const envelope = createEventEnvelope('hr', 'employee.hired', { name: 'Test' });

      expect(envelope).toMatchObject({
        domain: 'hr',
        eventType: 'employee.hired',
        payload: { name: 'Test' },
      });
      expect(envelope.id).toBeDefined();
      expect(envelope.metadata).toBeDefined();
      expect(envelope.metadata.timestamp).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const e1 = createEventEnvelope('a', 'b', {});
      const e2 = createEventEnvelope('a', 'b', {});
      expect(e1.id).not.toBe(e2.id);
    });

    it('should include delivery and priority defaults', () => {
      const envelope = createEventEnvelope('hr', 'test', {});
      expect(envelope.delivery).toBeDefined();
      expect(envelope.priority).toBe(PRIORITY.NORMAL);
    });

    it('should accept custom options', () => {
      const envelope = createEventEnvelope('hr', 'test', {}, {
        correlationId: 'c-1',
        priority: PRIORITY.CRITICAL,
      });
      expect(envelope.metadata.correlationId).toBe('c-1');
      expect(envelope.priority).toBe(PRIORITY.CRITICAL);
    });
  });

  // ─── Statistics ──────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return stats after publish', async () => {
      bus.subscribe('hr.test', jest.fn());
      await bus.publish('hr', 'test', {});
      await bus.publish('hr', 'test', {});

      const stats = bus.getStats();
      expect(stats.published).toBeGreaterThanOrEqual(2);
      expect(stats.totalSubscribers).toBeGreaterThanOrEqual(1);
    });

    it('should report correct infrastructure availability', () => {
      const stats = bus.getStats();
      expect(stats.infrastructure).toBeDefined();
      expect(stats.infrastructure.eventStore).toBe(false);
      expect(stats.infrastructure.messageQueue).toBe(false);
    });

    it('should track registered domains', () => {
      bus.registerDomain('hr', { events: ['a'] });
      expect(bus.getStats().registeredDomains).toBe(1);
    });
  });

  // ─── Health Check ────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should report healthy when initialized', async () => {
      const health = await bus.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.bus).toBe(true);
    });

    it('should report degraded when not initialized', async () => {
      const bus2 = new SystemIntegrationBus();
      const health = await bus2.healthCheck();
      expect(health.status).toBe('degraded');
    });

    it('should include timestamp', async () => {
      const health = await bus.healthCheck();
      expect(health.timestamp).toBeDefined();
    });
  });

  // ─── Pattern Matching ────────────────────────────────────────────────

  describe('pattern matching', () => {
    it('should match exact pattern', () => {
      expect(bus._matchPattern('hr.employee.hired', 'hr.employee.hired')).toBe(true);
    });

    it('should not match different exact patterns', () => {
      expect(bus._matchPattern('hr.employee.hired', 'hr.employee.fired')).toBe(false);
    });

    it('should match .* suffix wildcard', () => {
      expect(bus._matchPattern('hr.*', 'hr.employee.hired')).toBe(true);
      expect(bus._matchPattern('hr.*', 'hr.salary.changed')).toBe(true);
    });

    it('should not match .* against different domain', () => {
      expect(bus._matchPattern('hr.*', 'finance.invoice.created')).toBe(false);
    });

    it('should match .> suffix wildcard', () => {
      expect(bus._matchPattern('hr.>', 'hr.employee.hired')).toBe(true);
    });

    it('should match global *', () => {
      expect(bus._matchPattern('*', 'anything.here')).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════════════════

describe('Integration Constants', () => {
  it('should export DELIVERY constants', () => {
    expect(DELIVERY.PERSIST).toBe('persist');
    expect(DELIVERY.BROADCAST).toBe('broadcast');
    expect(DELIVERY.REALTIME).toBe('realtime');
    expect(DELIVERY.LOCAL).toBe('local');
  });

  it('should export PRIORITY constants', () => {
    expect(PRIORITY.CRITICAL).toBe('critical');
    expect(PRIORITY.HIGH).toBe('high');
    expect(PRIORITY.NORMAL).toBe('normal');
    expect(PRIORITY.LOW).toBe('low');
  });
});
