#!/usr/bin/env node
/**
 * سكريبت مراقبة الأداء - Performance Monitoring Script
 * يراقب استهلاك الموارد وأداء النظام
 */

const os = require('os');
const { execSync } = require('child_process');

// ألوان للـ Console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * الحصول على معلومات الـ CPU
 */
function getCPUUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~((100 * idle) / total);

  return {
    cores: cpus.length,
    model: cpus[0].model,
    usage: `${usage}%`,
    usageValue: usage,
  };
}

/**
 * الحصول على معلومات الذاكرة
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  return {
    total: formatBytes(totalMem),
    used: formatBytes(usedMem),
    free: formatBytes(freeMem),
    usage: `${usagePercent}%`,
    usageValue: parseFloat(usagePercent),
  };
}

/**
 * الحصول على معلومات القرص (Windows)
 * استخدام PowerShell بدلاً من wmic (غير متوفر في بعض الإصدارات)
 */
function getDiskUsage() {
  try {
    if (process.platform === 'win32') {
      const psCommand =
        'Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | ' +
        "Select-Object -First 1 @{Name='Total';Expression={$_.Size}}, @{Name='Free';Expression={$_.FreeSpace}} | " +
        'ConvertTo-Json -Compress';

      const output = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
        encoding: 'utf-8',
      });

      const disk = JSON.parse(output);
      const free = parseInt(disk.Free, 10);
      const total = parseInt(disk.Total, 10);
      const used = total - free;
      const usagePercent = ((used / total) * 100).toFixed(2);

      return {
        total: formatBytes(total),
        used: formatBytes(used),
        free: formatBytes(free),
        usage: `${usagePercent}%`,
        usageValue: parseFloat(usagePercent),
      };
    }

    return {
      total: 'N/A',
      used: 'N/A',
      free: 'N/A',
      usage: 'N/A',
      usageValue: 0,
    };
  } catch (error) {
    return {
      total: 'N/A',
      used: 'N/A',
      free: 'N/A',
      usage: 'N/A',
      usageValue: 0,
      error: error.message,
    };
  }
}

/**
 * الحصول على معلومات الشبكة
 */
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const networkData = [];

  for (const name in interfaces) {
    const iface = interfaces[name];
    const ipv4 = iface.find(i => i.family === 'IPv4' && !i.internal);
    if (ipv4) {
      networkData.push({
        interface: name,
        address: ipv4.address,
        netmask: ipv4.netmask,
      });
    }
  }

  return networkData;
}

/**
 * الحصول على معلومات Node.js Process
 */
