/**
 * Anti-mass-assignment guard for appointment.service.js.
 *
 * The booking routes pass req.body straight into the service, which used to
 * `new Appointment({ ...data })` on create and `Object.assign(apt, data)` on
 * update — letting any authenticated caller forge lifecycle/audit fields
 * (status, cancelledBy/At, createdBy, appointmentNumber, statusHistory,
 * insuranceApprovalStatus). The service now whitelists creatable/updatable
 * fields. This test proves the forged fields are dropped while legit edits land.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let svc;
let Appointment;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'apt-massassign-test' } });
  await mongoose.connect(mongod.getUri());
  Appointment = require('../models/Appointment');
  svc = require('../services/appointment.service');
  await Appointment.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Appointment.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

describe('appointment mass-assignment', () => {
  it('createAppointment drops forged status/audit fields, keeps legit booking fields', async () => {
    const userId = oid();
    const apt = await svc.createAppointment(
      {
        date: new Date('2099-01-01'),
        startTime: '10:00',
        endTime: '10:30',
        beneficiaryName: 'Test',
        notes: 'legit note',
        // forged privileged fields:
        status: 'COMPLETED',
        createdBy: oid(),
        bookedBy: oid(),
        cancelledBy: oid(),
        cancelledAt: new Date(),
        statusHistory: [{ from: 'X', to: 'COMPLETED', changedBy: oid() }],
        insuranceApprovalStatus: 'approved',
      },
      userId
    );
    // new appointments must start PENDING regardless of the forged status
    expect(apt.status).toBe('PENDING');
    // createdBy/bookedBy come from the authenticated userId, not the body
    expect(String(apt.createdBy)).toBe(String(userId));
    expect(String(apt.bookedBy)).toBe(String(userId));
    // forged audit/lifecycle fields dropped
    expect(apt.cancelledBy).toBeUndefined();
    expect(apt.cancelledAt).toBeUndefined();
    expect(apt.statusHistory).toHaveLength(0);
    expect(apt.insuranceApprovalStatus).not.toBe('approved');
    // legit field preserved
    expect(apt.notes).toBe('legit note');
  });

  it('updateAppointment applies edits but drops forged audit/system fields', async () => {
    const userId = oid();
    const apt = await svc.createAppointment(
      { date: new Date('2099-01-01'), startTime: '11:00', notes: 'a' },
      userId
    );
    const originalCreatedBy = String(apt.createdBy);
    const originalNumber = apt.appointmentNumber;

    const updated = await svc.updateAppointment(
      apt._id,
      {
        notes: 'edited', // legit
        createdBy: oid(), // forged
        cancelledBy: oid(), // forged
        appointmentNumber: 'HACK-2', // forged
        statusHistory: [{ from: 'a', to: 'b', changedBy: oid() }], // forged
      },
      userId
    );
    expect(updated.notes).toBe('edited');
    expect(String(updated.createdBy)).toBe(originalCreatedBy);
    expect(updated.cancelledBy).toBeUndefined();
    expect(updated.appointmentNumber).toBe(originalNumber);
    expect(updated.statusHistory).toHaveLength(0);
  });
});
