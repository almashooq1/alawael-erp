/**
 * Unit tests for domains/reports/services/ReportsEngine.js
 * Tests pure/synchronous methods — no DB required.
 */
'use strict';

// jest.config has resetModules: true — the mock factory runs again on every
// fresh require, producing a different `model` instance each time. Pin the
// fn at file scope so test setup + service share one reference.
const mockMongooseModel = jest.fn();
const mockMongooseObjectId = jest.fn(id => id);
jest.mock('mongoose', () => ({
  model: mockMongooseModel,
  Types: { ObjectId: mockMongooseObjectId },
}));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const { ReportsEngine, reportsEngine } = require('../../domains/reports/services/ReportsEngine');

// ─── Module exports ───────────────────────────────────────────────────────────

describe('ReportsEngine module exports', () => {
  test('exports ReportsEngine class', () => {
    expect(typeof ReportsEngine).toBe('function');
  });
  test('exports reportsEngine singleton', () => {
    expect(reportsEngine).toBeInstanceOf(ReportsEngine);
  });
  test('singleton has builtinReports map', () => {
    expect(typeof reportsEngine.builtinReports).toBe('object');
  });
});

// ─── listBuiltinReports ────────────────────────────────────────────────────────

describe('ReportsEngine.listBuiltinReports()', () => {
  test('returns an array', async () => {
    const list = await reportsEngine.listBuiltinReports();
    expect(Array.isArray(list)).toBe(true);
  });
  test('each entry has code, name, category, scope', async () => {
    const list = await reportsEngine.listBuiltinReports();
    for (const item of list) {
      expect(item).toHaveProperty('code');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('scope');
    }
  });
  test('includes BENEFICIARY_PROGRESS report', async () => {
    const codes = (await reportsEngine.listBuiltinReports()).map(r => r.code);
    expect(codes).toContain('BENEFICIARY_PROGRESS');
  });
  test('includes THERAPIST_CASELOAD report', async () => {
    const codes = (await reportsEngine.listBuiltinReports()).map(r => r.code);
    expect(codes).toContain('THERAPIST_CASELOAD');
  });
  test('includes PROGRAM_OUTCOMES report', async () => {
    const codes = (await reportsEngine.listBuiltinReports()).map(r => r.code);
    expect(codes).toContain('PROGRAM_OUTCOMES');
  });
  test('count matches builtinReports object keys', async () => {
    const list = await reportsEngine.listBuiltinReports();
    const keys = Object.keys(reportsEngine.builtinReports);
    expect(list.length).toBe(keys.length);
  });
});

// ─── builtinReports — structure checks ───────────────────────────────────────

describe('builtinReports structure', () => {
  test('each builtin has a generate function', () => {
    for (const [code, r] of Object.entries(reportsEngine.builtinReports)) {
      expect(typeof r.generate).toBe('function');
    }
  });
  test('BENEFICIARY_PROGRESS scope is "beneficiary"', () => {
    expect(reportsEngine.builtinReports.BENEFICIARY_PROGRESS.scope).toBe('beneficiary');
  });
  test('THERAPIST_CASELOAD scope is "therapist"', () => {
    expect(reportsEngine.builtinReports.THERAPIST_CASELOAD.scope).toBe('therapist');
  });
  test('PROGRAM_OUTCOMES scope is "program"', () => {
    expect(reportsEngine.builtinReports.PROGRAM_OUTCOMES.scope).toBe('program');
  });
  test('PROGRAM_OUTCOMES category is "outcomes"', () => {
    expect(reportsEngine.builtinReports.PROGRAM_OUTCOMES.category).toBe('outcomes');
  });
});

// ─── generateReport — error when template not found ───────────────────────────

describe('ReportsEngine.generateReport() — unknown template', () => {
  beforeEach(() => {
    // model from top-of-file mockMongooseModel
    const nullChain = { lean: jest.fn().mockResolvedValue(null) };
    mockMongooseModel.mockReturnValue({
      findOne: jest.fn().mockReturnValue(nullChain),
      findById: jest.fn().mockReturnValue(nullChain),
      create: jest.fn().mockResolvedValue({ _id: 'r1', status: 'generating', save: jest.fn() }),
    });
  });

  test('throws when neither builtin nor template found', async () => {
    await expect(
      reportsEngine.generateReport('NONEXISTENT_CODE', { userId: 'u1' })
    ).rejects.toThrow(/غير موجود/);
  });
});

// ─── listReports / listTemplates — query structure ────────────────────────────

describe('ReportsEngine.listReports()', () => {
  test('calls GeneratedReport.find with isDeleted:false', async () => {
    const mockFind = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    const mockModel = {
      find: jest.fn().mockReturnValue(mockFind),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    // model from top-of-file mockMongooseModel
    mockMongooseModel.mockReturnValue(mockModel);

    const result = await reportsEngine.listReports({ page: 1, limit: 10 });
    expect(mockModel.find).toHaveBeenCalledWith(expect.objectContaining({ isDeleted: false }));
    expect(result).toMatchObject({ data: [], total: 0, page: 1, limit: 10 });
  });
});

describe('ReportsEngine.listTemplates()', () => {
  test('calls ReportTemplate.find with isDeleted:false and status', async () => {
    const mockFind = { sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
    // model from top-of-file mockMongooseModel
    mockMongooseModel.mockReturnValue({ find: jest.fn().mockReturnValue(mockFind) });

    const result = await reportsEngine.listTemplates({ status: 'active' });
    expect(Array.isArray(result)).toBe(true);
  });
});
