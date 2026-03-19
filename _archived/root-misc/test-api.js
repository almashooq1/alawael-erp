#!/usr/bin/env node

/**
 * 🧪 نظام اختبار API تلقائي - ALAWAEL
 * 
 * هذا الملف يختبر الـ endpoints الأساسية للتأكد من أن النظام يعمل بشكل صحيح
 */

const http = require('http');

// ألوان للـ console (Windows/Unix compatible)
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

const API_BASE_URL = 'http://localhost:3000';
const ENDPOINTS = [
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/api/users', method: 'GET', name: 'Get Users' },
  { path: '/api/dashboard', method: 'GET', name: 'Dashboard' },
];

console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   🧪 نظام اختبار API الآلي - ALAWAEL              ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.blue}📍 Server: ${API_BASE_URL}${colors.reset}`);
console.log(`${colors.blue}⏰ الوقت: ${new Date().toLocaleString()}${colors.reset}\n`);

/**
 * اختبر endpoint واحد
 */
function testEndpoint(url, method = 'GET', index = 0) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const options = new URL(url);
    
    const request = http.request(options, (response) => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        const duration = Date.now() - startTime;
        const statusColor = response.statusCode === 200 ? colors.green : colors.yellow;
        const status = response.statusCode === 200 ? '✅' : '⚠️';

        console.log(`${index + 1}. ${status} ${ENDPOINTS[index].name}`);
        console.log(`   ${colors.cyan}URL:${colors.reset} ${ENDPOINTS[index].path}`);
        console.log(`   ${colors.green}Status:${colors.reset} ${statusColor}${response.statusCode}${colors.reset}`);
        console.log(`   ${colors.yellow}Time:${colors.reset} ${duration}ms`);
        
        if (response.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`   ${colors.blue}Response:${colors.reset}`, JSON.stringify(json, null, 2).split('\n').slice(0, 3).join('\n   '));
          } catch (e) {
            console.log(`   ${colors.blue}Response:${colors.reset}`, data.substring(0, 50) + '...');
          }
        }
        console.log();

        resolve({
          endpoint: ENDPOINTS[index].path,
          status: response.statusCode,
          duration,
          success: response.statusCode === 200
        });
      });
    });

    request.on('error', (error) => {
      console.log(`${index + 1}. ❌ ${ENDPOINTS[index].name}`);
      console.log(`   ${colors.red}Error:${colors.reset} ${error.message}`);
      console.log();

      resolve({
        endpoint: ENDPOINTS[index].path,
        status: 0,
        duration: 0,
        success: false,
        error: error.message
      });
    });

    request.end();
  });
}

/**
 * اختبر جميع الـ endpoints
 */
async function runTests() {
  console.log(`${colors.cyan}🔄 جاري اختبار ${ENDPOINTS.length} endpoints...${colors.reset}\n`);

  const results = [];

  for (let i = 0; i < ENDPOINTS.length; i++) {
    const endpoint = ENDPOINTS[i];
    const url = API_BASE_URL + endpoint.path;
    const result = await testEndpoint(url, endpoint.method, i);
    results.push(result);
    
    // انتظر قليلاً بين الاختبارات
    if (i < ENDPOINTS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // الملخص النهائي
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║            📊 الملخص النهائي                       ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const avgTime = Math.round(results.reduce((a, b) => a + b.duration, 0) / total);

  console.log(`${colors.green}✅ نجح:${colors.reset} ${successful}/${total}`);
  console.log(`${colors.red}❌ فشل:${colors.reset} ${total - successful}/${total}`);
  console.log(`${colors.yellow}⏱️  متوسط الوقت:${colors.reset} ${avgTime}ms\n`);

  if (successful === total) {
    console.log(`${colors.green}🎉 جميع الاختبارات نجحت! النظام يعمل بشكل صحيح.${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠️  بعض الاختبارات لم تنجح. تحقق من السجلات.${colors.reset}\n`);
  }

  console.log(`${colors.cyan}════════════════════════════════════════════════════${colors.reset}\n`);
}

// شغل الاختبارات
runTests().catch(console.error);
