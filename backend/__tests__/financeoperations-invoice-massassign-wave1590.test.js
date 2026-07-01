'use strict';

/**
 * financeoperations-invoice-massassign-wave1590.test.js — W1590
 *
 * services/financeOperations.service.js createInvoice() did `Invoice.create(data)` and
 * updateInvoice() did `Object.assign(invoice, data)` with the raw caller payload — so a
 * caller could forge invoice `status:'PAID'/'ISSUED'` (bypass the pay/cancel transitions),
 * forge the `zatca` envelope/hash, set `paidAt/paidBy/paidAmount`, spoof `issuer`, or re-home
 * the invoice to another branch via `branchId`. W1590 strips those server-controlled fields
 * before create/update (branchId then derives from the beneficiary via the pre-save hook).
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Invoice;
let Beneficiary;
let svc;
const BRANCH_OWN = new mongoose.Types.ObjectId();
const BRANCH_FOREIGN = new mongoose.Types.ObjectId();
const USER = new mongoose.Types.ObjectId();
let beneficiaryId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1587-finops' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Invoice = require('../models/Invoice');
  Beneficiary = require('../models/Beneficiary'); // registered so the pre-save branch-derive works
  svc = require('../services/financeOperations.service');
  // beneficiary carries the canonical branch the invoice should inherit
  beneficiaryId = new mongoose.Types.ObjectId();
  await Beneficiary.collection.insertOne({ _id: beneficiaryId, branchId: BRANCH_OWN, name: 'B' });
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1590 — financeOperations invoice mass-assignment', () => {
  it('createInvoice strips forged status/zatca/paid*/branchId/issuer', async () => {
    const doc = await svc.createInvoice(
      {
        beneficiary: String(beneficiaryId),
        items: [{ description: 'x', quantity: 2, unitPrice: 100 }],
        taxAmount: 30,
        // forged / server-controlled fields the caller must NOT be able to set:
        status: 'PAID',
        zatca: { hash: 'FORGED', uuid: 'evil' },
        paidAt: new Date('2020-01-01'),
        paidBy: new mongoose.Types.ObjectId(),
        branchId: BRANCH_FOREIGN,
        issuer: new mongoose.Types.ObjectId(),
      },
      USER
    );
    expect(doc.status).not.toBe('PAID'); // forged lifecycle rejected (schema default)
    expect(doc.paidAt == null).toBe(true); // payment audit not settable on create
    expect(String(doc.issuer)).toBe(String(USER)); // server-set from userId, not caller
    expect(String(doc.branchId)).toBe(String(BRANCH_OWN)); // derived from beneficiary, NOT forged foreign
    expect(doc.zatca && doc.zatca.hash).not.toBe('FORGED'); // ZATCA hash not forgeable
    expect(doc.totalAmount).toBe(230); // 2*100 + 30 tax — recomputed from items
  });

  it('updateInvoice blocks forging status/zatca/branch on a DRAFT invoice', async () => {
    const draft = await svc.createInvoice(
      {
        beneficiary: String(beneficiaryId),
        items: [{ description: 'y', quantity: 1, unitPrice: 50 }],
      },
      USER
    );
    const before = draft.status;
    const updated = await svc.updateInvoice(
      draft._id,
      { status: 'PAID', zatca: { hash: 'FORGED' }, branchId: BRANCH_FOREIGN, notes: 'legit edit' },
      USER
    );
    expect(updated.status).toBe(before); // status change must go via pay/cancel, not PATCH
    expect(updated.zatca && updated.zatca.hash).not.toBe('FORGED');
    expect(String(updated.branchId)).toBe(String(BRANCH_OWN)); // not re-homed
    expect(updated.notes).toBe('legit edit'); // non-privileged field still updates
  });

  it('static: strip helper defined + applied in create and update', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'financeOperations.service.js'),
      'utf8'
    );
    expect(src).toMatch(/const INVOICE_CALLER_STRIP = \[/);
    expect(src).toMatch(/function stripInvoiceCallerControlled\(data\)/);
    expect((src.match(/stripInvoiceCallerControlled\(data\)/g) || []).length).toBeGreaterThanOrEqual(3); // def + create + update
  });
});
