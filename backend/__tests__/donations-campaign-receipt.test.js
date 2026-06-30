/**
 * Donations integrity guards (2026-06-29 hunt). Donation/Donor/Campaign have NO
 * branch field (global by design — not an IDOR). These lock the phantom campaign
 * link, the non-atomic receipt number, and the missing ObjectId guards.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(path.join(__dirname, '../routes/donations.routes.js'), 'utf8');
const MODEL = fs.readFileSync(path.join(__dirname, '../models/Donation.js'), 'utf8');

describe('donations — campaign link is a real schema field', () => {
  test('Donation schema declares campaignId (ref Campaign) — was a phantom write', () => {
    expect(MODEL).toMatch(/campaignId:\s*\{\s*type:\s*mongoose\.Schema\.Types\.ObjectId,\s*ref:\s*'Campaign'/);
  });
});

describe('donations — unique receipt number', () => {
  test('does not derive the receipt number from countDocuments (collision-prone)', () => {
    expect(ROUTE).not.toMatch(/countDocuments\(\)[\s\S]{0,80}padStart/);
    expect(ROUTE).not.toMatch(/`DON-\$\{String\(count \+ 1\)/);
  });
  test('uses a timestamp+random token for the receipt number', () => {
    expect(ROUTE).toMatch(/DON-\$\{Date\.now\(\)\.toString\(36\)/);
  });
});

describe('donations — ObjectId guards on path params', () => {
  test('mongoose is imported', () => {
    expect(ROUTE).toMatch(/const mongoose = require\('mongoose'\)/);
  });
  test('/donor/:donorId validates the id', () => {
    const i = ROUTE.indexOf("router.get('/donor/:donorId'");
    const block = ROUTE.slice(i, i + 300);
    expect(block).toMatch(/mongoose\.isValidObjectId\(req\.params\.donorId\)/);
  });
  test('/campaign/:campaignId validates the id', () => {
    const i = ROUTE.indexOf("router.get('/campaign/:campaignId'");
    const block = ROUTE.slice(i, i + 300);
    expect(block).toMatch(/mongoose\.isValidObjectId\(req\.params\.campaignId\)/);
  });
});
