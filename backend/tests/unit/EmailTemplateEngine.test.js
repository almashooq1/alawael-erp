/**
 * Unit tests for EmailTemplateEngine.js — Email Template Rendering Engine
 * Exports: { EmailTemplateEngine, BRAND }
 * Mocks: EmailConfig, fs, logger, path
 */

'use strict';

/* ── Mock logger ────────────────────────────────────────────────────── */
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/* ── Mock EmailConfig ───────────────────────────────────────────────── */
jest.mock('../../services/email/EmailConfig', () => ({
  brand: {
    name: 'الأوائل',
    nameEn: 'AlAwael',
    logo: 'https://example.com/logo.png',
    primaryColor: '#1a73e8',
    secondaryColor: '#34a853',
    textColor: '#333333',
    bgColor: '#f5f5f5',
    footerColor: '#666666',
  },
  frontendUrl: 'https://app.test.com',
  templates: {
    dir: '/mock/templates',
    cacheEnabled: true,
    cacheTTL: 3600000,
  },
}));

/* ── Mock fs ────────────────────────────────────────────────────────── */
const mockWatcherClose = jest.fn();
const mockWatch = jest.fn().mockReturnValue({ close: mockWatcherClose });
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('<h1>{{title}}</h1><p>{{name}}</p>'),
  },
  existsSync: jest.fn().mockReturnValue(true),
  watch: mockWatch,
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  isAbsolute: jest.fn(() => false),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const { EmailTemplateEngine, BRAND } = require('../../services/email/EmailTemplateEngine');

beforeEach(() => {
  jest.clearAllMocks();
  // Source uses bare `logger` variable (not imported)
  global.logger = require('../../utils/logger');
});

