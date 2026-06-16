/**
 * Regression test: parent-portal change-phone / settings used to return success
 * WITHOUT persisting to the Guardian record (silent no-op TODOs). This locks in
 * that `persistCurrentGuardian` resolves the guardian by the JWT's guardianPhone
 * and writes via findOneAndUpdate, is a safe no-op without identity, and is
 * best-effort (swallows DB errors).
 */
'use strict';

jest.unmock('mongoose');

const mongoose = require('mongoose');
const route = require('../routes/parent-portal-enhanced.routes');
const { persistCurrentGuardian } = route;

describe('parent-portal persistCurrentGuardian', () => {
  afterEach(() => jest.restoreAllMocks());

  it('exposes the helper for testing', () => {
    expect(typeof persistCurrentGuardian).toBe('function');
  });

  it('updates the Guardian matched by the current guardianPhone', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'g1', phone: '0500000001' });
    jest.spyOn(mongoose, 'model').mockReturnValue({ findOneAndUpdate });

    const req = { user: { guardianPhone: '0500000000' } };
    const result = await persistCurrentGuardian(req, { phone: '0500000001' });

    expect(mongoose.model).toHaveBeenCalledWith('Guardian');
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { phone: '0500000000' },
      { $set: { phone: '0500000001' } },
      { new: true }
    );
    expect(result).toEqual({ _id: 'g1', phone: '0500000001' });
  });

  it('is a no-op (no DB call) when there is no authenticated guardianPhone', async () => {
    const spy = jest.spyOn(mongoose, 'model');
    const result = await persistCurrentGuardian({ user: {} }, { phone: 'x' });
    expect(result).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('is a no-op when req has no user at all', async () => {
    const spy = jest.spyOn(mongoose, 'model');
    expect(await persistCurrentGuardian({}, { language: 'en' })).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('swallows DB errors and returns null (best-effort persistence)', async () => {
    jest.spyOn(mongoose, 'model').mockReturnValue({
      findOneAndUpdate: jest.fn().mockRejectedValue(new Error('db down')),
    });
    const result = await persistCurrentGuardian(
      { user: { guardianPhone: '0500000000' } },
      { phone: '0500000001' }
    );
    expect(result).toBeNull();
  });

  it('persists settings updates (e.g. language) via the same path', async () => {
    const findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'g2', language: 'en' });
    jest.spyOn(mongoose, 'model').mockReturnValue({ findOneAndUpdate });

    const result = await persistCurrentGuardian(
      { user: { guardianPhone: '0500000000' } },
      { language: 'en' }
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { phone: '0500000000' },
      { $set: { language: 'en' } },
      { new: true }
    );
    expect(result).toEqual({ _id: 'g2', language: 'en' });
  });
});
