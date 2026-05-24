'use strict';

/**
 * W346 — CAPA Pass 5 producer service drift guard.
 *
 * Tests producer functions directly with a stub capaService that captures
 * createCapaItem calls — no mongoose dependency. Verifies:
 *   - input validation
 *   - source.module routing (audit/rca/fmea)
 *   - priority mapping from upstream entity fields
 *   - owner fallback chain (explicit > finding/rca/action default)
 *   - title + description + rootCause population
 */

const {
  createCapaProducers,
  CAPA_TYPES,
  SOURCE_MODULES,
  PRIORITIES,
} = require('../services/quality/capa-producers.service');

function makeStubCapaService() {
  const calls = [];
  return {
    calls,
    createCapaItem: async input => {
      calls.push(input);
      return { _id: 'fake-capa-id', capaNumber: 'CAPA-2026-0001', ...input };
    },
  };
}

describe('W346 — producer factory contract', () => {
  it('exports createCapaProducers factory + lib constants', () => {
    expect(typeof createCapaProducers).toBe('function');
    expect(Array.isArray(CAPA_TYPES) || CAPA_TYPES instanceof Object).toBe(true);
    expect(SOURCE_MODULES).toBeDefined();
    expect(PRIORITIES).toBeDefined();
  });

  it('factory rejects when capaService.createCapaItem is missing', () => {
    expect(() => createCapaProducers()).toThrow(/capaService\.createCapaItem required/);
    expect(() => createCapaProducers({ capaService: {} })).toThrow(
      /capaService\.createCapaItem required/
    );
  });

  it('factory returns the documented 3 producer functions', () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    expect(typeof p.createCapaFromAuditFinding).toBe('function');
    expect(typeof p.createCapaFromRcaRootCause).toBe('function');
    expect(typeof p.createCapaFromFmeaAction).toBe('function');
  });
});

