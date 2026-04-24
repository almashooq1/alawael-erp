'use strict';

/**
 * purchaseRequest.registry.js — Phase 16 Commit 4 (4.0.69).
 *
 * Canonical vocabulary + approval-chain policy for the PR→PO
 * workflow. Pure data, validated at boot.
 *
 * Context — the old PurchaseRequest model was archived during
 * the broken-requires sweep (2026-04-17) because it had no
 * service / route around it. This restores PR as a first-class
 * ops subject with:
 *
 *   • a clean canonical state machine (draft → submitted →
 *     under_review → approved → converted_to_po, with returned /
 *     rejected / cancelled escapes)
 *
 *   • approval tiers driven by estimated value — small requests
 *     take one signature, large ones take four. The thresholds
 *     are policy, not code, so Finance can tune them without a
 *     schema migration.
 *
 *   • SLA wiring to the `procurement.pr.approval` and
 *     `procurement.po.issuance` policies already shipped in C1.
 */

// ── canonical statuses ──────────────────────────────────────────────

const PR_STATUSES = Object.freeze([
  'draft',
  'submitted',
  'under_review', // at least one approval recorded, more pending
  'approved', // every required approval recorded
  'returned_for_clarification', // pause state (matches SLA pauseOnStates)
  'rejected',
  'converted_to_po',
  'cancelled',
]);

const PR_TERMINAL_STATUSES = Object.freeze(['rejected', 'converted_to_po', 'cancelled']);

// Statuses that pause the procurement.pr.approval SLA clock.
// MUST match sla.registry.js → procurement.pr.approval.pauseOnStates.
const PR_PAUSE_STATUSES = Object.freeze(['returned_for_clarification']);

// ── transition graph ────────────────────────────────────────────────

