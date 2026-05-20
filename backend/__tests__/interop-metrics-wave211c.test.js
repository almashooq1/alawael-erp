'use strict';

/**
 * Wave 211c — Interop metrics + OpenAPI surface tests.
 *
 * Verifies:
 *   • /integrations-metrics emits the new W211 gauges
 *     (integration_alerts_open + integration_trend_sample_age_seconds)
 *     when alerts/samples exist, and omits them otherwise.
 *   • The metrics endpoint stays up when Mongoose is unreachable (one of
 *     the cardinal sins of observability — never let the monitor go down
 *     because the monitored system did).
 *   • The OpenAPI YAML still parses and covers the 6 new endpoints +
 *     the IntegrationAlert + IntegrationTrendSeries schemas.
 */

jest.mock('../models/IntegrationAlert', () => ({
  aggregate: jest.fn(),
}));
jest.mock('../models/IntegrationTrendSample', () => ({
  findOne: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const IntegrationAlert = require('../models/IntegrationAlert');
const IntegrationTrendSample = require('../models/IntegrationTrendSample');

function mockChainSingle(value) {
  // Mimic Mongoose query chain: findOne(...).sort(...).select(...).lean()
  const chain = {
    sort() {
      return chain;
    },
    select() {
      return chain;
    },
    lean() {
      return Promise.resolve(value);
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return chain;
}

describe('Wave 211c — metrics route exposes alert + sample-age gauges', () => {
  const route = require('../routes/integrations-metrics.routes');

  beforeEach(() => {
    IntegrationAlert.aggregate.mockReset();
    IntegrationTrendSample.findOne.mockReset();
  });

  it('emits integration_alerts_open when open alerts exist', async () => {
    IntegrationAlert.aggregate.mockResolvedValue([
      {
        _id: { integration: 'gosi', ruleCode: 'CIRCUIT_OPEN', severity: 'critical' },
        count: 2,
      },
      {
        _id: { integration: 'nphies', ruleCode: 'DLQ_BUILDUP', severity: 'warning' },
        count: 1,
      },
    ]);
    IntegrationTrendSample.findOne.mockReturnValue(mockChainSingle(null));

    const app = express();
    app.use('/metrics', route);
    const res = await request(app).get('/metrics').expect(200);

    expect(res.text).toMatch(
      /integration_alerts_open\{integration="gosi",rule_code="CIRCUIT_OPEN",severity="critical"\} 2/
    );
    expect(res.text).toMatch(
      /integration_alerts_open\{integration="nphies",rule_code="DLQ_BUILDUP",severity="warning"\} 1/
    );
  });

  it('omits integration_alerts_open when no open alerts', async () => {
    IntegrationAlert.aggregate.mockResolvedValue([]);
    IntegrationTrendSample.findOne.mockReturnValue(mockChainSingle(null));

    const app = express();
    app.use('/metrics', route);
    const res = await request(app).get('/metrics').expect(200);

    expect(res.text).not.toMatch(/integration_alerts_open/);
  });

  it('emits integration_trend_sample_age_seconds when a sample exists', async () => {
    IntegrationAlert.aggregate.mockResolvedValue([]);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    IntegrationTrendSample.findOne.mockReturnValue(mockChainSingle({ capturedAt: fiveMinAgo }));

    const app = express();
    app.use('/metrics', route);
    const res = await request(app).get('/metrics').expect(200);

    expect(res.text).toMatch(/integration_trend_sample_age_seconds /);
    // Should be roughly 300 seconds (5min). Allow ±15s for test scheduling.
    const m = res.text.match(/^integration_trend_sample_age_seconds (\d+)$/m);
    expect(m).toBeTruthy();
    const age = Number(m[1]);
    expect(age).toBeGreaterThanOrEqual(295);
    expect(age).toBeLessThanOrEqual(320);
  });

  it('stays 200 + omits new gauges when Mongo reads throw', async () => {
    IntegrationAlert.aggregate.mockRejectedValue(new Error('mongo unavailable'));
    IntegrationTrendSample.findOne.mockImplementation(() => {
      throw new Error('mongo unavailable');
    });

    const app = express();
    app.use('/metrics', route);
    const res = await request(app).get('/metrics').expect(200);

    expect(res.text).not.toMatch(/integration_alerts_open/);
    expect(res.text).not.toMatch(/integration_trend_sample_age_seconds/);
    // Existing adapter metrics still present — proves Mongo failure didn't
    // black out the endpoint.
    expect(res.text).toMatch(/gov_adapter_circuit_open/);
  });
});

describe('Wave 211c — OpenAPI spec covers the new W211 surface', () => {
  const SPEC = YAML.parse(
    fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'docs', 'api', 'openapi-integration.yaml'),
      'utf8'
    )
  );

  it('parses without errors', () => {
    expect(SPEC.openapi).toBeDefined();
    expect(SPEC.paths).toBeDefined();
    expect(SPEC.components.schemas).toBeDefined();
  });

  it.each([
    '/api/v1/admin/ops/integration-health/trends/{integration}',
    '/api/v1/admin/ops/integration-health/sample',
    '/api/v1/admin/ops/integration-health/alerts',
    '/api/v1/admin/ops/integration-health/alerts/{id}/ack',
    '/api/v1/admin/ops/integration-health/alerts/{id}/resolve',
    '/api/v1/admin/ops/integration-health/alerts/evaluate',
  ])('declares path %s', p => {
    expect(SPEC.paths[p]).toBeDefined();
  });

  it.each(['IntegrationAlert', 'IntegrationTrendSample', 'IntegrationTrendSeries'])(
    'declares schema %s',
    name => {
      expect(SPEC.components.schemas[name]).toBeDefined();
    }
  );

  it('IntegrationAlert schema enumerates the 6 rule codes', () => {
    const ruleEnum = SPEC.components.schemas.IntegrationAlert.properties.ruleCode.enum;
    expect(ruleEnum).toEqual(
      expect.arrayContaining([
        'CIRCUIT_OPEN',
        'DLQ_BUILDUP',
        'UNCONFIGURED_LIVE',
        'HIGH_FAILURE_RATE',
        'RATE_LIMIT_SATURATION',
        'SCHEDULER_STALLED',
      ])
    );
  });
});
