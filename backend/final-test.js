const http = require('http');

console.log('\n🧪 FINAL COMPREHENSIVE TEST\n');
console.log('Testing all 5 phases...\n');

const tests = [
  { phase: 'Phase 29 (AI)', endpoint: '/api/ai/llm/providers' },
  { phase: 'Phase 29 (AI)', endpoint: '/api/ai/llm/models' },
  { phase: 'Phase 30 (Quantum)', endpoint: '/api/quantum/readiness-assessment' },
  { phase: 'Phase 31 (XR)', endpoint: '/api/xr/bci/capabilities' },
  { phase: 'Phase 32 (DevOps)', endpoint: '/api/devops/monitoring/health' },
  { phase: 'Phase 33 (Optimization)', endpoint: '/api/optimization/performance/profile' },
];

let passed = 0;
let failed = 0;

function runTest(index) {
  if (index >= tests.length) {
    console.log(
      `\n📊 RESULTS: ${passed}/${tests.length} tests passed (${Math.round((passed / tests.length) * 100)}%)\n`
    );
    if (passed === tests.length) {
      console.log('✅ ALL SYSTEMS OPERATIONAL\n');
    } else {
      console.log(`⚠️  ${failed} endpoint(s) need attention\n`);
    }
    process.exit(0);
  }

  const test = tests[index];
  const url = `http://localhost:3001${test.endpoint}`;

  http
    .get(url, res => {
      if (res.statusCode === 200) {
        console.log(`✅ ${test.phase}: ${test.endpoint}`);
        passed++;
      } else {
        console.log(`⚠️  ${test.phase}: ${test.endpoint} (Status: ${res.statusCode})`);
        failed++;
      }
      runTest(index + 1);
    })
    .on('error', e => {
      console.log(`❌ ${test.phase}: ${test.endpoint} (Error: ${e.message})`);
      failed++;
      runTest(index + 1);
    });
}

runTest(0);
