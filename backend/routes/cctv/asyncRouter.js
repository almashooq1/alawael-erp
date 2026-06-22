'use strict';

/**
 * W1445 — async-safe Express router for the CCTV surface.
 *
 * The CCTV routers are mounted via `routes/registries/cctv.registry.js` `safeMount`
 * (a plain `app.use`, with NO async-error adapter), and the app runs on Express 4
 * (no built-in promise handling; `express-async-errors` is not installed). So a CCTV
 * handler that does a bare `await` which rejects — e.g. `GET /:id` →
 * `cameraService.getById(req.params.id)` → `CctvCamera.findById('not-an-objectid')`
 * → Mongoose CastError — produced an UNHANDLED rejection that never reached the
 * error middleware. The request then hung until `server.timeout` (120s) destroyed
 * the socket, leaking a pending handler per bad request.
 *
 * `asyncRouter(router)` patches the router's verb methods so every handler's
 * rejection is forwarded to `next(err)` (handled by the global / built-in Express
 * error handler → a real response instead of a hang). Mirrors the monkey-patch in
 * `routes/montessori.js`. Sync handlers are unaffected; `router.use` middleware and
 * 4-arg error handlers are left untouched.
 *
 * Usage (one line per CCTV route file):
 *   const router = require('./asyncRouter')(express.Router());
 */

const HANDLER_VERBS = ['get', 'post', 'put', 'patch', 'delete'];

function wrap(fn) {
  if (typeof fn !== 'function') return fn;
  // Preserve Express error-handling middleware signature (err, req, res, next).
  if (fn.length === 4) return fn;
  return function asyncSafeHandler(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function asyncRouter(router) {
  for (const verb of HANDLER_VERBS) {
    if (typeof router[verb] !== 'function') continue;
    const original = router[verb].bind(router);
    router[verb] = (...args) => original(...args.map(wrap));
  }
  return router;
}

module.exports = asyncRouter;
