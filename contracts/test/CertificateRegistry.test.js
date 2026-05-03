/**
 * CertificateRegistry contract tests — run via `npx hardhat test`.
 * Covers the invariants the off-chain verifier (`scripts/blockchain-verify-chain.js`)
 * relies on: append-only roots, owner-restricted writes, pause toggle,
 * ownership transfer, deduplication.
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

const ROOT_A = '0x' + 'a'.repeat(64);
const ROOT_B = '0x' + 'b'.repeat(64);
const ROOT_ZERO = '0x' + '0'.repeat(64);

describe('CertificateRegistry', () => {
  let contract;
  let owner;
  let other;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('CertificateRegistry');
    contract = await Factory.deploy(owner.address);
    await contract.waitForDeployment();
  });

  it('records initial state', async () => {
    expect(await contract.owner()).to.equal(owner.address);
    expect(await contract.paused()).to.equal(false);
    expect(await contract.latestId()).to.equal(0);
  });

  it('anchors a root and assigns id=1', async () => {
    const tx = await contract.anchor(ROOT_A, 5);
    await tx.wait();
    expect(await contract.latestId()).to.equal(1);
    expect(await contract.anchorIdOf(ROOT_A)).to.equal(1);
    expect(await contract.isAnchored(ROOT_A)).to.equal(true);

    const [root, anchoredAt, by, batchSize] = await contract.getRoot(1);
    expect(root).to.equal(ROOT_A);
    expect(by).to.equal(owner.address);
    expect(batchSize).to.equal(5);
    expect(Number(anchoredAt)).to.be.greaterThan(0);
  });

  it('emits the Anchored event with all fields', async () => {
    await expect(contract.anchor(ROOT_A, 7))
      .to.emit(contract, 'Anchored')
      .withArgs(1, ROOT_A, owner.address, 7, anyValue);
  });

  it('rejects duplicate roots', async () => {
    await contract.anchor(ROOT_A, 1);
    await expect(contract.anchor(ROOT_A, 1)).to.be.revertedWithCustomError(
      contract,
      'AlreadyAnchored'
    );
  });

  it('rejects the zero root', async () => {
    await expect(contract.anchor(ROOT_ZERO, 0)).to.be.revertedWithCustomError(
      contract,
      'ZeroRoot'
    );
  });

  it('only the owner may anchor', async () => {
    await expect(
      contract.connect(other).anchor(ROOT_A, 1)
    ).to.be.revertedWithCustomError(contract, 'NotOwner');
  });

  it('paused contract refuses new anchors but reads still work', async () => {
    await contract.anchor(ROOT_A, 1);
    await contract.setPaused(true);
    expect(await contract.paused()).to.equal(true);

    await expect(contract.anchor(ROOT_B, 1)).to.be.revertedWithCustomError(
      contract,
      'WhilePaused'
    );

    expect(await contract.isAnchored(ROOT_A)).to.equal(true);

    await contract.setPaused(false);
    await contract.anchor(ROOT_B, 1);
    expect(await contract.latestId()).to.equal(2);
  });

  it('transfers ownership and revokes the previous owner', async () => {
    await contract.transferOwnership(other.address);
    expect(await contract.owner()).to.equal(other.address);
    await expect(contract.anchor(ROOT_A, 1)).to.be.revertedWithCustomError(
      contract,
      'NotOwner'
    );
    await contract.connect(other).anchor(ROOT_A, 1);
    expect(await contract.anchorIdOf(ROOT_A)).to.equal(1);
  });

  it('rejects transferOwnership to zero address', async () => {
    await expect(contract.transferOwnership(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      contract,
      'ZeroAddress'
    );
  });

  it('append-only — ids increment monotonically per anchor', async () => {
    await contract.anchor(ROOT_A, 1);
    await contract.anchor(ROOT_B, 2);
    expect(await contract.latestId()).to.equal(2);
    expect(await contract.anchorIdOf(ROOT_A)).to.equal(1);
    expect(await contract.anchorIdOf(ROOT_B)).to.equal(2);
  });
});

