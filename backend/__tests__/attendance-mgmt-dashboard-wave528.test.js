'use strict';

/**
 * attendance-mgmt-dashboard-wave528.test.js — W528 regression.
 *
 * GET /api/v1/attendance-mgmt/dashboard returned 500 because
 * AttendanceManagementService.getDashboardStats() called two static helpers
 * that were never defined:
 *   AttendanceManagementService._getWeeklyTrend(branchId, department)
 *   AttendanceManagementService._getDepartmentBreakdown(start, end)
 * → "TypeError: ..._getWeeklyTrend is not a function" → wrapAsync → 500.
 *
 * Fix: implement both static methods returning the shapes the frontend
 * (AttendanceManagement.jsx) consumes:
 *   weeklyTrend:   [{ day, date, present, late, absent }]   (7 rows)
 *   deptBreakdown: [{ department, statuses: [{ status, count }], total }]
 *
 * This guard runs the real aggregation against MongoMemoryServer so a future
 * rename/removal of either helper fails here instead of silently 500-ing in
 * production.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');

let ownServer = null;
let Svc;
let Attendance;
let Employee;

beforeAll(async () => {
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    ownServer = await MongoMemoryServer.create();
    uri = ownServer.getUri();
  }
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'attendance-mgmt-w528' });
  Svc = require('../services/attendanceManagement.service');
  Attendance = require('../models/Attendance');
  Employee = require('../models/HR/Employee');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (ownServer) await ownServer.stop();
}, 60_000);

beforeEach(async () => {
  await Attendance.collection.deleteMany({});
  await Employee.collection.deleteMany({});
  await Employee.collection.insertMany([
    {
      employee_number: 'W528-1',
      national_id: '2000000001',
      email: 'w528-1@x.test',
      status: 'active',
      department: 'clinical',
    },
    {
      employee_number: 'W528-2',
      national_id: '2000000002',
      email: 'w528-2@x.test',
      status: 'active',
      department: 'hr',
    },
  ]);
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  await Attendance.collection.insertMany([
    {
      employeeId: new mongoose.Types.ObjectId(),
      date: today,
      status: 'present',
      department: 'clinical',
      checkIn: today,
    },
    {
      employeeId: new mongoose.Types.ObjectId(),
      date: today,
      status: 'late',
      department: 'clinical',
      checkIn: today,
    },
    { employeeId: new mongoose.Types.ObjectId(), date: today, status: 'absent', department: 'hr' },
  ]);
});

describe('W528 — attendance-mgmt dashboard helpers exist + getDashboardStats works', () => {
  test('the two previously-missing static helpers are defined', () => {
    expect(typeof Svc._getWeeklyTrend).toBe('function');
    expect(typeof Svc._getDepartmentBreakdown).toBe('function');
  });

  test('getDashboardStats resolves (no TypeError 500) with the expected shape', async () => {
    const d = await Svc.getDashboardStats({});
    expect(d).toBeTruthy();
    expect(d.totalEmployees).toBe(2);
    // weeklyTrend: exactly 7 day-rows with the consumed keys
    expect(Array.isArray(d.weeklyTrend)).toBe(true);
    expect(d.weeklyTrend).toHaveLength(7);
    for (const row of d.weeklyTrend) {
      expect(row).toHaveProperty('day');
      expect(row).toHaveProperty('date');
      expect(typeof row.present).toBe('number');
      expect(typeof row.late).toBe('number');
      expect(typeof row.absent).toBe('number');
    }
    // today's records land in the last (newest) bucket
    const todayRow = d.weeklyTrend[d.weeklyTrend.length - 1];
    expect(todayRow.present).toBe(1);
    expect(todayRow.late).toBe(1);
    expect(todayRow.absent).toBe(1);
  });

  test('deptBreakdown groups by department with statuses + total', async () => {
    const d = await Svc.getDashboardStats({});
    expect(Array.isArray(d.deptBreakdown)).toBe(true);
    const clinical = d.deptBreakdown.find(x => x.department === 'clinical');
    expect(clinical).toBeTruthy();
    expect(clinical.total).toBe(2); // present + late
    expect(Array.isArray(clinical.statuses)).toBe(true);
    const present = clinical.statuses.find(s => s.status === 'present');
    expect(present.count).toBe(1);
    // sorted by total desc → clinical (2) before hr (1)
    expect(d.deptBreakdown[0].department).toBe('clinical');
  });

  test('_getWeeklyTrend honours the department filter', async () => {
    const trend = await Svc._getWeeklyTrend(null, 'hr');
    const todayRow = trend[trend.length - 1];
    expect(todayRow.absent).toBe(1); // hr had 1 absent
    expect(todayRow.present).toBe(0); // clinical present excluded
  });
});
