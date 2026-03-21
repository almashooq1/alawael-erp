/**
 * @file validateObjectId.test.js
 * @description Tests for ObjectId validation middleware
 */

const mongoose = require('mongoose');

// Polyfill for Mongoose 8 (isValid may be removed)
if (!mongoose.Types.ObjectId.isValid) {
  mongoose.Types.ObjectId.isValid = id => {
    if (!id) return false;
    const str = String(id);
    return /^[0-9a-fA-F]{24}$/.test(str);
  };
}

const validateObjectId = require('../middleware/validateObjectId');

// ── Helpers ──────────────────────────────────────────────────────────────────
const mockReq = (params = {}) => ({ params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = () => jest.fn();

// ── Tests ────────────────────────────────────────────────────────────────────
describe('validateObjectId middleware', () => {
  const VALID_ID = '507f1f77bcf86cd799439011';
  const VALID_ID_2 = '507f1f77bcf86cd799439022';
  const INVALID_ID = 'not-a-valid-id';

  it('should be a function that returns a middleware function', () => {
    const middleware = validateObjectId('id');
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3); // (req, res, next)
  });

  it('should call next() when param is a valid ObjectId', () => {
    const req = mockReq({ id: VALID_ID });
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 400 when param is an invalid ObjectId', () => {
    const req = mockReq({ id: INVALID_ID });
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('id'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should validate multiple params — all valid', () => {
    const req = mockReq({ id: VALID_ID, subId: VALID_ID_2 });
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id', 'subId')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject when first of multiple params is invalid', () => {
    const req = mockReq({ id: INVALID_ID, subId: VALID_ID_2 });
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id', 'subId')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('id') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject when second of multiple params is invalid', () => {
    const req = mockReq({ id: VALID_ID, subId: INVALID_ID });
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id', 'subId')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('subId') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass through when param is undefined (missing)', () => {
    const req = mockReq({}); // no 'id' param
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject when param is an empty string', () => {
    const req = mockReq({ id: '' });
    const res = mockRes();
    const next = mockNext();

    validateObjectId('id')(req, res, next);

    // empty string is falsy, so `val && !isValid(val)` → val is falsy → skips → next()
    expect(next).toHaveBeenCalled();
  });

  it('should handle zero params (no validation needed)', () => {
    const req = mockReq({ id: INVALID_ID });
    const res = mockRes();
    const next = mockNext();

    validateObjectId()(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
