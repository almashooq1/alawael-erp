#!/usr/bin/env node
/**
 * سكريبت فحص صحة النظام - Health Check Script
 * يفحص جميع خدمات النظام ويعيد تقرير شامل
 */

const http = require('http');
const https = require('https');

// ألوان للـ Console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// إعدادات الخدمات
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
  {
    name: 'MongoDB',
    check: checkMongoDB,
  },
  {
    name: 'Redis',
    check: checkRedis,
  },
];

/**
 * فحص HTTP/HTTPS
 */
function checkHTTP(url, timeout) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();

    const req = protocol.get(url, res => {
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
      reject(new Error('Request timeout'));
    });

    req.on('error', err => {
      reject(err);
    });
  });
}

/**
 * فحص MongoDB
 */
async function checkMongoDB() {
  try {
    const mongoose = require('mongoose');
    const uriLocal = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
    const uriDocker = process.env.MONGODB_URI_DOCKER || 'mongodb://mongo:27017/alaweal_db';

    const tryUri = async uri => {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const duration = Date.now() - startTime;
      await mongoose.disconnect();
      return { status: 'healthy', responseTime: `${duration}ms` };
    };

    try {
      return await tryUri(uriLocal);
    } catch (e1) {
      try {
        return await tryUri(uriDocker);
      } catch (e2) {
        return {
          status: 'unhealthy',
          error: e2?.message || e1?.message || 'MongoDB connection failed',
        };
      }
    }
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

/**
 * فحص Redis
 */
async function checkRedis() {
  try {
    const Redis = require('ioredis');

    const baseOpts = {
      port: parseInt(process.env.REDIS_PORT || 6379, 10),
      password: process.env.REDIS_PASSWORD || 'redis_password',
      retryStrategy: () => null,
      enableReadyCheck: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 5000,
      lazyConnect: true,
    };

    const tryConnect = async host => {
      const redis = new Redis({ ...baseOpts, host });
      // تجنب أحداث خطأ غير معالَجة
      redis.on('error', () => {});
      await redis.connect();
      const startTime = Date.now();
      await redis.ping();
      const duration = Date.now() - startTime;
      await redis.quit();
      return {
        status: 'healthy',
        responseTime: `${duration}ms`,
      };
    };

    // المحاولة: المضيف المحلي ثم اسم خدمة docker
    try {
      return await tryConnect(process.env.REDIS_HOST || 'localhost');
    } catch (e1) {
      try {
        return await tryConnect(process.env.REDIS_HOST_DOCKER || 'redis');
      } catch (e2) {
        return {
          status: 'unhealthy',
          error: e2?.message || e1?.message || 'Redis connection failed',
        };
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * فحص خدمة واحدة
 */
async function checkService(service) {
  try {
    let result;

    if (service.check) {
      // فحص مخصص
      result = await service.check();
    } else if (service.url) {
      // فحص HTTP
      result = await checkHTTP(service.url, service.timeout);
    }

    return {
      name: service.name,
      ...result,
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'unhealthy',
      error: error.message,
    };
  }
}

/**
 * طباعة النتائج
 */
function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + '🏥 نتائج فحص صحة النظام - System Health Check' + colors.reset);
  console.log('='.repeat(60) + '\n');

  let allHealthy = true;

  results.forEach(result => {
    const statusColor =
      result.status === 'healthy'
        ? colors.green
        : result.status === 'warning'
          ? colors.yellow
          : colors.red;
    const statusIcon =
      result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';

    console.log(`${statusIcon} ${colors.blue}${result.name}${colors.reset}`);
    console.log(`   الحالة: ${statusColor}${result.status}${colors.reset}`);

    if (result.statusCode) {
      console.log(`   كود الحالة: ${result.statusCode}`);
    }

    if (result.responseTime) {
      console.log(`   وقت الاستجابة: ${result.responseTime}`);
    }

    if (result.error) {
      console.log(`   ${colors.red}الخطأ: ${result.error}${colors.reset}`);
    }

    if (result.message) {
      console.log(`   الرسالة: ${result.message}`);
    }

    console.log();

    if (result.status !== 'healthy') {
      allHealthy = false;
    }
  });

  console.log('='.repeat(60));

  const overallStatus = allHealthy
    ? 'جميع الخدمات تعمل بشكل صحيح ✅'
    : 'بعض الخدمات تحتاج انتباه ⚠️';
  const overallColor = allHealthy ? colors.green : colors.yellow;

  console.log(overallColor + overallStatus + colors.reset);
  console.log('='.repeat(60) + '\n');

  return allHealthy ? 0 : 1;
}

/**
 * التشغيل الرئيسي
 */
async function runOnce(checkDbDirect, checkCacheDirect) {
  console.log(colors.cyan + '\n🔍 بدء فحص صحة النظام...\n' + colors.reset);

  const effectiveServices = services.filter(s => {
    if (s.name === 'MongoDB' && !checkDbDirect) return false;
    if (s.name === 'Redis' && !checkCacheDirect) return false;
    return true;
  });

  const results = await Promise.all(effectiveServices.map(checkService));

  const exitCode = printResults(results);
  return exitCode;
}

function parseBool(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const v = String(value).toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

// تشغيل
if (require.main === module) {
  const args = process.argv.slice(2);
  const watch = args.includes('--watch');
  const intervalArg = args.find(a => a.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1], 10) : 30;

  const checkDbDirect = parseBool(process.env.CHECK_DB_DIRECT, true);
  const checkCacheDirect = parseBool(process.env.CHECK_CACHE_DIRECT, true);

  if (watch) {
    let running = false;
    console.log(
      colors.yellow + `⏱️ وضع المراقبة: كل ${interval}s، اضغط Ctrl+C للإيقاف\n` + colors.reset
    );
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        await runOnce(checkDbDirect, checkCacheDirect);
      } catch (error) {
        console.error(colors.red + '❌ خطأ أثناء الفحص:' + colors.reset, error?.message || error);
      } finally {
        running = false;
      }
    };
    (async () => {
      await tick();
    })();
    setInterval(tick, interval * 1000);
  } else {
    runOnce(checkDbDirect, checkCacheDirect)
      .then(code => process.exit(code))
      .catch(error => {
        console.error(colors.red + '❌ فشل الفحص:' + colors.reset, error);
        process.exit(1);
      });
  }
}

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', error => {
  console.error(colors.red + '❌ خطأ غير متوقع:' + colors.reset, error);
});

module.exports = { checkService, checkHTTP, checkMongoDB, checkRedis };
