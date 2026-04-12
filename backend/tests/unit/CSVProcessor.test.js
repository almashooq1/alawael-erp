/**
 * Unit Tests — CSVProcessor.js
 * Tests only PURE methods (transformData, convertType, mapColumns, filterData)
 * Skips I/O methods (importCSV, exportToCSV, sampleCSV, etc.) that need fs/csv-parse
 */
'use strict';

jest.mock('fs');
jest.mock('csv-parse', () => ({ parse: jest.fn() }));
jest.mock('csv-stringify', () => ({ stringify: jest.fn() }));

const CSVProcessor = require('../../services/migration/CSVProcessor');

let processor;
beforeEach(() => {
  processor = new CSVProcessor({ delimiter: ',', encoding: 'utf-8', maxRowsPerChunk: 100 });
});

// ═══════════════════════════════════════
//  Constructor / Defaults
// ═══════════════════════════════════════
describe('constructor', () => {
  it('sets defaults when no options', () => {
    const p = new CSVProcessor();
    expect(p.options.delimiter).toBe(',');
    expect(p.options.encoding).toBe('utf-8');
    expect(p.options.maxRowsPerChunk).toBe(1000);
    expect(p.importedData).toEqual([]);
    expect(p.errorLog).toEqual([]);
  });

  it('accepts custom options', () => {
    const p = new CSVProcessor({ delimiter: ';', encoding: 'windows-1256', maxRowsPerChunk: 500 });
    expect(p.options.delimiter).toBe(';');
    expect(p.options.encoding).toBe('windows-1256');
    expect(p.options.maxRowsPerChunk).toBe(500);
  });
});

// ═══════════════════════════════════════
//  clearData / getErrorLog
// ═══════════════════════════════════════
describe('clearData', () => {
  it('clears importedData and errorLog', () => {
    processor.importedData = [{ a: 1 }];
    processor.errorLog = [{ msg: 'err' }];
    processor.clearData();
    expect(processor.importedData).toEqual([]);
    expect(processor.errorLog).toEqual([]);
  });
});

