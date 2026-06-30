'use strict';

/**
 * appointment-slot-booking-atomic-wave1548.test.js — W1548
 *
 * Guards the fix for the slot-booking overbooking race in
 * routes/appointmentScheduling.routes.js (PATCH /slots/:id/book). The old
 * read-then-write (findById → check currentPatients < maxPatients → += 1 →
 * save) let concurrent bookings exceed maxPatients. The fix uses a single
 * atomic findOneAndUpdate with an $expr capacity check + $inc.
 *
 * Behavioral (MongoMemoryServer) proves the capacity cap is enforced + the
 * 404/409 distinction; the static assertion guards against the racy pattern
 * being reintroduced.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'u1', _id: 'u1' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
let app;
let TimeSlot;

const seedSlot = async (over = {}) => {
  const r = await TimeSlot.collection.insertOne({
    date: new Date('2026-07-01'),
    startTime: '09:00',
    endTime: '10:00',
    maxPatients: 1,
    currentPatients: 0,
    status: 'available',
    isOverbooked: false,
    ...over,
  });
  return r.insertedId;
};

const book = id =>
  request(app)
    .patch(`/api/appointment-scheduling/slots/${id}/book`)
    .send({
      beneficiary: new mongoose.Types.ObjectId(),
      appointment: new mongoose.Types.ObjectId(),
    });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1548-slot' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ TimeSlot } = require('../models/appointmentScheduling.model'));
  app = express();
  app.use(express.json());
  app.use('/api/appointment-scheduling', require('../routes/appointmentScheduling.routes'));
  app.use((err, req, res, _next) => res.status(500).json({ error: err.message }));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1548 — atomic slot booking (no overbooking)', () => {
  it('books an available 1-patient slot, then caps a second booking at 409', async () => {
    const id = await seedSlot();
    const r1 = await book(id);
    expect(r1.status).toBe(200);
    expect(r1.body.data.currentPatients).toBe(1);
    expect(r1.body.data.status).toBe('booked');

    const r2 = await book(id);
    expect(r2.status).toBe(409);

    const after = await TimeSlot.findById(id);
    expect(after.currentPatients).toBe(1); // never exceeded maxPatients
    expect(after.isOverbooked).toBe(false);
  });

  it('allows up to maxPatients on a group slot, then caps', async () => {
    const id = await seedSlot({ maxPatients: 2 });
    expect((await book(id)).status).toBe(200);
    expect((await book(id)).status).toBe(200);
    expect((await book(id)).status).toBe(409);
    const after = await TimeSlot.findById(id);
    expect(after.currentPatients).toBe(2);
  });

  it('returns 404 for a non-existent slot', async () => {
    const r = await book(new mongoose.Types.ObjectId());
    expect(r.status).toBe(404);
  });

  it('returns 409 for a blocked slot', async () => {
    const id = await seedSlot({ status: 'blocked' });
    const r = await book(id);
    expect(r.status).toBe(409);
  });

  it('static: booking handler uses an atomic conditional update, not the racy read-then-write', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'appointmentScheduling.routes.js'),
      'utf8'
    );
    const handler = src.slice(
      src.indexOf("'/slots/:id/book'"),
      src.indexOf("'/slots/:id/cancel'")
    );
    expect(handler).toMatch(/findOneAndUpdate/);
    expect(handler).toMatch(/\$expr/);
    expect(handler).toMatch(/\$inc/);
    expect(handler).not.toMatch(/currentPatients \+= 1/);
  });
});
