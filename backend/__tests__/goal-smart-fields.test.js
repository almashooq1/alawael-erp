/**
 * goal-smart-fields.test.js — Phase 9 Commit 7.
 *
 * Validates the SMART-decomposition fields added to the Goal schema
 * (measurableMetric, masteryCriteria, frequencyPerWeek, promptingLevel,
 * disciplineId, templateCode, progressTrend, lastProgressAt,
 * sessionsToDate). All fields are optional and non-breaking.
 *
 * Tests inspect the Mongoose schema *definition* rather than
 * instantiating documents — per the project's Jest test-harness
 * gotcha doc, mongoose model constructors flake inside Jest. Schema
 * path introspection is stable.
 */

'use strict';

// The project's Jest setup (jest.setup.js) globally mocks mongoose to
// skip DB. That stub does not expose `.schema` on model exports, so
// we unmock mongoose here specifically to load the real schema
// definition. No DB is touched — this is pure schema introspection.
jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
// Clear any previously-registered Goal model from the real mongoose
// singleton so require('../models/Goal') gets a fresh registration
// with our updated schema definition.
if (mongoose.models && mongoose.models.Goal) {
  delete mongoose.models.Goal;
  if (mongoose.modelSchemas) delete mongoose.modelSchemas.Goal;
}

const Goal = require('../models/Goal');
const { GOAL_METRIC_KINDS } = require('../config/rehab-disciplines.registry');

const schema = Goal.schema;

function pathOf(name) {
  return schema.path(name);
}

describe('Goal schema — SMART field existence', () => {
  it.each([
    'measurableMetric',
    'masteryCriteria',
    'frequencyPerWeek',
    'promptingLevel',
    'disciplineId',
    'templateCode',
    'progressTrend',
    'lastProgressAt',
    'sessionsToDate',
  ])('schema defines the %s field', name => {
    expect(pathOf(name)).toBeDefined();
  });
});

describe('Goal schema — measurableMetric enum aligns with registry', () => {
  it('accepts exactly the GOAL_METRIC_KINDS from the registry', () => {
    const path = pathOf('measurableMetric');
    expect(path).toBeDefined();
    const allowed = path.options.enum;
    expect(Array.isArray(allowed)).toBe(true);
    // Every registry metric must appear in the schema enum
    for (const kind of GOAL_METRIC_KINDS) {
      expect(allowed).toContain(kind);
    }
    // And no extras leak in
    expect(allowed.length).toBe(GOAL_METRIC_KINDS.length);
  });

  it('marks the field as optional (no `required`)', () => {
    const path = pathOf('measurableMetric');
    expect(path.isRequired).not.toBe(true);
  });
});

describe('Goal schema — frequencyPerWeek bounds', () => {
  it('declares min=0 and max=14', () => {
    const path = pathOf('frequencyPerWeek');
    expect(path).toBeDefined();
    expect(path.options.min).toBe(0);
    expect(path.options.max).toBe(14);
  });

  it('is optional', () => {
    expect(pathOf('frequencyPerWeek').isRequired).not.toBe(true);
  });
});

describe('Goal schema — promptingLevel enum', () => {
  it('declares the six-level prompting hierarchy', () => {
    const allowed = pathOf('promptingLevel').options.enum;
    expect(allowed).toEqual([
      'INDEPENDENT',
      'GESTURAL',
      'VERBAL',
      'MODEL',
      'PARTIAL_PHYSICAL',
      'FULL_PHYSICAL',
    ]);
  });
});

describe('Goal schema — progressTrend enum', () => {
  it('declares the four trend states from the progress engine', () => {
    const allowed = pathOf('progressTrend').options.enum;
    expect(allowed).toEqual(['IMPROVING', 'STABLE', 'DECLINING', 'STALLED']);
  });
});

describe('Goal schema — registry back-refs are indexed strings', () => {
  it('disciplineId is a string with an index', () => {
    const path = pathOf('disciplineId');
    expect(path.instance).toBe('String');
    expect(path.options.index).toBe(true);
  });

  it('templateCode is a string with an index', () => {
    const path = pathOf('templateCode');
    expect(path.instance).toBe('String');
    expect(path.options.index).toBe(true);
  });
});

describe('Goal schema — sessionsToDate defaults + bounds', () => {
  it('has default 0 and min 0', () => {
    const path = pathOf('sessionsToDate');
    expect(path.options.default).toBe(0);
    expect(path.options.min).toBe(0);
  });
});

describe('Goal schema — lastProgressAt is a Date', () => {
  it('exists as a Date path', () => {
    const path = pathOf('lastProgressAt');
    expect(path.instance).toBe('Date');
  });
});

describe('Goal schema — preserves legacy paths (non-breaking)', () => {
  it.each([
    'title',
    'description',
    'category',
    'programId',
    'participantId',
    'baselineValue',
    'targetValue',
    'unit',
    'status',
    'priority',
    'progressPercentage',
    'interventions',
  ])('legacy path %s is still defined', name => {
    expect(pathOf(name)).toBeDefined();
  });
});
