/**
 * Wave 947 — regression guard: authenticateToken aliases req.user._id from the
 * JWT `id`.
 *
 * The JWT payload (generateToken) carries `id`, not `_id`, and `req.user =
 * decoded`. Hundreds of routes read `req.user._id` to stamp createdBy /
 * uploadedBy / performedBy / audit actor — all of which were silently null.
 * aliasUserId() now copies id → _id once at decode.
 */

'use strict';

jest.mock('../utils/tokenBlacklist', () => ({ isBlacklisted: jest.fn(async () => false) }));

const auth = require('../middleware/auth');
const { generateToken } = auth;

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('W947 — auth aliases req.user._id from JWT id', () => {
  it('authenticateToken sets req.user._id === the JWT id (was undefined before)', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const token = generateToken({ id: userId, email: 'x@y.z', role: 'therapist' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = jest.fn();

    await auth.authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeTruthy();
    expect(req.user.id).toBe(userId);
    expect(req.user._id).toBe(userId); // the fix — previously undefined
  });
});
