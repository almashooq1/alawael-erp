'use strict';

/**
 * ops-phase16-drift.test.js — Phase 16 Commit 9 (4.0.74).
 *
 * Cross-commit invariants for the Phase-16 ops control tower.
 * These tests catch regressions that span files: a registry edit
 * that breaks alignment with a service's pause bucket, a route
 * file that stops exporting a Router, a bootstrap accessor that
 * disappears, etc.
 *
 * Pure data + load checks. No DB, no I/O.
 */

const path = require('path');
const fs = require('fs');

// ── SLA ↔ service pause-state alignment ──────────────────────────

describe('Phase 16 drift — SLA pause states match service buckets', () => {
  const slaRegistry = require('../config/sla.registry');

  it('every OPS_MODULES member has ≥ 1 SLA policy', () => {
    for (const mod of slaRegistry.OPS_MODULES) {
      const hits = slaRegistry.byModule(mod);
      expect(hits.length).toBeGreaterThan(0);
    }
  });

  it('facility.inspection.closeout pauseOnStates ⊇ facility registry FINDING_PAUSE_STATUSES', () => {
    const facilityReg = require('../config/facility.registry');
    const sla = slaRegistry.byId('facility.inspection.closeout');
    expect(sla).toBeTruthy();
    for (const s of facilityReg.FINDING_PAUSE_STATUSES) {
      expect(sla.pauseOnStates).toContain(s);
    }
  });

  it('procurement.pr.approval pauseOnStates ⊇ PR registry PR_PAUSE_STATUSES', () => {
    const prReg = require('../config/purchaseRequest.registry');
    const sla = slaRegistry.byId('procurement.pr.approval');
    expect(sla).toBeTruthy();
    for (const s of prReg.PR_PAUSE_STATUSES) {
      expect(sla.pauseOnStates).toContain(s);
    }
  });

  it('maintenance.wo.critical pauseOnStates ⊇ WO registry PAUSE_STATES', () => {
    const woReg = require('../config/workOrder.registry');
    const sla = slaRegistry.byId('maintenance.wo.critical');
    expect(sla).toBeTruthy();
    for (const s of woReg.PAUSE_STATES) {
      expect(sla.pauseOnStates).toContain(s);
    }
  });

  it('all SLA policies reference a known OPS_MODULES value', () => {
    for (const sla of slaRegistry.SLAS) {
      expect(slaRegistry.OPS_MODULES).toContain(sla.module);
    }
  });
});

// ── State-machine reachability ───────────────────────────────────

describe('Phase 16 drift — state-machine reachability', () => {
  function reachableFrom(transitions, start) {
    const reachable = new Set([start]);
    let added = true;
    while (added) {
      added = false;
      for (const [from, edges] of Object.entries(transitions)) {
        if (!reachable.has(from)) continue;
        for (const edge of edges) {
          if (!reachable.has(edge.to)) {
            reachable.add(edge.to);
            added = true;
          }
        }
      }
    }
    return reachable;
  }

  it('every WO state is reachable from draft', () => {
    const woReg = require('../config/workOrder.registry');
    const reachable = reachableFrom(woReg.TRANSITIONS, 'draft');
    for (const s of woReg.WO_STATES) {
      expect(reachable.has(s)).toBe(true);
    }
  });

  it('every PR state is reachable from draft', () => {
    const prReg = require('../config/purchaseRequest.registry');
    const reachable = reachableFrom(prReg.PR_TRANSITIONS, 'draft');
    for (const s of prReg.PR_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });

  it('every meeting decision status (minus overdue) is reachable from open', () => {
    const mgReg = require('../config/meetingGovernance.registry');
    const reachable = reachableFrom(mgReg.DECISION_TRANSITIONS, 'open');
    // `overdue` is set by the scheduler, not a user transition;
    // it's intentionally unreachable from the user-driven graph.
    for (const s of mgReg.DECISION_STATUSES) {
      if (s === 'overdue') continue;
      expect(reachable.has(s)).toBe(true);
    }
  });

  it('every route-optimization job state is reachable from planning', () => {
    const roReg = require('../config/routeOptimization.registry');
    const reachable = reachableFrom(roReg.JOB_TRANSITIONS, 'planning');
    for (const s of roReg.JOB_STATUSES) {
      expect(reachable.has(s)).toBe(true);
    }
  });
});

// ── Bootstrap accessors ──────────────────────────────────────────

describe('Phase 16 drift — operationsBootstrap exports', () => {
  const bootstrap = require('../startup/operationsBootstrap');

  const requiredAccessors = [
    '_getWorkOrderStateMachine',
    '_getFacilityService',
    '_getFacilityInspectionService',
    '_getPurchaseRequestService',
    '_getOpsDashboardService',
    '_getMeetingGovernanceService',
    '_getRouteOptimizationService',
    '_getNotificationDispatchService',
  ];

  it.each(requiredAccessors)('exposes %s', accessor => {
    expect(typeof bootstrap[accessor]).toBe('function');
  });

  it('bootstrapOperations is exported', () => {
    expect(typeof bootstrap.bootstrapOperations).toBe('function');
  });
});

// ── Route file contracts ─────────────────────────────────────────

describe('Phase 16 drift — route files export Express routers', () => {
  const opsRoutesDir = path.join(__dirname, '..', 'routes', 'operations');

  function listRouteFiles() {
    return fs
      .readdirSync(opsRoutesDir)
      .filter(f => f.endsWith('.routes.js'))
      .map(f => path.join(opsRoutesDir, f));
  }

  it('every file ending in .routes.js exports a router', () => {
    const files = listRouteFiles();
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const file of files) {
      const mod = require(file);
      // Express routers are functions with a `.stack` array.
      expect(typeof mod).toBe('function');
      expect(Array.isArray(mod.stack)).toBe(true);
    }
  });
});