describe('W346 — createCapaFromAuditFinding', () => {
  function buildOccurrence(findingOverrides = {}) {
    return {
      _id: 'occurrence-1',
      auditNumber: 'AUD-2026-0042',
      branchId: 'branch-1',
      tenantId: 'tenant-1',
      findings: [
        {
          _id: 'finding-1',
          type: 'major_nc',
          description: 'Process X not following SOP',
          ownerUserId: 'owner-finding',
          clauseRef: 'ISO 9001:8.5',
          evidence: 'audit log #234',
          ...findingOverrides,
        },
      ],
    };
  }

  it('routes source.module=audit with refId + collection', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromAuditFinding({
      occurrenceDoc: buildOccurrence(),
      findingId: 'finding-1',
      createdBy: 'creator-1',
    });
    expect(stub.calls[0].source).toEqual({
      module: 'audit',
      refId: 'occurrence-1',
      collection: 'audit_occurrences',
    });
  });

  it('maps major_nc → priority:high, minor_nc → medium, observation → low', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    for (const [type, expected] of [
      ['major_nc', 'high'],
      ['minor_nc', 'medium'],
      ['observation', 'low'],
      ['opportunity', 'low'],
    ]) {
      stub.calls.length = 0;
      await p.createCapaFromAuditFinding({
        occurrenceDoc: buildOccurrence({ type }),
        findingId: 'finding-1',
        createdBy: 'c1',
      });
      expect(stub.calls[0].priority).toBe(expected);
    }
  });

  it('falls back to finding.ownerUserId when explicit ownerUserId missing', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromAuditFinding({
      occurrenceDoc: buildOccurrence(),
      findingId: 'finding-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].ownerUserId).toBe('owner-finding');
  });

  it('throws MISSING_SUB_DOC when findingId not found', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await expect(
      p.createCapaFromAuditFinding({
        occurrenceDoc: buildOccurrence(),
        findingId: 'nope',
        createdBy: 'c1',
      })
    ).rejects.toMatchObject({ code: 'MISSING_SUB_DOC' });
  });

  it('throws INVALID_INPUT when occurrenceDoc/findingId/createdBy missing', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await expect(p.createCapaFromAuditFinding({})).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      p.createCapaFromAuditFinding({ occurrenceDoc: buildOccurrence() })
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      p.createCapaFromAuditFinding({
        occurrenceDoc: buildOccurrence(),
        findingId: 'finding-1',
      })
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('throws INVALID_INPUT when no owner can be derived', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    const occ = buildOccurrence({ ownerUserId: null });
    await expect(
      p.createCapaFromAuditFinding({
        occurrenceDoc: occ,
        findingId: 'finding-1',
        createdBy: 'c1',
      })
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('W346 — createCapaFromRcaRootCause', () => {
  function buildRca(rootOverrides = {}) {
    return {
      _id: 'rca-1',
      rcaNumber: 'RCA-2026-0007',
      title: 'Incident XYZ',
      severity: 5,
      branchId: 'branch-1',
      tenantId: 'tenant-1',
      facilitatorUserId: 'facilitator-1',
      rootCauses: [
        {
          _id: 'root-1',
          text: 'Documentation gap',
          source: 'five_whys',
          severity: 4,
          ...rootOverrides,
        },
      ],
    };
  }

  it('routes source.module=rca', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromRcaRootCause({
      rcaDoc: buildRca(),
      rootCauseId: 'root-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].source.module).toBe('rca');
    expect(stub.calls[0].source.refId).toBe('rca-1');
  });

  it('severity mapping: 1-2→low, 3-4→medium, 5→high, 6 (both)→critical', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    for (const [rootSev, rcaSev, expected] of [
      [1, 3, 'low'],
      [2, 3, 'low'],
      [3, 3, 'medium'],
      [4, 3, 'medium'],
      [5, 3, 'high'],
      [6, 3, 'high'],
      [6, 6, 'critical'],
    ]) {
      stub.calls.length = 0;
      const rca = buildRca({ severity: rootSev });
      rca.severity = rcaSev;
      await p.createCapaFromRcaRootCause({
        rcaDoc: rca,
        rootCauseId: 'root-1',
        createdBy: 'c1',
      });
      expect(stub.calls[0].priority).toBe(expected);
    }
  });

  it('falls back to rca.facilitatorUserId when explicit owner missing', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromRcaRootCause({
      rcaDoc: buildRca(),
      rootCauseId: 'root-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].ownerUserId).toBe('facilitator-1');
  });

  it('uses root.text as description + identifies the analysis source in rootCause field', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromRcaRootCause({
      rcaDoc: buildRca({ source: 'ishikawa', category: 'methods' }),
      rootCauseId: 'root-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].description).toBe('Documentation gap');
    expect(stub.calls[0].rootCause).toMatch(/ishikawa.*methods/);
  });
});

describe('W346 — createCapaFromFmeaAction', () => {
  function buildFmea(rowOverrides = {}, actionOverrides = {}) {
    return {
      _id: 'fmea-1',
      fmeaNumber: 'FMEA-2026-0003',
      branchId: 'branch-1',
      tenantId: 'tenant-1',
      rows: [
        {
          _id: 'row-1',
          rowNumber: 7,
          failureMode: 'Sensor mis-read',
          failureEffect: 'Wrong dosage',
          actionPriority: 'high',
          preventionControls: ['daily calibration', 'paired sensor cross-check'],
          ...rowOverrides,
          actions: [
            {
              _id: 'action-1',
              description: 'Add redundant sensor',
              ownerUserId: 'action-owner',
              dueDate: new Date('2026-12-31'),
              ...actionOverrides,
            },
          ],
        },
      ],
    };
  }

  it('routes source.module=fmea + type=preventive (FMEA is forward-looking)', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromFmeaAction({
      fmeaDoc: buildFmea(),
      rowId: 'row-1',
      actionId: 'action-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].source.module).toBe('fmea');
    expect(stub.calls[0].type).toBe('preventive');
  });

  it('priority mapping copies row.actionPriority verbatim (high/medium/low) + medium fallback on null', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    for (const [actionPriority, expected] of [
      ['high', 'high'],
      ['medium', 'medium'],
      ['low', 'low'],
      [null, 'medium'],
    ]) {
      stub.calls.length = 0;
      await p.createCapaFromFmeaAction({
        fmeaDoc: buildFmea({ actionPriority }),
        rowId: 'row-1',
        actionId: 'action-1',
        createdBy: 'c1',
      });
      expect(stub.calls[0].priority).toBe(expected);
    }
  });

  it('falls back to action.ownerUserId + action.dueDate when explicit omitted', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromFmeaAction({
      fmeaDoc: buildFmea(),
      rowId: 'row-1',
      actionId: 'action-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].ownerUserId).toBe('action-owner');
    expect(stub.calls[0].dueDate).toEqual(new Date('2026-12-31'));
  });

  it('rootCause field describes the failure mode + effect', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromFmeaAction({
      fmeaDoc: buildFmea(),
      rowId: 'row-1',
      actionId: 'action-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].rootCause).toMatch(/Sensor mis-read/);
    expect(stub.calls[0].rootCause).toMatch(/Wrong dosage/);
  });

  it('verificationCriteria lists existing prevention controls when present', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await p.createCapaFromFmeaAction({
      fmeaDoc: buildFmea(),
      rowId: 'row-1',
      actionId: 'action-1',
      createdBy: 'c1',
    });
    expect(stub.calls[0].verificationCriteria).toMatch(/daily calibration/);
    expect(stub.calls[0].verificationCriteria).toMatch(/paired sensor cross-check/);
  });

  it('throws MISSING_SUB_DOC when row or action not found', async () => {
    const stub = makeStubCapaService();
    const p = createCapaProducers({ capaService: stub });
    await expect(
      p.createCapaFromFmeaAction({
        fmeaDoc: buildFmea(),
        rowId: 'nope',
        actionId: 'action-1',
        createdBy: 'c1',
      })
    ).rejects.toMatchObject({ code: 'MISSING_SUB_DOC' });
    await expect(
      p.createCapaFromFmeaAction({
        fmeaDoc: buildFmea(),
        rowId: 'row-1',
        actionId: 'nope',
        createdBy: 'c1',
      })
    ).rejects.toMatchObject({ code: 'MISSING_SUB_DOC' });
  });
});

describe('W346 — source.module values are all valid per lib.SOURCE_MODULES', () => {
  it('audit + rca + fmea are all in lib.SOURCE_MODULES', () => {
    expect(SOURCE_MODULES).toContain('audit');
    expect(SOURCE_MODULES).toContain('rca');
    expect(SOURCE_MODULES).toContain('fmea');
  });
});
