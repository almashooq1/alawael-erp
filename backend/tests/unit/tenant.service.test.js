/**
 * Unit tests for tenant.service.js — Tenant Service
 * Singleton extends EventEmitter, uuid, Logger. All in-memory Maps.
 */

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-' + (global.__tnCtr = (global.__tnCtr || 0) + 1)),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const svc = require('../../services/tenant.service');

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  svc.tenants.clear();
  svc.tenantUsers.clear();
  svc.tenantSettings.clear();
  svc.tenantQuotas.clear();
  svc.tenantStatus.clear();
  svc.stats = {
    totalTenants: 0,
    activeTenants: 0,
    suspendedTenants: 0,
    totalUsers: 0,
    totalStorage: 0,
  };
  global.__tnCtr = 0;
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('TenantService', () => {
  const base = { name: 'Acme', slug: 'acme', email: 'admin@acme.com' };

  /* ── createTenant ────────────────────────────────────────────────── */
  describe('createTenant', () => {
    test('creates tenant with defaults', () => {
      const t = svc.createTenant(base);
      expect(t.id).toBe('tenant-uuid-1');
      expect(t.name).toBe('Acme');
      expect(t.slug).toBe('acme');
      expect(t.planType).toBe('starter');
      expect(t.status).toBe('active');
      expect(t.subdomain).toBe('acme.app');
      expect(svc.tenants.size).toBe(1);
      expect(svc.tenantSettings.has(t.id)).toBe(true);
      expect(svc.tenantQuotas.has(t.id)).toBe(true);
    });

    test('creates with specific plan', () => {
      const t = svc.createTenant({ ...base, planType: 'enterprise' });
      const q = svc.tenantQuotas.get(t.id);
      expect(q.maxUsers).toBe(10000);
    });

    test('throws if name missing', () => {
      expect(() => svc.createTenant({ slug: 'x', email: 'e@e.com' })).toThrow('required');
    });

    test('throws if slug missing', () => {
      expect(() => svc.createTenant({ name: 'X', email: 'e@e.com' })).toThrow('required');
    });

    test('throws if email missing', () => {
      expect(() => svc.createTenant({ name: 'X', slug: 'x' })).toThrow('required');
    });

    test('throws for duplicate slug', () => {
      svc.createTenant(base);
      expect(() => svc.createTenant(base)).toThrow('already exists');
    });

    test('throws for unknown plan', () => {
      expect(() => svc.createTenant({ ...base, planType: 'mega' })).toThrow('Unknown plan type');
    });

    test('emits tenant:created', () => {
      const listener = jest.fn();
      svc.on('tenant:created', listener);
      svc.createTenant(base);
      expect(listener).toHaveBeenCalled();
      svc.removeListener('tenant:created', listener);
    });

    test('increments stats', () => {
      svc.createTenant(base);
      expect(svc.stats.totalTenants).toBe(1);
      expect(svc.stats.activeTenants).toBe(1);
    });
  });

  /* ── getTenant / getTenantBySlug ─────────────────────────────────── */
  describe('Getters', () => {
    test('getTenant returns tenant', () => {
      const t = svc.createTenant(base);
      expect(svc.getTenant(t.id).name).toBe('Acme');
    });

    test('getTenant returns undefined for missing', () => {
      expect(svc.getTenant('nope')).toBeUndefined();
    });

    test('getTenantBySlug returns tenant', () => {
      svc.createTenant(base);
      expect(svc.getTenantBySlug('acme').name).toBe('Acme');
    });

    test('getTenantBySlug returns undefined for missing', () => {
      expect(svc.getTenantBySlug('nope')).toBeUndefined();
    });
  });

  /* ── updateTenant ────────────────────────────────────────────────── */
  describe('updateTenant', () => {
    test('updates fields', () => {
      const t = svc.createTenant(base);
      svc.updateTenant(t.id, { name: 'Updated' });
      expect(svc.getTenant(t.id).name).toBe('Updated');
    });

    test('throws for non-existent', () => {
      expect(() => svc.updateTenant('nope', {})).toThrow('Tenant not found');
    });
  });

  /* ── suspendTenant / reactivateTenant ────────────────────────────── */
  describe('Suspend / Reactivate', () => {
    test('suspendTenant changes status', () => {
      const t = svc.createTenant(base);
      svc.suspendTenant(t.id, 'billing');
      expect(svc.getTenant(t.id).status).toBe('suspended');
      expect(svc.stats.suspendedTenants).toBe(1);
    });

    test('suspendTenant throws for non-existent', () => {
      expect(() => svc.suspendTenant('nope', 'x')).toThrow('Tenant not found');
    });

    test('reactivateTenant restores status', () => {
      const t = svc.createTenant(base);
      svc.suspendTenant(t.id, 'billing');
      svc.reactivateTenant(t.id);
      expect(svc.getTenant(t.id).status).toBe('active');
    });

    test('reactivateTenant throws for non-existent', () => {
      expect(() => svc.reactivateTenant('nope')).toThrow('Tenant not found');
    });
  });

  /* ── deleteTenant ────────────────────────────────────────────────── */
  describe('deleteTenant', () => {
    test('archives tenant', () => {
      const t = svc.createTenant(base);
      svc.deleteTenant(t.id);
      expect(svc.getTenant(t.id).status).toBe('archived');
    });

    test('throws for non-existent', () => {
      expect(() => svc.deleteTenant('nope')).toThrow('Tenant not found');
    });
  });

  /* ── User management ─────────────────────────────────────────────── */
  describe('User management', () => {
    test('addUserToTenant — success', () => {
      const t = svc.createTenant(base);
      svc.addUserToTenant(t.id, 'u1', 'admin');
      const users = svc.getTenantUsers(t.id);
      expect(users).toHaveLength(1);
      expect(users[0].role).toBe('admin');
    });

    test('addUserToTenant — exceeds quota throws', () => {
      const t = svc.createTenant(base); // starter = 10 max
      const quota = svc.tenantQuotas.get(t.id);
      quota.usedUsers = 10; // already at max
      expect(() => svc.addUserToTenant(t.id, 'u99')).toThrow('User limit reached');
    });

    test('addUserToTenant — tenant not found', () => {
      expect(() => svc.addUserToTenant('nope', 'u1')).toThrow('Tenant not found');
    });

    test('removeUserFromTenant — success', () => {
      const t = svc.createTenant(base);
      svc.addUserToTenant(t.id, 'u1');
      svc.removeUserFromTenant(t.id, 'u1');
      expect(svc.getTenantUsers(t.id)).toHaveLength(0);
    });

    test('removeUserFromTenant — user not found', () => {
      const t = svc.createTenant(base);
      expect(() => svc.removeUserFromTenant(t.id, 'nope')).toThrow('User not found');
    });

    test('getUserTenants returns tenants for user', () => {
      const t1 = svc.createTenant(base);
      const t2 = svc.createTenant({ ...base, name: 'Corp', slug: 'corp', email: 'corp@c.com' });
      svc.addUserToTenant(t1.id, 'u1', 'admin');
      svc.addUserToTenant(t2.id, 'u1', 'member');
      const tenants = svc.getUserTenants('u1');
      expect(tenants).toHaveLength(2);
    });

    test('getTenantUsers for empty tenant', () => {
      expect(svc.getTenantUsers('nope')).toHaveLength(0);
    });
  });

  /* ── Settings ────────────────────────────────────────────────────── */
  describe('Settings', () => {
    test('updateTenantSettings — success', () => {
      const t = svc.createTenant(base);
      svc.updateTenantSettings(t.id, { brandingColor: '#ff0000' });
      const s = svc.getTenantSettings(t.id);
      expect(s.brandingColor).toBe('#ff0000');
    });

    test('updateTenantSettings — tenant not found', () => {
      expect(() => svc.updateTenantSettings('nope', {})).toThrow('Tenant not found');
    });

    test('getTenantSettings returns settings', () => {
      const t = svc.createTenant(base);
      const s = svc.getTenantSettings(t.id);
      expect(s.passwordPolicy.minLength).toBe(8);
    });
  });

  /* ── Quota ───────────────────────────────────────────────────────── */
  describe('Quota', () => {
    test('getTenantQuota returns usage percentages', () => {
      const t = svc.createTenant(base);
      svc.addUserToTenant(t.id, 'u1');
      const q = svc.getTenantQuota(t.id);
      expect(q.userUsagePercent).toBe('10.00');
      expect(q.storageUsagePercent).toBe('0.00');
    });

    test('getTenantQuota returns null for missing', () => {
      expect(svc.getTenantQuota('nope')).toBeNull();
    });

    test('recordApiCall increments counter', () => {
      const t = svc.createTenant(base);
      svc.recordApiCall(t.id);
      svc.recordApiCall(t.id);
      const q = svc.tenantQuotas.get(t.id);
      expect(q.usedApiCalls).toBe(2);
    });

    test('recordStorageUsage increments storage', () => {
      const t = svc.createTenant(base);
      svc.recordStorageUsage(t.id, 2.5);
      const q = svc.tenantQuotas.get(t.id);
      expect(q.usedStorage).toBe(2.5);
    });
  });

  /* ── getAllTenants ───────────────────────────────────────────────── */
  describe('getAllTenants', () => {
    test('returns all tenants', () => {
      svc.createTenant(base);
      svc.createTenant({ ...base, name: 'B', slug: 'b', email: 'b@b.com' });
      expect(svc.getAllTenants()).toHaveLength(2);
    });

    test('filters by status', () => {
      const t = svc.createTenant(base);
      svc.createTenant({ ...base, name: 'B', slug: 'b', email: 'b@b.com' });
      svc.suspendTenant(t.id, 'test');
      expect(svc.getAllTenants({ status: 'active' })).toHaveLength(1);
    });

    test('filters by planType', () => {
      svc.createTenant(base);
      svc.createTenant({ ...base, name: 'B', slug: 'b', email: 'b@b.com', planType: 'enterprise' });
      expect(svc.getAllTenants({ planType: 'enterprise' })).toHaveLength(1);
    });

    test('filters by search', () => {
      svc.createTenant(base);
      svc.createTenant({ ...base, name: 'Beta', slug: 'beta', email: 'b@b.com' });
      expect(svc.getAllTenants({ search: 'acme' })).toHaveLength(1);
    });
  });

  /* ── getStatistics ───────────────────────────────────────────────── */
  describe('getStatistics', () => {
    test('returns comprehensive stats', () => {
      svc.createTenant(base);
      svc.createTenant({
        ...base,
        name: 'B',
        slug: 'b',
        email: 'b@b.com',
        planType: 'professional',
      });
      const t1Id = Array.from(svc.tenants.keys())[0];
      svc.addUserToTenant(t1Id, 'u1');

      const stats = svc.getStatistics();
      expect(stats.totalTenants).toBe(2);
      expect(stats.activeTenants).toBe(2);
      expect(stats.totalUsers).toBe(1);
      expect(stats.planDistribution.starter).toBe(1);
      expect(stats.planDistribution.professional).toBe(1);
    });
  });
});
