'use strict';

/**
 * workOrderStateMachine.service.js — Phase 16 Commit 2 (4.0.67).
 *
 * The single legal way to change a MaintenanceWorkOrder's state.
 * Everything that wants to move a WO through its lifecycle goes
 * through `transition()` — routes, schedulers, integration adapters.
 *
 * Responsibilities:
 *
 *   1. **Enforce the graph.** Reject illegal transitions defined in
 *      `config/workOrder.registry.js`. No silent "we'll fix it
 *      later" — the caller gets a 409 with the allowed moves.
 *
 *   2. **Enforce field preconditions.** A transition that requires
 *      `resolution` or `scheduledDate` blocks until those fields
 *      are populated. Keeps the audit trail honest.
 *
 *   3. **Maintain audit.** Every transition pushes a row onto
 *      `statusHistory` (from, to, event, actor, timestamp, notes).
 *
 *   4. **Emit bus events.** `ops.wo.<event>` is published on the
 *      injected dispatcher (typically the QualityEventBus) for
 *      every successful transition. Payload is a stable snapshot
 *      of the WO — listeners must not reach back into Mongo.
 *
 *   5. **Drive the SLA engine.** On the first transition that
 *      activates a tracked SLA (submitted/approved for
 *      criticals/high/preventive), we call `slaEngine.activate()`
 *      and back-link the resulting SLA id onto the WO. On every
 *      subsequent transition we call `slaEngine.observe()` with
 *      the right eventType (`state_changed` / `first_response` /
 *      `resolved` / `cancelled`).
 *
 *   6. **Stay decoupled.** The engine never crawls into the WO
 *      model, and this service never reaches into the engine's
 *      internals. Both are injected as plain objects, so tests can
 *      swap them for recorders.
 *
 * Errors:
 *   - IllegalTransitionError(code=ILLEGAL_TRANSITION)
 *   - MissingFieldError(code=MISSING_FIELD, fields=[...])
 *
 * Never throws for event-dispatch failures — they are logged and
 * swallowed so one broken subscriber can't wedge the transition.
 */

const registry = require('../../config/workOrder.registry');

class IllegalTransitionError extends Error {
  constructor(msg, { from, to, allowed }) {
    super(msg);
    this.code = 'ILLEGAL_TRANSITION';
    this.from = from;
    this.to = to;
    this.allowed = allowed;
  }
}

class MissingFieldError extends Error {
  constructor(fields) {
    super(`Transition blocked: missing required fields: ${fields.join(', ')}`);
    this.code = 'MISSING_FIELD';
    this.fields = fields;
  }
}

