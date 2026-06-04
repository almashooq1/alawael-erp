'use strict';

/**
 * W344 — CAPA Pass 3 service + bootstrap drift guard.
 *
 * Service tests use the factory directly with a stub model so we don't depend
 * on mongoose at test time (jest.setup.js mocks mongoose). Bootstrap shape is
 * verified via static analysis on source (W325 P2 / W337 / W340 pattern).
 */

const fs = require('fs');
const path = require('path');

const { createCapaService } = require('../services/quality/capa.service');
const lib = require('../intelligence/capa-lifecycle.lib');

const SERVICE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'quality', 'capa.service.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);

describe('W344 — capa.service factory contract', () => {
  it('exports createCapaService factory', () => {
    expect(typeof createCapaService).toBe('function');
  });

  it('factory returns the documented public surface', () => {
    const svc = createCapaService();
    expect(typeof svc.createCapaItem).toBe('function');
    expect(typeof svc.transitionCapaItem).toBe('function');
    expect(typeof svc.listOverdue).toBe('function');
    expect(typeof svc.sweepOverdue).toBe('function');
    expect(typeof svc.listByStatus).toBe('function');
  });

  it('enforceMfa option is honored on the instance', () => {
    const a = createCapaService();
    const b = createCapaService({ enforceMfa: true });
    expect(a._opts.enforceMfa).toBe(false);
    expect(b._opts.enforceMfa).toBe(true);
  });

  it('emitEvent option is honored when supplied', () => {
    const svcWith = createCapaService({ emitEvent: async () => {} });
    const svcWithout = createCapaService();
    expect(svcWith._opts.hasEmit).toBe(true);
    expect(svcWithout._opts.hasEmit).toBe(false);
  });
});

describe('W344 — createCapaItem input validation', () => {
  const svc = createCapaService();

  it('rejects missing source.module', async () => {
    await expect(
      svc.createCapaItem({
        type: 'corrective',
        title: 't',
        description: 'd',
        ownerUserId: 'u1',
        dueDate: new Date(),
        createdBy: 'u1',
      })
    ).rejects.toThrow(/source\.module required/);
  });

  it('rejects invalid type', async () => {
    await expect(
      svc.createCapaItem({
        source: { module: 'audit' },
        type: 'bogus',
        title: 't',
        description: 'd',
        ownerUserId: 'u1',
        dueDate: new Date(),
        createdBy: 'u1',
      })
    ).rejects.toThrow(/invalid type/);
  });

  it('rejects invalid source.module', async () => {
    await expect(
      svc.createCapaItem({
        source: { module: 'made_up' },
        type: 'corrective',
        title: 't',
        description: 'd',
        ownerUserId: 'u1',
        dueDate: new Date(),
        createdBy: 'u1',
      })
    ).rejects.toThrow(/invalid source\.module/);
  });

  it('rejects missing ownerUserId / dueDate / createdBy individually', async () => {
    const base = {
      source: { module: 'audit' },
      type: 'corrective',
      title: 't',
      description: 'd',
      ownerUserId: 'u1',
      dueDate: new Date(),
      createdBy: 'u1',
    };
    await expect(svc.createCapaItem({ ...base, ownerUserId: undefined })).rejects.toThrow(
      /ownerUserId required/
    );
    await expect(svc.createCapaItem({ ...base, dueDate: undefined })).rejects.toThrow(
      /dueDate required/
    );
    await expect(svc.createCapaItem({ ...base, createdBy: undefined })).rejects.toThrow(
      /createdBy required/
    );
  });
});