const PR_TRANSITIONS = Object.freeze({
  draft: [
    { to: 'submitted', event: 'submitted' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  submitted: [
    { to: 'under_review', event: 'review_started' },
    { to: 'approved', event: 'approved' }, // single-tier fast-path
    { to: 'returned_for_clarification', event: 'returned' },
    { to: 'rejected', event: 'rejected' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  under_review: [
    { to: 'approved', event: 'approved' },
    { to: 'returned_for_clarification', event: 'returned' },
    { to: 'rejected', event: 'rejected' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  returned_for_clarification: [
    { to: 'under_review', event: 'resubmitted' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  approved: [
    { to: 'converted_to_po', event: 'converted_to_po' },
    { to: 'cancelled', event: 'cancelled' },
  ],
  converted_to_po: [],
  rejected: [],
  cancelled: [],
});

// ── approval tiers (by estimated value in SAR) ──────────────────────
//
// Tier shape: { name, maxValue, chain: [{ role, level, label }] }
// - `maxValue` is the upper bound inclusive; the last tier must
//   have `maxValue: null` meaning "no cap".
// - `chain` is evaluated in `level` order — a signature at level N
//   unlocks level N+1.

const APPROVAL_TIERS = Object.freeze([
  {
    name: 'simple',
    maxValue: 5000, // ≤ 5,000 SAR
    chain: [{ role: 'department_head', level: 1, label: 'Department Head' }],
  },
  {
    name: 'standard',
    maxValue: 50000, // ≤ 50,000 SAR
    chain: [
      { role: 'department_head', level: 1, label: 'Department Head' },
      { role: 'procurement_manager', level: 2, label: 'Procurement Manager' },
    ],
  },
  {
    name: 'complex',
    maxValue: 500000, // ≤ 500,000 SAR
    chain: [
      { role: 'department_head', level: 1, label: 'Department Head' },
      { role: 'procurement_manager', level: 2, label: 'Procurement Manager' },
      { role: 'cfo', level: 3, label: 'CFO' },
    ],
  },
  {
    name: 'special',
    maxValue: null, // > 500,000 SAR
    chain: [
      { role: 'department_head', level: 1, label: 'Department Head' },
      { role: 'procurement_manager', level: 2, label: 'Procurement Manager' },
      { role: 'cfo', level: 3, label: 'CFO' },
      { role: 'ceo', level: 4, label: 'CEO' },
    ],
  },
]);

// ── purchase methods ────────────────────────────────────────────────

const PURCHASE_METHODS = Object.freeze([
  'direct_purchase',
  'competitive_bidding', // 3-quote rule
  'negotiation',
  'emergency',
  'framework_agreement',
]);

const PRIORITIES = Object.freeze(['low', 'normal', 'high', 'urgent']);

// ── helpers ─────────────────────────────────────────────────────────

function tierForValue(estimatedValue) {
  if (typeof estimatedValue !== 'number' || estimatedValue < 0) return APPROVAL_TIERS[0];
  for (const t of APPROVAL_TIERS) {
    if (t.maxValue === null || estimatedValue <= t.maxValue) return t;
  }
  return APPROVAL_TIERS[APPROVAL_TIERS.length - 1];
}

function canTransition(from, to) {
  const edges = PR_TRANSITIONS[from] || [];
  return edges.some(e => e.to === to);
}

function eventForTransition(from, to) {
  const edges = PR_TRANSITIONS[from] || [];
  const edge = edges.find(e => e.to === to);
  return edge ? edge.event : null;
}

function isTerminal(status) {
  return PR_TERMINAL_STATUSES.includes(status);
}

function slaPolicyForApproval() {
  return 'procurement.pr.approval';
}

function slaPolicyForPoIssuance() {
  return 'procurement.po.issuance';
}

/**
 * Competitive-bidding rule — requests ≥ this amount MUST go through
 * a formal RFQ with `minimumSuppliers` quotes before conversion.
 * Finance can adjust at runtime by mutating this env override.
 */
function competitiveBiddingRequiredFor(estimatedValue) {
  const threshold = Number(process.env.PR_COMPETITIVE_BIDDING_THRESHOLD) || 10000;
  return estimatedValue >= threshold;
}

// ── validation ──────────────────────────────────────────────────────

function validate() {
  // tiers: last one MUST have maxValue === null, and levels must be
  // monotonic ascending per chain.
  for (let i = 0; i < APPROVAL_TIERS.length; i++) {
    const t = APPROVAL_TIERS[i];
    if (!Array.isArray(t.chain) || t.chain.length === 0) {
      throw new Error(`PR registry: tier '${t.name}' has empty chain`);
    }
    let prevLevel = 0;
    for (const step of t.chain) {
      if (typeof step.level !== 'number' || step.level <= prevLevel) {
        throw new Error(`PR registry: tier '${t.name}' chain not monotonic at level ${step.level}`);
      }
      prevLevel = step.level;
      if (!step.role || typeof step.role !== 'string') {
        throw new Error(`PR registry: tier '${t.name}' step missing role`);
      }
    }
    const isLast = i === APPROVAL_TIERS.length - 1;
    if (isLast && t.maxValue !== null) {
      throw new Error(`PR registry: last tier must have maxValue=null`);
    }
    if (!isLast && (typeof t.maxValue !== 'number' || t.maxValue <= 0)) {
      throw new Error(`PR registry: tier '${t.name}' needs positive maxValue`);
    }
  }

  // transitions: every target must be a canonical status
  for (const [from, edges] of Object.entries(PR_TRANSITIONS)) {
    if (!PR_STATUSES.includes(from)) {
      throw new Error(`PR registry: transition source '${from}' unknown`);
    }
    for (const e of edges) {
      if (!PR_STATUSES.includes(e.to)) {
        throw new Error(`PR registry: transition ${from}→${e.to} unknown target`);
      }
      if (!e.event) throw new Error(`PR registry: transition ${from}→${e.to} missing event`);
    }
  }

  return true;
}

module.exports = {
  PR_STATUSES,
  PR_TERMINAL_STATUSES,
  PR_PAUSE_STATUSES,
  PR_TRANSITIONS,
  APPROVAL_TIERS,
  PURCHASE_METHODS,
  PRIORITIES,
  tierForValue,
  canTransition,
  eventForTransition,
  isTerminal,
  slaPolicyForApproval,
  slaPolicyForPoIssuance,
  competitiveBiddingRequiredFor,
  validate,
};
