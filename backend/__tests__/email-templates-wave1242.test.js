'use strict';

/**
 * W1242 — professional email-template system (registry + renderer + routes).
 *
 * Layers:
 *  1. REGISTRY — every template structurally complete (bilingual subjects,
 *     valid category/block types/panel tones, variable specs with samples,
 *     every {{var}} used in subject/blocks is DECLARED in the contract and
 *     vice-versa for required vars).
 *  2. RENDERER — contract enforcement (missing required → 422-coded throw),
 *     HTML-escaping of interpolated values (injection-safe), RTL layout
 *     markers, hidden preheader, plain-text alternative, CTA omitted when
 *     its url variable is absent.
 *  3. STATIC WIRING — routes mounted via dualMountAuth; admin-only test-send.
 */

const fs = require('fs');
const path = require('path');

const registry = require('../intelligence/email-templates.registry');
const renderer = require('../services/email/templateRenderer.service');

const BACKEND = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(BACKEND, rel), 'utf8');

const VAR_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
function varsIn(str) {
  const out = new Set();
  let m;
  while ((m = VAR_RE.exec(String(str))) !== null) out.add(m[1]);
  return out;
}

describe('W1242 registry — catalogue integrity', () => {
  const all = registry.listTemplates();

  test('catalogue is substantial and frozen', () => {
    expect(all.length).toBeGreaterThanOrEqual(12);
    expect(Object.isFrozen(registry.EMAIL_TEMPLATES)).toBe(true);
    expect(Object.isFrozen(all[0])).toBe(true);
    expect(Object.isFrozen(all[0].blocks)).toBe(true);
  });

  test('every template: key match, valid category, bilingual subject, Arabic title', () => {
    for (const t of all) {
      expect(registry.EMAIL_TEMPLATES[t.key]).toBe(t);
      expect(registry.CATEGORIES).toContain(t.category);
      expect(t.subjectAr.length).toBeGreaterThan(5);
      expect(typeof t.subjectEn).toBe('string');
      expect(/[؀-ۿ]/.test(t.titleAr)).toBe(true);
    }
  });

  test('every block has a valid type; panels have valid tones; kv rows are labelled', () => {
    for (const t of all) {
      expect(t.blocks.length).toBeGreaterThanOrEqual(2);
      for (const b of t.blocks) {
        expect(registry.BLOCK_TYPES).toContain(b.type);
        if (b.type === 'panel' && b.tone) expect(registry.PANEL_TONES).toContain(b.tone);
        if (b.type === 'kv')
          for (const r of b.rows) {
            expect(typeof r.labelAr).toBe('string');
            expect(typeof r.value).toBe('string');
          }
        if (b.type === 'cta') expect(typeof b.urlVar).toBe('string');
      }
    }
  });

  test('variable contract is CLOSED both ways (no undeclared use, no dead required vars)', () => {
    for (const t of all) {
      const declared = new Set(Object.keys(t.variables || {}));
      const used = new Set();
      for (const v of varsIn(t.subjectAr)) used.add(v);
      for (const v of varsIn(t.subjectEn || '')) used.add(v);
      for (const v of varsIn(t.preheaderAr || '')) used.add(v);
      for (const b of t.blocks) {
        if (b.ar) for (const v of varsIn(b.ar)) used.add(v);
        if (b.rows) for (const r of b.rows) for (const v of varsIn(r.value)) used.add(v);
        if (b.urlVar) used.add(b.urlVar);
      }
      for (const v of used) expect(declared.has(v) ? v : `UNDECLARED:${v}@${t.key}`).toBe(v);
      for (const [name, spec] of Object.entries(t.variables)) {
        if (spec.required)
          expect(used.has(name) ? name : `DEAD-REQUIRED:${name}@${t.key}`).toBe(name);
        expect(spec.sample !== undefined && spec.sample !== '').toBe(true);
        expect(typeof spec.labelAr).toBe('string');
      }
    }
  });

  test('every template renders from its own samples (catalogue is self-previewable)', () => {
    for (const t of all) {
      const out = renderer.renderSample(t.key);
      expect(out.subject.length).toBeGreaterThan(3);
      expect(out.html).toContain('dir="rtl"');
      expect(out.text.length).toBeGreaterThan(10);
      expect(out.html).not.toMatch(/\{\{\s*[A-Za-z_]/); // no unresolved vars leak
    }
  });
});

describe('W1242 renderer — safety + layout', () => {
  test('missing required variables → coded 422 throw listing the gaps', () => {
    expect(() => renderer.renderTemplate('PASSWORD_RESET', { name: 'x' })).toThrow(
      /TEMPLATE_VARS_MISSING/
    );
    try {
      renderer.renderTemplate('PASSWORD_RESET', { name: 'x' });
    } catch (err) {
      expect(err.code).toBe('TEMPLATE_VARS_MISSING');
      expect(err.statusCode).toBe(422);
      expect(err.missing).toEqual(expect.arrayContaining(['otp', 'expiryMinutes']));
    }
  });

  test('unknown template key → coded 404 throw', () => {
    expect(() => renderer.renderTemplate('NOPE', {})).toThrow(/TEMPLATE_NOT_FOUND/);
  });

  test('interpolated values are HTML-escaped (injection cannot smuggle markup)', () => {
    const out = renderer.renderTemplate('PASSWORD_RESET', {
      name: '<script>alert(1)</script>',
      otp: '12"34',
      expiryMinutes: '15',
    });
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('12&quot;34');
    // plain text keeps the raw value (no HTML context)
    expect(out.text).toContain('<script>alert(1)</script>');
  });

  test('layout: RTL+lang, hidden preheader, brand header, footer, 600px table', () => {
    const out = renderer.renderSample('APPOINTMENT_REMINDER');
    expect(out.html).toContain('dir="rtl" lang="ar"');
    expect(out.html).toContain('display:none!important'); // preheader
    expect(out.html).toContain('مراكز الأوائل للتأهيل'); // brand
    expect(out.html).toContain('width="600"');
    expect(out.html).toContain('جميع الحقوق محفوظة'); // footer
  });

  test('CTA renders as a link when url provided and is OMITTED when absent', () => {
    const withUrl = renderer.renderTemplate('GOAL_ACHIEVED', {
      beneficiaryName: 'محمد',
      goalTitle: 'هدف',
      progressUrl: 'https://example.org/p?a=1&b=2',
    });
    expect(withUrl.html).toContain('href="https://example.org/p?a=1&amp;b=2"');
    const withoutUrl = renderer.renderTemplate('GOAL_ACHIEVED', {
      beneficiaryName: 'محمد',
      goalTitle: 'هدف',
    });
    expect(withoutUrl.html).not.toContain('<a href');
  });

  test('plain-text alternative carries the substance (kv rows + cta url)', () => {
    const out = renderer.renderSample('INVOICE_ISSUED');
    expect(out.text).toContain('رقم الفاتورة: INV-2026-0451');
    expect(out.text).toContain('https://alaweal.org/portal/invoices');
  });

  test('subject interpolates without escaping artifacts', () => {
    const out = renderer.renderTemplate('WELCOME_USER', {
      name: 'سارة & فريقها',
      email: 'a@b.c',
      loginUrl: 'https://x.y',
    });
    expect(out.subject).toContain('سارة & فريقها'); // raw & in subject (header, not HTML)
    expect(out.subject).not.toContain('&amp;');
  });
});

describe('W1242 static wiring', () => {
  test('routes file: auth + read roles + admin-only test-send + no raw body spread', () => {
    const src = read('routes/email-templates.routes.js');
    expect(src).toMatch(/authenticateToken/);
    expect(src).toMatch(/requireRole\(READ_ROLES\)/);
    expect(src).toMatch(/requireRole\(SEND_ROLES\)/);
    expect(src).toMatch(/'admin', 'superadmin', 'super_admin'\]/); // SEND_ROLES tight
    expect(src).not.toMatch(/\.\.\.req\.body/);
  });

  test('mounted via dualMountAuth in features.registry', () => {
    const src = read('routes/registries/features.registry.js');
    expect(src).toMatch(/safeRequire\('\.\.\/routes\/email-templates\.routes'\)/);
    expect(src).toMatch(
      /dualMountAuth\(app, 'email-templates', emailTemplatesRoutes, authenticate\)/
    );
  });
});
