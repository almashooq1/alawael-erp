/**
 * asyncapi-events-spec.test.js — structural smoke check for the
 * AsyncAPI 3.0 event catalog at docs/api/asyncapi-events.yaml.
 *
 * Guards against the three regressions a hand-maintained event spec
 * tends to suffer:
 *   1. YAML stops parsing.
 *   2. An event name referenced in the backend isn't cataloged in the spec.
 *   3. A channel points at a message / schema that doesn't exist.
 *
 * The test also asserts the two new HTTP endpoints (/api/docs/events.yaml
 * and /api/docs/events.json) return the right content types.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const express = require('express');
const request = require('supertest');

const SPEC_PATH = path.resolve(__dirname, '..', '..', 'docs', 'api', 'asyncapi-events.yaml');

// Events the catalog promises to document. Add to this list whenever you
// document a new event; the test fails if the YAML falls behind.
const REQUIRED_CHANNELS = [
  // integration bus
  'attendance.department.sync',
  'dashboard.kpi.update',
  'finance.leave.deduction_check',
  'finance.salary.budget_impact',
  'finance.workhours.logged',
  'hr.absence.flagged',
  'medical.record.init_requested',
  'system.audit.entry',
  'system.security.alert',
  // DDD cross-domain
  'core.beneficiary.registered',
  'episodes.episode.phase_transitioned',
  'sessions.session.completed',
  'sessions.session.no_show',
  'assessments.assessment.completed',
  'goals.goal.achieved',
  'behavior.behavior.incident_recorded',
  'family.family.engagement_low',
  'ai-recommendations.ai.risk_elevated',
  'dashboards.dashboard.alert_triggered',
  'quality.quality.corrective_action_required',
  'ar-vr.arvr.safety_alert',
  // quality bus
  'quality.review.closed',
  'quality.incident.resolved',
  'compliance.finding.created',
  // HR webhook
  'hr.webhook.out',
];

describe('AsyncAPI event spec — structural checks', () => {
  let spec;

  beforeAll(() => {
    spec = YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
  });

  it('parses YAML and declares AsyncAPI 3.0', () => {
    expect(spec).toBeTruthy();
    expect(typeof spec.asyncapi).toBe('string');
    expect(spec.asyncapi.startsWith('3.0')).toBe(true);
  });

  it('declares info + servers + channels + operations + components', () => {
    expect(spec.info?.title).toBeTruthy();
    expect(Object.keys(spec.servers || {}).length).toBeGreaterThan(0);
    expect(Object.keys(spec.channels || {}).length).toBeGreaterThan(0);
    expect(Object.keys(spec.operations || {}).length).toBeGreaterThan(0);
    expect(spec.components?.messages).toBeTruthy();
    expect(spec.components?.schemas).toBeTruthy();
  });

  it('declares at least the three bus servers', () => {
    const serverNames = Object.keys(spec.servers);
    expect(serverNames).toContain('integration-bus');
    expect(serverNames).toContain('quality-bus');
    expect(serverNames).toContain('hr-webhooks');
  });

  it.each(REQUIRED_CHANNELS)('documents channel %s', name => {
    expect(spec.channels[name]).toBeTruthy();
  });

  it('every channel references messages that exist in components.messages', () => {
    for (const [channelName, channel] of Object.entries(spec.channels)) {
      for (const [msgKey, msg] of Object.entries(channel.messages || {})) {
        expect(msg.$ref).toBeTruthy();
        const m = msg.$ref.match(/#\/components\/messages\/(\w+)/);
        expect(m).toBeTruthy();
        expect(spec.components.messages[m[1]]).toBeDefined();
        expect(spec.components.messages[m[1]].payload).toBeDefined();
      }
    }
  });

  it('every message payload $ref resolves to a defined schema', () => {
    for (const [name, msg] of Object.entries(spec.components.messages)) {
      const payload = msg.payload;
      expect(payload).toBeTruthy();
      if (payload.$ref) {
        const m = payload.$ref.match(/#\/components\/schemas\/(\w+)/);
        expect(spec.components.schemas[m[1]]).toBeDefined();
      }
    }
  });

  it('every schema that uses allOf points at defined bases', () => {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      if (Array.isArray(schema.allOf)) {
        for (const part of schema.allOf) {
          if (part.$ref) {
            const m = part.$ref.match(/#\/components\/schemas\/(\w+)/);
            expect(spec.components.schemas[m[1]]).toBeDefined();
          }
        }
      }
    }
  });
});

describe('AsyncAPI spec HTTP surface', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/api/docs', require('../routes/openapi-integration.routes'));
  });

  it('GET /api/docs/events.yaml returns YAML content', async () => {
    const res = await request(app).get('/api/docs/events.yaml').expect(200);
    expect(res.headers['content-type']).toMatch(/yaml/);
    expect(res.text).toMatch(/^asyncapi:\s*3\.0/m);
    expect(res.text).toMatch(/core\.beneficiary\.registered/);
  });

  it('GET /api/docs/events.json returns JSON and parses as AsyncAPI', async () => {
    const res = await request(app).get('/api/docs/events.json').expect(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.asyncapi).toMatch(/^3\.0/);
    expect(res.body.channels['sessions.session.completed']).toBeTruthy();
  });
});