// ── Notification priority matrix invariants ──────────────────────

describe('Phase 16 drift — notification priority matrix', () => {
  const nd = require('../config/notificationDispatch.registry');

  it('every priority uses only supported channels', () => {
    for (const [priority, channels] of Object.entries(nd.PRIORITY_CHANNEL_MATRIX)) {
      for (const ch of channels) {
        expect(nd.SUPPORTED_CHANNELS).toContain(ch);
      }
    }
  });

  it('critical is the only bypass priority', () => {
    expect(nd.BYPASS_PRIORITIES).toEqual(['critical']);
  });

  it('digest-eligible priorities are non-urgent only', () => {
    for (const p of nd.DIGEST_ELIGIBLE_PRIORITIES) {
      expect(nd.BYPASS_PRIORITIES).not.toContain(p);
    }
  });
});

// ── Event-name consistency ───────────────────────────────────────

describe('Phase 16 drift — ops.* event prefixes', () => {
  const slaRegistry = require('../config/sla.registry');

  it('every SLA breachEvent / preBreachEvent follows ops.sla.* convention', () => {
    for (const sla of slaRegistry.SLAS) {
      if (sla.breachEvent) expect(sla.breachEvent).toMatch(/^ops\.sla\./);
      if (sla.preBreachEvent) expect(sla.preBreachEvent).toMatch(/^ops\.sla\./);
    }
  });

  it('every SLA source event follows ops.<module>.* convention', () => {
    for (const sla of slaRegistry.SLAS) {
      // `event` is the source trigger that activates the clock.
      expect(sla.event).toMatch(/^ops\./);
    }
  });
});

// ── Required-field gates referenced from state machines ─────────

describe('Phase 16 drift — required-field gates', () => {
  it('WO completed transition requires resolution', () => {
    const woReg = require('../config/workOrder.registry');
    const edges = woReg.allowedTransitions('in_progress');
    const edge = edges.find(e => e.to === 'completed');
    expect(edge).toBeTruthy();
    expect(edge.required).toContain('resolution');
  });

  it('meeting decision completed requires executionNotes', () => {
    const mgReg = require('../config/meetingGovernance.registry');
    const req = mgReg.requiredFieldsForTransition('in_progress', 'completed');
    expect(req).toContain('executionNotes');
  });

  it('meeting decision deferred requires deferReason', () => {
    const mgReg = require('../config/meetingGovernance.registry');
    const req = mgReg.requiredFieldsForTransition('open', 'deferred');
    expect(req).toContain('deferReason');
  });
});
