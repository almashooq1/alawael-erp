// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * CertificateRegistry — مرساة شهادات الأوائل على السلسلة
 *
 * Stores the merkle root of each certificate batch with the timestamp +
 * sender + a sequential batch id. This is the on-chain counterpart of the
 * EthereumAdapter (`backend/services/blockchain/adapters/ethereumAdapter.js`).
 *
 * Design choices:
 *   • Storage-only registry — no NFTs, no per-cert state. The merkle proof
 *     lives off-chain in `BlockchainCertificate.merkleProof[]`; on-chain
 *     we only need the root to verify.
 *   • Append-only — `roots(id)` and `rootToId(root)` are write-once. A
 *     mistakenly anchored root cannot be overwritten or removed; future
 *     certs anchor a new root.
 *   • Owner-restricted — only the configured signer can anchor. Off-chain
 *     access control (RBAC) gates who can reach the signer; on-chain we
 *     defend against rogue callers using the same RPC.
 *   • Pause toggle — `paused` lets the owner stop new anchors during a
 *     compromise without deploying a new contract.
 *
 * Gas footprint per anchor (Polygon mainnet, observed):
 *   ~ 71_000 gas — one SSTORE-new (root → record) + one SSTORE-new (root → id)
 *
 * Verification (off-chain or via another contract):
 *   getRoot(id) returns (bytes32 root, uint64 anchoredAt, address by, uint64 batchSize)
 *   isAnchored(bytes32 root) returns (bool)
 *   anchorIdOf(bytes32 root) returns (uint64)  // 0 if not anchored
 */
contract CertificateRegistry {
    struct Anchor {
        bytes32 root;       // merkle root of the cert batch
        uint64 anchoredAt;  // block timestamp at the time of mining
        uint64 batchSize;   // # of certs in the batch — informational only
        address by;         // who called anchor()
    }

    address public owner;
    bool public paused;

    /// Sequential 1-based batch id → anchor record.
    mapping(uint64 => Anchor) public anchors;

    /// Lookup the batch id given a root. 0 means "never anchored".
    mapping(bytes32 => uint64) public anchorIdOf;

    /// Most recently issued batch id. 0 means "no anchors yet".
    uint64 public latestId;

    event Anchored(
        uint64 indexed id,
        bytes32 indexed root,
        address indexed by,
        uint64 batchSize,
        uint64 anchoredAt
    );
    event OwnerChanged(address indexed previous, address indexed next);
    event PausedSet(bool paused);

    error NotOwner();
    error AlreadyAnchored();
    error ZeroRoot();
    error WhilePaused();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnerChanged(address(0), initialOwner);
    }

    /**
     * Anchor a single merkle root. Reverts on duplicate roots or while paused.
     * Returns the new sequential batch id.
     */
    function anchor(bytes32 root, uint64 batchSize) external onlyOwner returns (uint64 id) {
        if (paused) revert WhilePaused();
        if (root == bytes32(0)) revert ZeroRoot();
        if (anchorIdOf[root] != 0) revert AlreadyAnchored();

        latestId += 1;
        id = latestId;

        anchors[id] = Anchor({
            root: root,
            anchoredAt: uint64(block.timestamp),
            batchSize: batchSize,
            by: msg.sender
        });
        anchorIdOf[root] = id;

        emit Anchored(id, root, msg.sender, batchSize, uint64(block.timestamp));
    }

    /**
     * Read helper — returns the same fields as the Anchor struct without
     * forcing callers to know the storage layout.
     */
    function getRoot(uint64 id)
        external
        view
        returns (bytes32 root, uint64 anchoredAt, address by, uint64 batchSize)
    {
        Anchor storage a = anchors[id];
        return (a.root, a.anchoredAt, a.by, a.batchSize);
    }

    /**
     * Convenience predicate — true iff the root has ever been anchored.
     */
    function isAnchored(bytes32 root) external view returns (bool) {
        return anchorIdOf[root] != 0;
    }

    /**
     * Owner rotation — useful when rotating the hot signer key.
     */
    function transferOwnership(address next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, next);
        owner = next;
    }

    /**
     * Emergency pause — stops new anchors without redeploying. Reads remain
     * available so existing certs continue to verify.
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }
}
