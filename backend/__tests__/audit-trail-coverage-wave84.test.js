/**
 * audit-trail-coverage-wave84.test.js — Wave 84.
 *
 * Closes critical-review blockers B1 + A3 from the Session-Waves 64-83
 * critique: AuditTrail UI calls /api/v1/governance/audit-trail with 18
 * entityType strings, but no test ever verified that
 * `governance.service.getAuditTrail` actually returns NON-EMPTY for
 * audit logs written by `recordAccess` with the matching entityType.
 *
 * This file fakes a minimal in-memory AuditLog model + auditLogger
 * pair, writes one access record per UI-known entityType using
 * `recordAccess`, then calls `getAuditTrail` and asserts the timeline
 * comes back populated for every type.
 *
 * Expected to surface the bug where:
 *   • recordAccess writes top-level `entityType` field
 *   • getAuditTrail filters on `resource.type` nested path
 *   → query never matches; UI shows "no events" everywhere
 *
 * The fix (same wave) is to align both sides on a compound
 * `resource = "${entityType}#${entityId}"` key.
 */

'use strict';

const { createGovernanceService } = require('../intelligence/governance.service');

// ─── Fake AuditLog model — minimal { find, save } ──────────────────

function buildFakeAuditModel() {
  const store = [];
  let counter = 0;

  function ModelCtor(data) {
    Object.assign(this, data);
    this._id = data._id || `audit-${++counter}`;
    this.save = async function () {
      store.push({ ...this });
      return this;
    };
  }

  ModelCtor.find = function (query = {}) {
    const matches = store.filter(r => {
      for (const [key, val] of Object.entries(query)) {
        if (key.includes('.')) {
          // nested path lookup: 'resource.type' → r.resource.type
          const parts = key.split('.');
          let cur = r;
          for (const p of parts) {
            if (cur == null) return false;
            cur = cur[p];
          }
          if (String(cur) !== String(val)) return false;
        } else {
          if (String(r[key]) !== String(val)) return false;
        }
      }
      return true;
    });
    const chain = {
      sort() {
        return chain;
      },
      limit() {
        return chain;
      },
      lean: async () => matches.map(r => ({ ...r })),
    };
    return chain;
  };

  ModelCtor._store = store;
  return ModelCtor;
}

// ─── Auditlogger that persists into the fake model ─────────────────

function buildFakeAuditLogger(model) {
  return {
    log: async entry => {
      // Thin bridge — writes whatever recordAccess hands it,
      // verbatim. After Wave 84 the caller produces `entry.resource`
      // as the compound key already, so this side is dumb.
      const doc = new model({
        userId: entry.actorUserId,
        actorRole: entry.actorRole,
        action: entry.action,
        timestamp: new Date(),
        ipAddress: entry.ipAddress,
        resource: entry.resource ?? null,
        metadata: entry.metadata,
      });
      await doc.save();
    },
  };
}

// ─── The 18 entity-types the web-admin UI uses ─────────────────────
// Source: apps/web-admin/src/lib/types/audit-trail.ts (Waves 76-78)

const UI_ENTITY_TYPES = [
  'beneficiary',
  'invoice',
  'episode',
  'beneficiary-lifecycle-transition',
  'access-review-attestation',
  'incident',
  'complaint',
  'capa',
  'appointment',
  'assessment',
  'employee',
  'payroll',
  'session',
  'document',
  'controlled-document',
  'management-review',
  'vehicle',
  'form-submission',
];

// ─── 1. Establish the round-trip contract ──────────────────────────

describe('Wave 84 — audit-trail entityType round-trip (B1 + A3 closure)', () => {
  const viewer = { userId: 'auditor-1', role: 'quality_compliance' };

  test.each(UI_ENTITY_TYPES)(
    'entityType "%s" round-trips: recordAccess writes → getAuditTrail reads non-empty',
    async entityType => {
      const auditModel = buildFakeAuditModel();
      const auditLogger = buildFakeAuditLogger(auditModel);
      const svc = createGovernanceService();
      const entityId = `${entityType}-test-id`;

      await svc.recordAccess({
        dataKinds: ['clinical_phi'],
        viewer,
        entityType,
        entityId,
        auditLogger,
      });

      const result = await svc.getAuditTrail({
        entityType,
        entityId,
        viewer,
        auditModel,
        entityDoc: null,
      });

      expect(result.ok).toBe(true);
      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].kind).toBe('audit-log');
    }
  );
});

// ─── 2. Audit isolation by entity ──────────────────────────────────

