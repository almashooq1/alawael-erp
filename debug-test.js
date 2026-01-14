#!/usr/bin/env node

const http = require('http');

// Test 1: Login
console.log('🔐 Testing Login...');

const loginOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const loginData = JSON.stringify({
  email: 'admin@alawael.com',
  password: 'Admin@123456',
});

const loginReq = http.request(loginOptions, res => {
  let data = '';
  res.on('data', chunk => (data += chunk));
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Response:', JSON.stringify(response, null, 2));

      if (response.data && response.data.accessToken) {
        const token = response.data.accessToken;
        console.log('\n✅ Token received:', token.substring(0, 30) + '...\n');

        // Test 2: Use token to access CRM
        setTimeout(() => {
          testCrmEndpoint(token);
        }, 1000);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});

loginReq.on('error', console.error);
loginReq.write(loginData);
loginReq.end();

function testCrmEndpoint(token) {
  console.log('📊 Testing CRM Dashboard...');
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/crm/dashboard',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, res => {
    let data = '';
    res.on('data', chunk => (data += chunk));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);

      try {
        const response = JSON.parse(data);
        console.log('Response keys:', Object.keys(response));
        if (response.kpis) {
          console.log('✅ Dashboard data received:', response.kpis.length, 'KPIs');
        }
      } catch (e) {
        console.log('Response (raw):', data.substring(0, 200));
      }
    });
  });

  req.on('error', console.error);
  req.end();
}
