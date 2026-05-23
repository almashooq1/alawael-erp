/**
 * seed-rag-policies-wave283d.test.js — sanity for the RAG seed script (W283d).
 *
 * The seed script ingests starter Saudi rehab center policies so
 * POLICY_QUERY in the Parent Chatbot (W283c) returns useful answers
 * in dev/demo instead of always downgrading to UNKNOWN.
 *
 * This guard asserts:
 *   (1) The script is parseable + exists at the expected path
 *   (2) npm script registered for both seed + dry + list modes
 *   (3) Policies cover the most common Parent Chatbot intents (so
 *       POLICY_QUERY actually has relevant content to retrieve)
 *   (4) Each policy has all required RAG fields (sourceDocId, type,
 *       title, text)
 *   (5) Policies are reasonably-sized (not empty, not absurdly long)
 *
 * Does NOT actually run the seed against a DB — that's an ops concern.
 */

'use strict';

jest.unmock('mongoose');

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'seed-rag-policies.js');
const PACKAGE_JSON = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const SCRIPT_SRC = fs.readFileSync(SCRIPT_PATH, 'utf8');

describe('W283d — seed-rag-policies CLI', () => {
  describe('file + package wiring', () => {
    it('script file exists at scripts/seed-rag-policies.js', () => {
      expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
    });

    it('script has executable shebang', () => {
      expect(SCRIPT_SRC.startsWith('#!/usr/bin/env node')).toBe(true);
    });

    it('npm scripts registered for seed + dry + list', () => {
      expect(PACKAGE_JSON.scripts['seed:rag-policies']).toBe('node scripts/seed-rag-policies.js');
      expect(PACKAGE_JSON.scripts['seed:rag-policies:dry']).toBe(
        'node scripts/seed-rag-policies.js --dry-run'
      );
      expect(PACKAGE_JSON.scripts['seed:rag-policies:list']).toBe(
        'node scripts/seed-rag-policies.js --list'
      );
    });

    it('script is syntactically valid (parseable)', () => {
      // node --check would do this externally; here we just attempt
      // to compile the source as a CommonJS module.
      const vm = require('vm');
      expect(() => new vm.Script(SCRIPT_SRC, { filename: SCRIPT_PATH })).not.toThrow();
    });
  });

  describe('policy coverage', () => {
    // Extract policy metadata from the script source. We don't EXEC the
    // script (it would run main()); just regex out the POLICIES array.
    function extractPolicies() {
      // Find each `sourceDocId: '...',` entry and the sibling title
      const ids = [...SCRIPT_SRC.matchAll(/sourceDocId:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      const titles = [...SCRIPT_SRC.matchAll(/sourceDocTitle:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      return { ids, titles, count: ids.length };
    }

    it('has at least 5 starter policies', () => {
      const { count } = extractPolicies();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('every policy has a sourceDocTitle', () => {
      const { ids, titles } = extractPolicies();
      expect(titles.length).toBe(ids.length);
    });

    it('covers the main Parent Chatbot policy intents (cancellation, payment, documents, transport, hours, attendance, confidentiality)', () => {
      const { ids } = extractPolicies();
      const expectedKeywords = [
        'cancellation',
        'payment',
        'document',
        'transport',
        'clinic-hours',
        'attendance',
        'confidentiality',
      ];
      for (const kw of expectedKeywords) {
        const hasMatch = ids.some(id => id.includes(kw));
        expect(hasMatch).toBe(true);
      }
    });

    it('every policy text is non-empty and >= 500 chars (chunkable)', () => {
      // Find each `text: \`...\`,` block. Using lazy regex with `[\s\S]`
      // so newlines inside the template-literal are matched.
      const textBlocks = [...SCRIPT_SRC.matchAll(/text:\s*`([\s\S]+?)`,/g)].map(m => m[1]);
      expect(textBlocks.length).toBeGreaterThanOrEqual(5);
      for (const t of textBlocks) {
        expect(t.length).toBeGreaterThanOrEqual(500);
        expect(t.length).toBeLessThanOrEqual(5000); // not absurdly long
      }
    });

    it('every policy text contains Arabic content (target audience: Saudi families)', () => {
      const textBlocks = [...SCRIPT_SRC.matchAll(/text:\s*`([\s\S]+?)`,/g)].map(m => m[1]);
      for (const t of textBlocks) {
        // Arabic Unicode range
        expect(/[؀-ۿ]/.test(t)).toBe(true);
      }
    });
  });

  describe('CLI behavior surface', () => {
    it('supports --dry-run, --list, --branch, --json, --help flags', () => {
      expect(SCRIPT_SRC).toMatch(/flag\(['"]--dry-run['"]\)/);
      expect(SCRIPT_SRC).toMatch(/flag\(['"]--list['"]\)/);
      expect(SCRIPT_SRC).toMatch(/arg\(['"]--branch['"]\)/);
      expect(SCRIPT_SRC).toMatch(/flag\(['"]--json['"]\)/);
      expect(SCRIPT_SRC).toMatch(/flag\(['"]--help['"]\)/);
    });

    it('uses replacePreviousVersion: true for idempotency', () => {
      expect(SCRIPT_SRC).toMatch(/replacePreviousVersion:\s*true/);
    });

    it('disconnects from Mongo in a finally block (no leaked connections)', () => {
      expect(SCRIPT_SRC).toMatch(/finally\s*\{[\s\S]*?mongoose\.disconnect/);
    });
  });
});
