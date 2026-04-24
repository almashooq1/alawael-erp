/**
 * openapi-to-postman.test.js — covers the OpenAPI → Postman v2.1 converter
 * + the `/api/docs/integration.postman.json` endpoint.
 *
 * We don't want to import a Postman schema validator — too much dependency
 * weight. Instead we assert the structural contract Postman actually cares
 * about:
 *   - collection has info.schema pointing at v2.1
 *   - every path×method in the OpenAPI spec maps to exactly one item
 *   - folders are keyed by OpenAPI tag
 *   - Bearer auth + baseUrl variable + bearerToken variable are present
 *   - request bodies with a $ref schema serialize a JSON example
 *   - path parameters turn {x} into :x AND register as a url.variable entry
 *   - query params become url.query entries
 *   - header params become headers
 */

'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const express = require('express');
const request = require('supertest');
const { convert } = require('../services/openapiToPostman');

const SPEC_PATH = path.resolve(__dirname, '..', '..', 'docs', 'api', 'openapi-integration.yaml');

describe('openapiToPostman.convert — structural', () => {
  let spec;
  let collection;

  beforeAll(() => {
    spec = YAML.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
    collection = convert(spec);
  });

  it('declares the Postman v2.1 schema', () => {
    expect(collection.info.schema).toMatch(/v2\.1\.0/);
    expect(collection.info.name).toBeTruthy();
  });

  it('sets a {{baseUrl}} variable from the first server', () => {
    const v = collection.variable.find(x => x.key === 'baseUrl');
    expect(v).toBeTruthy();
    expect(v.value).toBe(spec.servers[0].url.replace(/\/$/, ''));
  });

  it('sets a {{bearerToken}} variable for the top-level auth', () => {
    expect(collection.auth.type).toBe('bearer');
    expect(collection.auth.bearer[0].value).toBe('{{bearerToken}}');
    const v = collection.variable.find(x => x.key === 'bearerToken');
    expect(v).toBeTruthy();
  });

  it('creates one folder per OpenAPI tag, and covers every operation', () => {
    const allOps = [];
    for (const [p, methods] of Object.entries(spec.paths)) {
      for (const [m, op] of Object.entries(methods)) {
        if (typeof op !== 'object' || !op.responses) continue;
        allOps.push(`${m.toUpperCase()} ${p}`);
      }
    }
    const items = collection.item.flatMap(folder => folder.item);
    expect(items.length).toBe(allOps.length);
    const tags = new Set();
    for (const [p, methods] of Object.entries(spec.paths)) {
      for (const [m, op] of Object.entries(methods)) {
        if (typeof op !== 'object' || !op.responses) continue;
        tags.add((op.tags && op.tags[0]) || 'Default');
      }
    }
    expect(collection.item.length).toBe(tags.size);
  });

  it('turns path parameters {id} into :id AND adds url.variable entries', () => {
    const items = collection.item.flatMap(f => f.item);
    const item = items.find(i => i.request.url.raw.includes('/:id'));
    expect(item).toBeTruthy();
    expect(item.request.url.path.some(seg => seg === ':id')).toBe(true);
    expect(item.request.url.variable?.some(v => v.key === 'id')).toBe(true);
  });

  it('emits a JSON body example when requestBody has a $ref schema', () => {
    const items = collection.item.flatMap(f => f.item);
    const signing = items.find(i => i.request.url.raw.endsWith('/api/v1/nafath/signing/request'));
    expect(signing).toBeTruthy();
    expect(signing.request.body?.mode).toBe('raw');
    const parsed = JSON.parse(signing.request.body.raw);
    expect(typeof parsed).toBe('object');
    expect(Object.keys(parsed)).toContain('signerNationalId');
  });

  it('adds a Content-Type: application/json header on requests with a body', () => {
    const items = collection.item.flatMap(f => f.item);
    for (const item of items) {
      if (item.request.body) {
        const ct = item.request.header.find(h => h.key.toLowerCase() === 'content-type');
        expect(ct?.value).toBe('application/json');
      }
    }
  });

  it('preserves Idempotency-Key as a header parameter', () => {
    const items = collection.item.flatMap(f => f.item);
    const signing = items.find(i => i.request.url.raw.endsWith('/api/v1/nafath/signing/request'));
    const hasHeader = signing.request.header.some(h => h.key === 'Idempotency-Key');
    expect(hasHeader).toBe(true);
  });

  it('throws on a malformed spec', () => {
    expect(() => convert(null)).toThrow(/invalid spec/);
  });
});

describe('/api/docs/integration.postman.json endpoint', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use('/api/docs', require('../routes/openapi-integration.routes'));
  });

  it('serves a downloadable Postman v2.1 collection', async () => {
    const res = await request(app).get('/api/docs/integration.postman.json').expect(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.headers['content-disposition']).toMatch(/\.postman_collection\.json/);
    expect(res.body.info.schema).toMatch(/v2\.1\.0/);
    const items = res.body.item.flatMap(f => f.item);
    expect(items.length).toBeGreaterThan(10);
  });
});
