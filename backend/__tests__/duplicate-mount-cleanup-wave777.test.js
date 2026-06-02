'use strict';

/**
 * duplicate-mount-cleanup-wave777.test.js — W777 drift guard.
 * Removes duplicate _registry.js mounts that shadow documents.registry + communication.registry.
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const REG = fs.readFileSync(path.join(BACKEND, 'routes', '_registry.js'), 'utf8');
const DOCS = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'documents.registry.js'),
  'utf8'
);
const COMM = fs.readFileSync(
  path.join(BACKEND, 'routes', 'registries', 'communication.registry.js'),
  'utf8'
);

describe('W777 — duplicate mount cleanup (_registry vs specialized registries)', () => {
  it('_registry.js does not mount admin/document-expiry (documents.registry owns it)', () => {
    expect(REG).not.toMatch(/dualMount\s*\(\s*app\s*,\s*['"]admin\/document-expiry['"]/);
    expect(DOCS).toMatch(/admin\/document-expiry/);
  });

  it('_registry.js does not mount whatsapp (communication.registry owns it)', () => {
    expect(REG).not.toMatch(/dualMount\s*\(\s*app\s*,\s*['"]whatsapp['"]/);
    expect(COMM).toMatch(/dualMount\s*\(\s*app\s*,\s*['"]whatsapp['"]/);
  });
});
