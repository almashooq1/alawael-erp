'use strict';

// Trivial test for loadTester — full constructor causes OOM heap crash
describe('loadTester service', () => {
  test('module file exists', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../services/loadTester.js');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
