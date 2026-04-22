/**
 * reportingEngine.js — orchestrator for the periodic & on-demand
 * reporting pipeline.
 *
 * Phase 10 Commit 1.
 *
 * Pipeline (per call to runInstance):
 *
 *   1. Look up the catalog entry by reportId.
 *   2. Compute the instanceKey (<reportId>:<periodKey>:<scopeKey>).
 *   3. Short-circuit if an approval request exists and is not yet
 *      APPROVED (pending/rejected/expired ends the run).
 *   4. Invoke the pure builder to produce a JSON document.
 *   5. If approvalRequired and no approval: create a PENDING approval
 *      request, emit `report.approval.requested`, stop. Resuming happens
 *      via dispatchApproved(requestId).
 *   6. Resolve recipients for each audience on the entry.
 *   7. Render per-recipient payload (subject + body + attachments) for
 *      each recipient × channel pair.
 *   8. Upsert a ReportDelivery row per pair; dispatch through the
 *      channel adapter; update ledger; emit events.
 *
 * The engine is I/O-aware but every moving part is injectable so unit
 * tests can run without Mongo / channels / event bus.
 */

'use strict';

const crypto = require('crypto');

// ─── Helpers (pure) ───────────────────────────────────────────────

function computeInstanceKey(reportId, periodKey, scopeKey) {
  const scope = scopeKey || 'global';
  return `${reportId}:${periodKey}:${scope}`;
}

function hashPayload(doc) {
  const stable = JSON.stringify(doc, Object.keys(doc || {}).sort());
  return crypto.createHash('sha256').update(stable).digest('hex');
}

function resolveBuilder(builderPath, builderRegistry) {
  // builderPath: 'module.function' (e.g. 'rehabReportBuilders.buildFamilyUpdate')
  if (!builderPath) throw new Error('builder path required');
  const [mod, fn] = builderPath.split('.');
  const registry = builderRegistry || {};
  const modObj = registry[mod];
  if (!modObj) return null;
  const fnRef = modObj[fn];
  return typeof fnRef === 'function' ? fnRef : null;
}

function resolveChannel(channels, name) {
  const ch = (channels || {})[name];
  return ch && typeof ch.send === 'function' ? ch : null;
}

function pickLocale(recipient, supported) {
  const pref = recipient && recipient.locale;
  if (pref && supported.includes(pref)) return pref;
  return supported[0] || 'ar';
}

function addHoursToNow(hours) {
  return new Date(Date.now() + hours * 3600 * 1000);
}

// ─── Engine ───────────────────────────────────────────────────────

class ReportingEngine {
  /**
   * @param {Object} deps
   * @param {Object} deps.catalog               — `require('config/report.catalog')`
   * @param {Object} deps.DeliveryModel         — ReportDelivery proxy (with .model getter)
   * @param {Object} deps.ApprovalModel         — ReportApprovalRequest proxy
   * @param {Object} deps.builders              — `{ moduleName: { fnName: function } }`
   * @param {Object} deps.channels              — `{ email: {send}, sms: {send}, ... }`
   * @param {Object} deps.recipientResolver     — `{ resolve(audience, scope, ctx) → [rcpts] }`
   * @param {Object} [deps.renderer]            — `{ render(report, doc, recipient) → payload }`
   * @param {Object} [deps.eventBus]            — `{ emit(event, payload) }`
   * @param {Object} [deps.logger]
   * @param {Object} [deps.clock]               — `{ now() → Date }` for tests
   */
  constructor({
    catalog,
    DeliveryModel,
    ApprovalModel,
    builders = {},
    channels = {},
    recipientResolver,
    renderer,
    eventBus,
    logger = console,
    clock,
    // P10-C15 — reporting-backed KPI resolver auto-injected into
    // every builder's ctx under `ctx.valueResolver` so the three KPI
    // builders + two executive composites produce live values out of
    // the box. Callers can still override per-run by passing their
    // own `input.builderCtx.valueResolver`.
    valueResolver,
    // P10-C18 — per-recipient rolling 24h cap consulted before every
    // channel.send(). Over-limit recipients get their delivery row
    // marked CANCELLED (reason='rate_limited'); a
    // `report.delivery.cancelled` event fires so ops can alert.
    // Optional — when absent, the engine's behavior is unchanged.
    rateLimiter,
  }) {
    if (!catalog) throw new Error('ReportingEngine: catalog required');
    if (!DeliveryModel) throw new Error('ReportingEngine: DeliveryModel required');
    if (!ApprovalModel) throw new Error('ReportingEngine: ApprovalModel required');
    if (!recipientResolver) {
      throw new Error('ReportingEngine: recipientResolver required');
    }
    this.catalog = catalog;
    this.DeliveryModel = DeliveryModel;
    this.ApprovalModel = ApprovalModel;
    this.builders = builders;
    this.channels = channels;
    this.recipientResolver = recipientResolver;
    this.renderer = renderer || {
      render: (report, doc /* , recipient */) => ({
        subject: report.nameEn,
        bodyHtml: `<pre>${JSON.stringify(doc).slice(0, 200)}</pre>`,
        bodyText: JSON.stringify(doc).slice(0, 200),
        attachments: [],
      }),
    };
    this.eventBus = eventBus || { emit: () => {} };
    this.logger = logger;
    this.clock = clock || { now: () => new Date() };
    this.valueResolver = typeof valueResolver === 'function' ? valueResolver : null;
    this.rateLimiter = rateLimiter && typeof rateLimiter.check === 'function' ? rateLimiter : null;
  }

