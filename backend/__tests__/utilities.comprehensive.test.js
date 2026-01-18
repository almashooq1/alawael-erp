/**
 * Utility Functions Tests
 * Tests for helper and utility functions
 */

describe('String Utilities', () => {
  test('should trim whitespace', () => {
    const input = '  hello world  ';
    expect(input.trim()).toBe('hello world');
  });

  test('should convert to uppercase', () => {
    const input = 'hello';
    expect(input.toUpperCase()).toBe('HELLO');
  });

  test('should convert to lowercase', () => {
    const input = 'HELLO';
    expect(input.toLowerCase()).toBe('hello');
  });

  test('should check string includes substring', () => {
    const str = 'hello world';
    expect(str.includes('world')).toBe(true);
    expect(str.includes('foo')).toBe(false);
  });

  test('should split string by delimiter', () => {
    const str = 'a,b,c';
    expect(str.split(',')).toEqual(['a', 'b', 'c']);
  });

  test('should replace substring', () => {
    const str = 'hello world';
    expect(str.replace('world', 'there')).toBe('hello there');
  });

  test('should check string starts with', () => {
    const str = 'hello world';
    expect(str.startsWith('hello')).toBe(true);
    expect(str.startsWith('world')).toBe(false);
  });

  test('should check string ends with', () => {
    const str = 'hello world';
    expect(str.endsWith('world')).toBe(true);
    expect(str.endsWith('hello')).toBe(false);
  });

  test('should get string length', () => {
    expect('hello'.length).toBe(5);
    expect(''.length).toBe(0);
  });

  test('should get substring', () => {
    const str = 'hello world';
    expect(str.substring(0, 5)).toBe('hello');
    expect(str.substring(6)).toBe('world');
  });
});

