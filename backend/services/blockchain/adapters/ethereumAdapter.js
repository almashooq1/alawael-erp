/**
 * Ethereum Adapter — مُحوِّل إيثريوم الحقيقي
 *
 * Anchors merkle roots on a real EVM-compatible chain (Ethereum mainnet,
 * Polygon, Sepolia, Polygon Amoy, …) by sending a tx that includes the
 * 32-byte root. We don't deploy a full registry contract — the root is
 * placed in `data` of a self-transfer (the cheapest way to record a hash
 * on-chain), or to the configured contract via the `anchor(bytes32)` ABI.
 *
 * Activation:
 *   1. npm install ethers@^6 in backend/
 *   2. set BLOCKCHAIN_NETWORK=ethereum (or polygon)
 *   3. set BLOCKCHAIN_ETH_RPC_URL, BLOCKCHAIN_ETH_PRIVATE_KEY (or signer URL)
 *   4. (optional) set BLOCKCHAIN_CONTRACT_ADDRESS to call `anchor(bytes32)`;
 *      otherwise the adapter sends to itself with the root in `data`.
 *
 * The require('ethers') is **deferred** to first use so this file can ship
 * without forcing the dep on every install. If `ethers` is missing the
 * adapter throws a clear, actionable error instead of crashing boot.
 *
 * Persists each anchor into AnchorLedger so the verify pipeline can confirm
 * the local cert's tx hash against an on-chain record (the same path the
 * mock and internal adapters use).
 */

'use strict';

const { AnchorLedger } = require('./internalAdapter');
const logger = require('../../../utils/logger');

// Matches the deployed CertificateRegistry.sol (contracts/CertificateRegistry.sol).
// Two overloads accepted so older single-arg deployments keep working.
const ANCHOR_ABI = [
  'function anchor(bytes32 root, uint64 batchSize) external returns (uint64)',
  'function anchor(bytes32 root) external',
];

let _ethers = null;
function loadEthers() {
  if (_ethers) return _ethers;
  try {
    _ethers = require('ethers');
    return _ethers;
  } catch (err) {
    throw Object.assign(
      new Error(
        'EthereumAdapter requires the `ethers` package. Run `npm install ethers@^6` in backend/, then restart.'
      ),
      { code: 'ETHERS_NOT_INSTALLED', cause: err }
    );
  }
}

function bytes32From(rootHex) {
  if (!/^[a-f0-9]{64}$/i.test(rootHex)) {
    throw new Error('ethereumAdapter: merkleRoot must be 64-char hex');
  }
  return '0x' + rootHex;
}

class EthereumAdapter {
  constructor({
    networkLabel = 'ethereum',
    chainId,
    rpcUrl = process.env.BLOCKCHAIN_ETH_RPC_URL,
    privateKey = process.env.BLOCKCHAIN_ETH_PRIVATE_KEY,
    contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS,
  } = {}) {
    this.networkLabel = networkLabel;
    this.chainId = chainId;
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    this.contractAddress = contractAddress;
    this._signer = null;
    this._provider = null;
  }

  get name() {
    return this.networkLabel;
  }

  _connect() {
    if (this._signer) return;
    if (!this.rpcUrl) {
      throw Object.assign(new Error('BLOCKCHAIN_ETH_RPC_URL is not set'), {
        code: 'ETH_RPC_MISSING',
      });
    }
    if (!this.privateKey) {
      throw Object.assign(new Error('BLOCKCHAIN_ETH_PRIVATE_KEY is not set'), {
        code: 'ETH_KEY_MISSING',
      });
    }
    const ethers = loadEthers();
    this._provider = new ethers.JsonRpcProvider(this.rpcUrl);
    this._signer = new ethers.Wallet(this.privateKey, this._provider);
  }

