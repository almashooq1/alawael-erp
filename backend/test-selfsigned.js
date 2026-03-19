#!/usr/bin/env node

/**
 * Quick test to see what selfsigned returns
 */

const selfsigned = require('selfsigned');

const attrs = [{ name: 'commonName', value: 'localhost' }];
const result = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
});

console.log('Result type:', typeof result);
console.log('Result keys:', Object.keys(result));
console.log('Result:', result);

// Check for arrays
if (Array.isArray(result)) {
  console.log('Result is array with', result.length, 'items');
  result.forEach((item, idx) => {
    console.log(`Item ${idx}:`, typeof item, item ? item.substring(0, 50) : 'null');
  });
}
