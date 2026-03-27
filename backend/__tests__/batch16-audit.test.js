/**
 * Batch 16 — Security & Quality Audit Tests (Items 151–160)
 *
 *  151  contracts.routes.js — ObjectId validation on :id routes
 *  152  meetings.routes.js  — ObjectId validation on :id routes
 *  153  training.routes.js  — ObjectId validation on :id routes
 *  154  helpdesk.routes.js  — ObjectId validation on :id routes
 *  155  contracts.routes.js — Pagination limit capped at 100
 *  156  meetings.routes.js  — Pagination limit capped at 100
 *  157  training.routes.js  — Pagination limit capped at 100
 *  158  helpdesk.routes.js  — Pagination limit capped at 100
 *  159  app.js              — HTTP Parameter Pollution (HPP) protection
 *  160  contracts.routes.js — Race-condition-safe contract number generation
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = relPath => fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');

// ============================================================
// 151 — contracts.routes.js — ObjectId validation on :id routes
// ============================================================
describe('Item 151 — contracts.routes.js ObjectId validation', () => {
  const src = read('routes/contracts.routes.js');

  test('source file exists and is not empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  test('imports mongoose for ObjectId validation', () => {
    expect(src).toMatch(/require\(['"]mongoose['"]\)/);
  });

  test('defines validObjectId helper', () => {
    expect(src).toMatch(/validObjectId/);
  });

  test('uses isValidObjectId check', () => {
    expect(src).toMatch(/isValidObjectId/);
  });

  test('returns 400 for invalid ObjectId', () => {
    expect(src).toMatch(/400.*معرف غير صالح|معرف غير صالح.*400/s);
  });

  test('GET /:id route guarded with validObjectId', () => {
    // The GET /:id handler must call validObjectId before findById
    const getIdBlock = src.match(/router\.get\('\/:id'[\s\S]*?validObjectId/);
    expect(getIdBlock).toBeTruthy();
  });

  test('PUT /:id route guarded with validObjectId', () => {
    const putBlock = src.match(/router\.put\('\/:id'[\s\S]*?validObjectId/);
    expect(putBlock).toBeTruthy();
  });

  test('DELETE /:id route guarded with validObjectId', () => {
    const delBlock = src.match(/router\.delete\('\/:id'[\s\S]*?validObjectId/);
    expect(delBlock).toBeTruthy();
  });
});

// ============================================================
// 152 — meetings.routes.js — ObjectId validation on :id routes
// ============================================================
describe('Item 152 — meetings.routes.js ObjectId validation', () => {
  const src = read('routes/meetings.routes.js');

  test('imports mongoose for ObjectId validation', () => {
    expect(src).toMatch(/require\(['"]mongoose['"]\)/);
  });

  test('defines validObjectId helper', () => {
    expect(src).toMatch(/validObjectId/);
  });

  test('GET /:id route guarded with validObjectId', () => {
    const match = src.match(/router\.get\('\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('PUT /:id route guarded with validObjectId', () => {
    const match = src.match(/router\.put\('\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('DELETE /:id route guarded with validObjectId', () => {
    const match = src.match(/router\.delete\('\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });
});

// ============================================================
// 153 — training.routes.js — ObjectId validation on :id routes
// ============================================================
describe('Item 153 — training.routes.js ObjectId validation', () => {
  const src = read('routes/training.routes.js');

  test('defines validObjectId helper', () => {
    expect(src).toMatch(/validObjectId/);
  });

  test('uses isValidObjectId check', () => {
    expect(src).toMatch(/isValidObjectId/);
  });

  test('PUT /courses/:id route guarded', () => {
    const match = src.match(/router\.put\('\/courses\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('DELETE /courses/:id route guarded', () => {
    const match = src.match(/router\.delete\('\/courses\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('PUT /sessions/:id route guarded', () => {
    const match = src.match(/router\.put\('\/sessions\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('PUT /plans/:id route guarded', () => {
    const match = src.match(/router\.put\('\/plans\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });
});

// ============================================================
// 154 — helpdesk.routes.js — ObjectId validation on :id routes
// ============================================================
describe('Item 154 — helpdesk.routes.js ObjectId validation', () => {
  const src = read('routes/helpdesk.routes.js');

  test('imports mongoose for ObjectId validation', () => {
    expect(src).toMatch(/require\(['"]mongoose['"]\)/);
  });

  test('defines validObjectId helper', () => {
    expect(src).toMatch(/validObjectId/);
  });

  test('PUT /tickets/:id route guarded', () => {
    const match = src.match(/router\.put\('\/tickets\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('DELETE /tickets/:id route guarded', () => {
    const match = src.match(/router\.delete\('\/tickets\/:id'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });

  test('POST /tickets/:id/comments route guarded', () => {
    const match = src.match(/router\.post\('\/tickets\/:id\/comments'[\s\S]*?validObjectId/);
    expect(match).toBeTruthy();
  });
});

// ============================================================
// 155 — contracts.routes.js — Pagination limit capped at 100
// ============================================================
describe('Item 155 — contracts.routes.js pagination cap', () => {
  const src = read('routes/contracts.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('defines clampLimit helper', () => {
    expect(src).toMatch(/clampLimit/);
  });

  test('uses Math.min to cap the limit', () => {
    expect(src).toMatch(/Math\.min/);
  });

  test('list route uses clampLimit', () => {
    // The GET / handler should reference clampLimit
    expect(src).toMatch(/clampLimit\(rawLimit\)/);
  });
});

// ============================================================
// 156 — meetings.routes.js — Pagination limit capped at 100
// ============================================================
describe('Item 156 — meetings.routes.js pagination cap', () => {
  const src = read('routes/meetings.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('defines clampLimit helper', () => {
    expect(src).toMatch(/clampLimit/);
  });

  test('list route destructures rawLimit', () => {
    expect(src).toMatch(/limit:\s*rawLimit/);
  });
});

// ============================================================
// 157 — training.routes.js — Pagination limit capped at 100
// ============================================================
describe('Item 157 — training.routes.js pagination cap', () => {
  const src = read('routes/training.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('defines clampLimit helper', () => {
    expect(src).toMatch(/clampLimit/);
  });

  test('courses list uses clampLimit', () => {
    expect(src).toMatch(/clampLimit\(rawLimit\)/);
  });

  test('sessions list uses clampLimit', () => {
    // Should have two occurrences
    const matches = src.match(/clampLimit\(rawLimit\)/g);
    expect(matches).toBeTruthy();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// 158 — helpdesk.routes.js — Pagination limit capped at 100
// ============================================================
describe('Item 158 — helpdesk.routes.js pagination cap', () => {
  const src = read('routes/helpdesk.routes.js');

  test('defines MAX_PAGE_LIMIT constant', () => {
    expect(src).toMatch(/MAX_PAGE_LIMIT\s*=\s*100/);
  });

  test('defines clampLimit helper', () => {
    expect(src).toMatch(/clampLimit/);
  });

  test('tickets list uses clampLimit', () => {
    expect(src).toMatch(/clampLimit\(rawLimit\)/);
  });

  test('articles list uses clampLimit', () => {
    const matches = src.match(/clampLimit\(rawLimit\)/g);
    expect(matches).toBeTruthy();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// 159 — app.js — HTTP Parameter Pollution (HPP) protection
// ============================================================
describe('Item 159 — app.js HPP protection', () => {
  const src = read('app.js');

  test('app.js exists and is non-trivial', () => {
    expect(src.length).toBeGreaterThan(500);
  });

  test('defines hppProtection middleware', () => {
    expect(src).toMatch(/hppProtection/);
  });

  test('checks for Array.isArray on query params', () => {
    expect(src).toMatch(/Array\.isArray\(req\.query\[/);
  });

  test('reduces array query params to last value', () => {
    expect(src).toMatch(/req\.query\[key\]\[req\.query\[key\]\.length\s*-\s*1\]/);
  });

  test('applies hpp middleware via app.use', () => {
    expect(src).toMatch(/app\.use\(hppProtection\)/);
  });
});

// ============================================================
// 160 — contracts.routes.js — Race-condition-safe contract number
// ============================================================
describe('Item 160 — contracts.routes.js atomic contract number', () => {
  const src = read('routes/contracts.routes.js');

  test('does NOT use countDocuments for contract number generation', () => {
    // The old pattern of const count = await Contract.countDocuments() for numbering
    // should be gone from the contract creation block
    const createBlock = src.match(/router\.post\(\s*'\/'\s*,[\s\S]*?contractNumber/);
    expect(createBlock).toBeTruthy();
    const blockStr = createBlock[0];
    expect(blockStr).not.toMatch(/countDocuments\(\)[\s\S]{0,40}contractNumber/);
  });

  test('uses crypto for unique sequence in contract number', () => {
    expect(src).toMatch(/require\(['"]crypto['"]\)/);
    expect(src).toMatch(/crypto\.randomInt/);
  });

  test('contract number still starts with CT- prefix', () => {
    expect(src).toMatch(/CT-\$\{year\}/);
  });

  test('adds code comment about race condition fix', () => {
    expect(src).toMatch(/race condition/i);
  });
});

// ============================================================
// Cross-check: meetings.routes.js also has race-safe ID
// ============================================================
describe('Item 160b — meetings.routes.js atomic meeting ID', () => {
  const src = read('routes/meetings.routes.js');

  test('does NOT use countDocuments for meeting ID generation', () => {
    const createBlock = src.match(/router\.post\(\s*'\/'\s*,[\s\S]*?meetingId/);
    expect(createBlock).toBeTruthy();
    const blockStr = createBlock[0];
    expect(blockStr).not.toMatch(/countDocuments\(\)[\s\S]{0,40}meetingId/);
  });

  test('uses crypto for unique sequence in meeting ID', () => {
    expect(src).toMatch(/crypto\.randomInt/);
  });

  test('meeting ID still starts with MTG- prefix', () => {
    expect(src).toMatch(/MTG-\$\{year\}/);
  });
});
