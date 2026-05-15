'use strict';

const { wirePhase29Subscribers } = require('../services/quality/phase29-subscribers');

/** Tiny stub bus implementing the same surface as qualityEventBus.on(). */
function makeBus() {
  const handlers = new Map();
  return {
    on(pattern, handler) {
      if (!handlers.has(pattern)) handlers.set(pattern, []);
      handlers.get(pattern).push(handler);
      return () => {
        const arr = handlers.get(pattern) || [];
        const idx = arr.indexOf(handler);
        if (idx >= 0) arr.splice(idx, 1);
      };
    },
    async emit(name, payload) {
      for (const h of handlers.get(name) || []) {
        await h(payload);
      }
    },
  };
}

function makeCapaModel() {
  const records = [];
  return {
    records,
    async create(doc) {
      records.push(doc);
      return doc;
    },
  };
}

function makeNotifier() {
  const events = [];
  return {
    events,
    async notify(channel, payload) {
      events.push({ channel, payload });
    },
  };
}

describe('wirePhase29Subscribers', () => {
  test('throws when bus.on is missing', () => {
    expect(() => wirePhase29Subscribers({})).toThrow(/bus.on/);
  });

  test('registers expected listeners', () => {
    const bus = makeBus();
    const handle = wirePhase29Subscribers(bus, { capaModel: makeCapaModel() });
    expect(handle.listenerCount).toBeGreaterThanOrEqual(8);
  });

  test('SPC special-cause drafts a CAPA + emits notifier', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    const notifier = makeNotifier();
    wirePhase29Subscribers(bus, { capaModel: capa, notifier });

    await bus.emit('quality.spc.special_cause_detected', {
      chartId: 'c-1',
      chartNumber: 'SPC-2026-0007',
      index: 12,
      rules: ['rule_1_beyond_3sigma'],
      value: 42,
    });
    expect(capa.records).toHaveLength(1);
    expect(capa.records[0].actionInfo.title).toContain('SPC-2026-0007');
    expect(capa.records[0].priority).toBe('critical'); // rule_1 → critical
    expect(notifier.events.find(e => e.channel === 'quality.spc.special_cause')).toBeTruthy();
  });

  test('non-3σ rule lands as major, not critical', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    wirePhase29Subscribers(bus, { capaModel: capa });
    await bus.emit('quality.spc.special_cause_detected', {
      chartId: 'c-2',
      rules: ['rule_3_trend_6'],
      value: 10,
    });
    expect(capa.records[0].priority).toBe('major');
  });

  test('FMEA high-priority drafts a preventive CAPA at critical', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    wirePhase29Subscribers(bus, { capaModel: capa });
    await bus.emit('quality.fmea.high_priority_detected', {
      worksheetId: 'fmea-1',
      functionAr: 'إعطاء الدواء',
      failureMode: 'هوية خاطئة',
      rpn: 500,
    });
    expect(capa.records[0].type).toBe('preventive');
    expect(capa.records[0].priority).toBe('critical');
    expect(capa.records[0].actionInfo.title).toContain('إعطاء الدواء');
  });

  test('audit NC routes major to critical, minor to major', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    wirePhase29Subscribers(bus, { capaModel: capa });

    await bus.emit('quality.audit.nc_recorded', {
      occurrenceId: 'a-1',
      type: 'major_nc',
      clauseRef: '9.2',
    });
    await bus.emit('quality.audit.nc_recorded', {
      occurrenceId: 'a-2',
      type: 'minor_nc',
      clauseRef: '7.5',
    });
    expect(capa.records).toHaveLength(2);
    expect(capa.records[0].priority).toBe('critical');
    expect(capa.records[1].priority).toBe('major');
  });

  test('calibration failure drafts a CAPA', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    wirePhase29Subscribers(bus, { capaModel: capa });
    await bus.emit('quality.calibration.failed', {
      assetId: 'cal-1',
      assetCode: 'CAL-2026-0003',
      calibratedAt: '2026-05-15',
    });
    expect(capa.records).toHaveLength(1);
    expect(capa.records[0].actionInfo.title).toContain('CAL-2026-0003');
  });

  test('standards lapsed → only notifier (no CAPA)', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    const notifier = makeNotifier();
    wirePhase29Subscribers(bus, { capaModel: capa, notifier });
    await bus.emit('quality.standard.clause_status_changed', {
      statusFrom: 'audit_passed',
      statusTo: 'lapsed',
      clauseCode: '9.3',
    });
    expect(capa.records).toHaveLength(0);
    expect(notifier.events.find(e => e.channel === 'quality.standard.lapsed')).toBeTruthy();
  });

  test('predictive_risk critical band notifies, non-critical is silent', async () => {
    const bus = makeBus();
    const notifier = makeNotifier();
    wirePhase29Subscribers(bus, { capaModel: makeCapaModel(), notifier });
    await bus.emit('quality.predictive_risk.computed', { score: 92, band: 'critical' });
    await bus.emit('quality.predictive_risk.computed', { score: 30, band: 'low' });
    expect(notifier.events).toHaveLength(1);
    expect(notifier.events[0].payload.band).toBe('critical');
  });

  test('subscriber failures swallow + log without throwing', async () => {
    const bus = makeBus();
    const brokenCapa = {
      async create() {
        throw new Error('db down');
      },
    };
    const warnings = [];
    const logger = { warn: msg => warnings.push(msg) };
    wirePhase29Subscribers(bus, { capaModel: brokenCapa, logger });
    // Emitting should NOT throw despite the broken model.
    await bus.emit('quality.fmea.high_priority_detected', { worksheetId: 'x' });
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('fmea→capa');
  });

  test('unsubscribeAll detaches every listener', async () => {
    const bus = makeBus();
    const capa = makeCapaModel();
    const handle = wirePhase29Subscribers(bus, { capaModel: capa });
    handle.unsubscribeAll();
    await bus.emit('quality.fmea.high_priority_detected', { worksheetId: 'x' });
    expect(capa.records).toHaveLength(0);
  });
});