  // ─── Public API ────────────────────────────────────────────────

  /**
   * Execute one instance of a report end-to-end.
   *
   * @param {Object} input
   * @param {string} input.reportId
   * @param {string} input.periodKey
   * @param {string} [input.scopeKey]
   * @param {Object} [input.builderCtx]       — passed to the builder
   * @param {Object} [input.requestedBy]      — user for on-demand runs
   * @param {Array}  [input.recipientsOverride] — skip resolver
   * @returns {Promise<{status, instanceKey, deliveries?, approvalRequestId?, errors}>}
   */
  async runInstance(input) {
    const errors = [];
    const started = Date.now();
    const report = this.catalog.byId(input.reportId);
    if (!report) {
      return { status: 'not_found', errors: [`unknown report ${input.reportId}`] };
    }
    if (!report.enabled) {
      return { status: 'disabled', errors: [`report ${report.id} disabled`] };
    }
    const instanceKey = computeInstanceKey(report.id, input.periodKey, input.scopeKey);

    // Step 1 — Check existing approval, if any.
    const existingApproval = await this._findApproval(instanceKey);
    if (existingApproval) {
      if (existingApproval.state === 'PENDING') {
        return {
          status: 'awaiting_approval',
          instanceKey,
          approvalRequestId: String(existingApproval._id || existingApproval.id),
          errors: [],
        };
      }
      if (['REJECTED', 'EXPIRED', 'CANCELLED'].includes(existingApproval.state)) {
        return {
          status: 'blocked',
          instanceKey,
          approvalRequestId: String(existingApproval._id || existingApproval.id),
          errors: [`approval ${existingApproval.state}`],
        };
      }
    }

    // Step 2 — Build the document.
    let doc;
    try {
      const builderFn = resolveBuilder(report.builder, this.builders);
      if (!builderFn) {
        return {
          status: 'builder_missing',
          instanceKey,
          errors: [`builder ${report.builder} not registered`],
        };
      }
      // Auto-inject the engine's valueResolver into ctx when the
      // caller didn't supply one — KPI builders rely on
      // `ctx.valueResolver` to turn kpi.registry entries into live
      // values via the reporting-backed resolver (C13). Non-KPI
      // builders simply ignore the extra field.
      const callerCtx = input.builderCtx || {};
      const mergedCtx =
        callerCtx.valueResolver || !this.valueResolver
          ? callerCtx
          : { ...callerCtx, valueResolver: this.valueResolver };
      doc = await builderFn({
        report,
        periodKey: input.periodKey,
        scopeKey: input.scopeKey,
        ctx: mergedCtx,
      });
    } catch (err) {
      return {
        status: 'build_failed',
        instanceKey,
        errors: [`builder threw: ${err.message}`],
      };
    }
    if (!doc || typeof doc !== 'object') {
      return {
        status: 'build_failed',
        instanceKey,
        errors: ['builder returned no document'],
      };
    }
    this.eventBus.emit('report.instance.built', {
      reportId: report.id,
      instanceKey,
      durationMs: Date.now() - started,
    });

    // Step 3 — Approval gate.
    if (report.approvalRequired && !existingApproval) {
      const approval = await this._createApprovalRequest({
        report,
        instanceKey,
        periodKey: input.periodKey,
        scopeKey: input.scopeKey,
        requestedBy: input.requestedBy,
        payloadHash: hashPayload(doc),
        doc,
      });
      return {
        status: 'awaiting_approval',
        instanceKey,
        approvalRequestId: String(approval._id || approval.id),
        errors,
      };
    }
    if (report.approvalRequired && existingApproval) {
      if (existingApproval.state !== 'APPROVED') {
        return {
          status: 'awaiting_approval',
          instanceKey,
          approvalRequestId: String(existingApproval._id || existingApproval.id),
          errors,
        };
      }
      // Verify hash against the doc we just built.
      if (existingApproval.payloadHash !== hashPayload(doc)) {
        errors.push('payload hash drift — re-approval required');
        return {
          status: 'payload_drift',
          instanceKey,
          approvalRequestId: String(existingApproval._id || existingApproval.id),
          errors,
        };
      }
    }

    // Step 4 — Resolve recipients & dispatch.
    const dispatchResult = await this._dispatch({
      report,
      instanceKey,
      periodKey: input.periodKey,
      scopeKey: input.scopeKey,
      doc,
      recipientsOverride: input.recipientsOverride,
      approvalRequestId: existingApproval
        ? String(existingApproval._id || existingApproval.id)
        : null,
    });
    errors.push(...dispatchResult.errors);

    // Step 5 — Mark approval as dispatched.
    if (existingApproval && existingApproval.state === 'APPROVED') {
      try {
        existingApproval.markDispatched(null);
        if (typeof existingApproval.save === 'function') {
          await existingApproval.save();
        }
      } catch (err) {
        errors.push(`approval dispatch mark failed: ${err.message}`);
      }
    }

    return {
      status: 'dispatched',
      instanceKey,
      deliveries: dispatchResult.deliveries,
      errors,
    };
  }

