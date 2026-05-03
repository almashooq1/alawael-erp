/**
 * pages-blockchain-csvParser.test.js
 *
 * Pure parsing tests for the BatchIssue CSV pipeline. We test the three
 * stages independently (parseCsv → rowsToObjects → rowToCertPayload) so a
 * regression in any layer fails loudly.
 */

import { parseCsv, rowsToObjects, rowToCertPayload } from '../pages/blockchain/csvParser';

describe('parseCsv', () => {
  it('parses simple comma-separated values', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('preserves embedded commas inside quoted fields', () => {
    expect(parseCsv('name,title\n"Doe, John","Hello"')).toEqual([
      ['name', 'title'],
      ['Doe, John', 'Hello'],
    ]);
  });

  it('unescapes "" → " inside quoted fields', () => {
    expect(parseCsv('q\n"He said ""hi"""')).toEqual([['q'], ['He said "hi"']]);
  });

  it('drops fully-empty trailing lines', () => {
    expect(parseCsv('a\n1\n\n')).toEqual([['a'], ['1']]);
  });

  it('keeps a trailing row that has no newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('rowsToObjects', () => {
  it('builds objects keyed by trimmed header names', () => {
    const out = rowsToObjects([
      ['  name ', 'age'],
      ['Ali', '30'],
    ]);
    expect(out.headers).toEqual(['name', 'age']);
    expect(out.objects).toEqual([{ name: 'Ali', age: '30' }]);
  });

  it('fills missing trailing columns with empty strings', () => {
    const out = rowsToObjects([['a', 'b', 'c'], ['1']]);
    expect(out.objects).toEqual([{ a: '1', b: '', c: '' }]);
  });

  it('returns empty when given no rows', () => {
    expect(rowsToObjects([])).toEqual({ headers: [], objects: [] });
  });
});

describe('rowToCertPayload', () => {
  it('maps the canonical columns into the cert payload shape', () => {
    const out = rowToCertPayload(
      {
        recipient_name_ar: 'علي',
        recipient_name_en: 'Ali',
        national_id: '1234567890',
        email: 'a@b.com',
        title_ar: 'إنجاز',
        title_en: 'Achievement',
      },
      'tpl-1'
    );
    expect(out).toEqual({
      template: 'tpl-1',
      recipient: {
        name: { ar: 'علي', en: 'Ali' },
        nationalId: '1234567890',
        email: 'a@b.com',
      },
      title: { ar: 'إنجاز', en: 'Achievement' },
      data: undefined,
    });
  });

  it('collects every "data.*" column into the dynamic data object', () => {
    const out = rowToCertPayload(
      { recipient_name_ar: 'A', title_ar: 'T', 'data.score': '92', 'data.course': 'OT-101' },
      undefined
    );
    expect(out.data).toEqual({ score: '92', course: 'OT-101' });
    expect(out.template).toBeUndefined();
  });

  it('omits empty optional fields rather than sending empty strings', () => {
    const out = rowToCertPayload({ recipient_name_ar: 'A', title_ar: 'T' }, '');
    expect(out.template).toBeUndefined();
    expect(out.recipient.nationalId).toBeUndefined();
    expect(out.recipient.email).toBeUndefined();
    expect(out.data).toBeUndefined();
  });
});
