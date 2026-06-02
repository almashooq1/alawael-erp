'use strict';

/**
 * W761 — WhatsAppContactGroup paginateMembers pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises paginateMembers via the helper attached to module.exports — backs
 * the JSON members-listing route's page/limit support.
 */

const Group = require('../models/WhatsAppContactGroup');

const MEMBERS = Array.from({ length: 25 }, (_, i) => ({
  phone: `9665000000${String(i).padStart(2, '0')}`,
  displayName: `M${i}`,
}));

describe('W761 WhatsAppContactGroup — paginateMembers', () => {
  it('returns the first page with metadata', () => {
    const r = Group.paginateMembers(MEMBERS, 1, 10);
    expect(r.items).toHaveLength(10);
    expect(r).toMatchObject({ page: 1, limit: 10, total: 25, totalPages: 3 });
    expect(r.items[0].phone).toBe(MEMBERS[0].phone);
  });

  it('returns the correct slice for a later page', () => {
    const r = Group.paginateMembers(MEMBERS, 3, 10);
    expect(r.items).toHaveLength(5);
    expect(r.items[0].phone).toBe(MEMBERS[20].phone);
  });

  it('clamps an out-of-range page to the last page', () => {
    const r = Group.paginateMembers(MEMBERS, 99, 10);
    expect(r.page).toBe(3);
    expect(r.items).toHaveLength(5);
  });

  it('clamps limit to [1, 200] and defaults sanely', () => {
    expect(Group.paginateMembers(MEMBERS, 1, 9999).limit).toBe(200);
    expect(Group.paginateMembers(MEMBERS, 1, 0).limit).toBe(50);
  });

  it('is robust to empty / nullish input', () => {
    const r = Group.paginateMembers(null, 1, 10);
    expect(r).toMatchObject({ items: [], total: 0, totalPages: 1, page: 1 });
  });
});
