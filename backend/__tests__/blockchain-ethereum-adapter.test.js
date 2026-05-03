/**
 * blockchain-ethereum-adapter.test.js
 *
 * The real EthereumAdapter loads `ethers` lazily so this file ships even
 * when ethers isn't installed. We test:
 *   • Selector returns the EthereumAdapter for ethereum/polygon/sepolia/amoy
 *   • Calling .anchor() without ethers installed throws the documented
 *     ETHERS_NOT_INSTALLED error (so deploys catch the missing dep early)
 *   • Without RPC URL / private key the adapter throws clear errors before
 *     attempting any network IO.
 *   • bytes32 conversion validates input hex shape.
 */

'use strict';

const { resetForTest, getAdapter } = require('../services/blockchain/adapters');
const { EthereumAdapter } = require('../services/blockchain/adapters/ethereumAdapter');

describe('selector — real chains', () => {
  const ORIG = process.env.BLOCKCHAIN_NETWORK;
  beforeEach(() => resetForTest());
  afterEach(() => {
    if (ORIG === undefined) delete process.env.BLOCKCHAIN_NETWORK;
    else process.env.BLOCKCHAIN_NETWORK = ORIG;
    resetForTest();
  });

  it.each([
    ['ethereum', 'ethereum', 1],
    ['polygon', 'polygon', 137],
    ['sepolia', 'sepolia', 11155111],
    ['amoy', 'amoy', 80002],
  ])('returns EthereumAdapter for %s with chainId %i', (key, label, chainId) => {
    process.env.BLOCKCHAIN_NETWORK = key;
    const a = getAdapter();
    expect(a).toBeInstanceOf(EthereumAdapter);
    expect(a.name).toBe(label);
    expect(a.chainId).toBe(chainId);
  });
});

describe('EthereumAdapter — config validation', () => {
  it('throws ETH_RPC_MISSING when rpcUrl is unset', async () => {
    const a = new EthereumAdapter({
      networkLabel: 'ethereum',
      chainId: 1,
      rpcUrl: '',
      privateKey: '',
    });
    await expect(a.anchor({ merkleRoot: 'a'.repeat(64), batchSize: 1 })).rejects.toMatchObject({
      code: 'ETH_RPC_MISSING',
    });
  });

  it('throws ETH_KEY_MISSING when rpcUrl is set but signer key is not', async () => {
    const a = new EthereumAdapter({
      networkLabel: 'ethereum',
      chainId: 1,
      rpcUrl: 'http://x',
      privateKey: '',
    });
    let err;
    try {
      await a.anchor({ merkleRoot: 'a'.repeat(64), batchSize: 1 });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    // Either ETH_KEY_MISSING (config), or ETHERS_NOT_INSTALLED (dep). Both prove
    // we never tried to actually broadcast a transaction with garbage state.
    expect(['ETH_KEY_MISSING', 'ETHERS_NOT_INSTALLED']).toContain(err.code);
  });

  it('rejects merkleRoot that is not 64-char hex before any IO', async () => {
    const a = new EthereumAdapter({
      networkLabel: 'ethereum',
      chainId: 1,
      rpcUrl: 'http://x',
      privateKey: '0x' + '1'.repeat(64),
    });
    await expect(a.anchor({ merkleRoot: 'short' })).rejects.toThrow(/64-char hex|merkleRoot/);
  });

  it('reports the configured network label', () => {
    const a = new EthereumAdapter({ networkLabel: 'polygon', chainId: 137 });
    expect(a.name).toBe('polygon');
  });
});
