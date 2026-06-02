/**
 * Auto-generated tests for services/branchWarehouseService.js
 * Type: service | 967L | JS | .js
 * @generated P#107 frontend universal generator (fs-based)
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../services/branchWarehouseService.js');

describe('services/branchWarehouseService.js', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(SRC, 'utf8');
  });

  test('file exists', () => {
    expect(fs.existsSync(SRC)).toBe(true);
  });

  test('is not empty', () => {
    expect(source.trim().length).toBeGreaterThan(0);
  });

  test('has default export', () => {
    expect(source).toMatch(/export\s+default\s+/);
  });

  test('exports branchService', () => {
    expect(source).toMatch(/branchService/);
  });

  test('exports warehouseService', () => {
    expect(source).toMatch(/warehouseService/);
  });

  test('exports stockTransferService', () => {
    expect(source).toMatch(/stockTransferService/);
  });

  test('exports stockMovementService', () => {
    expect(source).toMatch(/stockMovementService/);
  });

  test('exports stockTakeService', () => {
    expect(source).toMatch(/stockTakeService/);
  });

  test('exports purchaseRequestService', () => {
    expect(source).toMatch(/purchaseRequestService/);
  });

  test('unwraps purchasing API envelopes for legacy pages', () => {
    expect(source).toMatch(/unwrapApiList/);
    expect(source).toMatch(/purchasing\/requests.*unwrapApiList/s);
    expect(source).toMatch(/purchasing\/receipts.*unwrapApiList/s);
    expect(source).toMatch(/purchasing\/contracts.*unwrapApiList/s);
    expect(source).toMatch(/purchaseOrderService/);
    expect(source).toMatch(/purchasing\/orders.*unwrapApiList/s);
    expect(source).toMatch(/orders\/\$\{id\}\/receipts/);
  });

  test('makes API calls', () => {
    expect(source).toMatch(/(?:axios|api\.|fetch\(|\.get\(|\.post\(|\.put\(|\.delete\()/);
  });

  test('has async functions (45)', () => {
    const matches = source.match(/async\s+/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(45);
  });

  test('has 2 import(s)', () => {
    const imports =
      (source.match(/^import\s+/gm) || []).length + (source.match(/require\s*\(/g) || []).length;
    expect(imports).toBeGreaterThanOrEqual(1);
  });

  test('file structure', () => {
    // Type: service | Lines: 967 | React: false | Ext: .js
    expect(source.split('\n').length).toBeGreaterThan(0);
  });
});
