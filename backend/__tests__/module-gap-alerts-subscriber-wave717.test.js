'use strict';

/**
 * W717 — module-gap-alerts-subscriber + sweeper→bus emit wiring.
 *
 * Upgrades the W695 sweepers from log-only to the real alert pipeline:
 * sweeper emits `module_gap.<x>.overdue` → this subscriber logs + emits
 * downstream `notification.module_gap.overdue.alert`. Mirrors the W349
 * capa-alerts pattern.
 *
 *   1. static: subscriber exports + downstream-event name + bootstrap wires it
 *   2. behavioral: drive a REAL QualityEventBus — emit a source event, flush,
 *      assert the downstream alert fires with a normalized + severity payload
 *
 * No DB (the bus is pure in-memory).
 */

const fs = require('fs');
const path = require('path');

const SUB_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'module-gap-alerts-subscriber.service.js'),
  'utf8'
);
const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'moduleGapSweepersBootstrap.js'),
  'utf8'
);

const sub = require('../services/module-gap-alerts-subscriber.service');

describe('W717 subscriber — shape', () => {
  it('exports wireModuleGapAlerts + DOWNSTREAM_EVENT', () => {
    expect(typeof sub.wireModuleGapAlerts).toBe('function');
    expect(sub.DOWNSTREAM_EVENT).toBe('notification.module_gap.overdue.alert');
    expect(sub.SOURCE_PATTERN).toBe('module_gap.*');
  });
  it('throws without a bus that has .on()', () => {
    expect(() => sub.wireModuleGapAlerts({})).toThrow(/bus/);
  });
});

describe('W717 bootstrap — emits + wires (read-only preserved)', () => {
  it('resolves the QualityEventBus + wires the subscriber', () => {
    expect(BOOT_SRC).toMatch(/qualityEventBus\.service/);
    expect(BOOT_SRC).toMatch(/wireModuleGapAlerts/);
  });
  it('emits the 4 module_gap source events', () => {
    for (const ev of [
      'module_gap.pando_followup.overdue',
      'module_gap.sensory_review.due',
      'module_gap.sponsorship.expired',
      'module_gap.vfss_pending.aging',
    ]) {
      expect(BOOT_SRC).toMatch(new RegExp(ev.replace(/\./g, '\\.')));
    }
  });
  it('still READ-ONLY — no persistence writes added', () => {
    expect(BOOT_SRC).not.toMatch(/\.save\(/);
    expect(BOOT_SRC).not.toMatch(
      /\.updateOne\(|\.updateMany\(|\.findOneAndUpdate\(|\.deleteOne\(|\.deleteMany\(|\.create\(/
    );
  });
});

describe('W717 subscriber — behavioral over a REAL QualityEventBus', () => {
  let Bus;
  beforeAll(() => {
    // The bus module exports a class + getDefault(); use a FRESH instance so
    // we don't pollute the singleton across tests.
    const mod = require('../services/quality/qualityEventBus.service');
    Bus = mod.QualityEventBus || mod.default || null;
  });

  it('source event → downstream notification.module_gap.overdue.alert (via bus.emit)', async () => {
    const mod = require('../services/quality/qualityEventBus.service');
    const bus =
      typeof mod.QualityEventBus === 'function' ? new mod.QualityEventBus() : mod.getDefault();
    const received = [];
    bus.on('notification.module_gap.overdue.alert', payload => received.push(payload));

    sub.wireModuleGapAlerts({ bus, logger: { warn() {}, error() {}, info() {} } });
    await bus.emit('module_gap.pando_followup.overdue', {
      kind: 'pando_followup',
      beneficiaryId: 'b1',
      branchId: 'br1',
      recordId: 'o1',
      daysOverdue: 10,
      dueDate: '2026-05-01',
    });
    await bus.flush();

    expect(received.length).toBe(1);
    expect(received[0].source).toBe('module_gap.pando_followup.overdue');
    expect(received[0].beneficiaryId).toBe('b1');
    expect(received[0].daysOverdue).toBe(10);
    expect(received[0].severity).toBe('warning'); // 7 <= 10 < 30
    expect(received[0].detectedAt).toBeTruthy();
  });

  it('downstreamEmit override is used when provided + severity tiers map', async () => {
    const mod = require('../services/quality/qualityEventBus.service');
    const bus =
      typeof mod.QualityEventBus === 'function' ? new mod.QualityEventBus() : mod.getDefault();
    const out = [];
    sub.wireModuleGapAlerts({
      bus,
      logger: { warn() {}, error() {}, info() {} },
      downstreamEmit: (name, payload) => out.push({ name, payload }),
    });
    await bus.emit('module_gap.sponsorship.expired', { recordId: 's1', daysOverdue: 45 });
    await bus.flush();
    expect(out.length).toBe(1);
    expect(out[0].name).toBe('notification.module_gap.overdue.alert');
    expect(out[0].payload.severity).toBe('critical'); // >= 30
  });

  it('_normalizePayload defaults severity to warning when days unknown', () => {
    const n = sub._normalizePayload('module_gap.vfss_pending.aging', { recordId: 'v1' });
    expect(n.severity).toBe('warning');
    expect(n.daysOverdue).toBeNull();
  });
});