describe('W344 — transitionCapaItem MFA enforcement (service-layer defense)', () => {
  it('enforceMfa:true validates via lib.validateTransition before mutating status (W843)', async () => {
    createCapaService({ enforceMfa: true });
    expect(SERVICE_SRC).toMatch(/lib\.validateTransition\s*\(/);
    expect(SERVICE_SRC).toMatch(/enforceMfa\s*\?\s*0\s*:\s*Number\.MAX_SAFE_INTEGER/);
    expect(SERVICE_SRC).toMatch(/preCheck\.code/);
    expect(SERVICE_SRC).toMatch(/MFA_TIER_INSUFFICIENT/);
  });
});

describe('W344 — service source-shape invariants', () => {
  it('uses the lazy-model pattern (W214) so service can be required before model registration', () => {
    expect(SERVICE_SRC).toMatch(
      /function\s+_CapaModel\s*\(\s*\)\s*\{[\s\S]*try\s*\{[\s\S]*mongoose\.model\(\s*['"]CapaItem['"]\s*\)/
    );
    expect(SERVICE_SRC).toMatch(
      /require\(\s*['"]\.\.\/\.\.\/models\/quality\/CapaItem\.model['"]\s*\)/
    );
  });

  it('transitionCapaItem sets $locals.transition for the pre-save hook to consume', () => {
    expect(SERVICE_SRC).toMatch(/doc\.\$locals\.transition\s*=\s*\{/);
  });

  it('CLOSED transition captures closedAt + closedBy', () => {
    expect(SERVICE_SRC).toMatch(/to\s*===\s*['"]CLOSED['"]/);
    expect(SERVICE_SRC).toMatch(/doc\.closedAt\s*=/);
    expect(SERVICE_SRC).toMatch(/doc\.closedBy\s*=\s*actorUserId/);
  });

  it('IMPLEMENTED + VERIFIED transitions capture their timestamps', () => {
    expect(SERVICE_SRC).toMatch(/doc\.implementedAt\s*=/);
    expect(SERVICE_SRC).toMatch(/doc\.verifiedAt\s*=/);
  });

  it('listOverdue filters non-terminal statuses + deleted_at', () => {
    expect(SERVICE_SRC).toMatch(
      /\$in:\s*\[\s*['"]OPEN['"]\s*,\s*['"]IN_PROGRESS['"]\s*,\s*['"]IMPLEMENTED['"]/
    );
    expect(SERVICE_SRC).toMatch(/deleted_at:\s*null/);
  });

  it('listByStatus validates status against lib.LIFECYCLE_STATES', () => {
    expect(SERVICE_SRC).toMatch(/lib\.LIFECYCLE_STATES\.includes\(\s*status\s*\)/);
  });
});

describe('W344 — capaBootstrap shape + scheduler integration', () => {
  it('exports wireCapa(app, deps) function', () => {
    const mod = require('../startup/capaBootstrap');
    expect(typeof mod.wireCapa).toBe('function');
  });

  it('constructs service with enforceMfa:true (W275 + W276 contract)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/createCapaService\(\s*\{[\s\S]*?enforceMfa:\s*true/);
  });

  it('attaches service to app._capaService for late binding (W283 pattern)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/app\._capaService\s*=\s*service/);
  });

  it('overdue-sweeper cron is env-gated via ENABLE_CAPA_SWEEPER', () => {
    expect(BOOTSTRAP_SRC).toMatch(/ENABLE_CAPA_SWEEPER/);
    expect(BOOTSTRAP_SRC).toMatch(/cronEnabled/);
  });

  it('registers with schedulerRegistry under canonical key "capa-overdue-sweeper" (W316 pattern)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/schedulerRegistry\.register\(\s*['"]capa-overdue-sweeper['"]/);
    expect(BOOTSTRAP_SRC).toMatch(/schedulerRegistry\.recordRun\(\s*['"]capa-overdue-sweeper['"]/);
  });

  it('cron uses Asia/Riyadh timezone (W286 + W282b standard)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/timezone:\s*['"]Asia\/Riyadh['"]/);
  });

  it('uses loadOptional for node-cron (graceful degradation)', () => {
    expect(BOOTSTRAP_SRC).toMatch(/loadOptional\(\s*['"]node-cron['"]\s*\)/);
  });

  it('uses loadOptional for qualityEventBus (graceful degradation when bus absent)', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /loadOptional\(\s*['"]\.\.\/services\/quality\/qualityEventBus\.service['"]\s*\)/
    );
  });
});

describe('W344 — exported constants match lib (no enum desync)', () => {
  it('service rejects types not in lib.CAPA_TYPES', () => {
    // The validation message references lib.CAPA_TYPES.join — proves binding.
    expect(SERVICE_SRC).toMatch(/lib\.CAPA_TYPES\.includes\(\s*type\s*\)/);
    expect(SERVICE_SRC).toMatch(/lib\.SOURCE_MODULES\.includes\(\s*source\.module\s*\)/);
  });
});
