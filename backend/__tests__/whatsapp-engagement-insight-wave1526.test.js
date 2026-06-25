'use strict';

/**
 * whatsapp-engagement-insight-wave1526.test.js — static drift guard for the
 * WhatsApp engagement-health insight (W1526). Pairs with the behavioral suite.
 */

const fs = require('fs');
const path = require('path');

const svc = require('../services/whatsapp/whatsappEngagementInsight.service');

const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappEngagementInsight.service.js'),
  'utf8'
);
const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp-insights.routes.js'), 'utf8');
const REG_SRC = fs.readFileSync(path.join(__dirname, '../routes/registries/communication.registry.js'), 'utf8');

describe('W1526 pure helpers exported + sane defaults', () => {
  test('tier ordering is monotonic by recency', () => {
    const order = ['active', 'cooling', 'silent', 'dormant'];
    const tiers = [2, 14, 40, 120].map(d => svc.engagementTier(new Date(Date.now() - d * 86400000)));
    expect(tiers).toEqual(order);
  });
  test('thresholds are exported + ascending', () => {
    const t = svc.DEFAULT_THRESHOLDS;
    expect(t.active).toBeLessThan(t.cooling);
    expect(t.cooling).toBeLessThan(t.silent);
  });
  test('emptyInsight is the safe zero shape', () => {
    const e = svc.emptyInsight({ conversations: 'unavailable' });
    expect(e.tiers).toEqual({ active: 0, cooling: 0, silent: 0, dormant: 0 });
    expect(e.outreachList).toEqual([]);
    expect(e.sources).toEqual({ conversations: 'unavailable' });
  });
});

describe('W1526 static — read-only, branch-scoped, bounded, mounted', () => {
  test('service is read-only (no writes) + bounded scan', () => {
    expect(SVC_SRC).not.toMatch(/\.(create|insertMany|updateOne|findOneAndUpdate|deleteMany|save)\(/);
    expect(SVC_SRC).toMatch(/SCAN_LIMIT/);
    expect(SVC_SRC).toMatch(/status:\s*'active'/);
  });
  test('route authenticates + scopes by branch + is mounted', () => {
    expect(ROUTE_SRC).toMatch(/router\.use\(authenticate\)/);
    expect(ROUTE_SRC).toMatch(/effectiveBranchScope\(req\)/);
    expect(REG_SRC).toMatch(/dualMount\(app, 'whatsapp-insights'/);
  });
});
