'use strict';

/**
 * Behavioral counterpart for the day-rehab core trio:
 *   • BeneficiarySection   (Wave 175) — class/group roster
 *   • DayRehabBusRoute     (Wave 183) — pickup/dropoff transport
 *   • FieldTrip            (Wave 202b) — supervised outings
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These exercise every Wave-18 `__invariants`
 * branch end-to-end against MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Section;
let BusRoute;
let Trip;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w175-183-202b-day-rehab' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Section = require('../models/BeneficiarySection');
  BusRoute = require('../models/DayRehabBusRoute');
  Trip = require('../models/FieldTrip');
  await Section.init().catch(() => null);
  await BusRoute.init().catch(() => null);
  await Trip.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Section.deleteMany({});
  await BusRoute.deleteMany({});
  await Trip.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  BeneficiarySection (W175)
// ════════════════════════════════════════════════════════════════════

describe('BeneficiarySection — Wave-18 invariants', () => {
  let counter = 0;
  const baseSection = (overrides = {}) => ({
    name: 'فصل التوحد المتقدم',
    code: 'AUT-A-' + ++counter,
    program: 'autism',
    branchId: oid(),
    capacity: 8,
    ...overrides,
  });

  it('rejects rows without name', async () => {
    const s = new Section(baseSection({ name: undefined }));
    await expect(s.save()).rejects.toThrow(/name/);
  });

  it('rejects rows without code', async () => {
    const s = new Section(baseSection({ code: undefined }));
    await expect(s.save()).rejects.toThrow(/code/);
  });

  it('rejects program enum drift', async () => {
    const s = new Section(baseSection({ program: 'telepathy' }));
    await expect(s.save()).rejects.toThrow(/program/);
  });

  it('rejects status enum drift', async () => {
    const s = new Section(baseSection({ status: 'half-paused' }));
    await expect(s.save()).rejects.toThrow(/status/);
  });

  it('rejects capacity < 1', async () => {
    const s = new Section(baseSection({ capacity: 0 }));
    await expect(s.save()).rejects.toThrow(/capacity/);
  });

  it('rejects capacity > 50', async () => {
    const s = new Section(baseSection({ capacity: 100 }));
    await expect(s.save()).rejects.toThrow(/capacity/);
  });

  it('rejects beneficiaryIds.length > capacity', async () => {
    const s = new Section(
      baseSection({
        capacity: 2,
        beneficiaryIds: [oid(), oid(), oid()],
      })
    );
    await expect(s.save()).rejects.toThrow(/beneficiaryIds/);
  });

  it('rejects schedule.endTime ≤ startTime', async () => {
    const s = new Section(
      baseSection({
        schedule: { startTime: '13:30', endTime: '08:00' },
      })
    );
    await expect(s.save()).rejects.toThrow(/endTime/);
  });

  it('rejects ageRange.maxMonths < minMonths', async () => {
    const s = new Section(baseSection({ ageRange: { minMonths: 60, maxMonths: 24 } }));
    await expect(s.save()).rejects.toThrow(/maxMonths/);
  });

  it('rejects workingDays with invalid day', async () => {
    const s = new Section(
      baseSection({
        schedule: { startTime: '07:30', endTime: '13:30', workingDays: ['sun', 'doomsday'] },
      })
    );
    await expect(s.save()).rejects.toThrow(/workingDays/);
  });

  it('rejects HH:MM time format violation', async () => {
    const s = new Section(baseSection({ schedule: { startTime: '7:30am', endTime: '13:30' } }));
    await expect(s.save()).rejects.toThrow();
  });

  it('accepts a fully-formed section', async () => {
    const s = new Section(
      baseSection({
        nameEn: 'Advanced Autism Class',
        classroomId: oid(),
        primaryTherapistId: oid(),
        assistantIds: [oid(), oid()],
        beneficiaryIds: [oid(), oid(), oid()],
        ageRange: { minMonths: 36, maxMonths: 72 },
        schedule: {
          startTime: '07:30',
          endTime: '13:30',
          workingDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
        },
      })
    );
    await expect(s.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (branchId, code)', async () => {
    const branch = oid();
    const code = 'UNQ-SEC-A';
    await new Section(baseSection({ branchId: branch, code })).save();
    const dup = new Section(baseSection({ branchId: branch, code }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('uppercases code on save', async () => {
    const s = await new Section(baseSection({ code: 'aut-z' })).save();
    expect(s.code).toBe('AUT-Z');
  });

  it('exposes currentCount virtual computed from beneficiaryIds', async () => {
    const s = await new Section(baseSection({ beneficiaryIds: [oid(), oid(), oid()] })).save();
    expect(s.currentCount).toBe(3);
  });

  it('exposes PROGRAMS / STATUSES / WORKING_DAYS module constants', () => {
    expect(Section.PROGRAMS).toContain('autism');
    expect(Section.PROGRAMS).toContain('early_intervention');
    expect(Section.STATUSES).toEqual(['active', 'paused', 'archived']);
    expect(Section.WORKING_DAYS).toContain('sun');
    expect(Section.WORKING_DAYS).toContain('sat');
  });
});

// ════════════════════════════════════════════════════════════════════
//  DayRehabBusRoute (W183)
// ════════════════════════════════════════════════════════════════════

describe('DayRehabBusRoute — Wave-18 invariants', () => {
  let counter = 0;
  const baseRoute = (overrides = {}) => ({
    name: 'خط شمال الرياض',
    code: 'NRH-' + ++counter,
    branchId: oid(),
    ...overrides,
  });

  it('rejects rows without name', async () => {
    const r = new BusRoute(baseRoute({ name: undefined }));
    await expect(r.save()).rejects.toThrow(/name/);
  });

  it('rejects rows without code', async () => {
    const r = new BusRoute(baseRoute({ code: undefined }));
    await expect(r.save()).rejects.toThrow(/code/);
  });

  it('rejects direction enum drift', async () => {
    const r = new BusRoute(baseRoute({ direction: 'sideways' }));
    await expect(r.save()).rejects.toThrow(/direction/);
  });

  it('rejects pickupEndTime ≤ pickupStartTime', async () => {
    const r = new BusRoute(baseRoute({ pickupStartTime: '07:30', pickupEndTime: '06:30' }));
    await expect(r.save()).rejects.toThrow(/pickupEnd/);
  });

  it('rejects dropoffEndTime ≤ dropoffStartTime', async () => {
    const r = new BusRoute(baseRoute({ dropoffStartTime: '14:30', dropoffEndTime: '13:30' }));
    await expect(r.save()).rejects.toThrow(/dropoffEnd/);
  });

  it('rejects duplicate stop order', async () => {
    const r = new BusRoute(
      baseRoute({
        stops: [
          { order: 1, name: 'Stop A', beneficiaryIds: [oid()] },
          { order: 1, name: 'Stop B', beneficiaryIds: [oid()] },
        ],
      })
    );
    await expect(r.save()).rejects.toThrow(/duplicate stop order/);
  });

  it('rejects HH:MM time format violation', async () => {
    const r = new BusRoute(baseRoute({ pickupStartTime: '6am' }));
    await expect(r.save()).rejects.toThrow();
  });

  it('rejects stop latitude out of range', async () => {
    const r = new BusRoute(
      baseRoute({
        stops: [{ order: 1, name: 'Stop A', latitude: 91, longitude: 46 }],
      })
    );
    await expect(r.save()).rejects.toThrow(/latitude/);
  });

  it('accepts a fully-formed route', async () => {
    const r = new BusRoute(
      baseRoute({
        direction: 'both',
        driverId: oid(),
        driverName: 'السائق محمد',
        supervisorId: oid(),
        supervisorName: 'المشرفة فاطمة',
        vehicleId: oid(),
        stops: [
          {
            order: 1,
            name: 'حي النخيل',
            latitude: 24.74,
            longitude: 46.7,
            estimatedPickupTime: '06:45',
            beneficiaryIds: [oid()],
          },
          {
            order: 2,
            name: 'حي العليا',
            latitude: 24.72,
            longitude: 46.68,
            estimatedPickupTime: '07:00',
            beneficiaryIds: [oid(), oid()],
          },
        ],
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (branchId, code)', async () => {
    const branch = oid();
    const code = 'UNQ-RT-A';
    await new BusRoute(baseRoute({ branchId: branch, code })).save();
    const dup = new BusRoute(baseRoute({ branchId: branch, code }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('uppercases code on save', async () => {
    const r = await new BusRoute(baseRoute({ code: 'lower-rt' })).save();
    expect(r.code).toBe('LOWER-RT');
  });

  it('exposes totalStops + totalBeneficiaries virtuals', async () => {
    const b1 = oid();
    const b2 = oid();
    const r = await new BusRoute(
      baseRoute({
        stops: [
          { order: 1, name: 'A', beneficiaryIds: [b1, b2] },
          { order: 2, name: 'B', beneficiaryIds: [b2] }, // dedup
        ],
      })
    ).save();
    expect(r.totalStops).toBe(2);
    expect(r.totalBeneficiaries).toBe(2);
  });

  it('exposes STATUSES + DAYS module constants', () => {
    expect(BusRoute.STATUSES).toEqual(['active', 'paused', 'archived']);
    expect(BusRoute.DAYS).toContain('sun');
    expect(BusRoute.DAYS).toContain('sat');
  });
});

// ════════════════════════════════════════════════════════════════════
//  FieldTrip (W202b)
// ════════════════════════════════════════════════════════════════════

describe('FieldTrip — Wave-18 invariants', () => {
  const baseTrip = (overrides = {}) => ({
    title: 'زيارة حديقة الحيوان',
    destination: 'حديقة حيوان الرياض',
    tripDate: new Date('2026-06-15'),
    ...overrides,
  });

  it('rejects rows without title', async () => {
    const t = new Trip(baseTrip({ title: undefined }));
    await expect(t.save()).rejects.toThrow(/title/);
  });

  it('rejects rows without destination', async () => {
    const t = new Trip(baseTrip({ destination: undefined }));
    await expect(t.save()).rejects.toThrow(/destination/);
  });

  it('rejects rows without tripDate', async () => {
    const t = new Trip(baseTrip({ tripDate: undefined }));
    await expect(t.save()).rejects.toThrow(/tripDate/);
  });

  it('rejects tripType enum drift', async () => {
    const t = new Trip(baseTrip({ tripType: 'spiritual-retreat' }));
    await expect(t.save()).rejects.toThrow(/tripType/);
  });

  it('rejects status enum drift', async () => {
    const t = new Trip(baseTrip({ status: 'half-planned' }));
    await expect(t.save()).rejects.toThrow(/status/);
  });

  it('rejects endDate < tripDate', async () => {
    const t = new Trip(
      baseTrip({
        tripDate: new Date('2026-06-15'),
        endDate: new Date('2026-06-10'),
      })
    );
    await expect(t.save()).rejects.toThrow(/endDate/);
  });

  it('rejects transportMethod enum drift', async () => {
    const t = new Trip(baseTrip({ transportMethod: 'teleporter' }));
    await expect(t.save()).rejects.toThrow(/transportMethod/);
  });

  it('rejects requiredStaffRatio < 1', async () => {
    const t = new Trip(baseTrip({ requiredStaffRatio: 0 }));
    await expect(t.save()).rejects.toThrow(/requiredStaffRatio/);
  });

  it('rejects requiredStaffRatio > 10', async () => {
    const t = new Trip(baseTrip({ requiredStaffRatio: 15 }));
    await expect(t.save()).rejects.toThrow(/requiredStaffRatio/);
  });

  it('rejects departureTime in invalid HH:MM format', async () => {
    const t = new Trip(baseTrip({ departureTime: '8am' }));
    await expect(t.save()).rejects.toThrow();
  });

  it('rejects estimatedCostSAR < 0', async () => {
    const t = new Trip(baseTrip({ estimatedCostSAR: -100 }));
    await expect(t.save()).rejects.toThrow(/estimatedCostSAR/);
  });

  it('rejects enrollment.consentStatus enum drift', async () => {
    const t = new Trip(
      baseTrip({
        enrollments: [{ beneficiaryId: oid(), consentStatus: 'maybe' }],
      })
    );
    await expect(t.save()).rejects.toThrow(/consentStatus/);
  });

  it('accepts a fully-formed approved field trip', async () => {
    const t = new Trip(
      baseTrip({
        tripType: 'educational',
        endDate: new Date('2026-06-15'),
        departureTime: '08:00',
        returnTime: '13:00',
        branchId: oid(),
        sectionId: oid(),
        leadStaffName: 'المعالج أحمد',
        staffParticipants: ['أحمد', 'سارة', 'محمد'],
        requiredStaffRatio: 3,
        enrollments: [
          {
            beneficiaryId: oid(),
            consentStatus: 'signed',
            consentSignedBy: 'الأب علي',
            consentSignedAt: new Date('2026-06-01'),
          },
        ],
        transportMethod: 'center_bus',
        estimatedCostSAR: 500,
        riskAssessment: 'منخفض - رحلة محلية مع مرافقة كاملة',
        emergencyPlan: 'الاتصال بالرقم الطارئ في حالة وقوع حادث',
        status: 'approved',
        approvedByName: 'المدير محمد',
        approvedAt: new Date(),
      })
    );
    await expect(t.save()).resolves.toBeDefined();
  });

  it('exposes virtuals: enrolledCount + signedCount + staffCount + currentRatio', async () => {
    const t = await new Trip(
      baseTrip({
        staffParticipants: ['A', 'B'],
        enrollments: [
          { beneficiaryId: oid(), consentStatus: 'signed' },
          { beneficiaryId: oid(), consentStatus: 'signed' },
          { beneficiaryId: oid(), consentStatus: 'pending' },
          { beneficiaryId: oid(), consentStatus: 'declined' },
        ],
      })
    ).save();
    expect(t.enrolledCount).toBe(4);
    expect(t.signedCount).toBe(2);
    expect(t.staffCount).toBe(2);
    expect(t.currentRatio).toBe(2.0); // 4 enrolled / 2 staff
  });

  it('persists defaults: tripType=educational, transportMethod=center_bus, status=planning', async () => {
    const t = await new Trip(baseTrip()).save();
    expect(t.tripType).toBe('educational');
    expect(t.transportMethod).toBe('center_bus');
    expect(t.status).toBe('planning');
    expect(t.requiredStaffRatio).toBe(3);
  });

  it('exposes TYPES / STATUSES / CONSENT_STATUSES module constants', () => {
    expect(Trip.TYPES).toContain('educational');
    expect(Trip.TYPES).toContain('therapeutic');
    expect(Trip.STATUSES).toContain('approved');
    expect(Trip.STATUSES).toContain('completed');
    expect(Trip.CONSENT_STATUSES).toEqual(['pending', 'signed', 'declined']);
  });
});
