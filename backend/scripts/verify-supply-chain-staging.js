#!/usr/bin/env node
/**
 * W819 — Staging smoke for supply-chain + facility ops (ADR-039 closure §5).
 *
 * Usage:
 *   SUPPLY_CHAIN_API_URL=https://staging.example.com \
 *   SUPPLY_CHAIN_TOKEN=<jwt> \
 *   node backend/scripts/verify-supply-chain-staging.js
 *
 *   node backend/scripts/verify-supply-chain-staging.js --json
 *
 * Env (aliases accepted):
 *   SUPPLY_CHAIN_API_URL | API_URL — base URL without trailing slash
 *   SUPPLY_CHAIN_TOKEN     | TOKEN  — Bearer JWT
 */

'use strict';

const CHECKS = [
  {
    name: 'purchasing-platform-stats',
    path: '/api/v1/purchasing/platform-stats',
    validate(body) {
      if (!body?.success) return 'missing success:true';
      const tiers = body?.data?.tiers;
      if (!tiers?.legacyPurchasing || !tiers?.inventoryStock) {
        return 'data.tiers must include legacyPurchasing and inventoryStock';
      }
      if (tiers.legacyPurchasing.tier !== 'B' || tiers.inventoryStock.tier !== 'A') {
        return 'unexpected tier labels (expected B and A)';
      }
      return null;
    },
  },
  {
    name: 'maintenance-hub-snapshot',
    path: '/api/v1/ops/maintenance-hub/snapshot',
    validate(body) {
      if (!body?.success) return 'missing success:true';
      if (!body?.data?.facilityAssets) return 'missing data.facilityAssets';
      if (!body?.data?.workOrders) return 'missing data.workOrders';
      return null;
    },
  },
];

function baseUrl() {
  const raw = (process.env.SUPPLY_CHAIN_API_URL || process.env.API_URL || '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

function token() {
  return (process.env.SUPPLY_CHAIN_TOKEN || process.env.TOKEN || '').trim() || null;
}

async function runCheck(base, jwt, check) {
  const url = `${base}${check.path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  const shapeErr = res.ok && body ? check.validate(body) : null;
  return {
    name: check.name,
    path: check.path,
    status: res.status,
    ok: res.ok && !shapeErr,
    error: !res.ok ? `HTTP ${res.status}` : shapeErr,
  };
}

async function main() {
  const json = process.argv.includes('--json');
  const base = baseUrl();
  const jwt = token();

  if (!base || !jwt) {
    const msg =
      'Set SUPPLY_CHAIN_API_URL (or API_URL) and SUPPLY_CHAIN_TOKEN (or TOKEN) before running.';
    if (json) {
      console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
    } else {
      console.error(msg);
    }
    process.exit(2);
  }

  const results = [];
  for (const check of CHECKS) {
    results.push(await runCheck(base, jwt, check));
  }

  const ok = results.every((r) => r.ok);
  const payload = { ok, base, results };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    for (const r of results) {
      const mark = r.ok ? 'OK' : 'FAIL';
      console.log(`${mark}  ${r.name}  ${r.path}  (${r.status})${r.error ? ` — ${r.error}` : ''}`);
    }
    console.log(ok ? '\nAll supply-chain staging checks passed.' : '\nOne or more checks failed.');
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