  /**
   * Resume a previously-created approval request that has now been
   * approved. Looks up the approval, re-runs the builder (hash-checked),
   * and dispatches.
   */
  async dispatchApproved(approvalRequestId, builderCtx = {}) {
    const ApprovalModel = this.ApprovalModel.model || this.ApprovalModel;
    const approval = await ApprovalModel.findById(approvalRequestId);
    if (!approval) {
      return { status: 'not_found', errors: [`approval ${approvalRequestId}`] };
    }
    if (approval.state !== 'APPROVED') {
      return {
        status: 'not_approved',
        errors: [`approval in state ${approval.state}`],
      };
    }
    return this.runInstance({
      reportId: approval.reportId,
      periodKey: approval.periodKey,
      scopeKey: approval.scopeKey || undefined,
      builderCtx,
    });
  }

  // ─── Internals ─────────────────────────────────────────────────

  async _findApproval(instanceKey) {
    const ApprovalModel = this.ApprovalModel.model || this.ApprovalModel;
    try {
      return await ApprovalModel.findOne({ instanceKey });
    } catch (err) {
      this.logger.warn && this.logger.warn(`approval lookup failed: ${err.message}`);
      return null;
    }
  }

  async _createApprovalRequest({
    report,
    instanceKey,
    periodKey,
    scopeKey,
    requestedBy,
    payloadHash,
    doc,
  }) {
    const ApprovalModel = this.ApprovalModel.model || this.ApprovalModel;
    const approverRoles = this.catalog.resolveApprovers(report);
    const expiresAt = addHoursToNow(24);
    const approval = await ApprovalModel.create({
      reportId: report.id,
      instanceKey,
      periodKey,
      scopeKey: scopeKey || null,
      requestedBy: requestedBy || null,
      state: 'PENDING',
      stateHistory: [
        {
          state: 'PENDING',
          at: this.clock.now(),
          actor: requestedBy || null,
          reason: 'auto-created by engine',
        },
      ],
      approverRoles,
      approvers: [],
      expiresAt,
      confidentiality: report.confidentiality,
      payloadHash,
      metadata: { docSize: JSON.stringify(doc).length },
    });
    this.eventBus.emit('report.approval.requested', {
      requestId: String(approval._id || approval.id),
      reportId: report.id,
      instanceKey,
      approverRoles,
    });
    return approval;
  }

