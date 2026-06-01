'use strict';

/**
 * W751 — WhatsAppContactGroup CSV import pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises parseCsvMembers / parseCsvLine via the helpers attached to
 * module.exports, and verifies a round-trip with W750's membersToCsv.
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W751 WhatsAppContactGroup — parseCsvMembers / parseCsvLine', () => {
  it('parses a header + rows into normalized, de-duped members', () => {
    const csv = [
      'phone,displayName,addedAt',
      '966500000001,Ahmed,2026-01-01T00:00:00.000Z',
      '+966500000002,Sara,',
      '966500000001,Ahmed Dup,', // duplicate phone → last wins
    ].join('\n');
    const members = Group.parseCsvMembers(csv);
    expect(members).toHaveLength(2);
    const byPhone = Object.fromEntries(members.map(m => [m.phone, m.displayName]));
    expect(byPhone['966500000001']).toBe('Ahmed Dup');
    expect(byPhone['966500000002']).toBe('Sara');
  });

  it('returns [] for empty / header-only / phone-less input', () => {
    expect(Group.parseCsvMembers('')).toEqual([]);
    expect(Group.parseCsvMembers('phone,displayName')).toEqual([]);
    expect(Group.parseCsvMembers('name,city\nAhmed,Riyadh')).toEqual([]);
  });

  it('honours quoted cells and strips the injection guard prefix', () => {
    expect(Group.parseCsvLine('966500000003,"Smith, Jr.",x')).toEqual([
      '966500000003',
      'Smith, Jr.',
      'x',
    ]);
    expect(Group.parseCsvLine('966500000004,"say ""hi""",y')).toEqual([
      '966500000004',
      'say "hi"',
      'y',
    ]);
    // leading guard quote (csvCell output) is removed on parse
    expect(Group.parseCsvLine("966500000005,'=SUM(A1)")).toEqual(['966500000005', '=SUM(A1)']);
  });

  it('round-trips with membersToCsv (export → import)', () => {
    const original = {
      members: [
        { phone: '966500000006', displayName: 'Comma, Name', addedAt: new Date() },
        { phone: '966500000007', displayName: '=HYPERLINK("evil")' },
      ],
    };
    const csv = Group.membersToCsv(original);
    const back = Group.parseCsvMembers(csv);
    expect(back).toHaveLength(2);
    const byPhone = Object.fromEntries(back.map(m => [m.phone, m.displayName]));
    expect(byPhone['966500000006']).toBe('Comma, Name');
    expect(byPhone['966500000007']).toBe('=HYPERLINK("evil")');
  });
});
