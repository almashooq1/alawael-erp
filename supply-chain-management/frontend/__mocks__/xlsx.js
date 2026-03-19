/**
 * Mock for xlsx module used in tests
 */
module.exports = {
  utils: {
    json_to_sheet: jest.fn(() => ({})),
    book_new: jest.fn(() => ({ SheetNames: [], Sheets: {} })),
    book_append_sheet: jest.fn(),
    aoa_to_sheet: jest.fn(() => ({})),
    sheet_to_json: jest.fn(() => []),
  },
  writeFile: jest.fn(),
  read: jest.fn(() => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } })),
  write: jest.fn(() => new ArrayBuffer(0)),
};
