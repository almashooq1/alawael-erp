#!/usr/bin/env node
const http = require('http');

const tests = [
  { path: '/health', desc: 'Health Check' },
  { path: '/api/phases-29-33/ai/llm/providers', desc: 'AI LLM Providers' },
  { path: '/api/phases-29-33/quantum/crypto/key-status/test1', desc: 'Quantum Crypto' },
  { path: '/api/phases-29-33/xr/hologram/render/h1', desc: 'XR Hologram' },
];

async function test(port, path, desc) {
  return new Promise(resolve => {
    http
      .get(`http://localhost:${port}${path}`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          const emoji = res.statusCode === 200 ? '✅' : '⚠️';
          console.log(`${emoji} [${res.statusCode}] ${desc.padEnd(25)} - ${path}`);
          resolve(res.statusCode);
        });
      })
      .on('error', e => {
        console.log(`❌ [ERROR] ${desc.padEnd(25)} - ${e.message}`);
        resolve(0);
      });
  });
}

async function runTests(port, serverName) {
  console.log(`\n╔═══════════════════════════════════════════════════════╗`);
  console.log(`║  ${serverName.padEnd(53)} ║`);
  console.log(`╚═══════════════════════════════════════════════════════╝\n`);

  for (const t of tests) {
    await test(port, t.path, t.desc);
    await new Promise(r => setTimeout(r, 200));
  }
}

(async () => {
  console.log('\n🧪 Comparative Test: Isolated vs Main Server\n');

  // Test isolated server (3099)
  await runTests(3099, 'Isolated Server (Port 3099)');

  // Test main server (3001)
  await runTests(3001, 'Main Server (Port 3001)');

  console.log('\n✨ Test Complete!\n');
  process.exit(0);
})();
