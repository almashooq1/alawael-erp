#!/usr/bin/env node
// Service Port Scanner

const net = require('net');

const ports = [
  { name: 'Frontend', port: 3000 },
  { name: 'Backend API', port: 3001 },
  { name: 'PostgreSQL', port: 5432 },
  { name: 'Redis', port: 6379 },
  { name: 'Elasticsearch', port: 9200 },
  { name: 'MongoDB', port: 27017 },
];

console.log('\nSERVICE PORT STATUS\n' + '='.repeat(35));

let open = 0;
let closed = 0;

function checkPort(service) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      console.log(`[OPEN]  ${service.name.padEnd(20)} :${service.port}`);
      open++;
      socket.destroy();
      resolve();
    });
    socket.on('timeout', () => {
      console.log(`[DOWN]  ${service.name.padEnd(20)} :${service.port}`);
      closed++;
      socket.destroy();
      resolve();
    });
    socket.on('error', () => {
      console.log(`[DOWN]  ${service.name.padEnd(20)} :${service.port}`);
      closed++;
      resolve();
    });
    socket.connect(service.port, 'localhost');
  });
}

(async () => {
  for (const service of ports) {
    await checkPort(service);
  }

  console.log('='.repeat(35));
  console.log(`Services Running: ${open}/${ports.length}`);
  console.log('');

  if (open === 0) {
    console.log('No services are running.');
    console.log('Start with: npm run dev (or similar)');
  }
  console.log('');
})();
