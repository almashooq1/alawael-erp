/**
 * mutationIdAdapter
 *
 * The web-therapist offline queue tags every replayed mutation with a
 * client-generated `x-client-mutation-id` header so the server can dedupe
 * a request that the client retried after coming back online.
 *
 * The platform-wide idempotency middleware (middleware/idempotency.middleware.js)
 * keys off `Idempotency-Key`. To avoid two competing dedup conventions, this
 * tiny adapter copies the client mutation id into Idempotency-Key when only
 * the former is present. Existing Idempotency-Key headers are never overwritten.
 *
 * Mount this BEFORE idempotency() on any router that serves the therapist
 * portal (or any other offline-queueing client).
 */
'use strict';

module.exports = function mutationIdAdapter(req, _res, next) {
  if (req && req.headers) {
    const existing = req.headers['idempotency-key'];
    const incoming = req.headers['x-client-mutation-id'];
    if (!existing && typeof incoming === 'string' && incoming.length >= 8) {
      req.headers['idempotency-key'] = incoming;
    }
  }
  return next();
};
