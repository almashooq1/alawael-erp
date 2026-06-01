'use strict';

/**
 * W750 — WhatsAppContactGroup CSV export pure-helper drift guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Exercises membersToCsv / csvCell via the helpers attached to module.exports
 * (the global mongoose mock can't run custom statics).
 */

const Group = require('../models/WhatsAppContactGroup');

describe('W750 WhatsAppContactGroup — membersToCsv / csvCell', () => {
  it('renders a header and one row per member', () => {
    const csv = Group.membersToCsv({
      members: [
        { phone: '966500000001', displayName: 'Ahmed', addedAt: '2026-01-02T03:04:05.000Z' },
        { phone: '+966500000002', displayName: 'Sara' },
      ],
    });
    const lines = csv.split('\n');
    expect(lines[0]).toBe('phone,displayName,addedAt');
    expect(lines[1]).toBe('966500000001,Ahmed,2026-01-02T03:04:05.000Z');
    // phone normalised (no +); empty addedAt cell
    expect(lines[2]).toBe('966500000002,Sara,');
  });

  it('is header-only for a missing / empty members array', () => {
    expect(Group.membersToCsv({})).toBe('phone,displayName,addedAt');
    expect(Group.membersToCsv(null)).toBe('phone,displayName,addedAt');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(Group.csvCell('a,b')).toBe('"a,b"');
    expect(Group.csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(Group.csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formula injection', () => {
    expect(Group.csvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(Group.csvCell('+1')).toBe("'+1");
    expect(Group.csvCell('-1')).toBe("'-1");
    expect(Group.csvCell('@cmd')).toBe("'@cmd");
  });

  it('escapes a malicious displayName end-to-end', () => {
    const csv = Group.membersToCsv({
      members: [{ phone: '966500000003', displayName: '=HYPERLINK("evil")' }],
    });
    expect(csv.split('\n')[1]).toBe(`966500000003,"'=HYPERLINK(""evil"")",`);
  });
});