describe('Array Utilities', () => {
  test('should get array length', () => {
    expect([1, 2, 3].length).toBe(3);
    expect([].length).toBe(0);
  });

  test('should push element to array', () => {
    const arr = [1, 2];
    arr.push(3);
    expect(arr).toEqual([1, 2, 3]);
  });

  test('should pop element from array', () => {
    const arr = [1, 2, 3];
    const last = arr.pop();
    expect(last).toBe(3);
    expect(arr).toEqual([1, 2]);
  });

  test('should check array includes element', () => {
    const arr = [1, 2, 3];
    expect(arr.includes(2)).toBe(true);
    expect(arr.includes(5)).toBe(false);
  });

  test('should map array elements', () => {
    const arr = [1, 2, 3];
    const result = arr.map(x => x * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  test('should filter array elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = arr.filter(x => x > 2);
    expect(result).toEqual([3, 4, 5]);
  });

  test('should reduce array', () => {
    const arr = [1, 2, 3, 4];
    const sum = arr.reduce((acc, x) => acc + x, 0);
    expect(sum).toBe(10);
  });

  test('should find element in array', () => {
    const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = arr.find(x => x.id === 2);
    expect(result).toEqual({ id: 2 });
  });

  test('should find index in array', () => {
    const arr = [1, 2, 3, 4];
    expect(arr.indexOf(2)).toBe(1);
    expect(arr.indexOf(5)).toBe(-1);
  });

  test('should reverse array', () => {
    const arr = [1, 2, 3];
    expect([...arr].reverse()).toEqual([3, 2, 1]);
  });

  test('should sort array', () => {
    const arr = [3, 1, 4, 1, 5, 9, 2, 6];
    const sorted = [...arr].sort((a, b) => a - b);
    expect(sorted[0]).toBe(1);
    expect(sorted[sorted.length - 1]).toBe(9);
  });

  test('should flatten array', () => {
    const arr = [[1, 2], [3, 4], [5]];
    const flat = arr.flat();
    expect(flat).toEqual([1, 2, 3, 4, 5]);
  });

  test('should join array elements', () => {
    const arr = [1, 2, 3];
    expect(arr.join(',')).toBe('1,2,3');
    expect(arr.join('-')).toBe('1-2-3');
  });

  test('should remove duplicates from array', () => {
    const arr = [1, 2, 2, 3, 3, 3];
    const unique = [...new Set(arr)];
    expect(unique).toEqual([1, 2, 3]);
  });
});

describe('Object Utilities', () => {
  test('should get object keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(Object.keys(obj)).toEqual(['a', 'b', 'c']);
  });

  test('should get object values', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(Object.values(obj)).toEqual([1, 2, 3]);
  });

  test('should get object entries', () => {
    const obj = { a: 1, b: 2 };
    expect(Object.entries(obj)).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  test('should merge objects', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { c: 3, d: 4 };
    const merged = { ...obj1, ...obj2 };
    expect(merged).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  test('should check object has property', () => {
    const obj = { a: 1, b: 2 };
    expect(Object.prototype.hasOwnProperty.call(obj, 'a')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(obj, 'c')).toBe(false);
  });

  test('should delete object property', () => {
    const obj = { a: 1, b: 2, c: 3 };
    delete obj.b;
    expect(obj).toEqual({ a: 1, c: 3 });
  });

  test('should assign to object', () => {
    const target = { a: 1 };
    const source = { b: 2, c: 3 };
    Object.assign(target, source);
    expect(target).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('should create object from entries', () => {
    const entries = [
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ];
    const obj = Object.fromEntries(entries);
    expect(obj).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('should freeze object', () => {
    const obj = { a: 1 };
    Object.freeze(obj);
    expect(() => {
      obj.a = 2;
    }).not.toThrow();
    expect(obj.a).toBe(1); // Frozen, unchanged
  });
});

describe('Number Utilities', () => {
  test('should check if number is integer', () => {
    expect(Number.isInteger(5)).toBe(true);
    expect(Number.isInteger(5.5)).toBe(false);
  });

  test('should check if number is NaN', () => {
    expect(Number.isNaN(NaN)).toBe(true);
    expect(Number.isNaN(5)).toBe(false);
  });

  test('should parse integer', () => {
    expect(parseInt('123')).toBe(123);
    expect(parseInt('123abc')).toBe(123);
  });

  test('should parse float', () => {
    expect(parseFloat('123.45')).toBe(123.45);
    expect(parseFloat('123.45abc')).toBe(123.45);
  });

  test('should format number to string', () => {
    const num = 123.456;
    expect(num.toString()).toBe('123.456');
    expect(num.toFixed(2)).toBe('123.46');
  });

  test('should get absolute value', () => {
    expect(Math.abs(5)).toBe(5);
    expect(Math.abs(-5)).toBe(5);
  });

  test('should get minimum number', () => {
    expect(Math.min(5, 3, 8, 1)).toBe(1);
  });

  test('should get maximum number', () => {
    expect(Math.max(5, 3, 8, 1)).toBe(8);
  });

  test('should round number', () => {
    expect(Math.round(4.5)).toBeGreaterThanOrEqual(4);
    expect(Math.round(4.6)).toBe(5);
  });

  test('should floor number', () => {
    expect(Math.floor(4.9)).toBe(4);
  });

  test('should ceil number', () => {
    expect(Math.ceil(4.1)).toBe(5);
  });

  test('should power number', () => {
    expect(Math.pow(2, 3)).toBe(8);
    expect(Math.pow(10, 2)).toBe(100);
  });

  test('should get square root', () => {
    expect(Math.sqrt(16)).toBe(4);
    expect(Math.sqrt(25)).toBe(5);
  });
});

describe('Date Utilities', () => {
  test('should create date', () => {
    const date = new Date('2025-01-14');
    expect(date instanceof Date).toBe(true);
  });

  test('should get current timestamp', () => {
    const now = Date.now();
    expect(typeof now).toBe('number');
    expect(now).toBeGreaterThan(0);
  });

  test('should format date to ISO string', () => {
    const date = new Date('2025-01-14T00:00:00Z');
    const isoString = date.toISOString();
    expect(isoString).toMatch(/2025-01-14/);
  });

  test('should get date components', () => {
    const date = new Date('2025-01-14');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0); // 0-indexed
    expect(date.getDate()).toBe(14);
  });

  test('should add days to date', () => {
    const date = new Date('2025-01-14');
    date.setDate(date.getDate() + 5);
    expect(date.getDate()).toBe(19);
  });

  test('should get time difference', () => {
    const date1 = new Date('2025-01-14');
    const date2 = new Date('2025-01-15');
    const diff = date2 - date1;
    expect(diff).toBe(24 * 60 * 60 * 1000); // 1 day in milliseconds
  });
});

describe('Type Checking Utilities', () => {
  test('should check if value is string', () => {
    expect(typeof 'hello').toBe('string');
    expect(typeof 123).not.toBe('string');
  });

  test('should check if value is number', () => {
    expect(typeof 123).toBe('number');
    expect(typeof 'hello').not.toBe('number');
  });

  test('should check if value is boolean', () => {
    expect(typeof true).toBe('boolean');
    expect(typeof 'true').not.toBe('boolean');
  });

  test('should check if value is object', () => {
    expect(typeof {}).toBe('object');
    expect(typeof []).toBe('object');
    expect(typeof null).toBe('object'); // Special case
  });

  test('should check if value is undefined', () => {
    let x;
    expect(typeof x).toBe('undefined');
    expect(typeof 0).not.toBe('undefined');
  });

  test('should check if value is function', () => {
    expect(typeof (() => {})).toBe('function');
    expect(typeof []).not.toBe('function');
  });

  test('should check if value is null', () => {
    expect(null === null).toBe(true);
    expect(undefined === null).toBe(false);
  });

  test('should check if array is array', () => {
    expect(Array.isArray([1, 2, 3])).toBe(true);
    expect(Array.isArray('not array')).toBe(false);
    expect(Array.isArray({})).toBe(false);
  });

  test('should check if object is instance of class', () => {
    class MyClass {}
    const obj = new MyClass();
    expect(obj instanceof MyClass).toBe(true);
    expect({} instanceof MyClass).toBe(false);
  });
});

describe('Conditional Utilities', () => {
  test('should evaluate ternary operator', () => {
    const x = 5;
    expect(x > 3 ? 'big' : 'small').toBe('big');
    expect(x < 3 ? 'big' : 'small').toBe('small');
  });

  test('should evaluate logical AND', () => {
    expect(true && true).toBe(true);
    expect(true && false).toBe(false);
    expect(false && true).toBe(false);
  });

  test('should evaluate logical OR', () => {
    expect(true || false).toBe(true);
    expect(false || true).toBe(true);
    expect(false || false).toBe(false);
  });

  test('should evaluate logical NOT', () => {
    expect(!true).toBe(false);
    expect(!false).toBe(true);
  });

  test('should use nullish coalescing', () => {
    expect(null ?? 'default').toBe('default');
    expect(undefined ?? 'default').toBe('default');
    expect('value' ?? 'default').toBe('value');
    expect(false ?? 'default').toBe(false);
  });

  test('should use optional chaining', () => {
    const obj = { a: { b: { c: 'value' } } };
    expect(obj?.a?.b?.c).toBe('value');
    expect(obj?.x?.y?.z).toBe(undefined);
  });
});

describe('Regular Expressions', () => {
  test('should match email pattern', () => {
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(email.test('user@example.com')).toBe(true);
    expect(email.test('invalid')).toBe(false);
  });

  test('should match phone pattern', () => {
    const phone = /^\d{10}$/;
    expect(phone.test('1234567890')).toBe(true);
    expect(phone.test('123456789')).toBe(false);
  });

  test('should match URL pattern', () => {
    const url = /^https?:\/\//;
    expect(url.test('https://example.com')).toBe(true);
    expect(url.test('ftp://example.com')).toBe(false);
  });

  test('should replace with regex', () => {
    const str = 'hello world world';
    expect(str.replace(/world/g, 'there')).toBe('hello there there');
  });

  test('should split with regex', () => {
    const str = 'a1b2c3';
    expect(str.split(/\d/)).toEqual(['a', 'b', 'c', '']);
  });
});

describe('Error Handling', () => {
  test('should throw error', () => {
    expect(() => {
      throw new Error('Test error');
    }).toThrow('Test error');
  });

  test('should catch error type', () => {
    expect(() => {
      throw new TypeError('Type error');
    }).toThrow(TypeError);
  });

  test('should handle error message', () => {
    expect(() => {
      throw new Error('Specific message');
    }).toThrow('Specific message');
  });

  test('should use try-catch', () => {
    let caught = false;
    try {
      throw new Error('Test');
    } catch (e) {
      caught = true;
      expect(e.message).toBe('Test');
    }
    expect(caught).toBe(true);
  });

  test('should have error stack trace', () => {
    const error = new Error('Test error');
    expect(error.stack).toContain('Test error');
  });
});

describe('Promise Utilities', () => {
  test('should resolve promise', async () => {
    const promise = Promise.resolve('value');
    const result = await promise;
    expect(result).toBe('value');
  });

  test('should reject promise', async () => {
    const promise = Promise.reject(new Error('rejected'));
    await expect(promise).rejects.toThrow('rejected');
  });

  test('should chain promises', async () => {
    const promise = Promise.resolve(5)
      .then(x => x * 2)
      .then(x => x + 3);
    expect(await promise).toBe(13);
  });

  test('should use Promise.all', async () => {
    const p1 = Promise.resolve(1);
    const p2 = Promise.resolve(2);
    const p3 = Promise.resolve(3);
    const result = await Promise.all([p1, p2, p3]);
    expect(result).toEqual([1, 2, 3]);
  });

  test('should use Promise.race', async () => {
    const p1 = new Promise(resolve => setTimeout(() => resolve(1), 100));
    const p2 = new Promise(resolve => setTimeout(() => resolve(2), 50));
    const result = await Promise.race([p1, p2]);
    expect(result).toBe(2);
  });
});
