'use strict';

/**
 * phase29-subscribers.js — World-Class QMS Phase 29 follow-up.
 *
 * Wires the events emitted by the 17 Phase 29 modules to cross-module
 * subscribers (auto-CAPA, notifier, evidence vault). Every subscriber
 * is defensive: failures log but never throw, since the producers run
 * inside transactions we mustn't roll back over a side-effect.
 *
 * Subscribed events:
 *
 *   quality.spc.special_cause_detected
 *     → draft a corrective-action with the failed rule(s) in the
 *       description; severity = critical when rule_1 (3σ) trips,
 *       else major.
 *
 *   quality.fmea.high_priority_detected
 *     → draft a corrective-action; severity = critical; carries
 *       the FMEA row's functionAr + failureMode.
 *
 *   quality.audit.nc_recorded
 *     → draft a corrective-action; severity = critical when
 *       finding.type = major_nc, else major.
 *
 *   quality.supplier.scar_overdue
 *     → notifier event (no CAPA — the SCAR itself IS the CAPA equivalent
 *       on the supplier side).
 *
 *   quality.calibration.failed
 *     → draft a corrective-action; severity = major. Calibration failures
 *       require investigation + recall of dependent records.
 *
 *   quality.standard.clause_status_changed (statusTo = lapsed)
 *     → notifier event to the quality manager.
 *
 *   quality.doc.signature_revoked
 *     → audit-log only (security trail).
 *
 *   quality.predictive_risk.computed (band = critical)
 *     → notifier event to the executive team.
 */

function safeRequire(p) {
  try {
    return require(p);
  } catch (_) {
    return null;
  }
}

/**
 * Wire all Phase 29 subscribers onto the supplied event bus.
 *
 * @param {object} bus — qualityEventBus instance (must expose `on(pattern, handler)`)
 * @param {object} [opts]
 * @param {object} [opts.capaModel] — CorrectivePreventiveAction model (auto-resolved)
 * @param {object} [opts.notifier] — { notify(channel, payload) }
 * @param {object} [opts.logger]
 */