describe('Wave 84 — audit-trail isolation per entity id', () => {
  test('two distinct entityIds of the same entityType do not leak into each other', async () => {
    const auditModel = buildFakeAuditModel();
    const auditLogger = buildFakeAuditLogger(auditModel);
    const svc = createGovernanceService();
    const viewer = { userId: 'auditor-1', role: 'quality_compliance' };

    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer,
      entityType: 'beneficiary',
      entityId: 'ben-A',
      auditLogger,
    });
    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer,
      entityType: 'beneficiary',
      entityId: 'ben-B',
      auditLogger,
    });

    const a = await svc.getAuditTrail({
      entityType: 'beneficiary',
      entityId: 'ben-A',
      viewer,
      auditModel,
    });
    const b = await svc.getAuditTrail({
      entityType: 'beneficiary',
      entityId: 'ben-B',
      viewer,
      auditModel,
    });

    expect(a.events.length).toBe(1);
    expect(b.events.length).toBe(1);
    // Isolation lives in the row count, not in the rendered event
    // shape (the events themselves are identical projections of
    // identical viewer + dataKinds; only the underlying resource
    // key differs, and that key is filtered out of the public
    // event projection).
    expect(a.events[0].kind).toBe('audit-log');
    expect(b.events[0].kind).toBe('audit-log');
  });

  test('different entityType + same id do not collide', async () => {
    const auditModel = buildFakeAuditModel();
    const auditLogger = buildFakeAuditLogger(auditModel);
    const svc = createGovernanceService();
    const viewer = { userId: 'auditor-1', role: 'quality_compliance' };
    const sharedId = '00000000-0000-0000-0000-000000000001';

    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer,
      entityType: 'beneficiary',
      entityId: sharedId,
      auditLogger,
    });
    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer,
      entityType: 'episode',
      entityId: sharedId,
      auditLogger,
    });

    const ben = await svc.getAuditTrail({
      entityType: 'beneficiary',
      entityId: sharedId,
      viewer,
      auditModel,
    });
    const ep = await svc.getAuditTrail({
      entityType: 'episode',
      entityId: sharedId,
      viewer,
      auditModel,
    });

    expect(ben.events.length).toBe(1);
    expect(ep.events.length).toBe(1);
  });
});

// ─── 3. Viewer-scope enforcement still applies ─────────────────────

describe('Wave 84 — non-privileged viewer sees only their own actions', () => {
  test('viewer without governance.audit-trail.read sees only own AuditLog rows', async () => {
    const auditModel = buildFakeAuditModel();
    const loggerA = buildFakeAuditLogger(auditModel);
    const loggerB = buildFakeAuditLogger(auditModel);
    const svc = createGovernanceService();

    const viewerA = { userId: 'user-A', role: 'therapist' }; // no audit-trail.read
    const viewerB = { userId: 'user-B', role: 'therapist' };

    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer: viewerA,
      entityType: 'beneficiary',
      entityId: 'shared',
      auditLogger: loggerA,
    });
    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer: viewerB,
      entityType: 'beneficiary',
      entityId: 'shared',
      auditLogger: loggerB,
    });

    // viewerA sees only their own row (no read-all permission)
    const aResult = await svc.getAuditTrail({
      entityType: 'beneficiary',
      entityId: 'shared',
      viewer: viewerA,
      auditModel,
    });
    expect(aResult.events.length).toBe(1);
    expect(aResult.events[0].actorUserId).toBe('user-A');
  });

  test('privileged viewer sees both A and B actions', async () => {
    const auditModel = buildFakeAuditModel();
    const loggerA = buildFakeAuditLogger(auditModel);
    const loggerB = buildFakeAuditLogger(auditModel);
    const svc = createGovernanceService();

    const viewerA = { userId: 'user-A', role: 'therapist' };
    const viewerB = { userId: 'user-B', role: 'therapist' };

    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer: viewerA,
      entityType: 'beneficiary',
      entityId: 'shared',
      auditLogger: loggerA,
    });
    await svc.recordAccess({
      dataKinds: ['clinical_phi'],
      viewer: viewerB,
      entityType: 'beneficiary',
      entityId: 'shared',
      auditLogger: loggerB,
    });

    const exec = { userId: 'exec-1', role: 'executive_leadership' };
    const all = await svc.getAuditTrail({
      entityType: 'beneficiary',
      entityId: 'shared',
      viewer: exec,
      auditModel,
    });
    expect(all.events.length).toBe(2);
    const actorIds = all.events.map(e => e.actorUserId).sort();
    expect(actorIds).toEqual(['user-A', 'user-B']);
  });
});

// ─── 4. ENTITY_REQUIRED guard still works ──────────────────────────

describe('Wave 84 — guards', () => {
  test('missing entityType → ENTITY_REQUIRED', async () => {
    const svc = createGovernanceService();
    const res = await svc.getAuditTrail({
      entityId: 'x',
      viewer: { userId: 'u', role: 'q' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('ENTITY_REQUIRED');
  });

  test('missing entityId → ENTITY_REQUIRED', async () => {
    const svc = createGovernanceService();
    const res = await svc.getAuditTrail({
      entityType: 'beneficiary',
      viewer: { userId: 'u', role: 'q' },
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('ENTITY_REQUIRED');
  });
});
