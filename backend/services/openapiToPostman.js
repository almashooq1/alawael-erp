/**
 * openapiToPostman — converts the hand-crafted OpenAPI 3.1 spec into a
 * Postman Collection v2.1.0 JSON that partners can import directly.
 *
 * Scope: just enough of the v2.1 schema to make every endpoint importable
 * with auth + request body + an example header. We intentionally don't
 * cover parameters serialization edge cases (style / explode / deepObject)
 * because our spec doesn't use them.
 *
 * Produces:
 *   - Folders per OpenAPI tag
 *   - One request per (path, method)
 *   - Bearer auth at collection level, overridable per-request
 *   - Request body from schema example or first type-default
 *   - Required headers (Idempotency-Key, Content-Type) filled in
 *   - {{baseUrl}} variable pre-populated from the first server entry
 *
 * Postman v2.1 spec: https://schema.postman.com/collection/json/v2.1.0/collection.json
 */

'use strict';

function _exampleFor(schema, components) {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.example !== undefined) return schema.example;

  if (schema.$ref) {
    const m = schema.$ref.match(/^#\/components\/schemas\/(\w+)$/);
    if (m && components?.schemas?.[m[1]]) {
      return _exampleFor(components.schemas[m[1]], components);
    }
    return null;
  }

  if (schema.enum && schema.enum.length) return schema.enum[0];

  if (schema.type === 'object' || schema.properties) {
    const out = {};
    for (const [k, sub] of Object.entries(schema.properties || {})) {
      out[k] = _exampleFor(sub, components);
    }
    return out;
  }
  if (schema.type === 'array') {
    const item = _exampleFor(schema.items || {}, components);
    return item === null ? [] : [item];
  }
  if (schema.type === 'string') {
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'date') return new Date().toISOString().slice(0, 10);
    if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
    return '';
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;

  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce((acc, part) => {
      const partExample = _exampleFor(part, components);
      if (partExample && typeof partExample === 'object' && !Array.isArray(partExample)) {
        return { ...acc, ...partExample };
      }
      return acc;
    }, {});
  }

  return null;
}

function _resolveParameter(param, components) {
  if (!param) return null;
  if (param.$ref) {
    const m = param.$ref.match(/^#\/components\/parameters\/(\w+)$/);
    if (m) return components?.parameters?.[m[1]] || null;
  }
  return param;
}

function _pathToUrl(baseVar, rawPath) {
  // Convert {param} → :param for Postman, on both the raw string and the
  // path array so downstream consumers are consistent.
  const normalized = rawPath.replace(/\{(\w+)\}/g, ':$1');
  const segments = normalized.replace(/^\//, '').split('/');
  return {
    raw: `{{${baseVar}}}${normalized}`,
    host: [`{{${baseVar}}}`],
    path: segments,
  };
}

function _buildRequest(method, op, pathKey, components) {
  const headerParams = [];
  const queryParams = [];
  const pathVariables = [];

  for (const rawParam of op.parameters || []) {
    const param = _resolveParameter(rawParam, components);
    if (!param) continue;
    const entry = {
      key: param.name,
      value: param.example ?? param.schema?.example ?? '',
      description: param.description || undefined,
    };
    if (param.in === 'header') headerParams.push(entry);
    else if (param.in === 'query') queryParams.push({ ...entry, disabled: !param.required });
    else if (param.in === 'path') pathVariables.push({ key: param.name, value: entry.value || '' });
  }

  const headers = [{ key: 'Content-Type', value: 'application/json' }, ...headerParams];

  let body = undefined;
  const bodySchema = op.requestBody?.content?.['application/json']?.schema;
  if (bodySchema) {
    const example = _exampleFor(bodySchema, components);
    body = {
      mode: 'raw',
      raw: example == null ? '{}' : JSON.stringify(example, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  const url = _pathToUrl('baseUrl', pathKey);
  if (queryParams.length) url.query = queryParams;
  if (pathVariables.length) url.variable = pathVariables;

  return {
    name: op.summary || `${method.toUpperCase()} ${pathKey}`,
    request: {
      method: method.toUpperCase(),
      header: headers,
      ...(body ? { body } : {}),
      url,
      description: op.description || undefined,
    },
  };
}

function convert(spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error('openapiToPostman.convert: invalid spec');
  }
  const components = spec.components || {};
  const baseUrl = spec.servers?.[0]?.url || 'http://localhost:3001';

  const tagFolders = new Map();
  function folder(tag) {
    if (!tagFolders.has(tag)) {
      tagFolders.set(tag, { name: tag, item: [] });
    }
    return tagFolders.get(tag);
  }

  for (const [pathKey, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (typeof op !== 'object' || !op.responses) continue; // skip parameters/summary keys
      const tag = (op.tags && op.tags[0]) || 'Default';
      const req = _buildRequest(method, op, pathKey, components);
      folder(tag).item.push(req);
    }
  }

  return {
    info: {
      name: spec.info?.title || 'API',
      _postman_id: `alawael-${Date.now()}`,
      description: spec.info?.description || spec.info?.summary || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      { key: 'baseUrl', value: baseUrl.replace(/\/$/, ''), type: 'string' },
      {
        key: 'bearerToken',
        value: '',
        type: 'string',
        description: 'JWT issued by /api/v1/auth/login',
      },
    ],
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{bearerToken}}', type: 'string' }],
    },
    item: Array.from(tagFolders.values()),
  };
}

module.exports = { convert };
