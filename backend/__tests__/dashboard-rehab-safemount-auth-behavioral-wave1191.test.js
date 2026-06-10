/**
 * W1191 — behavioral counterpart: the three fixed routers reject anonymous
 * requests on a BARE (auth-less) mount, proving the router-level gate fires.
 *
 * Reproduces the phases.registry `safeMount` path: mount each route's DEFAULT
 * export (the exact instance safeMount `require()`s) at a prefix WITH NO injected
 * auth, then assert anonymous requests get 401. `router.use(authenticate)` runs
 * for every request entering the router (before route matching), so any path is
 * rejected — no DB/token needed (authenticate 401s on a missing Bearer token
 * before any handler).
 */

'use strict';

const express = require('express');
const request = require('supertest');

// DEFAULT exports === the instances phases.registry safeMounts with no middleware.
const rehabGoalSuggestions = require('../routes/rehab-goal-suggestions.routes');
const dashboardAlerts = require('../routes/dashboard-alerts.routes');
const dashboardsPlatform = require('../routes/dashboards-platform.routes');

function bareMount(router) {
  const app = express();
  app.use('/x', router); // deliberately auth-less, mirroring safeMount(app, '/api/<slug>', …)
  return app;
}

describe('W1191 safeMount-ed dashboard/rehab routers reject anonymous access (behavioral)', () => {
  const cases = [
    { name: 'rehab-goal-suggestions', app: bareMount(rehabGoalSuggestions), probes: [['get', '/x/goals'], ['get', '/x/interventions']] },
    { name: 'dashboard-alerts', app: bareMount(dashboardAlerts), probes: [['get', '/x/'], ['post', '/x/somekey/ack'], ['post', '/x/somekey/mute']] },
    { name: 'dashboards-platform', app: bareMount(dashboardsPlatform), probes: [['get', '/x/catalog'], ['get', '/x/anything']] },
  ];

  for (const c of cases) {
    for (const [method, url] of c.probes) {
      test(`${c.name}: ${method.toUpperCase()} ${url} → 401 without a token`, async () => {
        const res = await request(c.app)[method](url);
        expect(res.status).toBe(401);
      });
    }
  }
});
