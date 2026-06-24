'use strict';

/**
 * W1457 — user-management privilege-ceiling guard.
 *
 * BUG: routes/user-management.routes.js admits manager(70)/hr(60) to its router and
 * hand-copies role/customPermissions/deniedPermissions from the body with only a
 * super_admin carve-out — so a manager/hr user could set role:"admin" on anyone
 * (incl. themselves) or grant *:* permissions = vertical privilege escalation.
 *
 * FIX: assertUserMutationAllowed enforces (a) can't assign a role above your own,
 * (b) can't change your OWN role/permissions, (c) granting permissions needs admin tier.
 */

const { assertUserMutationAllowed } = require('../authorization/user-mutation-authz');

describe('W1457 assertUserMutationAllowed', () => {
  test('manager/hr CANNOT assign admin (the escalation vector)', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'manager', actorId: 'm1', targetUserId: 'u2', newRole: 'admin' })
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      assertUserMutationAllowed({ actorRole: 'hr', actorId: 'h1', targetUserId: 'u2', newRole: 'admin' })
    ).toMatchObject({ ok: false, status: 403 });
  });

  test('admin CAN assign roles at or below admin level', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'admin', actorId: 'a1', targetUserId: 'u2', newRole: 'manager' }).ok
    ).toBe(true);
    expect(
      assertUserMutationAllowed({ actorRole: 'admin', actorId: 'a1', targetUserId: 'u2', newRole: 'admin' }).ok
    ).toBe(true);
  });

  test('cannot assign a role ABOVE your own (admin cannot assign super_admin)', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'admin', actorId: 'a1', targetUserId: 'u2', newRole: 'super_admin' })
    ).toMatchObject({ ok: false, status: 403 });
  });

  test('cannot change your OWN role or permissions', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'admin', actorId: 'a1', targetUserId: 'a1', newRole: 'manager' })
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      assertUserMutationAllowed({ actorRole: 'admin', actorId: 'a1', targetUserId: 'a1', settingPermissions: true })
    ).toMatchObject({ ok: false, status: 403 });
  });

  test('granting permissions requires admin tier; manager is rejected, admin allowed', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'manager', actorId: 'm1', targetUserId: 'u2', settingPermissions: true })
    ).toMatchObject({ ok: false, status: 403 });
    expect(
      assertUserMutationAllowed({ actorRole: 'admin', actorId: 'a1', targetUserId: 'u2', settingPermissions: true }).ok
    ).toBe(true);
  });

  test('a non-role, non-permission update (e.g. profile fields) is allowed for manager', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'manager', actorId: 'm1', targetUserId: 'u2' }).ok
    ).toBe(true);
  });

  test('super_admin can assign admin', () => {
    expect(
      assertUserMutationAllowed({ actorRole: 'super_admin', actorId: 's1', targetUserId: 'u2', newRole: 'admin' }).ok
    ).toBe(true);
  });
});
