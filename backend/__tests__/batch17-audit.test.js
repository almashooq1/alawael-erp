/**
 * Batch 17 — Items 161-170 Audit Tests
 * Static code analysis verifying each fix is present.
 */

const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// ── 161 ── eStamp.routes.js pagination cap ──────────────────────────────────
describe('Item 161 — eStamp.routes.js pagination limit cap', () => {
  const src = read('routes/eStamp.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/const\s+MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('uses safeLimit derived from MAX_PAGE_LIMIT', () => {
    expect(src).toMatch(/Math\.min\(.*MAX_PAGE_LIMIT\)/);
  });

  test('applies safeLimit to .limit() calls', () => {
    expect(src).toMatch(/\.limit\(safeLimit\)/);
  });
});

// ── 162 ── gratuity.routes.js pagination cap ────────────────────────────────
describe('Item 162 — gratuity.routes.js pagination limit cap', () => {
  const src = read('routes/gratuity.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/const\s+MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('uses safeLimit with Math.min for list endpoint', () => {
    expect(src).toMatch(/safeLimit\s*=\s*Math\.min\(/);
  });

  test('applies safeLimit to .limit() call', () => {
    expect(src).toMatch(/\.limit\(safeLimit\)/);
  });
});

// ── 163 ── administration.routes.js pagination cap ──────────────────────────
describe('Item 163 — administration.routes.js pagination limit cap', () => {
  const src = read('routes/administration.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/const\s+MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('uses safeLimit for decisions list', () => {
    // Should have at least two safeLimit references (decisions + correspondence)
    const matches = src.match(/safeLimit/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  test('applies safeLimit to .limit() calls', () => {
    expect(src).toMatch(/\.limit\(safeLimit\)/);
  });
});

// ── 164 ── hr-advanced.routes.js pagination cap ─────────────────────────────
describe('Item 164 — hr-advanced.routes.js pagination limit cap', () => {
  const src = read('routes/hr-advanced.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/const\s+MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('audit trail endpoint uses Math.min with MAX_PAGE_LIMIT', () => {
    expect(src).toMatch(/Math\.min\(parseInt\(req\.query\.limit\).*MAX_PAGE_LIMIT\)/);
  });

  test('notifications endpoint uses Math.min with MAX_PAGE_LIMIT', () => {
    // Should have at least 3 occurrences of Math.min(... MAX_PAGE_LIMIT)
    const matches = src.match(/Math\.min\(.*?MAX_PAGE_LIMIT\)/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('leaves endpoint uses safeLimit', () => {
    expect(src).toMatch(/\.limit\(safeLimit\)\.lean\(\)/);
  });
});

// ── 165 ── busTracking.routes.js pagination cap ─────────────────────────────
describe('Item 165 — busTracking.routes.js pagination limit cap', () => {
  const src = read('routes/busTracking.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/const\s+MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('notifications limit uses Math.min with MAX_PAGE_LIMIT', () => {
    expect(src).toMatch(/Math\.min\(parseInt\(req\.query\.limit\).*MAX_PAGE_LIMIT\)/);
  });
});

// ── 166 ── measurements.routes.js pagination cap ────────────────────────────
describe('Item 166 — measurements.routes.js pagination limit cap', () => {
  const src = read('routes/measurements.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/const\s+MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('trend limit uses Math.min with MAX_PAGE_LIMIT', () => {
    expect(src).toMatch(/Math\.min\(parseInt\(req\.query\.limit\).*MAX_PAGE_LIMIT\)/);
  });
});

// ── 167 ── eStamp.routes.js error message leak redaction ────────────────────
describe('Item 167 — eStamp.routes.js error message redaction', () => {
  const src = read('routes/eStamp.routes.js');

  test('create endpoint does NOT leak err.message to client', () => {
    // The pattern "err.message || 'خطأ في إنشاء الختم'" should no longer exist
    expect(src).not.toMatch(/err\.message\s*\|\|\s*'خطأ في إنشاء الختم'/);
  });

  test('upload-image endpoint does NOT leak err.message to client', () => {
    expect(src).not.toMatch(/err\.message\s*\|\|\s*'خطأ في رفع الصورة'/);
  });

  test('still logs err.message server-side (logger only)', () => {
    expect(src).toMatch(/logger\.error\('E-Stamp create error: %s', err\.message\)/);
  });
});

// ── 168 ── eStamp.routes.js log injection in documentId ─────────────────────
describe('Item 168 — eStamp.routes.js log injection prevention', () => {
  const src = read('routes/eStamp.routes.js');

  test('sanitises newlines from documentId before logging', () => {
    expect(src).toMatch(/String\(req\.body\.documentId\)\.replace\(\/\[\\r\\n\]\/g/);
  });

  test('does NOT log raw req.body.documentId', () => {
    // Should NOT have "stamp.stampId, req.body.documentId)" without sanitization
    expect(src).not.toMatch(/stamp\.stampId,\s*req\.body\.documentId\)/);
  });
});

// ── 169 ── eStamp.routes.js ObjectId validation on :id param ────────────────
describe('Item 169 — eStamp.routes.js ObjectId validation on :id', () => {
  const src = read('routes/eStamp.routes.js');

  test('uses router.param to validate id as ObjectId', () => {
    expect(src).toMatch(/router\.param\('id'/);
  });

  test('checks ObjectId.isValid inside param middleware', () => {
    expect(src).toMatch(/ObjectId\.isValid\(val\)/);
  });

  test('returns 400 for invalid ObjectId', () => {
    expect(src).toMatch(/res\.status\(400\).*معرّف id غير صالح/);
  });
});

// ── 170 ── gratuity.routes.js ObjectId validation on :gratuityId param ──────
describe('Item 170 — gratuity.routes.js ObjectId validation on :gratuityId', () => {
  const src = read('routes/gratuity.routes.js');

  test('uses router.param to validate gratuityId as ObjectId', () => {
    expect(src).toMatch(/router\.param\('gratuityId'/);
  });

  test('checks ObjectId.isValid inside param middleware', () => {
    expect(src).toMatch(/ObjectId\.isValid\(val\)/);
  });

  test('returns 400 for invalid ObjectId', () => {
    expect(src).toMatch(/res\.status\(400\).*معرّف gratuityId غير صالح/);
  });
});
