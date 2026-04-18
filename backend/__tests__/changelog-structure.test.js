/**
 * changelog-structure.test.js — guards the release log's shape.
 *
 *   • version entries are listed in descending order
 *   • every entry has a date
 *   • every entry has a short title after the date
 *
 * Catches the "pushed 4.0.10 between 4.0.8 and 4.0.7" kind of edit
 * that looks fine in a diff but reads wrong chronologically.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CHANGELOG = fs.readFileSync(path.join(REPO_ROOT, 'CHANGELOG.md'), 'utf8');

// Match "## [X.Y.Z] — YYYY-MM-DD — Title"
const VERSION_RE = /^##\s+\[(\d+)\.(\d+)\.(\d+)\]\s+—\s+(\d{4}-\d{2}-\d{2})\s+—\s+(.+)$/gm;

function parseVersion(semver) {
  const [a, b, c] = semver.split('.').map(Number);
  return a * 10_000 + b * 100 + c;
}

describe('CHANGELOG structure', () => {
  let entries;
  beforeAll(() => {
    entries = [];
    let m;
    while ((m = VERSION_RE.exec(CHANGELOG)) !== null) {
      entries.push({
        version: `${m[1]}.${m[2]}.${m[3]}`,
        date: m[4],
        title: m[5].trim(),
      });
    }
  });

  it('has at least one entry', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('versions are listed in descending order', () => {
    for (let i = 1; i < entries.length; i += 1) {
      const prev = parseVersion(entries[i - 1].version);
      const curr = parseVersion(entries[i].version);
      if (curr > prev) {
        throw new Error(
          `Out of order: ${entries[i - 1].version} appears before ${entries[i].version}`
        );
      }
    }
  });

  it('every entry has a non-empty title', () => {
    for (const e of entries) {
      expect(e.title.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a valid ISO date (YYYY-MM-DD)', () => {
    for (const e of entries) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(e.date);
      expect(isNaN(d.getTime())).toBe(false);
    }
  });
});
