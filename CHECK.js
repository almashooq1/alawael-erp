#!/usr/bin/env node
// FAST HEALTH CHECK - Plain English Version

const fs = require('fs');

console.log('\n--- FAST PROJECT HEALTH CHECK ---\n');

let good = 0, bad = 0;

function check(name, exists) {
  const status = exists ? 'PASS' : 'FAIL';
  const symbol = exists ? '[✓]' : '[✗]';
  console.log(`${symbol} ${name.padEnd(25)} ${status}`);
  exists ? good++ : bad++;
}

check('package.json', fs.existsSync('package.json'));
check('node_modules', fs.existsSync('node_modules'));
check('.env or .env.example', fs.existsSync('.env') || fs.existsSync('.env.example'));
check('docker-compose.yml', fs.existsSync('docker-compose.yml'));
check('.git folder', fs.existsSync('.git'));
check('tests config', fs.existsSync('jest.config.js') || fs.existsSync('tests'));
check('README.md', fs.existsSync('README.md'));
check('backend folder', fs.existsSync('backend') || fs.existsSync('api') || fs.existsSync('server'));
check('frontend folder', fs.existsSync('frontend') || fs.existsSync('client') || fs.existsSync('web'));

const score = (good / (good + bad)) * 100;

console.log('\n' + '='.repeat(40));
console.log(`Score: ${Math.round(score)}/100`);
console.log('Status: ' + (score > 80 ? 'GOOD' : score > 60 ? 'OK' : 'NEEDS WORK'));
console.log('='.repeat(40) + '\n');

if (bad > 0) {
  console.log('Next Steps:');
  if (!fs.existsSync('package.json')) console.log('  - npm init');
  if (!fs.existsSync('node_modules')) console.log('  - npm install');
  if (!fs.existsSync('.env')) console.log('  - Edit .env file');
  console.log('\n');
}

console.log('Run full analysis:');
console.log('  node QUICK_START_ANALYZER.js');
console.log('  node PROJECT_ANALYZER_ADVANCED.js');
console.log('');
