'use strict';

/**
 * W1462 — admin uploads must not accept SVG (stored-XSS).
 *
 * routes/uploads.routes.js stores admin uploads under /home/alawael/app/uploads/<bucket>/
 * which nginx serves statically + inline at /uploads/* (app.js). An uploaded
 * image/svg+xml carrying inline <script> would render and execute in a victim's browser
 * (stored XSS). The app cannot set Content-Disposition on the nginx path, so SVG is
 * rejected at upload (matching public-uploads.routes.js). The sibling files.routes.js,
 * which serves through the app, instead forces attachment for svg — different surface.
 */

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'uploads.routes.js'), 'utf8');

describe('W1462 uploads route excludes SVG', () => {
  test('ALLOWED_MIMES does not contain image/svg+xml', () => {
    const m = src.match(/const ALLOWED_MIMES = new Set\(\[([\s\S]*?)\]\)/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toMatch(/svg/i);
  });

  test('the extension map does not map image/svg+xml', () => {
    expect(src).not.toMatch(/'image\/svg\+xml':\s*'\.svg'/);
  });

  test('still allows the safe raster/document mimes', () => {
    const m = src.match(/const ALLOWED_MIMES = new Set\(\[([\s\S]*?)\]\)/);
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].forEach(mime =>
      expect(m[1]).toContain(mime)
    );
  });
});
