/**
 * Blockchain Metrics — عدّادات بلوكتشين للـ Prometheus
 *
 * Process-local monotonic counters surfaced via /integrations-metrics in the
 * existing Prometheus text format. Same shape as deadLetterQueue.snapshotCounters
 * (rows of {labels, value}) so the same scrape endpoint can pick them up.
 *
 * Names emitted:
 *   blockchain_certificates_total      labels: outcome ∈ {created, deduped, issued, revoked, signed}
 *   blockchain_anchors_total           labels: network, outcome ∈ {success, fail}
 *   blockchain_verifications_total     labels: result, hash_match ∈ {true|false}
 *   blockchain_auto_issue_total        labels: source, outcome ∈ {issued, deduped, error}
 *
 * Each fn is best-effort and never throws — counters must not affect business
 * logic on failure.
 */

'use strict';

const counters = new Map();

function _bump(name, labels) {
  try {
    const labelKey = Object.entries(labels || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join('|');
    const key = `${name}#${labelKey}`;
    counters.set(key, (counters.get(key) || 0) + 1);
  } catch {
    /* counters are observability — never break the caller */
  }
}

function bumpCertificate(outcome) {
  _bump('blockchain_certificates_total', { outcome });
}
function bumpAnchor(network, outcome) {
  _bump('blockchain_anchors_total', { network, outcome });
}
function bumpVerification(result, hashMatch) {
  _bump('blockchain_verifications_total', { result, hash_match: hashMatch === true });
}
function bumpAutoIssue(source, outcome) {
  _bump('blockchain_auto_issue_total', { source, outcome });
}

function snapshot() {
  const rows = [];
  for (const [key, value] of counters) {
    const [name, labelKey] = key.split('#');
    const labels = {};
    if (labelKey) {
      for (const part of labelKey.split('|')) {
        const idx = part.indexOf('=');
        if (idx > 0) labels[part.slice(0, idx)] = part.slice(idx + 1);
      }
    }
    rows.push({ name, labels, value });
  }
  return rows;
}

function _resetForTests() {
  counters.clear();
}

module.exports = {
  bumpCertificate,
  bumpAnchor,
  bumpVerification,
  bumpAutoIssue,
  snapshot,
  _resetForTests,
};
