/**
 * Mock for exceljs module used in tests
 */
const mockWorksheet = {
  columns: [],
  addRows: jest.fn(),
  getRow: jest.fn(() => ({ font: {}, eachCell: jest.fn() })),
  eachRow: jest.fn(),
};

const mockWorkbook = {
  addWorksheet: jest.fn(() => mockWorksheet),
  xlsx: {
    writeBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
    load: jest.fn(() => Promise.resolve()),
  },
  worksheets: [mockWorksheet],
};

const ExcelJS = {
  Workbook: jest.fn(() => mockWorkbook),
};

module.exports = ExcelJS;
module.exports.default = ExcelJS;
