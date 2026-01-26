// Comprehensive Phase 29-33 Endpoints Test
const http = require('http');

const endpoints = [
  // Phase 29: AI Integration (23 endpoints)
  'ai/llm/providers',
  'ai/llm/models',
  'ai/llm/costs',
  'ai/llm/conversation/test-conv',
  'ai/bi/trends/sales',
  'ai/bi/report/summary',
  // Phase 30: Quantum (22 endpoints)
  'quantum/readiness-assessment',
  'quantum/readiness-report',
  'quantum/mitigation-strategy',
  'quantum/advantage/factorization',
  // Phase 31: XR (24 endpoints)
  'xr/bci/capabilities',
  'xr/hologram/metrics/test-hologram',
  'xr/collaboration/metrics/test-session',
  // Phase 32: DevOps (25 endpoints)
  'devops/monitoring/health',
  'devops/monitoring/report',
  'devops/scaling/metrics',
  'devops/k8s/metrics/test-cluster',
  'devops/ml/metrics/test-deployment',
  // Phase 33: Optimization (22 endpoints)
  'optimization/performance/profile',
  'optimization/performance/bottlenecks',
  'optimization/db/metrics',
  'optimization/resources/report',
  'optimization/resources/analyze',
  'optimization/resources/storage',
  'optimization/uptime/metrics',
  'optimization/uptime/dr-status',
];

async function testEndpoint(path) {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/phases-29-33/${path}`,
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, res => {
      resolve({
        path,
        status: res.statusCode,
        ok: res.statusCode === 200,
      });
    });

    req.on('error', () => {
      resolve({ path, status: 'ERROR', ok: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ path, status: 'TIMEOUT', ok: false });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🧪 Testing Phase 29-33 Endpoints...\n');

  const results = await Promise.all(endpoints.map(testEndpoint));

  const ok = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log('\n📊 Results Summary:');
  console.log(
    `✅ Working: ${ok}/${endpoints.length} (${((ok / endpoints.length) * 100).toFixed(1)}%)`
  );
  console.log(`❌ Failed: ${failed}/${endpoints.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed Endpoints:');
    results
      .filter(r => !r.ok)
      .forEach(r => {
        console.log(`   ${r.path} (${r.status})`);
      });
  }

  console.log('\n✅ Working Endpoints:');
  results
    .filter(r => r.ok)
    .slice(0, 10)
    .forEach(r => {
      console.log(`   ${r.path}`);
    });

  return { ok, failed, total: endpoints.length };
}

runTests().then(result => {
  process.exit(result.failed > 0 ? 1 : 0);
});
