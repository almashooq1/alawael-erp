/**
 * Unit Tests — emailEventBridge.js
 * Event bridge connecting system events to email sending via EmailManager
 */

/* ─── Logger Mock ───────────────────────────────────── */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ─── SUT ───────────────────────────────────────────── */
const EventEmitter = require('events');
const EmailEventBridge = require('../../services/email/emailEventBridge');

/* ─── Helper: build mock EmailManager ────────────────── */
function createMockEmailManager() {
  return {
    initialized: true,
    send: jest.fn().mockResolvedValue({ success: true, emailId: 'em1' }),
    sendTemplate: jest.fn().mockResolvedValue({ success: true, emailId: 'em2' }),
    sendBulk: jest.fn().mockResolvedValue({ total: 1, sent: 1, failed: 0 }),
    sendWelcome: jest.fn().mockResolvedValue({ success: true }),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true }),
    sendOTP: jest.fn().mockResolvedValue({ success: true }),
    sendLoginAlert: jest.fn().mockResolvedValue({ success: true }),
    sendAppointmentReminder: jest.fn().mockResolvedValue({ success: true }),
    sendAccountLocked: jest.fn().mockResolvedValue({ success: true }),
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
    sendAlert: jest.fn().mockResolvedValue({ success: true }),
    sendInvoice: jest.fn().mockResolvedValue({ success: true }),
    sendLeaveRequest: jest.fn().mockResolvedValue({ success: true }),
    sendLeaveApproved: jest.fn().mockResolvedValue({ success: true }),
    sendLeaveRejected: jest.fn().mockResolvedValue({ success: true }),
    sendSalarySlip: jest.fn().mockResolvedValue({ success: true }),
    send2FAEnabled: jest.fn().mockResolvedValue({ success: true }),
    send2FADisabled: jest.fn().mockResolvedValue({ success: true }),
    sendEmailVerification: jest.fn().mockResolvedValue({ success: true }),
    getAvailableTemplates: jest.fn().mockReturnValue(['WELCOME', 'OTP_CODE']),
    getStats: jest.fn().mockResolvedValue({}),
  };
}

