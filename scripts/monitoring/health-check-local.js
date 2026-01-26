#!/usr/bin/env node
/**
 * سكريبت فحص صحة محلي - بدون الاعتماد على Docker
 * يفحص الخدمات المتاحة محليًا (HTTP فقط)
 */

const http = require('http');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const services = [
  {
    name: 'API Backend',
    url: process.env.API_URL || 'http://localhost:3001/api/health',
    timeout: 5000,
  },
  {
    name: 'Frontend',
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    timeout: 5000,
  },
];

function checkHTTP(url, timeout) {
  return new Promise(resolve => {
    const startTime = Date.now();
    const req = http.get(url, res => {
      const duration = Date.now() - startTime;
      const statusOk = res.statusCode >= 200 && res.statusCode < 300;
      resolve({
        status: statusOk ? 'healthy' : 'unhealthy',
        statusCode: res.statusCode,
        responseTime: `${duration}ms`,
      });
    });

    req.setTimeout(timeout);
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 'unhealthy',
        error: 'Request timeout',
      });
    });

    req.on('error', err => {
      resolve({
        status: 'unhealthy',
        error: err.message,
      });
    });
  });
}

async function checkService(service) {
  try {
    if (service.url) {
      return {
        name: service.name,
        ...(await checkHTTP(service.url, service.timeout)),
      };
    }
    return {
      name: service.name,
      status: 'unknown',
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'unhealthy',
      error: error.message,
    };
  }
}

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '🏥 فحص الخدمات المحلية - Local Health Check' + colors.reset);
  console.log('='.repeat(60) + '\n');

  let allHealthy = true;
  results.forEach(result => {
    const icon = result.status === 'healthy' ? '✅' : result.status === 'unhealthy' ? '❌' : '⚠️';
    const color =
      result.status === 'healthy'
        ? colors.green
        : result.status === 'unhealthy'
          ? colors.red
          : colors.yellow;

    console.log(`${icon} ${colors.blue}${result.name}${colors.reset}`);
    console.log(`   الحالة: ${color}${result.status}${colors.reset}`);

    if (result.statusCode) console.log(`   كود الحالة: ${result.statusCode}`);
    if (result.responseTime) console.log(`   وقت الاستجابة: ${result.responseTime}`);
    if (result.error) console.log(`   ${colors.red}الخطأ: ${result.error}${colors.reset}`);
    console.log();

    if (result.status !== 'healthy') allHealthy = false;
  });

  console.log('='.repeat(60));
  const status = allHealthy
    ? colors.green + 'جميع الخدمات المحلية تعمل بشكل صحيح ✅' + colors.reset
    : colors.yellow + 'بعض الخدمات لم تتمكن من الاتصال ⚠️' + colors.reset;
  console.log(status);
  console.log('ملاحظة: هذا الفحص محلي فقط (بدون Docker/Mongo/Redis)');
  console.log('='.repeat(60) + '\n');

  return allHealthy ? 0 : 1;
}

async function main() {
  console.log(colors.cyan + '\n🔍 بدء فحص الخدمات المحلية...\n' + colors.reset);

  const results = await Promise.all(services.map(checkService));
  const exitCode = printResults(results);

  const args = process.argv.slice(2);
  if (args.includes('--watch')) {
    const interval = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1]) || 30;
    console.log(
      colors.yellow + `⏱️ وضع المراقبة: كل ${interval}s، اضغط Ctrl+C للإيقاف\n` + colors.reset
    );
    setInterval(() => {
      console.clear();
      main();
    }, interval * 1000);
  } else {
    process.exit(exitCode);
  }
}

process.on('unhandledRejection', error => {
  console.error(colors.red + '❌ خطأ غير متوقع:' + colors.reset, error);
});

if (require.main === module) {
  main().catch(error => {
    console.error(colors.red + '❌ فشل الفحص:' + colors.reset, error);
    process.exit(1);
  });
}

module.exports = { checkService, checkHTTP };
