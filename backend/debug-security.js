#!/usr/bin/env node
/**
 * Debug script to check if suspiciousActivityDetector is blocking Phase 29-33 requests
 */

const { detectSuspiciousActivity } = require('./utils/security');

// Mock request object for Phase 29-33 endpoint
const mockRequest = {
  method: 'GET',
  path: '/api/phases-29-33/ai/llm/providers',
  body: {},
  query: {},
  params: {},
  headers: {},
};

console.log('🔍 Testing detectSuspiciousActivity with Phase 29-33 request...\n');
console.log('Request:', JSON.stringify(mockRequest, null, 2));

const isSuspicious = detectSuspiciousActivity(mockRequest);

console.log(`\nResult: ${isSuspicious ? '⚠️ SUSPICIOUS' : '✅ SAFE'}\n`);

// Test with more endpoints
const testCases = [
  { path: '/api/phases-29-33/ai/llm/providers', params: {} },
  { path: '/api/phases-29-33/quantum/crypto/key-status/test', params: { id: 'test' } },
  { path: '/api/phases-29-33/xr/hologram/render/holo-1', params: { id: 'holo-1' } },
  { path: '/api/phases-29-33/devops/k8s/metrics/cluster-1', params: { id: 'cluster-1' } },
];

console.log('🧪 Testing multiple endpoints:\n');
testCases.forEach(testCase => {
  const req = {
    method: 'GET',
    path: testCase.path,
    body: {},
    query: {},
    params: testCase.params,
    headers: {},
  };
  const result = detectSuspiciousActivity(req);
  console.log(`${result ? '⚠️ ' : '✅ '} ${testCase.path} - ${result ? 'BLOCKED' : 'ALLOWED'}`);
});
