/**
 * W1495 — WhatsApp campaigns drift guard
 *
 * Static (source-shape) guards for the campaign routes + model, plus a pure
 * test of the run-outcome summariser. No DB, no boot (consistent with W1491).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const campaignService = require('../services/whatsapp/whatsappCampaign.service');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');
const MODEL_SRC = fs.readFileSync(path.join(__dirname, '../models/WhatsAppCampaign.js'), 'utf8');
const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappCampaign.service.js'),
  'utf8'
);

const ROUTES = [
  '/campaigns',
  '/campaigns/:id',
  '/campaigns/:id/run',
  '/campaigns/:id/cancel',
];

describe('W1495 campaign routes — declared + branch-scoped', () => {
  test.each(ROUTES)('declares route %s', route => {
    expect(ROUTE_SRC).toContain(`'${route}'`);
  });

  test('list/create literal routes precede /campaigns/:id (no shadowing)', () => {
    const list = ROUTE_SRC.indexOf("'/campaigns'");
    const byId = ROUTE_SRC.indexOf("'/campaigns/:id'");
    expect(list).toBeGreaterThan(-1);
    expect(byId).toBeGreaterThan(list);
  });

  test('every campaign handler is branch-scoped via effectiveBranchScope', () => {
    const start = ROUTE_SRC.indexOf("'/campaigns'");
    const end = ROUTE_SRC.indexOf("'/campaigns/:id/cancel'") + 400;
    const block = ROUTE_SRC.slice(start, end);
    // 5 handlers, each must pass effectiveBranchScope(req) into the service.
    const count = (block.match(/effectiveBranchScope\(req\)/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('routes delegate to whatsappCampaign service (no inline send loop)', () => {
    expect(ROUTE_SRC).toMatch(/require\(['"]\.\.\/services\/whatsapp\/whatsappCampaign\.service['"]\)/);
    expect(ROUTE_SRC).toMatch(/whatsappCampaign\.(createCampaign|runCampaign|listCampaigns)/);
  });
});

describe('W1495 service — reuses send primitives, no duplication', () => {
  test('run consent-filters + rate-limits + uses the approved template sender', () => {
    expect(SVC_SRC).toMatch(/partitionByEligibility/);
    expect(SVC_SRC).toMatch(/canMessage/);
    expect(SVC_SRC).toMatch(/rateLimit\.checkAndRecord/);
    expect(SVC_SRC).toMatch(/whatsappTemplates\.sendTemplate/);
  });

  test('summarizeOutcomes folds outcomes into sent/queued/failed', () => {
    const c = campaignService.summarizeOutcomes([
      'sent',
      'sent',
      'queued',
      'failed',
      'whatever-else',
    ]);
    expect(c).toEqual({ sent: 2, queued: 1, failed: 2 });
  });

  test('summarizeOutcomes is empty-safe', () => {
    expect(campaignService.summarizeOutcomes()).toEqual({ sent: 0, queued: 0, failed: 0 });
  });

  test('exposes the campaign lifecycle operations', () => {
    for (const fn of ['createCampaign', 'listCampaigns', 'getCampaign', 'cancelCampaign', 'runCampaign']) {
      expect(typeof campaignService[fn]).toBe('function');
    }
  });
});

describe('W1495 WhatsAppCampaign model — shape (static)', () => {
  test('declares the 6-state lifecycle', () => {
    for (const s of ['draft', 'scheduled', 'running', 'completed', 'cancelled', 'failed']) {
      expect(MODEL_SRC).toContain(`'${s}'`);
    }
  });

  test('branch-isolated (branchId ref Branch) + scoped filters', () => {
    expect(MODEL_SRC).toMatch(/branchId:\s*\{[^}]*ref:\s*'Branch'/);
    expect(MODEL_SRC).toMatch(/function scopedFilter/);
    expect(MODEL_SRC).toMatch(/function listFilter/);
  });

  test('contactGroupId is required + refs WhatsAppContactGroup', () => {
    expect(MODEL_SRC).toMatch(/contactGroupId:\s*\{[\s\S]*?ref:\s*'WhatsAppContactGroup'[\s\S]*?required:\s*true/);
  });

  test('run/cancel are gated by lifecycle (isRunnable / isCancellable)', () => {
    expect(MODEL_SRC).toMatch(/function isRunnable/);
    expect(MODEL_SRC).toMatch(/function isCancellable/);
  });
});
