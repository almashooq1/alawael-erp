/**
 * CCTV model barrel — Phase 27.
 *
 * Centralises all CCTV model exports so callers only import from one place.
 */
'use strict';

module.exports = {
  CctvCamera: require('./CctvCamera'),
  CctvNvr: require('./CctvNvr'),
  CctvEvent: require('./CctvEvent'),
  CctvRecording: require('./CctvRecording'),
  CctvAlert: require('./CctvAlert'),
  CctvViewAudit: require('./CctvViewAudit'),
  CctvAccessGrant: require('./CctvAccessGrant'),
  CctvFaceIdentity: require('./CctvFaceIdentity'),
  CctvAnpr: require('./CctvAnpr'),
  CctvZone: require('./CctvZone'),
  CctvStreamSession: require('./CctvStreamSession'),
  CctvHealthCheck: require('./CctvHealthCheck'),
};