  async _dispatch({
    report,
    instanceKey,
    periodKey,
    scopeKey,
    doc,
    recipientsOverride,
    approvalRequestId,
  }) {
    const errors = [];
    const deliveries = [];

    const recipients =
      recipientsOverride || (await this._resolveRecipients(report, scopeKey, { periodKey }));
    if (!recipients || !recipients.length) {
      errors.push('no recipients resolved');
      return { deliveries, errors };
    }

    const DeliveryModel = this.DeliveryModel.model || this.DeliveryModel;

    for (const r of recipients) {
      const locale = pickLocale(r, report.locales);
      const effectiveChannels = this._pickChannelsForRecipient(report, r);
      const payload = await this._safeRender(report, doc, r, locale);
      for (const channelName of effectiveChannels) {
        const channel = resolveChannel(this.channels, channelName);
        const deliveryFilter = {
          instanceKey,
          recipientId: r.id,
          channel: channelName,
        };
        const baseDoc = {
          reportId: report.id,
          instanceKey,
          periodKey,
          scopeKey: scopeKey || null,
          recipientId: r.id,
          recipientModel: r.recipientModel || 'User',
          recipientRole: r.role,
          channel: channelName,
          locale,
          confidentiality: report.confidentiality,
          approvalRequestId: approvalRequestId || null,
          branchId: r.branchId || null,
        };

        // Upsert a QUEUED row before sending — idempotent on repeat ticks.
        let delivery;
        try {
          delivery = await DeliveryModel.findOneAndUpdate(
            deliveryFilter,
            {
              $setOnInsert: { ...baseDoc, status: 'QUEUED', attempts: 0 },
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          errors.push(`queue failed for ${r.id}/${channelName}: ${err.message}`);
          continue;
        }

        // If the delivery is already terminal from a previous run, skip.
        if (delivery && typeof delivery.isTerminal === 'function' && delivery.isTerminal()) {
          deliveries.push(delivery);
          continue;
        }

        // If the delivery was already sent / delivered in a prior run
        // but not yet terminal (webhook hasn't fired READ yet), do NOT
        // re-send — we'd produce a duplicate at the provider. Retry is
        // driven by the ops scheduler for FAILED rows only.
        if (delivery && (delivery.status === 'SENT' || delivery.status === 'DELIVERED')) {
          deliveries.push(delivery);
          continue;
        }

        // No adapter? mark FAILED and move on.
        if (!channel) {
          try {
            delivery.markFailed(`channel ${channelName} not registered`);
            if (typeof delivery.save === 'function') await delivery.save();
          } catch (err) {
            errors.push(`mark-failed crashed: ${err.message}`);
          }
          this.eventBus.emit('report.delivery.failed', {
            deliveryId: String(delivery._id || delivery.id),
            reason: 'no_adapter',
          });
          continue;
        }

        // P10-C18 — per-recipient rolling 24h cap. Consults the limiter
        // right before spending a channel call so the row is already
        // persisted for visibility, but no provider traffic is emitted
        // for over-limit recipients.
        if (this.rateLimiter) {
          let decision;
          try {
            decision = await this.rateLimiter.check({ recipientId: r.id, role: r.role });
          } catch (err) {
            // Fail-open: rate limit check crashing must not block delivery.
            this.logger.warn &&
              this.logger.warn(`[rateLimiter] check crashed for ${r.id}: ${err.message}`);
            decision = { allowed: true };
          }
          if (decision && decision.allowed === false) {
            try {
              delivery.markCancelled(
                `rate_limited: ${decision.current}/${decision.limit} in 24h for role=${r.role}`
              );
              if (typeof delivery.save === 'function') await delivery.save();
            } catch (err) {
              errors.push(`mark-cancelled crashed: ${err.message}`);
            }
            this.eventBus.emit('report.delivery.cancelled', {
              deliveryId: String(delivery._id || delivery.id),
              recipientId: String(r.id),
              role: r.role,
              reason: 'rate_limited',
              current: decision.current,
              limit: decision.limit,
            });
            deliveries.push(delivery);
            continue;
          }
        }

        // Send.
        try {
          const result = await channel.send(
            {
              subject: payload.subject,
              bodyHtml: payload.bodyHtml,
              bodyText: payload.bodyText,
              attachments: payload.attachments || [],
              locale,
              reportId: report.id,
              instanceKey,
              confidentiality: report.confidentiality,
            },
            [r]
          );
          if (result && result.success) {
            delivery.markSent(result.providerMessageId);
            if (typeof delivery.save === 'function') await delivery.save();
            this.eventBus.emit('report.delivery.sent', {
              deliveryId: String(delivery._id || delivery.id),
              channel: channelName,
            });
          } else {
            delivery.markFailed((result && result.error) || 'channel returned success=false');
            if (typeof delivery.save === 'function') await delivery.save();
            this.eventBus.emit('report.delivery.failed', {
              deliveryId: String(delivery._id || delivery.id),
              reason: (result && result.error) || 'unknown',
            });
          }
        } catch (err) {
          try {
            delivery.markFailed(err.message);
            if (typeof delivery.save === 'function') await delivery.save();
          } catch (_) {
            /* ignore */
          }
          errors.push(`send crashed for ${r.id}/${channelName}: ${err.message}`);
          this.eventBus.emit('report.delivery.failed', {
            deliveryId: String(delivery._id || delivery.id),
            reason: err.message,
          });
        }

        deliveries.push(delivery);
      }
    }

    return { deliveries, errors };
  }

  async _resolveRecipients(report, scopeKey, ctx) {
    const all = [];
    for (const audience of report.audiences) {
      try {
        const list = await this.recipientResolver.resolve(audience, scopeKey, ctx);
        for (const r of list || []) {
          all.push({ ...r, role: audience });
        }
      } catch (err) {
        this.logger.warn &&
          this.logger.warn(`recipient resolve ${audience} failed: ${err.message}`);
      }
    }
    // De-duplicate by (id, channelPref intersection) — dedupe on id only;
    // engine emits per catalog channel, not per preference.
    const seen = new Map();
    for (const r of all) {
      const k = String(r.id);
      if (!seen.has(k)) seen.set(k, r);
    }
    return [...seen.values()];
  }

  _pickChannelsForRecipient(report, recipient) {
    let list = [...report.channels];
    if (report.confidentiality === 'confidential') {
      // portal_inbox only (plus optional in_app ping).
      list = list.filter(c => c === 'portal_inbox' || c === 'in_app');
      if (!list.length) list = ['portal_inbox'];
    }
    if (Array.isArray(recipient.preferredChannels) && recipient.preferredChannels.length) {
      const inter = list.filter(c => recipient.preferredChannels.includes(c));
      if (inter.length) list = inter;
    }
    return list;
  }

  async _safeRender(report, doc, recipient, locale) {
    try {
      const payload = await this.renderer.render(report, doc, {
        ...recipient,
        locale,
      });
      return payload || {};
    } catch (err) {
      this.logger.warn && this.logger.warn(`render failed for ${report.id}: ${err.message}`);
      return {
        subject: report.nameEn,
        bodyText: JSON.stringify(doc).slice(0, 500),
        bodyHtml: `<pre>${JSON.stringify(doc).slice(0, 500)}</pre>`,
        attachments: [],
      };
    }
  }
}

module.exports = {
  ReportingEngine,
  computeInstanceKey,
  hashPayload,
};