describe('EmailEventBridge', () => {
  let bridge;
  let mockManager;
  let bus;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_EVENT_BRIDGE = 'true';
    mockManager = createMockEmailManager();
    bridge = new EmailEventBridge(mockManager);
    bus = new EventEmitter();
  });

  afterEach(() => {
    bridge.disconnect();
    delete process.env.EMAIL_EVENT_BRIDGE;
  });

  // ═══════════════════════════════════════════
  //  Constructor
  // ═══════════════════════════════════════════
  describe('constructor', () => {
    it('stores emailManager reference', () => {
      expect(bridge.emailManager).toBe(mockManager);
    });
    it('initializes _bus as null', () => {
      expect(bridge._bus).toBeNull();
    });
    it('initializes stats', () => {
      expect(bridge._stats.received).toBe(0);
      expect(bridge._stats.processed).toBe(0);
      expect(bridge._stats.skipped).toBe(0);
      expect(bridge._stats.errors).toBe(0);
      expect(bridge._stats.deduplicated).toBe(0);
    });
    it('has empty subscriptions', () => {
      expect(bridge._subscriptions).toEqual([]);
    });
    it('initializes deduplication cache', () => {
      expect(bridge._dedupeCache).toBeInstanceOf(Map);
      expect(bridge._dedupeCache.size).toBe(0);
    });
    it('sets _enabled from env', () => {
      expect(bridge._enabled).toBe(true);
    });
    it('disables when env set to false', () => {
      process.env.EMAIL_EVENT_BRIDGE = 'false';
      const b = new EmailEventBridge(mockManager);
      expect(b._enabled).toBe(false);
    });
    it('has _dedupeWindow default 5 min', () => {
      expect(bridge._dedupeWindow).toBe(5 * 60 * 1000);
    });
  });

  // ═══════════════════════════════════════════
  //  connect / disconnect
  // ═══════════════════════════════════════════
  describe('connect', () => {
    it('connects to bus and registers subscriptions', () => {
      bridge.connect({ bus });
      expect(bridge._bus).toBe(bus);
      expect(bridge._subscriptions.length).toBeGreaterThan(0);
    });
    it('starts dedup purge interval', () => {
      bridge.connect({ bus });
      expect(bridge._dedupePurgeInterval).toBeDefined();
    });
    it('does not connect when disabled', () => {
      process.env.EMAIL_EVENT_BRIDGE = 'false';
      const b = new EmailEventBridge(mockManager);
      b.connect({ bus });
      expect(b._bus).toBeNull();
    });
    it('accepts moduleConnector option', () => {
      const mc = { register: jest.fn() };
      bridge.connect({ bus, moduleConnector: mc });
      expect(bridge._moduleConnector).toBe(mc);
    });
    it('accepts socketEmitter option', () => {
      const se = { emit: jest.fn() };
      bridge.connect({ bus, socketEmitter: se });
      expect(mockManager._wsManager).toBe(se);
    });
    it('returns this for chaining', () => {
      const result = bridge.connect({ bus });
      expect(result).toBe(bridge);
    });
  });

  describe('disconnect', () => {
    it('clears subscriptions', () => {
      bridge.connect({ bus });
      bridge.disconnect();
      expect(bridge._subscriptions).toEqual([]);
    });
    it('clears dedup interval', () => {
      bridge.connect({ bus });
      bridge.disconnect();
      expect(bridge._dedupePurgeInterval).toBeNull();
    });
    it('clears dedup cache', () => {
      bridge._dedupeCache.set('test', Date.now());
      bridge.disconnect();
      expect(bridge._dedupeCache.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  //  emitEvent
  // ═══════════════════════════════════════════
  describe('emitEvent', () => {
    it('emits event on bus and returns success', async () => {
      bridge.connect({ bus });
      const spy = jest.spyOn(bus, 'emit');
      const r = await bridge.emitEvent('test:event', { x: 1 });
      expect(r.success).toBe(true);
      expect(spy).toHaveBeenCalledWith('test:event', { x: 1 });
    });
    it('returns error when no bus', async () => {
      const r = await bridge.emitEvent('test', {});
      expect(r.success).toBe(false);
      expect(r.error).toBe('No bus connected');
    });
  });

  // ═══════════════════════════════════════════
  //  Auth Event Handlers (via bus.emit)
  // ═══════════════════════════════════════════
  describe('auth event handlers', () => {
    beforeEach(() => {
      bridge.connect({ bus });
    });

    it('auth.user.registered → sendWelcome', async () => {
      bus.emit('auth.user.registered', {
        user: { email: 'ali@test.com', name: 'Ali' },
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendWelcome).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ali@test.com', name: 'Ali' })
      );
    });

    it('auth.password.reset.requested → sendPasswordReset', async () => {
      bus.emit('auth.password.reset.requested', {
        user: { email: 'ali@test.com', name: 'Ali' },
        token: 'tok123',
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendPasswordReset).toHaveBeenCalled();
    });

    it('auth.otp.generated → sendOTP', async () => {
      bus.emit('auth.otp.generated', {
        user: { email: 'ali@test.com' },
        otp: '1234',
        expiry: 5,
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendOTP).toHaveBeenCalled();
    });

    it('auth.user.login → sendLoginAlert for admin', async () => {
      bus.emit('auth.user.login', {
        user: { email: 'admin@test.com', name: 'Admin', role: 'admin' },
        ip: '1.2.3.4',
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendLoginAlert).toHaveBeenCalled();
    });

    it('auth.user.login skips non-admin without sendAlert', async () => {
      bus.emit('auth.user.login', {
        user: { email: 'user@test.com', name: 'User', role: 'user' },
        ip: '1.2.3.4',
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendLoginAlert).not.toHaveBeenCalled();
    });

    it('auth.user.locked → sendAccountLocked', async () => {
      bus.emit('auth.user.locked', {
        user: { email: 'ali@test.com', name: 'Ali' },
        attempts: 5,
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendAccountLocked).toHaveBeenCalled();
    });

    it('auth.password.changed → sendNotification', async () => {
      bus.emit('auth.password.changed', {
        user: { email: 'ali@test.com', name: 'Ali' },
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendNotification).toHaveBeenCalledWith(
        'ali@test.com',
        expect.objectContaining({ title: 'تم تغيير كلمة المرور ✅' })
      );
    });

    it('auth.2fa.enabled → send2FAEnabled', async () => {
      bus.emit('auth.2fa.enabled', { email: 'ali@test.com', username: 'ali' });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.send2FAEnabled).toHaveBeenCalledWith('ali@test.com', 'ali');
    });

    it('auth.email.verify → sendEmailVerification', async () => {
      bus.emit('auth.email.verify', {
        user: { email: 'ali@test.com' },
        token: 'ver123',
      });
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendEmailVerification).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════
  //  System Events
  // ═══════════════════════════════════════════
  describe('system event handlers', () => {
    beforeEach(() => {
      bridge.connect({ bus });
    });

    it('system.alert.critical increments received', async () => {
      bus.emit('system.alert.critical', {
        title: 'DB Down',
        message: 'Database unreachable',
        recipients: ['admin@test.com'],
      });
      await new Promise(r => setTimeout(r, 50));
      expect(bridge._stats.received).toBeGreaterThanOrEqual(1);
    });

    it('system.error increments received', async () => {
      bus.emit('system.error', {
        error: 'Fatal error',
        stack: 'trace',
        recipients: ['admin@test.com'],
      });
      await new Promise(r => setTimeout(r, 50));
      expect(bridge._stats.received).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════
  //  Stats tracking
  // ═══════════════════════════════════════════
  describe('event processing stats', () => {
    beforeEach(() => {
      bridge.connect({ bus });
    });

    it('increments received on event', async () => {
      bus.emit('auth.user.registered', { user: { email: 'a@b.com', name: 'A' } });
      await new Promise(r => setTimeout(r, 50));
      expect(bridge._stats.received).toBe(1);
    });

    it('increments processed on success', async () => {
      bus.emit('auth.user.registered', { user: { email: 'a@b.com', name: 'A' } });
      await new Promise(r => setTimeout(r, 50));
      expect(bridge._stats.processed).toBe(1);
    });

    it('increments errors on handler failure', async () => {
      mockManager.sendWelcome.mockRejectedValueOnce(new Error('SMTP fail'));
      bus.emit('auth.user.registered', { user: { email: 'a@b.com', name: 'A' } });
      await new Promise(r => setTimeout(r, 50));
      expect(bridge._stats.errors).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════
  //  Deduplication
  // ═══════════════════════════════════════════
  describe('deduplication', () => {
    beforeEach(() => {
      bridge.connect({ bus });
    });

    it('_buildDedupeKey returns string for regular events', () => {
      const key = bridge._buildDedupeKey('auth.user.registered', { email: 'a@b.com' });
      expect(typeof key).toBe('string');
      expect(key).toContain('auth.user.registered');
    });

    it('_buildDedupeKey returns null for OTP events', () => {
      const key = bridge._buildDedupeKey('auth.otp.generated', {});
      expect(key).toBeNull();
    });

    it('_buildDedupeKey returns null for password reset', () => {
      const key = bridge._buildDedupeKey('auth.password.reset.requested', {});
      expect(key).toBeNull();
    });

    it('_isDuplicate returns false for first occurrence', () => {
      expect(bridge._isDuplicate('test:key:1')).toBe(false);
    });

    it('_isDuplicate returns true within window', () => {
      bridge._dedupeCache.set('test:key:2', Date.now());
      expect(bridge._isDuplicate('test:key:2')).toBe(true);
    });

    it('_isDuplicate returns false after window expires', () => {
      bridge._dedupeCache.set('test:key:3', Date.now() - (bridge._dedupeWindow + 1000));
      expect(bridge._isDuplicate('test:key:3')).toBe(false);
    });

    it('deduplicates same event within window', async () => {
      const data = { user: { email: 'dup@test.com', name: 'R' } };
      bus.emit('auth.user.registered', data);
      await new Promise(r => setTimeout(r, 50));
      bus.emit('auth.user.registered', data);
      await new Promise(r => setTimeout(r, 50));
      expect(mockManager.sendWelcome).toHaveBeenCalledTimes(1);
      expect(bridge._stats.deduplicated).toBeGreaterThanOrEqual(1);
    });

    it('_purgeDedupeCache removes expired entries', () => {
      bridge._dedupeCache.set('old', Date.now() - 999999999);
      bridge._dedupeCache.set('new', Date.now());
      bridge._purgeDedupeCache();
      expect(bridge._dedupeCache.has('old')).toBe(false);
      expect(bridge._dedupeCache.has('new')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  //  _safeSend
  // ═══════════════════════════════════════════
  describe('_safeSend', () => {
    it('calls fn and returns result on success', async () => {
      const fn = jest.fn().mockResolvedValue({ success: true });
      const r = await bridge._safeSend(fn, 'test', 'a@b.com');
      expect(fn).toHaveBeenCalled();
      expect(r.success).toBe(true);
    });

    it('catches error and returns failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      const r = await bridge._safeSend(fn, 'test', 'a@b.com');
      expect(r.success).toBe(false);
      expect(r.error).toBe('fail');
      expect(bridge._stats.errors).toBe(1);
    });

    it('returns failed result for non-success', async () => {
      const fn = jest.fn().mockResolvedValue({ success: false, error: 'NO_EMAIL' });
      const r = await bridge._safeSend(fn, 'test', 'a@b.com');
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  //  _on (internal subscription)
  // ═══════════════════════════════════════════
  describe('_on', () => {
    it('does nothing without bus', () => {
      bridge._bus = null;
      bridge._on('test.event', jest.fn());
      expect(bridge._subscriptions).toHaveLength(0);
    });

    it('registers listener on bus', () => {
      bridge._bus = bus;
      const spy = jest.spyOn(bus, 'on');
      bridge._on('custom.event', jest.fn());
      expect(spy).toHaveBeenCalledWith('custom.event', expect.any(Function));
    });

    it('adds to subscriptions', () => {
      bridge._bus = bus;
      bridge._on('custom.event2', jest.fn());
      expect(bridge._subscriptions).toHaveLength(1);
      expect(bridge._subscriptions[0].event).toBe('custom.event2');
    });
  });

  // ═══════════════════════════════════════════
  //  getStats
  // ═══════════════════════════════════════════
  describe('getStats', () => {
    it('returns all stat fields', () => {
      const stats = bridge.getStats();
      expect(stats).toHaveProperty('enabled', true);
      expect(stats).toHaveProperty('connected', false);
      expect(stats).toHaveProperty('subscriptionCount', 0);
      expect(stats).toHaveProperty('dedupeCacheSize', 0);
      expect(stats).toHaveProperty('received', 0);
      expect(stats).toHaveProperty('processed', 0);
      expect(stats).toHaveProperty('errors', 0);
      expect(stats).toHaveProperty('deduplicated', 0);
    });

    it('reflects connected state after connect', () => {
      bridge.connect({ bus });
      const stats = bridge.getStats();
      expect(stats.connected).toBe(true);
      expect(stats.subscriptionCount).toBeGreaterThan(0);
    });

    it('reflects events after processing', async () => {
      bridge.connect({ bus });
      bus.emit('auth.user.registered', { user: { email: 'a@b.com', name: 'A' } });
      await new Promise(r => setTimeout(r, 50));
      const stats = bridge.getStats();
      expect(stats.received).toBe(1);
      expect(stats.processed).toBe(1);
    });
  });

  // ═══════════════════════════════════════════
  //  Module connector hooks
  // ═══════════════════════════════════════════
  describe('module connector', () => {
    it('registers email module on moduleConnector', () => {
      const mc = { register: jest.fn() };
      bridge.connect({ bus, moduleConnector: mc });
      expect(mc.register).toHaveBeenCalledWith('email', expect.any(Object));
    });

    it('handles moduleConnector register error gracefully', () => {
      const mc = {
        register: jest.fn().mockImplementation(() => {
          throw new Error('dup');
        }),
      };
      expect(() => bridge.connect({ bus, moduleConnector: mc })).not.toThrow();
    });
  });
});
