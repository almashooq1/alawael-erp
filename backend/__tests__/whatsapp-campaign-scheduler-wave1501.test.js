/**
 * W1501 — WhatsApp campaign scheduler drift guard
 *
 * Static (source-shape) guards for the env-gated campaign sweeper + the
 * runDueCampaigns service method + the manual run-due route. No DB, no boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const campaignService = require('../services/whatsapp/whatsappCampaign.service');

const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappCampaign.service.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');
const BOOT_SRC = fs.readFileSync(
  path.join(__dirname, '../startup/whatsappCampaignBootstrap.js'),
  'utf8'
);
const APP_SRC = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

describe('W1501 runDueCampaigns service method', () => {
  test('is exported as a function', () => {
    expect(typeof campaignService.runDueCampaigns).toBe('function');
  });

  test('selects only due scheduled campaigns and launches via runCampaign', () => {
    const idx = SVC_SRC.indexOf('async function runDueCampaigns');
    expect(idx).toBeGreaterThan(-1);
    const slice = SVC_SRC.slice(idx, idx + 1400);
    expect(slice).toMatch(/status:\s*'scheduled'/);
    expect(slice).toMatch(/scheduledAt:\s*\{\s*\$lte/);
    expect(slice).toMatch(/isDeleted:\s*false/);
    expect(slice).toMatch(/runCampaign\(/);
    // per-campaign failures are isolated, not fatal
    expect(slice).toMatch(/failed\s*\+=\s*1/);
    // optional branch scope filter (cron = null → all branches)
    expect(slice).toMatch(/if\s*\(branchScope\)\s*filter\.branchId\s*=\s*branchScope/);
  });
});

describe('W1501 POST /campaigns/run-due route', () => {
  test('is declared + branch-scoped + delegates to runDueCampaigns', () => {
    expect(ROUTE_SRC).toContain("'/campaigns/run-due'");
    const idx = ROUTE_SRC.indexOf("'/campaigns/run-due'");
    const slice = ROUTE_SRC.slice(idx, idx + 400);
    expect(slice).toMatch(/effectiveBranchScope\(req\)/);
    expect(slice).toMatch(/whatsappCampaign\.runDueCampaigns/);
  });

  test('run-due literal is declared BEFORE /campaigns/:id (no route-shadowing)', () => {
    const runDue = ROUTE_SRC.indexOf("'/campaigns/run-due'");
    const byId = ROUTE_SRC.indexOf("'/campaigns/:id'");
    expect(runDue).toBeGreaterThan(-1);
    expect(byId).toBeGreaterThan(runDue);
  });
});

describe('W1501 bootstrap is env-gated + safe', () => {
  test('default-OFF: returns null unless ENABLE_WHATSAPP_CAMPAIGN_SCHEDULER=true', () => {
    expect(BOOT_SRC).toMatch(/process\.env\.ENABLE_WHATSAPP_CAMPAIGN_SCHEDULER\s*!==\s*'true'/);
    expect(BOOT_SRC).toMatch(/isTestEnv/);
  });

  test('runtime-safe: DB-readiness guard + try/catch + unref + calls runDueCampaigns', () => {
    expect(BOOT_SRC).toMatch(/readyState\s*!==\s*1/);
    expect(BOOT_SRC).toMatch(/handle\.unref/);
    expect(BOOT_SRC).toMatch(/runDueCampaigns/);
    expect(BOOT_SRC).toMatch(/catch\s*\(err\)/);
  });

  test('app.js wires the bootstrap', () => {
    expect(APP_SRC).toMatch(/bootstrapWhatsappCampaign/);
    expect(APP_SRC).toMatch(/require\(['"]\.\/startup\/whatsappCampaignBootstrap['"]\)/);
  });
});
