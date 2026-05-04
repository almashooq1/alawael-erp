/**
 * Unit tests for domains/programs/services/ProgramsService.js
 * Tests pure/synchronous helper methods — no DB required.
 */
'use strict';

jest.mock('mongoose', () => ({ model: jest.fn() }));
jest.mock('../../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const {
  ProgramsService,
  programsService,
} = require('../../domains/programs/services/ProgramsService');

// ─── Module exports ───────────────────────────────────────────────────────────

describe('ProgramsService module exports', () => {
  test('exports ProgramsService class', () => {
    expect(typeof ProgramsService).toBe('function');
  });
  test('exports programsService singleton', () => {
    expect(programsService).toBeInstanceOf(ProgramsService);
  });
});

// ─── _notFound helper ────────────────────────────────────────────────────────

describe('ProgramsService._notFound()', () => {
  test('returns an Error with statusCode 404', () => {
    const err = programsService._notFound('test message');
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('test message');
  });
  test('returns a new Error each time', () => {
    const e1 = programsService._notFound('a');
    const e2 = programsService._notFound('b');
    expect(e1).not.toBe(e2);
    expect(e1.message).toBe('a');
    expect(e2.message).toBe('b');
  });
});

// ─── createProgram (mocked mongoose) ─────────────────────────────────────────

describe('ProgramsService.createProgram()', () => {
  let mockProgram;

  beforeEach(() => {
    mockProgram = { _id: 'p1', code: 'PROG-001', name_ar: 'برنامج' };
    const { model } = require('mongoose');
    model.mockReturnValue({ create: jest.fn().mockResolvedValue(mockProgram) });
  });

  test('returns created program', async () => {
    const result = await programsService.createProgram({ code: 'PROG-001', name_ar: 'برنامج' });
    expect(result).toEqual(mockProgram);
  });
});

// ─── updateProgram (mocked mongoose) ─────────────────────────────────────────

describe('ProgramsService.updateProgram()', () => {
  test('throws 404 when program not found', async () => {
    const { model } = require('mongoose');
    model.mockReturnValue({ findByIdAndUpdate: jest.fn().mockResolvedValue(null) });

    await expect(programsService.updateProgram('nonexistent-id', {})).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('returns updated program', async () => {
    const updated = { _id: 'p1', code: 'PROG-001', name_ar: 'updated' };
    const { model } = require('mongoose');
    model.mockReturnValue({ findByIdAndUpdate: jest.fn().mockResolvedValue(updated) });

    const result = await programsService.updateProgram('p1', { name_ar: 'updated' });
    expect(result).toEqual(updated);
  });
});

// ─── listPrograms (mocked mongoose) ──────────────────────────────────────────

describe('ProgramsService.listPrograms()', () => {
  beforeEach(() => {
    const { model } = require('mongoose');
    model.mockReturnValue({
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([{ _id: 'p1', code: 'A' }]),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
    });
  });

  test('returns programs with pagination', async () => {
    const result = await programsService.listPrograms({ page: 1, limit: 10 });
    expect(result).toMatchObject({ programs: [{ code: 'A' }], total: 1, page: 1 });
  });

  test('filters by status when provided', async () => {
    const { model } = require('mongoose');
    const mockFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    model.mockReturnValue({ find: mockFind, countDocuments: jest.fn().mockResolvedValue(0) });
    await programsService.listPrograms({ status: 'active' });
    expect(mockFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });
});

// ─── getProgram (mocked mongoose) ────────────────────────────────────────────

describe('ProgramsService.getProgram()', () => {
  test('throws 404 when not found', async () => {
    const mockPopulate = { lean: jest.fn().mockResolvedValue(null) };
    const { model } = require('mongoose');
    model.mockReturnValue({
      findById: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue(mockPopulate) }),
    });
    await expect(programsService.getProgram('bad-id')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('returns program when found', async () => {
    const prog = { _id: 'p1', code: 'A', name_ar: 'Test' };
    const mockPopulate = { lean: jest.fn().mockResolvedValue(prog) };
    const { model } = require('mongoose');
    model.mockReturnValue({
      findById: jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue(mockPopulate) }),
    });
    const result = await programsService.getProgram('p1');
    expect(result).toEqual(prog);
  });
});

// ─── _recordTimeline (mocked mongoose) ───────────────────────────────────────

describe('ProgramsService._recordTimeline()', () => {
  test('silently swallows errors', async () => {
    const { model } = require('mongoose');
    model.mockReturnValue({ create: jest.fn().mockRejectedValue(new Error('DB error')) });
    // Should not throw
    await expect(
      programsService._recordTimeline({
        beneficiaryId: 'b1',
        eventType: 'test',
        title: 't',
        userId: 'u',
      })
    ).resolves.toBeUndefined();
  });

  test('creates timeline event when DB works', async () => {
    const mockCreate = jest.fn().mockResolvedValue({});
    const { model } = require('mongoose');
    model.mockReturnValue({ create: mockCreate });
    await programsService._recordTimeline({
      beneficiaryId: 'b1',
      episodeId: 'e1',
      eventType: 'program_enrolled',
      title: 'test',
      description: 'desc',
      userId: 'u1',
      metadata: {},
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        beneficiaryId: 'b1',
        eventType: 'program_enrolled',
        category: 'clinical',
      })
    );
  });
});
