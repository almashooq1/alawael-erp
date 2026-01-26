#!/usr/bin/env node

console.log('╔═════════════════════════════════════════════════════════════════╗');
console.log('║         AlAwael ERP Backend - Production Mode                    ║');
console.log('║         النظام المتكامل للمؤسسات - وضع الإنتاج                  ║');
console.log('╚═════════════════════════════════════════════════════════════════╝\n');

console.log('[STARTUP] Loading environment variables...');
console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`[STARTUP] PORT: ${process.env.PORT || 3001}`);
console.log(`[STARTUP] USE_MOCK_DB: ${process.env.USE_MOCK_DB || 'false'}\n`);

// Load actual server
console.log('[STARTUP] Importing server.js...');
require('./server.js');
