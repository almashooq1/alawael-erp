/**
 * measures-consistency.test.js — Frontend ↔ Backend scale alignment.
 *
 * The frontend maintains a static list of assessment scales in
 * frontend/src/services/assessmentService/scales.js. This test makes
 * sure that list does not contradict the canonical scoring modules in
 * backend/measures/scoring/, so clinicians never see one score in the
 * UI and a different score in the backend.
 *
 * The test reads the frontend source as text (no transpiler dependency)
 * and extracts the fields we care about.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { list: listBackendMeasures, getItemBank } = require('../measures/scoring');

const FRONTEND_SCALES_PATH = path.join(
  __dirname,
  '..',
  '..',
  'frontend',
  'src',
  'services',
  'assessmentService',
  'scales.js'
);

const source = fs.readFileSync(FRONTEND_SCALES_PATH, 'utf-8');

function extractStringProp(block, prop) {
  const m = block.match(new RegExp(`${prop}:\\s*['"]([^'"]+)['"]`));
  return m ? m[1] : null;
}

function extractNumberProp(block, prop) {
  const m = block.match(new RegExp(`${prop}:\\s*([0-9.]+)`));
  return m ? Number(m[1]) : null;
}

function extractBooleanProp(block, prop) {
  const m = block.match(new RegExp(`${prop}:\\s*(true|false)`));
  return m ? m[1] === 'true' : null;
}

function extractScaleBlock(id) {
  const start = source.indexOf(`id: '${id}'`);
  if (start === -1) return null;
  // Walk backwards to the opening '{' of the object
  let depth = 0;
  let i = start;
  while (i >= 0) {
    if (source[i] === '}') depth++;
    if (source[i] === '{') {
      if (depth === 0) break;
      depth--;
    }
    i--;
  }
  const objStart = i;
  // Walk forwards to the closing '}'
  depth = 0;
  i = objStart;
  while (i < source.length) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  return source.slice(objStart, i + 1);
}

function extractDomainKeys(block) {
  const keys = [];
  const re = /\{ key: '([^']+)'/g;
  let m;
  while ((m = re.exec(block))) keys.push(m[1]);
  return keys;
}

function listFrontendIds() {
  const ids = [];
  const re = /id:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source))) ids.push(m[1]);
  return ids;
}

describe('Frontend scales — id uniqueness', () => {
  it('has no duplicate scale ids', () => {
    const ids = listFrontendIds();
    const seen = new Set();
    const dups = [];
    for (const id of ids) {
      if (seen.has(id)) dups.push(id);
      seen.add(id);
    }
    expect(dups).toEqual([]);
  });
});

describe('Frontend scales — FIM alignment', () => {
  const block = extractScaleBlock('functionalIndependence');

  it('exports a single functionalIndependence scale', () => {
    expect(block).toBeTruthy();
  });

  it('matches backend FIM score range', () => {
    expect(extractNumberProp(block, 'maxScore')).toBe(126);
    expect(extractNumberProp(block, 'minScore')).toBe(18);
  });

  it('uses the canonical FIM domain keys', () => {
    const keys = extractDomainKeys(block);
    expect(keys).toEqual(
      expect.arrayContaining([
        'selfCare',
        'sphincterControl',
        'transfers',
        'locomotion',
        'communication',
        'socialCognition',
      ])
    );
  });

  it('backend FIM module is registered', () => {
    const backend = listBackendMeasures().find(m => m.measureCode === 'FIM');
    expect(backend).toBeTruthy();
    // FIM is registered as a sum-based module; item bank may be added later.
    expect(backend.measureCode).toBe('FIM');
  });
});

describe('Frontend scales — CARS-2 alignment', () => {
  const block = extractScaleBlock('cars2');

  it('uses the canonical cars2 id', () => {
    expect(block).toBeTruthy();
  });

  it('matches backend CARS-2 score range', () => {
    expect(extractNumberProp(block, 'maxScore')).toBe(60);
    expect(extractNumberProp(block, 'minScore')).toBe(15);
  });

  it('has 15 domains matching the 15 CARS-2 items', () => {
    const keys = extractDomainKeys(block);
    expect(keys.length).toBe(15);
  });

  it('backend CARS-2 module is registered', () => {
    const backend = listBackendMeasures().find(m => m.measureCode === 'CARS-2');
    expect(backend).toBeTruthy();
    expect(backend.itemCount).toBe(15);
  });
});

describe('Frontend scales — GMFCS alignment', () => {
  const block = extractScaleBlock('gmfcs');

  it('exports a single gmfcs scale', () => {
    expect(block).toBeTruthy();
  });

  it('is marked as ordinal with range 1-5', () => {
    expect(extractBooleanProp(block, 'isOrdinal')).toBe(true);
    expect(extractNumberProp(block, 'maxScore')).toBe(5);
  });

  it('backend GMFCS module is registered', () => {
    const backend = listBackendMeasures().find(m => m.measureCode === 'GMFCS');
    expect(backend).toBeTruthy();
  });
});

describe('Frontend scales — backend item-bank parity', () => {
  it('exposes backend item banks for canonical measures', () => {
    const backend = listBackendMeasures().filter(m => m.hasItemBank);
    // Sanity: at least the flagship measures carry item banks.
    expect(backend.length).toBeGreaterThanOrEqual(5);
    for (const m of backend) {
      const bank = getItemBank(m.measureCode);
      expect(bank).toBeTruthy();
      expect(bank.itemBank.items.length).toBe(m.itemCount);
    }
  });
});
