'use strict';

/**
 * W491 drift guard — stories.routes.js (Phase F REST surface).
 *
 * Static source-shape assertions + mount-side verification in
 * features.registry.js.
 */

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'stories.routes.js'),
  'utf8'
);
const REG_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'registries', 'features.registry.js'),
  'utf8'
);

describe('W491 — stories.routes structural', () => {
  it('declares GET /books (list)', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/books['"]/);
  });

  it('declares GET /books/:id', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/books\/:id['"]/);
  });

  it('declares POST /books/compose', () => {
    expect(ROUTE_SRC).toMatch(/router\.post\(\s*['"]\/books\/compose['"]/);
  });

  it('declares POST /books/:id/variants', () => {
    expect(ROUTE_SRC).toMatch(/router\.post\(\s*['"]\/books\/:id\/variants['"]/);
  });

  it('declares PATCH /books/:id', () => {
    expect(ROUTE_SRC).toMatch(/router\.patch\(\s*['"]\/books\/:id['"]/);
  });

  it('declares POST /books/:id/publish', () => {
    expect(ROUTE_SRC).toMatch(/router\.post\(\s*['"]\/books\/:id\/publish['"]/);
  });

  it('declares GET /variants/:id', () => {
    expect(ROUTE_SRC).toMatch(/router\.get\(\s*['"]\/variants\/:id['"]/);
  });

  it('declares POST /books/:id/share-with-family (W495)', () => {
    expect(ROUTE_SRC).toMatch(/router\.post\(\s*['"]\/books\/:id\/share-with-family['"]/);
  });

  it('share-with-family rejects when not yet published', () => {
    expect(ROUTE_SRC).toMatch(/NOT_PUBLISHED/);
    expect(ROUTE_SRC).toMatch(/Story must be published before sharing/);
  });

  it('share-with-family sets familyAccessGranted=true', () => {
    expect(ROUTE_SRC).toMatch(/book\.familyAccessGranted\s*=\s*true/);
  });

  it('declares POST /books/:id/view (W495 family-view tracking)', () => {
    expect(ROUTE_SRC).toMatch(/router\.post\(\s*['"]\/books\/:id\/view['"]/);
  });

  it('view endpoint uses atomic findByIdAndUpdate with $inc', () => {
    expect(ROUTE_SRC).toMatch(/findByIdAndUpdate\([\s\S]+?\$inc:\s*\{\s*familyViewCount:\s*1\s*\}/);
    expect(ROUTE_SRC).toMatch(/\$set:\s*\{\s*lastViewedAt:/);
  });

  it('view endpoint rejects when familyAccessGranted=false', () => {
    expect(ROUTE_SRC).toMatch(/FAMILY_ACCESS_NOT_GRANTED/);
  });

  it('view endpoint allows parent + beneficiary + guardian roles', () => {
    expect(ROUTE_SRC).toMatch(
      /'\/books\/:id\/view'[\s\S]+?requireRole\(\[[\s\S]+?'parent'[\s\S]+?'beneficiary'[\s\S]+?'guardian'/
    );
  });

  it('uses global authenticateToken', () => {
    expect(ROUTE_SRC).toMatch(/router\.use\(authenticateToken\)/);
  });

  it('uses branchFilter for list isolation', () => {
    expect(ROUTE_SRC).toMatch(/branchFilter\(req\)/);
  });

  it('uses assertBranchMatch on per-id endpoints', () => {
    expect(ROUTE_SRC).toMatch(/assertBranchMatch\(req,/);
  });

  it('imports W479 story-builder lib', () => {
    expect(ROUTE_SRC).toMatch(/require\(['"]\.\.\/intelligence\/story-builder\.lib/);
  });

  it('imports W482 variant-builder lib', () => {
    expect(ROUTE_SRC).toMatch(
      /require\(['"]\.\.\/intelligence\/story-surface-variant-builder\.lib/
    );
  });

  it('variant spawn is idempotent via findOneAndUpdate upsert', () => {
    expect(ROUTE_SRC).toMatch(/findOneAndUpdate\([\s\S]+?upsert:\s*true/);
  });

  it('variant spawn tolerates dup-key 11000', () => {
    expect(ROUTE_SRC).toMatch(/err\?\.code !== 11000/);
  });

  it('compose returns 400 on validation failure', () => {
    expect(ROUTE_SRC).toMatch(/VALIDATION_FAILED/);
  });

  it('publish sets reviewedBy from req.user', () => {
    expect(ROUTE_SRC).toMatch(/reviewedBy\s*=\s*req\.user/);
  });

  it('list limit clamped at 200', () => {
    expect(ROUTE_SRC).toMatch(/Math\.min\([\s\S]+?,\s*200\)/);
  });

  it('books loaded via lazy mongoose.model lookup', () => {
    expect(ROUTE_SRC).toMatch(/mongoose\.model\(['"]StoryBook['"]/);
    expect(ROUTE_SRC).toMatch(/mongoose\.model\(['"]StorySurfaceVariant['"]/);
  });

  it('declares 5 status enum values', () => {
    expect(ROUTE_SRC).toMatch(/'draft'/);
    expect(ROUTE_SRC).toMatch(/'reviewed'/);
    expect(ROUTE_SRC).toMatch(/'published'/);
    expect(ROUTE_SRC).toMatch(/'shared_with_family'/);
    expect(ROUTE_SRC).toMatch(/'archived'/);
  });
});

describe('W491 — features.registry mount', () => {
  it('safeRequire pulls stories.routes', () => {
    expect(REG_SRC).toMatch(/safeRequire\(['"]\.\.\/routes\/stories\.routes['"]\)/);
  });

  it('dualMount mounts stories surface', () => {
    expect(REG_SRC).toMatch(/dualMount\(app,\s*['"]stories['"]/);
  });

  it('logs W491 in mount announcement', () => {
    expect(REG_SRC).toMatch(/W491/);
  });
});
