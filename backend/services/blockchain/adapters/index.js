/**
 * Adapter Selector — اختيار المُحوِّل بحسب الإعدادات
 *
 * Resolves BLOCKCHAIN_NETWORK env to a concrete adapter instance.
 * Memoizes a single instance per process so tests and runtime share state
 * (helpful for the in-memory/Mongo AnchorLedger).
 *
 *   BLOCKCHAIN_NETWORK = "internal"        (default)
 *                      | "mock-ethereum"
 *                      | "mock-polygon"
 *
 * To wire a real chain later: implement { name, anchor({merkleRoot,batchSize}),
 * getAnchor(txHash) } and add a branch below.
 */

'use strict';

const { InternalAdapter } = require('./internalAdapter');
const { MockEthereumAdapter } = require('./mockEthereumAdapter');
const { EthereumAdapter } = require('./ethereumAdapter');

let cached = null;
let cachedKey = null;

function resolveKey() {
  return String(process.env.BLOCKCHAIN_NETWORK || 'internal')
    .trim()
    .toLowerCase();
}

function build(key) {
  switch (key) {
    case 'mock-ethereum':
      return new MockEthereumAdapter({ networkLabel: 'ethereum', chainId: 1 });
    case 'mock-polygon':
      return new MockEthereumAdapter({ networkLabel: 'polygon', chainId: 137 });
    case 'ethereum':
      return new EthereumAdapter({ networkLabel: 'ethereum', chainId: 1 });
    case 'polygon':
      return new EthereumAdapter({ networkLabel: 'polygon', chainId: 137 });
    case 'sepolia':
      return new EthereumAdapter({ networkLabel: 'sepolia', chainId: 11155111 });
    case 'amoy':
      return new EthereumAdapter({ networkLabel: 'amoy', chainId: 80002 });
    case 'internal':
    case '':
      return new InternalAdapter();
    default:
      // Unknown value: fall back to internal so misconfiguration doesn't break issuance.
      return new InternalAdapter();
  }
}

function getAdapter() {
  const key = resolveKey();
  if (!cached || cachedKey !== key) {
    cached = build(key);
    cachedKey = key;
  }
  return cached;
}

function resetForTest() {
  cached = null;
  cachedKey = null;
}

module.exports = { getAdapter, resetForTest };