function createWorkOrderStateMachine({
  workOrderModel,
  slaEngine = null, // { activate, observe } — optional; falls through if null
  dispatcher = null, // { emit(name, payload) }
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!workOrderModel) {
    throw new Error('workOrderStateMachine: workOrderModel required');
  }

  registry.validate();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[WO-SM] emit ${name} failed: ${err.message}`);
    }
  }

  // ── Public: transition ──────────────────────────────────────────

  /**
   * Move a WO from its current state to `toState`.
   *
   * @param {object} args
   * @param {string|object} args.workOrder — WO id or mongoose doc
   * @param {string} args.toState — canonical or legacy state name
   * @param {string} [args.actorId] — user performing the transition
   * @param {string} [args.notes]
   * @param {object} [args.patch] — extra fields to set atomically
   *   before the transition (e.g. `{ resolution: '...' }`)
   */
  async function transition({ workOrder, toState, actorId = null, notes = null, patch = {} }) {
    const wo = await _resolve(workOrder);
    if (!wo) throw new Error('WO-SM: work order not found');

    const fromRaw = wo.status;
    const from = registry.canonical(fromRaw);
    const to = registry.canonical(toState);
    if (!from) {
      throw new Error(`WO-SM: current state '${fromRaw}' is not recognised`);
    }
    if (!to) {
      throw new IllegalTransitionError(`unknown target state '${toState}'`, {
        from,
        to: toState,
        allowed: registry.allowedTransitions(from).map(e => e.to),
      });
    }

    if (!registry.canTransition(from, to)) {
      throw new IllegalTransitionError(`illegal transition ${from} → ${to}`, {
        from,
        to,
        allowed: registry.allowedTransitions(from).map(e => e.to),
      });
    }

    // Apply patch atomically BEFORE validating required fields —
    // callers typically pass resolution/scheduledDate here.
    if (patch && typeof patch === 'object') {
      for (const [k, v] of Object.entries(patch)) {
        wo[k] = v;
      }
    }

    // Validate precondition fields.
    const edge = registry.allowedTransitions(from).find(e => e.to === to);
    const required = edge.required || [];
    const missing = required.filter(f => _isMissing(wo[f]));
    if (missing.length) {
      throw new MissingFieldError(missing);
    }

    const ts = now();
    const event = edge.event;

    // Mirror key timestamps on the legacy fields so downstream
    // reports that still read `startedDate` / `completedDate`
    // keep working.
    if (to === 'in_progress' && !wo.startedDate) wo.startedDate = ts;
    if (registry.RESOLUTION_STATES.includes(to) && !wo.completedDate) {
      wo.completedDate = ts;
    }

    wo.statusHistory.push({
      from,
      to,
      event,
      actorId,
      at: ts,
      notes: notes || null,
    });
    wo.status = to;
    wo.updatedBy = actorId || wo.updatedBy;

    // ── SLA hooks ──────────────────────────────────────────────
    // Activate on first transition out of draft/submitted if a
    // policy applies.
    if (slaEngine) {
      const policyId = registry.slaPolicyFor({ type: wo.type, priority: wo.priority });
      if (policyId && !wo.slaId) {
        try {
          const sla = await slaEngine.activate({
            policyId,
            subjectType: 'MaintenanceWorkOrder',
            subjectId: wo._id,
            subjectRef: wo.workOrderNumber,
            branchId: wo.branchId || null,
            startedAt: wo.createdAt || ts,
            metadata: { type: wo.type, priority: wo.priority },
          });
          wo.slaId = sla._id;
        } catch (err) {
          logger.warn(`[WO-SM] SLA activate failed: ${err.message}`);
        }
      }

      // Fire the right observe() based on the semantic milestone.
      if (wo.slaId) {
        try {
          if (registry.RESPONSE_STATES.includes(to)) {
            await slaEngine.observe({
              slaId: wo.slaId,
              eventType: 'first_response',
              when: ts,
            });
          }
          if (registry.RESOLUTION_STATES.includes(to)) {
            await slaEngine.observe({
              slaId: wo.slaId,
              eventType: 'resolved',
              when: ts,
            });
          } else if (registry.CANCEL_STATES.includes(to)) {
            await slaEngine.observe({
              slaId: wo.slaId,
              eventType: 'cancelled',
              when: ts,
            });
          } else {
            // All other transitions are pause/resume signals.
            await slaEngine.observe({
              slaId: wo.slaId,
              eventType: 'state_changed',
              state: to,
              when: ts,
            });
          }
        } catch (err) {
          logger.warn(`[WO-SM] SLA observe failed: ${err.message}`);
        }
      }
    }

    await wo.save();

    // ── Bus emission ───────────────────────────────────────────
    const eventName = `ops.wo.${event}`;
    await _emit(eventName, _snapshot(wo, { from, to, event }));
    // Also fire the umbrella `ops.wo.transitioned` for generic
    // listeners that don't care about the specific event.
    await _emit('ops.wo.transitioned', _snapshot(wo, { from, to, event }));

    return wo;
  }

  // ── Public: create (convenience) ────────────────────────────────

  /**
   * Create a WO in `draft` or directly `submitted` state, skipping
   * the manual first transition. Mirrors how most callers actually
   * want to ingest WOs.
   */
  async function createWorkOrder(data, { autoSubmit = true, actorId = null } = {}) {
    const initialStatus = autoSubmit ? 'submitted' : 'draft';
    const wo = await workOrderModel.create({
      ...data,
      status: 'draft',
      statusHistory: [],
      createdBy: actorId,
    });
    if (autoSubmit) {
      return transition({
        workOrder: wo,
        toState: initialStatus,
        actorId,
        notes: 'auto-submit on create',
      });
    }
    return wo;
  }

  // ── internals ───────────────────────────────────────────────────

  async function _resolve(woOrId) {
    if (!woOrId) return null;
    if (typeof woOrId === 'string' || (woOrId && woOrId._bsontype === 'ObjectID')) {
      return workOrderModel.findById(woOrId);
    }
    if (woOrId.save) return woOrId; // mongoose doc
    return null;
  }

  function _isMissing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  }

  function _snapshot(wo, { from, to, event }) {
    return {
      workOrderId: String(wo._id),
      workOrderNumber: wo.workOrderNumber,
      branchId: wo.branchId ? String(wo.branchId) : null,
      assetId: wo.assetId ? String(wo.assetId) : null,
      type: wo.type,
      priority: wo.priority,
      from,
      to,
      event,
      slaId: wo.slaId ? String(wo.slaId) : null,
      at: new Date(),
    };
  }

  return {
    transition,
    createWorkOrder,
    // Expose error classes on the returned instance for typed catches.
    IllegalTransitionError,
    MissingFieldError,
  };
}

module.exports = {
  createWorkOrderStateMachine,
  IllegalTransitionError,
  MissingFieldError,
};
