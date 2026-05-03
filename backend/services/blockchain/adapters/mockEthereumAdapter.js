/**
 * Mock Ethereum Adapter — مُحوِّل إيثريوم (محاكاة)
 *
 * Drop-in adapter that mimics an EVM-compatible chain (Ethereum/Polygon) without
 * actually broadcasting. Tx hashes match the 0x-prefixed 32-byte format, block
 * numbers come from a process-local clock, gasUsed is deterministic per batch.
 *
 * Activate by setting BLOCKCHAIN_NETWORK=mock-ethereum (or mock-polygon).
 * Real adapters can later replace this without changing service-layer code,
 * provided they implement { name, anchor(), getAnchor() }.
 */

'use strict';

const crypto = require('crypto');
const { InternalAdapter, AnchorLedger } = require('./internalAdapter');

const ZERO_TX = '0x' + '0'.repeat(64);
const GENESIS_BLOCK = 21_000_000; // realistic-looking starting height

class MockEthereumAdapter extends InternalAdapter {
  constructor({ networkLabel = 'ethereum', chainId = 1, contractAddress } = {}) {
    super();
    this.networkLabel = networkLabel;
    this.chainId = chainId;
    this.contractAddress =
      contractAddress || process.env.BLOCKCHAIN_CONTRACT_ADDRESS || this._fakeContract();
  }

  get name() {
    return this.networkLabel;
  }

  _fakeContract() {
    // Deterministic per chainId so logs/UI stay stable across restarts in dev.
    const h = crypto.createHash('sha256').update(`alawael-cert-${this.chainId}`).digest('hex');
    return '0x' + h.slice(0, 40);
  }

  async anchor({ merkleRoot, batchSize = 0 }) {
    if (!merkleRoot || !/^[a-f0-9]{64}$/i.test(merkleRoot)) {
      throw new Error('mockEthereumAdapter.anchor: invalid merkleRoot');
    }
    const last = await AnchorLedger.findOne({ network: this.name })
      .sort({ blockNumber: -1 })
      .select('blockNumber transactionHash')
      .lean();
    const blockNumber = (last?.blockNumber ?? GENESIS_BLOCK) + 1;
    const previousTxHash = last?.transactionHash ?? ZERO_TX;

    const raw = `${this.chainId}|${this.contractAddress}|${merkleRoot}|${previousTxHash}|${blockNumber}|${Date.now()}`;
    const txCore = crypto.createHash('sha256').update(raw).digest('hex');
    const transactionHash = '0x' + txCore;

    // Realistic-looking gas: base 60k + ~5k per leaf (capped).
    const gasUsed = 60_000 + Math.min(batchSize, 500) * 5_000;

    await AnchorLedger.create({
      network: this.name,
      blockNumber,
      transactionHash,
      merkleRoot,
      previousTxHash,
      batchSize,
    });

    return {
      network: this.name,
      chainId: this.chainId,
      transactionHash,
      blockNumber,
      contractAddress: this.contractAddress,
      gasUsed,
      timestamp: new Date(),
    };
  }
}

module.exports = { MockEthereumAdapter };