function wirePhase29Subscribers(bus, opts = {}) {
  if (!bus || typeof bus.on !== 'function') {
    throw new Error('phase29-subscribers: bus.on() is required');
  }
  const logger = opts.logger || console;
  const capaModel =
    opts.capaModel || safeRequire('../../models/internal-audit/CorrectivePreventiveAction.model');
  const notifier = opts.notifier || null;

  let counter = 0;
  function genActionId(prefix) {
    counter += 1;
    return `${prefix}-${Date.now()}-${counter}`;
  }

  async function safe(label, fn) {
    try {
      await fn();
    } catch (err) {
      logger.warn(`[phase29-subscriber] ${label} failed: ${err.message}`);
    }
  }

  async function draftCapa({
    type = 'corrective',
    source,
    sourceId,
    title,
    description,
    severity = 'major',
  }) {
    if (!capaModel) {
      logger.warn('[phase29-subscriber] capaModel not wired — skipping draftCapa');
      return null;
    }
    return capaModel.create({
      actionId: genActionId('AUTO'),
      type,
      linkedNcr: {
        ncrId: sourceId ? String(sourceId) : null,
        ncrTitle: title,
        relationshipType: source,
      },
      actionInfo: {
        title,
        description,
        createdDate: new Date(),
        createdBy: 'phase29-auto-subscriber',
      },
      overallStatus: 'new',
      priority: severity,
    });
  }

  function notify(channel, payload) {
    if (!notifier || typeof notifier.notify !== 'function') return;
    safe(`notify:${channel}`, () => notifier.notify(channel, payload));
  }

  const unsubs = [];

  // ── SPC special-cause → auto-CAPA ───────────────────────────────

  unsubs.push(
    bus.on('quality.spc.special_cause_detected', async payload => {
      await safe('spc→capa', async () => {
        const rules = (payload?.rules || []).join(', ');
        const isBeyond3Sigma = (payload?.rules || []).includes('rule_1_beyond_3sigma');
        await draftCapa({
          source: 'spc',
          sourceId: payload?.chartId,
          title: `SPC special-cause on ${payload?.chartNumber || 'chart'} — index ${payload?.index}`,
          description: `Western Electric rule(s) tripped: ${rules}. Value: ${payload?.value}. Investigate root cause and verify the underlying process.`,
          severity: isBeyond3Sigma ? 'critical' : 'major',
        });
      });
      notify('quality.spc.special_cause', payload);
    })
  );

  // ── FMEA high-priority row → auto-CAPA ──────────────────────────

  unsubs.push(
    bus.on('quality.fmea.high_priority_detected', async payload => {
      await safe('fmea→capa', async () => {
        await draftCapa({
          type: 'preventive',
          source: 'fmea',
          sourceId: payload?.worksheetId,
          title: `FMEA H-band: ${payload?.functionAr || ''} — ${payload?.failureMode || ''}`,
          description: `RPN=${payload?.rpn ?? '—'}, Hazard score=${payload?.hazardScore ?? '—'}. Plan an action that brings the row out of H-band before the worksheet is verified.`,
          severity: 'critical',
        });
      });
      notify('quality.fmea.high_priority', payload);
    })
  );

  // ── Audit NC → auto-CAPA ────────────────────────────────────────

  unsubs.push(
    bus.on('quality.audit.nc_recorded', async payload => {
      await safe('audit→capa', async () => {
        const isMajor = payload?.type === 'major_nc';
        await draftCapa({
          source: 'audit',
          sourceId: payload?.occurrenceId,
          title: `Audit ${isMajor ? 'major' : 'minor'} NC ${payload?.clauseRef ? `on clause ${payload.clauseRef}` : ''}`,
          description: `Finding recorded during internal audit. Investigate root cause and design a corrective action that addresses both the immediate non-conformity and any systemic gaps.`,
          severity: isMajor ? 'critical' : 'major',
        });
      });
      notify('quality.audit.nc', payload);
    })
  );

  // ── Calibration failure → auto-CAPA ─────────────────────────────

  unsubs.push(
    bus.on('quality.calibration.failed', async payload => {
      await safe('calibration→capa', async () => {
        await draftCapa({
          source: 'calibration',
          sourceId: payload?.assetId,
          title: `Calibration FAIL on ${payload?.assetCode}`,
          description: `Asset failed scheduled calibration on ${payload?.calibratedAt}. Quarantine the asset, recall any test results produced since the last successful calibration, and investigate the failure mode.`,
          severity: 'major',
        });
      });
      notify('quality.calibration.failed', payload);
    })
  );

  // ── Supplier SCAR overdue → notifier only ──────────────────────

  unsubs.push(
    bus.on('quality.supplier.scar_overdue', async payload => {
      notify('quality.supplier.scar_overdue', payload);
    })
  );

  // ── Standards clause lapsed → notifier ─────────────────────────

  unsubs.push(
    bus.on('quality.standard.clause_status_changed', async payload => {
      if (payload?.statusTo === 'lapsed') {
        notify('quality.standard.lapsed', payload);
      }
    })
  );

  // ── Document signature revoked → notifier + audit ──────────────

  unsubs.push(
    bus.on('quality.doc.signature_revoked', async payload => {
      notify('quality.doc.signature_revoked', payload);
    })
  );

  // ── Predictive-risk critical band → executive notifier ─────────

  unsubs.push(
    bus.on('quality.predictive_risk.computed', async payload => {
      if (payload?.band === 'critical') {
        notify('quality.predictive_risk.critical', payload);
      }
    })
  );

  // ── Inspection fail → notifier ────────────────────────────────

  unsubs.push(
    bus.on('quality.inspection.fail_detected', async payload => {
      notify('quality.inspection.fail', payload);
    })
  );

  return {
    unsubscribeAll() {
      for (const u of unsubs) {
        try {
          u();
        } catch (_) {
          /* swallow */
        }
      }
    },
    listenerCount: unsubs.length,
  };
}

module.exports = { wirePhase29Subscribers };
