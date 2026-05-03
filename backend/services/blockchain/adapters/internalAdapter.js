/**
 * Internal Chain Adapter — مُحوِّل السلسلة الداخلية
 *
 * Default adapter: anchors batches to the local hash chain.
 * No external network — the "transaction hash" is sha256(merkleRoot, prevAnchorTxHash, ts).
 * Block number monotonically increments per anchor in this process; persisted via the
 * AnchorLedger collection so it survives restarts.
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const AnchorLedgerSchema = new mongoose.Schema(
  {
    network: { type: String, default: 'internal' },
    blockNumber: { type: Number, required: true },
    transactionHash: { type: String, required: true, index: true },
    merkleRoot: { type: String, required: true },
    previousTxHash: String,
    batchSize: Number,
    anchoredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
AnchorLedgerSchema.index({ blockNumber: 1 }, { unique: true });

const AnchorLedger =
  mongoose.models.AnchorLedger || mongoose.model('AnchorLedger', AnchorLedgerSchema);

class InternalAdapter {
  get name() {
    return 'internal';
  }

  async anchor({ merkleRoot, batchSize = 0 }) {
    if (!merkleRoot || !/^[a-f0-9]{64}$/i.test(merkleRoot)) {
      throw new Error('internalAdapter.anchor: invalid merkleRoot');
    }
    const last = await AnchorLedger.findOne()
      .sort({ blockNumber: -1 })
      .select('blockNumber transactionHash')
      .lean();
    const blockNumber = (last?.blockNumber ?? 0) + 1;
    const previousTxHash = last?.transactionHash ?? '0'.repeat(64);
    const txPayload = `${merkleRoot}|${previousTxHash}|${blockNumber}|${Date.now()}`;
    const transactionHash = crypto.createHash('sha256').update(txPayload).digest('hex');

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
      transactionHash,
      blockNumber,
      timestamp: new Date(),
      contractAddress: null,
      gasUsed: 0,
    };
  }

  async getAnchor(transactionHash) {
    return AnchorLedger.findOne({ transactionHash }).lean();
  }

  async listAnchors({ limit = 50 } = {}) {
    return AnchorLedger.find().sort({ blockNumber: -1 }).limit(limit).lean();
  }
}

module.exports = { InternalAdapter, AnchorLedger };
