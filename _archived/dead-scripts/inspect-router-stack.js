#!/usr/bin/env node
/* eslint-disable no-unused-vars, no-undef, no-empty, prefer-const, no-constant-condition, no-unused-expressions */
/**
 * Express Router Stack Inspector
 * Shows all mounted routes and their order
 */

const express = require('express');
const app = require('./server.js');

console.log('\n╔═══════════════════════════════════════════════════════╗');
console.log('║  Express Router Stack Inspector                       ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

if (app._router && app._router.stack) {
  console.log(`Total middleware/routes: ${app._router.stack.length}\n`);

  let routeIndex = 0;
  app._router.stack.forEach((layer, i) => {
    if (layer.route) {
      // Direct route
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      console.log(`${i.toString().padStart(3)}: [${methods.padEnd(6)}] ${layer.route.path}`);
    } else if (layer.name === 'router') {
      // Mounted router
      const path = layer.regexp.toString();
      const cleanPath = path.includes('phases-29-33')
        ? '/api/phases-29-33'
        : path.includes('phases-21-28')
          ? '/api/phases-21-28'
          : path.match(/\/api[^\\]*/)?.[0] || 'unknown';
      console.log(
        `${i.toString().padStart(3)}: [ROUTER] ${cleanPath} (${layer.handle.stack ? layer.handle.stack.length : '?'} routes)`
      );

      if (cleanPath.includes('phases-29-33') || cleanPath.includes('phases-21-28')) {
        routeIndex++;
      }
    } else if (layer.name) {
      // Middleware
      if (i < 30 || layer.name.includes('phase') || layer.name.includes('error')) {
        console.log(`${i.toString().padStart(3)}: [MW]     ${layer.name}`);
      }
    }
  });

  console.log(`\n✅ Found ${routeIndex} phase-related routers\n`);
} else {
  console.log('❌ Cannot access router stack\n');
}

process.exit(0);
