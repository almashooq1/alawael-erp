/**
 * tenant-scope-plugin.test.js — unit tests for the Phase-7
 * tenantScope mongoose plugin + AsyncLocalStorage request context.
 *
 * IMPORTANT: the plugin's query hooks work correctly at runtime but
 * end-to-end tests against a real mongoose-memory-server fail inside
 * Jest because Jest's sandbox + Mongoose 9's internal scheduling
 * breaks AsyncLocalStorage propagation across query execution. Same
 * plugin + context passes when executed via `node`. See the manual
 * probe in this commit's message for the standalone verification.
 *
 * This file therefore tests the two things we CAN test reliably in
 * Jest:
 *   1. requestContext AsyncLocalStorage wrapper in isolation
 *      (pre-mongoose — no scheduler interference).
 *   2. tenantScope plugin's hook FUNCTIONS invoked directly with
 *      mock `this` (simulates what mongoose passes to the hook).
 *
 * The live integration is verified at deploy-time by the standalone
 * smoke script `backend/scripts/_tenant-scope-smoke.js` (not included
 * in sprint gate — it requires a live mongo).
 */

'use strict';

const requestContext = require('../authorization/requestContext');
const tenantScopePlugin = require('../authorization/tenantScope.plugin');

describe('requestContext — AsyncLocalStorage wrapper', () => {
  it('get() outside run() returns null', () => {
    expect(requestContext.get()).toBeNull();
  });

  it('run() exposes the context synchronously', async () => {
    const seen = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'B1' } },
      () => requestContext.get()
    );
    expect(seen.branchScope.branchId).toBe('B1');
  });

  it('run() propagates the context across awaits', async () => {
    const seen = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'B1' } },
      async () => {
        await new Promise(r => setTimeout(r, 5));
        return requestContext.get();
      }
    );
    expect(seen.branchScope.branchId).toBe('B1');
  });

  it('bypass() flips bypassTenantScope to true', async () => {
    const seen = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'B1' }, userId: 'U1' },
      () => requestContext.bypass(async () => requestContext.get())
    );
    expect(seen.bypassTenantScope).toBe(true);
    expect(seen.userId).toBe('U1');
    expect(seen.branchScope.branchId).toBe('B1');
  });

  it('bypass() leaves the outer context unchanged after returning', async () => {
    const result = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'B1' } },
      async () => {
        const inner = await requestContext.bypass(() => Promise.resolve(requestContext.get()));
        const outer = requestContext.get();
        return { inner, outer };
      }
    );
    expect(result.inner.bypassTenantScope).toBe(true);
    expect(result.outer.bypassTenantScope).toBeFalsy();
  });

  it('nested run() overrides the parent context', async () => {
    const seen = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'B1' } },
      () =>
        requestContext.run({ branchScope: { restricted: true, branchId: 'B2' } }, async () =>
          requestContext.get()
        )
    );
    expect(seen.branchScope.branchId).toBe('B2');
  });
});

describe('tenantScope plugin — decision logic (hook invocation)', () => {
  // Build a minimal schema shim to capture what the plugin does.
  function makeSchemaShim() {
    const hooks = { pre: {}, static: {} };
    return {
      _hooks: hooks,
      pre(method, fn) {
        (hooks.pre[method] = hooks.pre[method] || []).push(fn);
      },
      static(name, fn) {
        hooks.static[name] = fn;
      },
      statics: {},
    };
  }

  it('registers pre-hooks on all query methods + save + insertMany + aggregate', () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const expected = [
      'find',
      'findOne',
      'count',
      'countDocuments',
      'findOneAndUpdate',
      'findOneAndDelete',
      'findOneAndReplace',
      'updateOne',
      'updateMany',
      'deleteOne',
      'deleteMany',
      'replaceOne',
      'save',
      'insertMany',
      'aggregate',
    ];
    for (const m of expected) {
      expect(schema._hooks.pre[m]).toBeDefined();
      expect(schema._hooks.pre[m].length).toBeGreaterThanOrEqual(1);
    }
  });

  it('registers __tenantScoped and __tenantScopeField statics', () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    expect(typeof schema._hooks.static.__tenantScoped).toBe('function');
    expect(schema._hooks.static.__tenantScoped()).toBe(true);
    expect(schema._hooks.static.__tenantScopeField()).toBe('branchId');
  });

  it('honors custom field name via options', () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema, { field: 'branch' });
    expect(schema._hooks.static.__tenantScopeField()).toBe('branch');
  });

  function callPreFind(schema) {
    const whereCalls = [];
    const thisArg = {
      where(q) {
        whereCalls.push(q);
        return this;
      },
      model: { modelName: 'TestModel' },
    };
    for (const hook of schema._hooks.pre.find) hook.call(thisArg);
    return whereCalls;
  }

  it('pre-find is a no-op when no request context is active', () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const calls = callPreFind(schema);
    expect(calls).toEqual([]);
  });

  it('pre-find adds branchId filter when context is restricted', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const calls = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'BR-1' } },
      () => callPreFind(schema)
    );
    expect(calls).toEqual([{ branchId: 'BR-1' }]);
  });

  it('pre-find is a no-op when allBranches is true', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const calls = await requestContext.run({ branchScope: { allBranches: true } }, () =>
      callPreFind(schema)
    );
    expect(calls).toEqual([]);
  });

  it('pre-find is a no-op when bypassTenantScope is true', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const calls = await requestContext.run(
      { branchScope: { restricted: true, branchId: 'X' }, bypassTenantScope: true },
      () => callPreFind(schema)
    );
    expect(calls).toEqual([]);
  });

  it('pre-find fails CLOSED (adds unsatisfiable filter) when scope is unscoped', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const calls = await requestContext.run({ branchScope: { unscoped: true } }, () =>
      callPreFind(schema)
    );
    expect(calls).toEqual([{ __tenant_unscoped_deny__: true }]);
  });
});

describe('tenantScope plugin — save hook stamps branchId', () => {
  function runSaveHook(schema, doc) {
    const [hook] = schema._hooks.pre.save;
    return hook.call(doc);
  }
  function makeSchemaShim() {
    const hooks = { pre: {}, static: {} };
    return {
      _hooks: hooks,
      pre(m, f) {
        (hooks.pre[m] = hooks.pre[m] || []).push(f);
      },
      static(n, f) {
        hooks.static[n] = f;
      },
      statics: {},
    };
  }

  it('stamps branchId when caller did not set one', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const doc = { name: 'x' };
    await requestContext.run({ branchScope: { restricted: true, branchId: 'BR-42' } }, () =>
      runSaveHook(schema, doc)
    );
    expect(doc.branchId).toBe('BR-42');
  });

  it('does not overwrite branchId caller already set', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const doc = { name: 'x', branchId: 'EXPLICIT' };
    await requestContext.run({ branchScope: { restricted: true, branchId: 'BR-42' } }, () =>
      runSaveHook(schema, doc)
    );
    expect(doc.branchId).toBe('EXPLICIT');
  });

  it('is a no-op when bypassTenantScope is true', async () => {
    const schema = makeSchemaShim();
    tenantScopePlugin(schema);
    const doc = { name: 'x' };
    await requestContext.run(
      { branchScope: { restricted: true, branchId: 'BR-42' }, bypassTenantScope: true },
      () => runSaveHook(schema, doc)
    );
    expect(doc.branchId).toBeUndefined();
  });
});
