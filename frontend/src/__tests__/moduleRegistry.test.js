/**
 * Tests for moduleRegistry constants & helpers
 * @module moduleRegistry.test
 *
 * Covers:
 * - MODULE_REGISTRY data integrity (all required fields)
 * - Unique keys & paths
 * - Paths start with '/'
 * - Colors are valid hex (when present)
 * - roles are arrays of strings
 * - getModule() finds by key
 * - getModulesForRole() filters correctly
 * - getModulesGrouped() groups by resource
 */

import {
  MODULE_REGISTRY,
  getModule,
  getModulesForRole,
  getModulesGrouped,
} from '../constants/moduleRegistry';

describe('MODULE_REGISTRY', () => {
  // ─── Data integrity ─────────────────────────────────
  describe('data integrity (all entries)', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(MODULE_REGISTRY)).toBe(true);
      expect(MODULE_REGISTRY.length).toBeGreaterThan(0);
    });

    it.each(MODULE_REGISTRY.map((m, i) => [m.key, m, i]))(
      '%s has all required fields',
      (_key, entry) => {
        expect(typeof entry.key).toBe('string');
        expect(entry.key.length).toBeGreaterThan(0);
        expect(typeof entry.nameAr).toBe('string');
        expect(entry.nameAr.length).toBeGreaterThan(0);
        expect(typeof entry.nameEn).toBe('string');
        expect(entry.nameEn.length).toBeGreaterThan(0);
        expect(typeof entry.icon).toBe('string');
        expect(entry.icon.length).toBeGreaterThan(0);
        expect(typeof entry.path).toBe('string');
        expect(entry.path.startsWith('/')).toBe(true);
        expect(typeof entry.resource).toBe('string');
        expect(entry.resource.length).toBeGreaterThan(0);
        expect(Array.isArray(entry.roles)).toBe(true);
      },
    );

    it('all role arrays contain only strings', () => {
      MODULE_REGISTRY.forEach(entry => {
        entry.roles.forEach(role => {
          expect(typeof role).toBe('string');
          expect(role.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ─── Uniqueness ─────────────────────────────────────
  describe('uniqueness', () => {
    it('all keys are unique', () => {
      const keys = MODULE_REGISTRY.map(m => m.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('all paths are unique', () => {
      const paths = MODULE_REGISTRY.map(m => m.path);
      expect(new Set(paths).size).toBe(paths.length);
    });
  });

  // ─── Color validation ──────────────────────────────
  describe('color validation', () => {
    it('entries with color have valid hex format', () => {
      MODULE_REGISTRY.filter(m => m.color).forEach(entry => {
        expect(entry.color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      });
    });
  });

  // ─── Path format ───────────────────────────────────
  describe('path format', () => {
    it('all paths start with /', () => {
      MODULE_REGISTRY.forEach(entry => {
        expect(entry.path[0]).toBe('/');
      });
    });

    it('no path has trailing slash (except root)', () => {
      MODULE_REGISTRY.forEach(entry => {
        if (entry.path !== '/') {
          expect(entry.path.endsWith('/')).toBe(false);
        }
      });
    });
  });
});

// ─── getModule ──────────────────────────────────────
describe('getModule()', () => {
  it('returns entry for existing key', () => {
    const mod = getModule('home');
    expect(mod).toBeDefined();
    expect(mod.key).toBe('home');
    expect(mod.path).toBe('/home');
  });

  it('returns entry for dashboard key', () => {
    const mod = getModule('dashboard');
    expect(mod).toBeDefined();
    expect(mod.nameEn).toBe('Dashboard');
  });

  it('returns undefined for non-existent key', () => {
    expect(getModule('nonexistent-key-xyz')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getModule('')).toBeUndefined();
  });
});

// ─── getModulesForRole ──────────────────────────────
describe('getModulesForRole()', () => {
  it('includes modules with empty roles (accessible to all)', () => {
    const mods = getModulesForRole('employee');
    const openModules = MODULE_REGISTRY.filter(m => m.roles.length === 0);
    openModules.forEach(open => {
      expect(mods.find(m => m.key === open.key)).toBeDefined();
    });
  });

  it('includes role-specific modules for admin', () => {
    const mods = getModulesForRole('admin');
    const adminMod = MODULE_REGISTRY.find(m => m.key === 'admin-portal');
    if (adminMod) {
      expect(mods.find(m => m.key === 'admin-portal')).toBeDefined();
    }
  });

  it('excludes admin-only modules for regular employee', () => {
    const mods = getModulesForRole('employee');
    const adminOnly = MODULE_REGISTRY.filter(
      m => m.roles.length > 0 && !m.roles.includes('employee'),
    );
    adminOnly.forEach(restricted => {
      expect(mods.find(m => m.key === restricted.key)).toBeUndefined();
    });
  });

  it('returns array', () => {
    expect(Array.isArray(getModulesForRole('admin'))).toBe(true);
  });
});

// ─── getModulesGrouped ──────────────────────────────
describe('getModulesGrouped()', () => {
  it('returns an object with resource keys', () => {
    const groups = getModulesGrouped();
    expect(typeof groups).toBe('object');
    expect(Object.keys(groups).length).toBeGreaterThan(0);
  });

  it('each group is an array of modules', () => {
    const groups = getModulesGrouped();
    Object.values(groups).forEach(arr => {
      expect(Array.isArray(arr)).toBe(true);
      arr.forEach(m => {
        expect(m.key).toBeDefined();
        expect(m.path).toBeDefined();
      });
    });
  });

  it('total modules across groups equals MODULE_REGISTRY length', () => {
    const groups = getModulesGrouped();
    const total = Object.values(groups).reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(MODULE_REGISTRY.length);
  });

  it('dashboard group contains home and dashboard modules', () => {
    const groups = getModulesGrouped();
    const dashGroup = groups.dashboard;
    expect(dashGroup).toBeDefined();
    expect(dashGroup.find(m => m.key === 'home')).toBeDefined();
    expect(dashGroup.find(m => m.key === 'dashboard')).toBeDefined();
  });
});
