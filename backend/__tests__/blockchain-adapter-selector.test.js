/**
 * blockchain-adapter-selector.test.js
 *
 * The selector must pick the right adapter type from BLOCKCHAIN_NETWORK
 * and fall back to internal on unknown values. We don't call .anchor() here
 * (that needs Mongoose) — we only assert constructor identity + label.
 */

'use strict';

const { getAdapter, resetForTest } = require('../services/blockchain/adapters');
const { InternalAdapter } = require('../services/blockchain/adapters/internalAdapter');
const { MockEthereumAdapter } = require('../services/blockchain/adapters/mockEthereumAdapter');

describe('adapter selector', () => {
  const ORIG = process.env.BLOCKCHAIN_NETWORK;
  beforeEach(() => resetForTest());
  afterEach(() => {
    if (ORIG === undefined) delete process.env.BLOCKCHAIN_NETWORK;
    else process.env.BLOCKCHAIN_NETWORK = ORIG;
    resetForTest();
  });

  it('defaults to InternalAdapter when env is unset', () => {
    delete process.env.BLOCKCHAIN_NETWORK;
    const a = getAdapter();
    expect(a).toBeInstanceOf(InternalAdapter);
    expect(a.name).toBe('internal');
  });

  it('returns MockEthereumAdapter labelled "ethereum" for mock-ethereum', () => {
    process.env.BLOCKCHAIN_NETWORK = 'mock-ethereum';
    const a = getAdapter();
    expect(a).toBeInstanceOf(MockEthereumAdapter);
    expect(a.name).toBe('ethereum');
    expect(a.chainId).toBe(1);
  });

  it('returns MockEthereumAdapter labelled "polygon" for mock-polygon', () => {
    process.env.BLOCKCHAIN_NETWORK = 'mock-polygon';
    const a = getAdapter();
    expect(a).toBeInstanceOf(MockEthereumAdapter);
    expect(a.name).toBe('polygon');
    expect(a.chainId).toBe(137);
  });

  it('falls back to InternalAdapter on unknown values (safe default)', () => {
    process.env.BLOCKCHAIN_NETWORK = 'nonsense';
    expect(getAdapter()).toBeInstanceOf(InternalAdapter);
  });

  it('memoizes the same instance until env changes', () => {
    process.env.BLOCKCHAIN_NETWORK = 'internal';
    const a = getAdapter();
    const b = getAdapter();
    expect(a).toBe(b);
  });

  it('rebuilds when env changes between calls', () => {
    process.env.BLOCKCHAIN_NETWORK = 'internal';
    const a = getAdapter();
    process.env.BLOCKCHAIN_NETWORK = 'mock-ethereum';
    const b = getAdapter();
    expect(a).not.toBe(b);
    expect(b).toBeInstanceOf(MockEthereumAdapter);
  });

  it('mock ethereum derives a deterministic contract address per chainId', () => {
    const eth = new MockEthereumAdapter({ networkLabel: 'ethereum', chainId: 1 });
    const eth2 = new MockEthereumAdapter({ networkLabel: 'ethereum', chainId: 1 });
    const poly = new MockEthereumAdapter({ networkLabel: 'polygon', chainId: 137 });
    expect(eth.contractAddress).toBe(eth2.contractAddress);
    expect(eth.contractAddress).toMatch(/^0x[a-f0-9]{40}$/);
    expect(eth.contractAddress).not.toBe(poly.contractAddress);
  });
});