function getProcessInfo() {
  const usage = process.memoryUsage();

  return {
    pid: process.pid,
    uptime: formatUptime(process.uptime()),
    memoryUsage: {
      rss: formatBytes(usage.rss),
      heapTotal: formatBytes(usage.heapTotal),
      heapUsed: formatBytes(usage.heapUsed),
      external: formatBytes(usage.external),
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * تنسيق البايتات
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * تنسيق وقت التشغيل
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * الحصول على مستوى التحذير
 */
function getWarningLevel(value) {
  if (value >= 90) return { color: colors.red, icon: '🔴' };
  if (value >= 75) return { color: colors.yellow, icon: '🟡' };
  return { color: colors.green, icon: '🟢' };
}

/**
 * طباعة التقرير
 */
function printReport() {
  console.log('\n' + '='.repeat(70));
  console.log(
    colors.cyan + '📊 تقرير مراقبة أداء النظام - Performance Monitoring Report' + colors.reset
  );
  console.log('='.repeat(70) + '\n');

  // معلومات النظام
  console.log(colors.blue + '🖥️  معلومات النظام' + colors.reset);
  console.log(`   النظام: ${os.type()} ${os.release()}`);
  console.log(`   المعمارية: ${os.arch()}`);
  console.log(`   Hostname: ${os.hostname()}`);
  console.log(`   وقت التشغيل: ${formatUptime(os.uptime())}`);
  console.log();

  // CPU
  const cpu = getCPUUsage();
  const cpuWarning = getWarningLevel(cpu.usageValue);
  console.log(colors.blue + '⚙️  المعالج (CPU)' + colors.reset);
  console.log(`   ${cpuWarning.icon} الاستخدام: ${cpuWarning.color}${cpu.usage}${colors.reset}`);
  console.log(`   الأنوية: ${cpu.cores}`);
  console.log(`   الطراز: ${cpu.model}`);
  console.log();

  // Memory
  const memory = getMemoryUsage();
  const memWarning = getWarningLevel(memory.usageValue);
  console.log(colors.blue + '💾 الذاكرة (RAM)' + colors.reset);
  console.log(`   ${memWarning.icon} الاستخدام: ${memWarning.color}${memory.usage}${colors.reset}`);
  console.log(`   المجموع: ${memory.total}`);
  console.log(`   المستخدم: ${memory.used}`);
  console.log(`   المتاح: ${memory.free}`);
  console.log();

  // Disk
  const disk = getDiskUsage();
  if (!disk.error) {
    const diskWarning = getWarningLevel(disk.usageValue);
    console.log(colors.blue + '💿 القرص الصلب' + colors.reset);
    console.log(
      `   ${diskWarning.icon} الاستخدام: ${diskWarning.color}${disk.usage}${colors.reset}`
    );
    console.log(`   المجموع: ${disk.total}`);
    console.log(`   المستخدم: ${disk.used}`);
    console.log(`   المتاح: ${disk.free}`);
    console.log();
  }

  // Network
  const network = getNetworkInfo();
  console.log(colors.blue + '🌐 الشبكة' + colors.reset);
  network.forEach(net => {
    console.log(`   ${net.interface}: ${net.address}`);
  });
  console.log();

  // Process Info
  const processInfo = getProcessInfo();
  console.log(colors.blue + '🔧 معلومات العملية (Node.js Process)' + colors.reset);
  console.log(`   PID: ${processInfo.pid}`);
  console.log(`   وقت التشغيل: ${processInfo.uptime}`);
  console.log(`   نسخة Node.js: ${processInfo.nodeVersion}`);
  console.log(`   RSS: ${processInfo.memoryUsage.rss}`);
  console.log(`   Heap Used: ${processInfo.memoryUsage.heapUsed}`);
  console.log(`   Heap Total: ${processInfo.memoryUsage.heapTotal}`);
  console.log();

  // التحذيرات
  const warnings = [];
  if (cpu.usageValue >= 80) warnings.push(`⚠️  استهلاك CPU عالي: ${cpu.usage}`);
  if (memory.usageValue >= 80) warnings.push(`⚠️  استهلاك الذاكرة عالي: ${memory.usage}`);
  if (disk.usageValue >= 80) warnings.push(`⚠️  القرص الصلب ممتلئ: ${disk.usage}`);

  if (warnings.length > 0) {
    console.log(colors.yellow + '⚠️  التحذيرات:' + colors.reset);
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log();
  }

  console.log('='.repeat(70));
  console.log(colors.cyan + `⏰ التوقيت: ${new Date().toLocaleString('ar-SA')}` + colors.reset);
  console.log('='.repeat(70) + '\n');
}

/**
 * مراقبة مستمرة
 */
function startMonitoring(intervalSeconds = 30) {
  console.log(
    colors.green + `\n✅ بدء المراقبة المستمرة (كل ${intervalSeconds} ثانية)...` + colors.reset
  );
  console.log(colors.yellow + 'اضغط Ctrl+C للإيقاف\n' + colors.reset);

  printReport();

  setInterval(() => {
    console.clear();
    printReport();
  }, intervalSeconds * 1000);
}

// التشغيل
if (require.main === module) {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous') || args.includes('-c');
  const interval = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 30;

  if (continuous) {
    startMonitoring(interval);
  } else {
    printReport();
  }
}

module.exports = {
  getCPUUsage,
  getMemoryUsage,
  getDiskUsage,
  getNetworkInfo,
  getProcessInfo,
  formatBytes,
  formatUptime,
};
