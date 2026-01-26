// Load Testing Script - Node.js
const http = require('http');

const config = {
  host: 'localhost',
  port: 3001,
  path: '/api/dashboard',
  requests: process.argv[2] || 100,
  concurrency: process.argv[3] || 10,
};

const results = {
  total: 0,
  success: 0,
  failed: 0,
  times: [],
  errors: [],
};

const startTime = Date.now();

async function makeRequest() {
  return new Promise(resolve => {
    const reqStart = Date.now();
    const req = http.get(`http://${config.host}:${config.port}${config.path}`, res => {
      const reqTime = Date.now() - reqStart;
      results.times.push(reqTime);

      if (res.statusCode === 200) {
        results.success++;
      } else {
        results.failed++;
      }

      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', err => {
      results.failed++;
      results.errors.push(err.message);
      resolve();
    });
  });
}

async function runTest() {
  console.log(`\n🧪 Load Testing`);
  console.log(`   Total Requests: ${config.requests}`);
  console.log(`   Concurrency: ${config.concurrency}\n`);

  const batches = Math.ceil(config.requests / config.concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(config.concurrency, config.requests - batch * config.concurrency);
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      promises.push(makeRequest());
      results.total++;
    }

    await Promise.all(promises);
    process.stdout.write(`\r   ✓ ${results.total}/${config.requests} requests completed`);
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const avgTime =
    Math.round((results.times.reduce((a, b) => a + b, 0) / results.times.length) * 100) / 100;
  const minTime = Math.min(...results.times);
  const maxTime = Math.max(...results.times);
  const throughput = Math.round((config.requests / totalTime) * 100) / 100;

  console.log(`\n\n📊 Results:\n`);
  console.log(`   Total Time:      ${totalTime.toFixed(2)}s`);
  console.log(`   Successful:      ${results.success}/${results.total}`);
  console.log(`   Failed:          ${results.failed}/${results.total}`);
  console.log(`   Throughput:      ${throughput} req/sec`);
  console.log(`   Avg Response:    ${avgTime}ms`);
  console.log(`   Min Response:    ${minTime}ms`);
  console.log(`   Max Response:    ${maxTime}ms\n`);

  if (results.errors.length > 0) {
    console.log(`   Errors: ${results.errors[0]}\n`);
  }
}

runTest();