  async anchor({ merkleRoot, batchSize = 0 }) {
    // Validate input before any IO so misconfigured callers get a clean error
    // even when ethers isn't installed yet.
    const root32 = bytes32From(merkleRoot);
    this._connect();
    const ethers = loadEthers();

    let txResp;
    if (this.contractAddress) {
      const contract = new ethers.Contract(this.contractAddress, ANCHOR_ABI, this._signer);
      // Prefer the (root, batchSize) overload — the CertificateRegistry we
      // ship records batch size on-chain. Fall back to single-arg only if
      // the deployed bytecode is older.
      try {
        txResp = await contract['anchor(bytes32,uint64)'](root32, BigInt(batchSize || 0));
      } catch (errOverloaded) {
        if (
          errOverloaded?.code === 'INVALID_ARGUMENT' ||
          errOverloaded?.code === 'UNSUPPORTED_OPERATION'
        ) {
          txResp = await contract['anchor(bytes32)'](root32);
        } else {
          throw errOverloaded;
        }
      }
    } else {
      // Fallback: self-transfer of 0 ETH with the root in calldata. Cheap,
      // mineable on any EVM chain, no contract deploy needed.
      txResp = await this._signer.sendTransaction({
        to: await this._signer.getAddress(),
        value: 0n,
        data: root32,
      });
    }

    const receipt = await txResp.wait();
    const previous = await AnchorLedger.findOne({ network: this.name })
      .sort({ blockNumber: -1 })
      .select('transactionHash')
      .lean();

    const record = {
      network: this.name,
      blockNumber: Number(receipt.blockNumber),
      transactionHash: receipt.hash || txResp.hash,
      merkleRoot,
      previousTxHash: previous?.transactionHash || '0x' + '0'.repeat(64),
      batchSize,
    };

    try {
      await AnchorLedger.create(record);
    } catch (err) {
      // AnchorLedger persists for audit; if Mongo is down we still return the
      // anchor receipt to the caller — the on-chain tx is the source of truth.
      logger?.warn?.(`[blockchain.eth] AnchorLedger persist failed: ${err.message}`);
    }

    return {
      network: this.name,
      chainId: this.chainId,
      transactionHash: record.transactionHash,
      blockNumber: record.blockNumber,
      contractAddress: this.contractAddress || null,
      gasUsed: Number(receipt.gasUsed || 0),
      timestamp: new Date(),
    };
  }

  async getAnchor(transactionHash) {
    return AnchorLedger.findOne({ transactionHash, network: this.name }).lean();
  }

  /**
   * Backfill the AnchorLedger from on-chain `Anchored` events. Used at boot
   * to recover from a DB pruning / restore scenario where the local ledger
   * lost rows. No-ops if the contract address isn't set (self-transfer mode
   * has no events to scan).
   *
   * Bounded by `lookbackBlocks` to keep RPC calls cheap. Pass `Infinity` to
   * scan from contract deployment (the chain provider must allow it).
   */
  async syncFromChain({ lookbackBlocks = 250_000 } = {}) {
    if (!this.contractAddress) return { skipped: true, reason: 'no contract address' };
    this._connect();
    const ethers = loadEthers();

    const ABI = [
      'event Anchored(uint64 indexed id, bytes32 indexed root, address indexed by, uint64 batchSize, uint64 anchoredAt)',
    ];
    const contract = new ethers.Contract(this.contractAddress, ABI, this._provider);

    const head = await this._provider.getBlockNumber();
    const fromBlock = lookbackBlocks === Infinity ? 0 : Math.max(0, head - lookbackBlocks);
    const events = await contract.queryFilter('Anchored', fromBlock, head);

    let inserted = 0;
    let skipped = 0;
    for (const ev of events) {
      const txHash = ev.transactionHash;
      const exists = await AnchorLedger.exists({ transactionHash: txHash });
      if (exists) {
        skipped += 1;
        continue;
      }
      const root = String(ev.args?.root || '').replace(/^0x/, '');
      const batchSize = Number(ev.args?.batchSize || 0);
      try {
        await AnchorLedger.create({
          network: this.name,
          blockNumber: Number(ev.blockNumber),
          transactionHash: txHash,
          merkleRoot: root,
          previousTxHash: '0x' + '0'.repeat(64),
          batchSize,
        });
        inserted += 1;
      } catch (err) {
        // Race with a concurrent anchor() call — safe to ignore.
        logger?.debug?.(`[blockchain.eth.sync] insert race: ${err.message}`);
      }
    }
    return { inserted, skipped, scannedFromBlock: fromBlock, scannedToBlock: head };
  }
}

module.exports = { EthereumAdapter };