describe('getErrorLog', () => {
  it('returns errorLog array', () => {
    processor.errorLog = [{ row: 1, msg: 'bad' }];
    expect(processor.getErrorLog()).toEqual([{ row: 1, msg: 'bad' }]);
  });

  it('empty by default', () => {
    expect(processor.getErrorLog()).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  convertType
// ═══════════════════════════════════════
describe('convertType', () => {
  // null/undefined/empty → null
  it('null → null', () => expect(processor.convertType(null, 'number')).toBeNull());
  it('undefined → null', () => expect(processor.convertType(undefined, 'number')).toBeNull());
  it('empty string → null', () => expect(processor.convertType('', 'string')).toBeNull());

  // string
  it('string', () => {
    expect(processor.convertType(42, 'string')).toBe('42');
    expect(processor.convertType('hello', 'string')).toBe('hello');
  });

  // number
  it('number', () => {
    expect(processor.convertType('42', 'number')).toBe(42);
    expect(processor.convertType('3.14', 'number')).toBeCloseTo(3.14);
    expect(processor.convertType('abc', 'number')).toBeNaN();
  });

  // integer
  it('integer', () => {
    expect(processor.convertType('42', 'integer')).toBe(42);
    expect(processor.convertType('3.7', 'integer')).toBe(3);
  });

  // float
  it('float', () => {
    expect(processor.convertType('3.14', 'float')).toBeCloseTo(3.14);
    expect(processor.convertType('42', 'float')).toBe(42);
  });

  // boolean — only true, '1', 'true', 'yes' are truthy
  it('boolean truthy', () => {
    expect(processor.convertType(true, 'boolean')).toBe(true);
    expect(processor.convertType('1', 'boolean')).toBe(true);
    expect(processor.convertType('true', 'boolean')).toBe(true);
    expect(processor.convertType('yes', 'boolean')).toBe(true);
  });

  it('boolean falsy', () => {
    expect(processor.convertType('false', 'boolean')).toBe(false);
    expect(processor.convertType('0', 'boolean')).toBe(false);
    expect(processor.convertType('no', 'boolean')).toBe(false);
    expect(processor.convertType('xyz', 'boolean')).toBe(false);
  });

  // date → ISO string
  it('date returns ISO string', () => {
    const d = processor.convertType('2025-06-15', 'date');
    expect(typeof d).toBe('string');
    expect(d).toContain('2025-06-15');
  });

  // json
  it('json valid', () => {
    expect(processor.convertType('{"a":1}', 'json')).toEqual({ a: 1 });
  });

  it('json invalid → null', () => {
    expect(processor.convertType('not-json', 'json')).toBeNull();
  });

  // unknown type → returns value as-is
  it('unknown type returns raw', () => {
    expect(processor.convertType('hello', 'unknown_type')).toBe('hello');
    expect(processor.convertType(42, 'xyz')).toBe(42);
  });
});

// ═══════════════════════════════════════
//  mapColumns  (only maps source→target, unmapped cols NOT kept)
// ═══════════════════════════════════════
describe('mapColumns', () => {
  it('maps source columns to target names', () => {
    const data = [{ old_name: 'val1', color: 'red' }];
    const mapping = { old_name: 'new_name', color: 'colour' };
    const r = processor.mapColumns(data, mapping);
    expect(r[0]).toEqual({ new_name: 'val1', colour: 'red' });
  });

  it('ignores mapping for missing source columns', () => {
    const data = [{ a: 1 }];
    const mapping = { a: 'x', nonexistent: 'y' };
    const r = processor.mapColumns(data, mapping);
    expect(r[0]).toEqual({ x: 1 });
  });

  it('handles empty data', () => {
    expect(processor.mapColumns([], { a: 'b' })).toEqual([]);
  });

  it('handles empty mapping', () => {
    const data = [{ a: 1, b: 2 }];
    const r = processor.mapColumns(data, {});
    expect(r[0]).toEqual({});
  });
});

// ═══════════════════════════════════════
//  filterData  (standard Array.filter with a function)
// ═══════════════════════════════════════
describe('filterData', () => {
  const data = [
    { name: 'أحمد', age: 25, status: 'active' },
    { name: 'سارة', age: 30, status: 'inactive' },
    { name: 'خالد', age: 20, status: 'active' },
  ];

  it('filters by predicate', () => {
    const r = processor.filterData(data, rec => rec.status === 'active');
    expect(r.length).toBe(2);
  });

  it('filters by numeric condition', () => {
    const r = processor.filterData(data, rec => rec.age > 25);
    expect(r.length).toBe(1);
    expect(r[0].name).toBe('سارة');
  });

  it('returns empty when no match', () => {
    const r = processor.filterData(data, rec => rec.age > 100);
    expect(r.length).toBe(0);
  });

  it('returns all when all match', () => {
    const r = processor.filterData(data, () => true);
    expect(r.length).toBe(3);
  });

  it('handles empty data', () => {
    expect(processor.filterData([], () => true)).toEqual([]);
  });
});

// ═══════════════════════════════════════
//  transformData (data, transformRules)
// ═══════════════════════════════════════
describe('transformData', () => {
  it('applies function rules', () => {
    const data = [{ name: 'ahmad', age: 25 }];
    const rules = { name: v => v.toUpperCase() };
    const r = processor.transformData(data, rules);
    expect(r[0].name).toBe('AHMAD');
    expect(r[0].age).toBe(25);
  });

  it('applies mapping rules', () => {
    const data = [{ status: 'A' }, { status: 'I' }];
    const rules = { status: { mapping: { A: 'active', I: 'inactive' } } };
    const r = processor.transformData(data, rules);
    expect(r[0].status).toBe('active');
    expect(r[1].status).toBe('inactive');
  });

  it('mapping: unknown value keeps original', () => {
    const data = [{ status: 'X' }];
    const rules = { status: { mapping: { A: 'active' } } };
    const r = processor.transformData(data, rules);
    expect(r[0].status).toBe('X');
  });

  it('applies type conversion rules', () => {
    const data = [{ age: '25', active: '1' }];
    const rules = {
      age: { type: 'number' },
      active: { type: 'boolean' },
    };
    const r = processor.transformData(data, rules);
    expect(r[0].age).toBe(25);
    expect(r[0].active).toBe(true);
  });

  it('skips fields not present in record', () => {
    const data = [{ name: 'test' }];
    const rules = { missing_field: { type: 'number' } };
    const r = processor.transformData(data, rules);
    expect(r[0]).toEqual({ name: 'test' });
  });

  it('function rule receives (value, record, index)', () => {
    const data = [{ x: 10 }, { x: 20 }];
    const rules = { x: (val, _rec, idx) => val + idx };
    const r = processor.transformData(data, rules);
    expect(r[0].x).toBe(10); // 10 + 0
    expect(r[1].x).toBe(21); // 20 + 1
  });

  it('empty data returns empty', () => {
    expect(processor.transformData([], { a: { type: 'number' } })).toEqual([]);
  });

  it('preserves untouched fields', () => {
    const data = [{ a: '1', b: 'hello', c: 'keep' }];
    const rules = { a: { type: 'number' } };
    const r = processor.transformData(data, rules);
    expect(r[0]).toEqual({ a: 1, b: 'hello', c: 'keep' });
  });
});