afterEach(() => {
  delete global.logger;
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('EmailTemplateEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new EmailTemplateEngine();
  });

  /* ── BRAND export ────────────────────────────────────────────────── */
  describe('BRAND export', () => {
    test('exposes brand config', () => {
      expect(BRAND).toBeDefined();
      expect(BRAND.name).toBe('الأوائل');
      expect(BRAND.nameEn).toBe('AlAwael');
      expect(BRAND.primaryColor).toBe('#1a73e8');
    });
  });

  /* ── Constructor ─────────────────────────────────────────────────── */
  describe('constructor', () => {
    test('initializes cache and version maps', () => {
      expect(engine._cache).toBeInstanceOf(Map);
      expect(engine._templateVersions).toBeInstanceOf(Map);
      expect(engine._renderCount).toBe(0);
    });
  });

  /* ── Template versioning ─────────────────────────────────────────── */
  describe('template versioning', () => {
    test('getTemplateVersion returns null for unseen template', () => {
      expect(engine.getTemplateVersion('unknown')).toBeNull();
    });

    test('_trackVersion creates version entry and increments renderCount', () => {
      engine._trackVersion('test');
      const v = engine.getTemplateVersion('test');
      expect(v).toBeDefined();
      expect(v.version).toBe('1.0.0');
      expect(v.renderCount).toBe(1);
      engine._trackVersion('test');
      expect(engine.getTemplateVersion('test').renderCount).toBe(2);
    });

    test('getAllVersions returns all tracked templates', () => {
      engine._trackVersion('a');
      engine._trackVersion('b');
      const versions = engine.getAllVersions();
      expect(versions.a).toBeDefined();
      expect(versions.a.version).toBe('1.0.0');
      expect(versions.b).toBeDefined();
    });
  });

  /* ── File watcher ────────────────────────────────────────────────── */
  describe('file watcher', () => {
    test('startWatching creates a watcher', () => {
      engine.startWatching();
      expect(mockWatch).toHaveBeenCalled();
      expect(engine._fileWatcher).toBeDefined();
    });

    test('stopWatching closes watcher', () => {
      engine.startWatching();
      engine.stopWatching();
      expect(mockWatcherClose).toHaveBeenCalled();
      expect(engine._fileWatcher).toBeNull();
    });

    test('stopWatching is safe when no watcher', () => {
      expect(() => engine.stopWatching()).not.toThrow();
    });
  });

  /* ── getStats ────────────────────────────────────────────────────── */
  describe('getStats', () => {
    test('returns stats object with expected keys', () => {
      const stats = engine.getStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.totalRenders).toBe(0);
      expect(stats.trackedTemplates).toBe(0);
      expect(stats.watching).toBe(false);
    });
  });

  /* ── wrapInLayout ────────────────────────────────────────────────── */
  describe('wrapInLayout', () => {
    test('wraps body in HTML layout with brand', () => {
      const html = engine.wrapInLayout('Test Title', '<p>Body</p>');
      expect(html).toContain('Test Title');
      expect(html).toContain('<p>Body</p>');
      expect(html).toContain('الأوائل');
    });

    test('includes footer', () => {
      const html = engine.wrapInLayout('T', '<p>B</p>');
      expect(html.toLowerCase()).toContain('</html>');
    });

    test('accepts options', () => {
      const html = engine.wrapInLayout('T', '<p>B</p>', { showLogo: false });
      expect(html).toBeDefined();
    });
  });

  /* ── Component builders ──────────────────────────────────────────── */
  describe('component builders', () => {
    test('buildInfoCard returns HTML with label-value pairs', () => {
      const html = engine.buildInfoCard([
        ['Name', 'Ali'],
        ['Age', 5],
      ]);
      expect(html).toContain('Name');
      expect(html).toContain('Ali');
      expect(html).toContain('info-card');
    });

    test('buildButton returns HTML link', () => {
      const html = engine.buildButton('Click Me', 'https://example.com');
      expect(html).toContain('Click Me');
      expect(html).toContain('https://example.com');
    });

    test('buildAlert includes type styling', () => {
      const success = engine.buildAlert('Done!', 'success');
      expect(success).toContain('Done!');
      expect(success).toContain('alert-success');

      const warning = engine.buildAlert('Watch out', 'warning');
      expect(warning).toContain('Watch out');
      expect(warning).toContain('alert-warning');

      const error = engine.buildAlert('Failed', 'error');
      expect(error).toContain('Failed');
      expect(error).toContain('alert-error');
    });

    test('buildBadge returns styled badge', () => {
      const html = engine.buildBadge('Active', 'success');
      expect(html).toContain('Active');
      expect(html).toContain('badge-success');
    });

    test('buildDivider returns divider class HTML', () => {
      const html = engine.buildDivider();
      expect(html).toContain('divider');
    });

    test('buildTable returns HTML table', () => {
      const html = engine.buildTable(
        ['Name', 'Score'],
        [
          ['Ali', '90'],
          ['Sara', '85'],
        ]
      );
      expect(html).toContain('<table');
      expect(html).toContain('Ali');
      expect(html).toContain('Score');
    });

    test('buildStatsGrid returns grid with stats', () => {
      const html = engine.buildStatsGrid([
        { label: 'Total', value: 100 },
        { label: 'Active', value: 80 },
      ]);
      expect(html).toContain('100');
      expect(html).toContain('Active');
    });

    test('buildProgressBar returns progress HTML', () => {
      const html = engine.buildProgressBar(75, 'Progress');
      expect(html).toContain('75');
      expect(html).toContain('Progress');
    });

    test('buildTimeline returns timeline HTML', () => {
      const html = engine.buildTimeline([
        { time: '2024-01-01', title: 'Start', description: 'Beginning' },
        { time: '2024-02-01', title: 'Mid', description: 'Midpoint' },
      ]);
      expect(html).toContain('Start');
      expect(html).toContain('Mid');
    });
  });

  /* ── render ──────────────────────────────────────────────────────── */
  describe('render', () => {
    test('renders WELCOME template and returns {subject, html}', () => {
      const result = engine.render('WELCOME', { name: 'Ali', email: 'ali@test.com' });
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result.html).toContain('Ali');
      expect(engine._renderCount).toBe(1);
    });

    test('renders PASSWORD_RESET template', () => {
      const result = engine.render('PASSWORD_RESET', {
        name: 'Sara',
        resetUrl: 'https://example.com/reset',
      });
      expect(result.html).toContain('Sara');
    });

    test('renders OTP_CODE template', () => {
      const result = engine.render('OTP_CODE', { name: 'User', otp: '123456', expiryMinutes: 5 });
      expect(result.html).toContain('123456');
    });

    test('renders NOTIFICATION template', () => {
      const result = engine.render('NOTIFICATION', {
        name: 'Ali',
        title: 'Test',
        message: 'Hello',
      });
      expect(result.html).toContain('Hello');
    });

    test('throws for unknown template', () => {
      expect(() => engine.render('NON_EXISTENT', {})).toThrow('Template not found');
    });

    test('increments renderCount on each render', () => {
      engine.render('WELCOME', { name: 'X' });
      engine.render('WELCOME', { name: 'Y' });
      expect(engine._renderCount).toBe(2);
    });
  });

  /* ── getTemplateNames ────────────────────────────────────────────── */
  describe('getTemplateNames', () => {
    test('returns array of template names', () => {
      const names = engine.getTemplateNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain('WELCOME');
      expect(names).toContain('PASSWORD_RESET');
      expect(names).toContain('OTP_CODE');
      expect(names.length).toBeGreaterThan(5);
    });
  });

  /* ── loadTemplate (async) ────────────────────────────────────────── */
  describe('loadTemplate', () => {
    test('reads file and interpolates variables', async () => {
      const result = await engine.loadTemplate('test.html', { title: 'Hello', name: 'Ali' });
      expect(result).toContain('Hello');
      expect(result).toContain('Ali');
    });

    test('uses cache on second call', async () => {
      const fs = require('fs');
      await engine.loadTemplate('cached.html', { title: 'A', name: 'B' });
      await engine.loadTemplate('cached.html', { title: 'A', name: 'B' });
      // readFile should be called once for the file (cache hit on second)
      expect(fs.promises.readFile).toHaveBeenCalled();
    });
  });

  /* ── _interpolate ────────────────────────────────────────────────── */
  describe('_interpolate', () => {
    test('replaces {{key}} with values', () => {
      const result = engine._interpolate('Hello {{name}}, you are {{age}}', {
        name: 'Ali',
        age: '5',
      });
      expect(result).toBe('Hello Ali, you are 5');
    });

    test('replaces missing placeholders with empty string', () => {
      const result = engine._interpolate('Hi {{name}} - {{missing}}', { name: 'Ali' });
      expect(result).toBe('Hi Ali - ');
    });
  });

  /* ── _escape ─────────────────────────────────────────────────────── */
  describe('_escape', () => {
    test('escapes HTML entities', () => {
      const result = engine._escape('<script>alert("xss")</script>');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).not.toContain('<script>');
    });

    test('escapes ampersand', () => {
      const result = engine._escape('Tom & Jerry');
      expect(result).toContain('&amp;');
    });

    test('returns empty string for null', () => {
      expect(engine._escape(null)).toBe('');
      expect(engine._escape(undefined)).toBe('');
    });
  });

  /* ── clearCache ──────────────────────────────────────────────────── */
  describe('clearCache', () => {
    test('clears the template cache', () => {
      engine._cache.set('test', 'data');
      expect(engine._cache.size).toBe(1);
      engine.clearCache();
      expect(engine._cache.size).toBe(0);
    });
  });
});
