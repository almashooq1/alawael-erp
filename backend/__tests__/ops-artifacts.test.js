/**
 * ops-artifacts.test.js — syntax + structural validation for the
 * Grafana dashboard JSON and Alertmanager rule YAML shipped in
 * docs/dashboards and docs/alerts.
 *
 * Purpose: catch drift-breakers at PR time. Someone editing the
 * dashboard in Grafana UI and copy-pasting a broken export, or an
 * alert rule with a typo in PromQL structure, would otherwise ship
 * silently and only surface when Grafana/Prometheus reloads.
 *
 * Checks are structural (not semantic PromQL validation — that
 * requires a Prometheus runtime). But structural is enough to catch
 * the 95% of "I pasted bad JSON" failures.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GRAFANA_JSON = path.join(REPO_ROOT, 'docs/dashboards/gov-integrations.grafana.json');
const ALERTS_YAML = path.join(REPO_ROOT, 'docs/alerts/gov-integrations.yml');

describe('Grafana dashboard JSON', () => {
  let dashboard;
  beforeAll(() => {
    const raw = fs.readFileSync(GRAFANA_JSON, 'utf8');
    dashboard = JSON.parse(raw);
  });

  it('parses as valid JSON', () => {
    expect(dashboard).toBeTruthy();
    expect(dashboard.uid).toBe('alawael-gov-integrations');
  });

  it('has a provider template variable', () => {
    const v = (dashboard.templating?.list || []).find(x => x.name === 'provider');
    expect(v).toBeTruthy();
    expect(v.query).toMatch(/label_values/);
  });

  it('every panel has id, type, title, and at least one target', () => {
    expect(Array.isArray(dashboard.panels)).toBe(true);
    expect(dashboard.panels.length).toBeGreaterThan(0);
    for (const p of dashboard.panels) {
      expect(p.id).toEqual(expect.any(Number));
      expect(p.type).toEqual(expect.any(String));
      expect(p.title).toEqual(expect.any(String));
      expect(Array.isArray(p.targets)).toBe(true);
      expect(p.targets.length).toBeGreaterThanOrEqual(1);
      for (const t of p.targets) {
        expect(typeof t.expr).toBe('string');
        expect(t.expr.length).toBeGreaterThan(0);
      }
    }
  });

  it('panel IDs are unique', () => {
    const ids = dashboard.panels.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('references metric families that exist in integrations-metrics.routes.js', () => {
    const metricsSource = fs.readFileSync(
      path.join(__dirname, '..', 'routes/integrations-metrics.routes.js'),
      'utf8'
    );
    const used = new Set();
    for (const p of dashboard.panels) {
      for (const t of p.targets) {
        const m = t.expr.match(/gov_adapter_\w+/g) || [];
        m.forEach(x => used.add(x.replace(/_(bucket|sum|count)$/, '')));
      }
    }
    for (const metric of used) {
      // Each referenced family must appear in the metrics endpoint source.
      expect(metricsSource).toMatch(metric);
    }
  });
});

describe('Alertmanager rules YAML', () => {
  let doc;
  beforeAll(() => {
    const raw = fs.readFileSync(ALERTS_YAML, 'utf8');
    doc = yaml.load(raw);
  });

  it('parses as valid YAML with groups[]', () => {
    expect(Array.isArray(doc.groups)).toBe(true);
    expect(doc.groups.length).toBeGreaterThan(0);
  });

  it('every rule has name/expr/labels.severity/annotations', () => {
    for (const group of doc.groups) {
      expect(typeof group.name).toBe('string');
      for (const rule of group.rules || []) {
        expect(typeof rule.alert).toBe('string');
        expect(typeof rule.expr).toBe('string');
        expect(rule.expr.length).toBeGreaterThan(0);
        expect(rule.labels?.severity).toMatch(/^(critical|warning|info)$/);
        expect(rule.annotations?.summary).toBeTruthy();
        expect(rule.annotations?.description).toBeTruthy();
      }
    }
  });

  it('critical/warning alerts point at a runbook_url that exists on disk', () => {
    for (const group of doc.groups) {
      for (const rule of group.rules || []) {
        if (
          ['critical', 'warning'].includes(rule.labels?.severity) &&
          rule.annotations?.runbook_url
        ) {
          const url = rule.annotations.runbook_url;
          // Accept either a local path reference or a fixed internal URL.
          // For the internal URL pattern, map it to disk via docs/runbooks/<name>.md
          const m = url.match(/runbooks\/([a-z0-9-]+\.md)/);
          if (m) {
            const file = path.join(REPO_ROOT, 'docs/runbooks', m[1]);
            expect(fs.existsSync(file)).toBe(true);
          }
        }
      }
    }
  });

  it('referenced metrics all appear in integrations-metrics.routes.js', () => {
    const metricsSource = fs.readFileSync(
      path.join(__dirname, '..', 'routes/integrations-metrics.routes.js'),
      'utf8'
    );
    const used = new Set();
    for (const group of doc.groups) {
      for (const rule of group.rules || []) {
        const m = rule.expr.match(/gov_adapter_\w+/g) || [];
        m.forEach(x => used.add(x.replace(/_(bucket|sum|count)$/, '')));
      }
    }
    for (const metric of used) {
      expect(metricsSource).toMatch(metric);
    }
  });
});
