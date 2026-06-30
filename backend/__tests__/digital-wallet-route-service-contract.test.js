/**
 * digital-wallet route ↔ service contract guard.
 *
 * BUG (fixed): the routes called the positional-signature service with object
 * args, e.g. `walletService.topUp(id, { ...req.body, userId })` while the service
 * is `topUp(walletId, amount, source, metadata, userId)`. So `amount` became an
 * object → MongoDB `$inc: { balance: {object} }` rejected (non-numeric) → every
 * wallet operation (create/topup/debit/transfer/applyCoupon/redeem/statement) was
 * broken on this LIVE-mounted feature.
 *
 * This guard locks: (1) the routes pass positional args (no `...req.body` spread
 * into the wallet service calls), and (2) the service math works for the corrected
 * call shape (create → topUp → debit → balances).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'digital-wallet.routes.js'),
  'utf8'
);

describe('digital-wallet route ↔ service positional contract (static)', () => {
  // None of the money-mutating service calls may receive an object spread.
  test.each(['topUp', 'debit', 'transfer', 'redeemLoyaltyPoints', 'createWallet', 'applyCoupon'])(
    'walletService.%s(...) is not called with a { ...req.body } object',
    method => {
      const re = new RegExp(`walletService\\.${method}\\([^;]*?\\.\\.\\.req\\.body`, 's');
      expect(ROUTE).not.toMatch(re);
    }
  );

  test('topUp/debit pass a numeric amount positionally', () => {
    expect(ROUTE).toMatch(/walletService\.topUp\(\s*req\.params\.id,\s*Number\(req\.body\.amount\)/);
    expect(ROUTE).toMatch(/walletService\.debit\(\s*req\.params\.id,\s*Number\(req\.body\.amount\)/);
  });
});

describe('digital-wallet service math (behavioral)', () => {
  jest.setTimeout(30000);
  let mongoose;
  let mongod;
  let svc;
  let DigitalWallet;

  beforeAll(async () => {
    jest.unmock('mongoose');
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wallet-contract-test' } });
    await mongoose.connect(mongod.getUri());
    svc = require('../services/digitalWallet.service');
    DigitalWallet = require('../models/DigitalWallet');
  });

  afterAll(async () => {
    if (mongoose) await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  it('create → topUp → debit yields correct balances with positional args', async () => {
    const oid = () => new mongoose.Types.ObjectId();
    const branchId = oid();
    const userId = oid();

    const wallet = await svc.createWallet('Beneficiary', oid(), branchId, userId);
    expect(wallet.balance).toBe(0); // opening balance is server-set, never client-supplied

    const after = await svc.topUp(wallet._id, 100, 'manual', {}, userId);
    expect(after.wallet.balance).toBe(100);

    const afterDebit = await svc.debit(wallet._id, 30, 'purchase', null, null, userId);
    expect(afterDebit.wallet.balance).toBe(70);

    // a non-numeric amount (the old broken call shape) must be rejected, not corrupt
    await expect(svc.topUp(wallet._id, { amount: 5 }, 'x', {}, userId)).rejects.toBeDefined();
    const fresh = await DigitalWallet.findById(wallet._id).lean();
    expect(fresh.balance).toBe(70); // unchanged by the rejected call
  });
});
