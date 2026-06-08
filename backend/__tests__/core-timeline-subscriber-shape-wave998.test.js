'use strict';

/**
 * core-timeline-subscriber-shape-wave998.test.js — W998.
 *
 * CAPSTONE drift guard for the 2026-06 core-linkage program. It institutionalizes
 * the founding lesson of that investigation (the W974 / W928 bug class):
 *
 *   A `CareTimeline` subscriber that writes a field value OUTSIDE the schema enum
 *   (a hyphenated `eventType`, a `beneficiary` instead of `beneficiaryId`, a
 *   `category` not in the list) throws a `ValidationError` that the handler's
 *   try/catch SWALLOWS — so ZERO rows persist, silently, while every static
 *   guard stays green. Only running a `.save()` ever caught it.
 *
 * This guard catches the *shape* half of that class WITHOUT a database: it
 * statically asserts that every `eventType` / `category` / `severity` string
 * literal written by ANY subscriber in `dddCrossModuleSubscribers.js` is a member
 * of the corresponding `CareTimeline` schema enum. Any new subscriber (mine or a
 * parallel session's) that introduces an enum value before adding it to the
 * schema fails CI here — turning a silent runtime no-op into a loud build error.
 *
 * Pure source analysis (reads both files as text); no mongoose, no DB.
 * The behavioral half (a row actually lands) is covered per-domain by the
 * `*-core-linkage-wave*.test.js` runtime e2e suites.
 */

const fs = require('fs');
const path = require('path');

const TIMELINE_MODEL = path.join(__dirname, '../domains/timeline/models/CareTimeline.js');
const SUBSCRIBERS = path.join(__dirname, '../integration/dddCrossModuleSubscribers.js');

// Extract the `enum: [ ... ]` array that immediately follows a `<field>: {`
// declaration in the schema source, then pull out every single-quoted literal
// (ignoring `//` comment lines inside the array). Throws if not found, so the
// guard can never silently pass on a parse failure.
function extractSchemaEnum(src, field) {
  const re = new RegExp(field + '\\s*:\\s*\\{[\\s\\S]*?enum:\\s*\\[([\\s\\S]*?)\\]');
  const m = src.match(re);
  if (!m) throw new Error(`could not locate enum for CareTimeline field "${field}"`);
  const values = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
  if (values.length === 0) throw new Error(`enum for "${field}" parsed empty`);
  return new Set(values);
}

// Every `<field>: '<literal>'` object-property assignment in the subscribers file.
function extractWrittenLiterals(src, field) {
  return [...new Set([...src.matchAll(new RegExp(field + ":\\s*'([^']+)'", 'g'))].map(m => m[1]))];
}

const timelineSrc = fs.readFileSync(TIMELINE_MODEL, 'utf8');
const subscribersSrc = fs.readFileSync(SUBSCRIBERS, 'utf8');

const EVENT_TYPE_ENUM = extractSchemaEnum(timelineSrc, 'eventType');
const CATEGORY_ENUM = extractSchemaEnum(timelineSrc, 'category');
const SEVERITY_ENUM = extractSchemaEnum(timelineSrc, 'severity');

describe('W998 — every CareTimeline subscriber write matches the schema shape', () => {
  it('parsed the three CareTimeline enums (guard self-check)', () => {
    // sanity: the enums are non-trivial — a regex regression that captured an
    // empty/tiny set must not let the assertions below pass vacuously.
    expect(EVENT_TYPE_ENUM.size).toBeGreaterThan(20);
    expect(CATEGORY_ENUM.has('clinical')).toBe(true);
    expect(SEVERITY_ENUM.has('warning')).toBe(true);
  });

  it('every eventType literal written by a subscriber is in the CareTimeline enum', () => {
    const written = extractWrittenLiterals(subscribersSrc, 'eventType');
    expect(written.length).toBeGreaterThan(10); // many wired domains; not vacuous
    const invalid = written.filter(v => !EVENT_TYPE_ENUM.has(v));
    expect(invalid).toEqual([]);
  });

  it('every category literal written by a subscriber is in the CareTimeline enum', () => {
    const invalid = extractWrittenLiterals(subscribersSrc, 'category').filter(
      v => !CATEGORY_ENUM.has(v)
    );
    expect(invalid).toEqual([]);
  });

  it('every severity literal written by a subscriber is in the CareTimeline enum', () => {
    const invalid = extractWrittenLiterals(subscribersSrc, 'severity').filter(
      v => !SEVERITY_ENUM.has(v)
    );
    expect(invalid).toEqual([]);
  });

  it('subscribers write beneficiaryId, never the bare `beneficiary` field (W928 class)', () => {
    // The original silent break wrote `beneficiary:` (model requires beneficiaryId).
    // A CareTimeline.create that passes `beneficiary:` as a top-level key would
    // miss the required ref. Allow `beneficiaryId:`; flag a bare `beneficiary:`
    // key inside a CareTimeline.create payload.
    const bareBeneficiaryWrites = [
      ...subscribersSrc.matchAll(/CareTimeline\.create\(\{[\s\S]*?\}\)/g),
    ].filter(block => /\bbeneficiary:\s/.test(block[0]));
    expect(bareBeneficiaryWrites.map(b => b[0].slice(0, 60))).toEqual([]);
  });
});
