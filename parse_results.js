const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, 'backend', 'jest-results.json');
const j = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

console.log(`Total suites: ${j.numTotalTestSuites}, Failed: ${j.numFailedTestSuites}, Passed: ${j.numPassedTestSuites}`);
console.log(`Total tests: ${j.numTotalTests}, Failed: ${j.numFailedTests}, Passed: ${j.numPassedTests}`);
console.log('');
console.log('=== FAILED SUITES ===');

j.testResults
  .filter(r => r.status === 'failed')
  .forEach(r => {
    const name = (r.testFilePath || r.testFileURL || 'unknown').replace(/.*[\\\/]/, '');
    const fails = (r.testResults || []).filter(t => t.status === 'failed');
    const firstError = r.failureMessage ? r.failureMessage.slice(0, 300) : '';
    console.log(`\nFAIL [${fails.length} tests] ${name}`);
    if (firstError && fails.length === 0) {
      console.log('  Error:', firstError.replace(/\n/g, '\n  ').slice(0, 200));
    }
    if (fails.length > 0) {
      fails.slice(0, 3).forEach(t => {
        const errMsg = (t.failureMessages || []).join('\n').slice(0, 150);
        console.log(`  - ${t.fullName}`);
        if (errMsg) console.log(`    ${errMsg.split('\n')[0]}`);
      });
      if (fails.length > 3) console.log(`  ... and ${fails.length - 3} more`);
    }
  });
