# 📊 مراقبة النظام والـ Monitoring

**التاريخ**: يناير 17, 2026  
**الأولوية**: 🟠 HIGH  
**الحالة**: شامل وجاهز

---

## 📋 إعدادات Monitoring

### PM2 Monitoring

```javascript
// ecosystem.config.js - إعدادات متقدمة

module.exports = {
  apps: [
    {
      name: 'alawael-erp',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,

      // Memory management
      max_memory_restart: '1G',

      // Monitoring
      instance_var: 'INSTANCE_ID',

      // Restart strategies
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
    },
  ],

  // PM2+ monitoring
  pmx: {
    network: true,
    ports: true,
    custom_probes: true,
  },

  // Alerts
  error_file: '/var/log/alawael/pm2-error.log',
  watch: ['src'],
  ignore_watch: ['node_modules', 'logs'],
};
```

### أوامر PM2

```bash
# إعداد Monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10

# مراقبة حقيقي
pm2 monit

# حفظ القائمة
pm2 save
pm2 startup

# عرض السجلات
pm2 logs
pm2 logs --err
pm2 flush

# الإحصائيات
pm2 info alawael-erp
```

---

## 🔍 Winston Logging

### logger.js

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  defaultMeta: { service: 'alawael-erp' },

  transports: [
    // Error logs
    new DailyRotateFile({
      filename: './logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
    }),

    // Combined logs
    new DailyRotateFile({
      filename: './logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),

    // Console output (development)
    ...(process.env.NODE_ENV !== 'production'
      ? [
          new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
          }),
        ]
      : []),
  ],
});

module.exports = logger;
```

---

## 📈 Prometheus Metrics

### prometheus.js

```javascript
const prometheus = require('prom-client');

// Default metrics
prometheus.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

const activeUsers = new prometheus.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users',
});

module.exports = {
  httpRequestDuration,
  httpRequestsTotal,
  dbQueryDuration,
  activeUsers,
};
```

---

## 🔔 الإخطارات والتنبيهات

### alerts.js

```javascript
const nodemailer = require('nodemailer');

const alertThresholds = {
  CPU_USAGE: 80, // 80%
  MEMORY_USAGE: 85, // 85%
  ERROR_RATE: 5, // 5% errors
  RESPONSE_TIME: 2000, // 2 seconds
  DB_CONNECTIONS: 10, // connections
  DISK_USAGE: 90, // 90%
};

async function checkSystemHealth() {
  // Check CPU
  if (cpuUsage > alertThresholds.CPU_USAGE) {
    await sendAlert('HIGH_CPU_USAGE', cpuUsage);
  }

  // Check Memory
  if (memoryUsage > alertThresholds.MEMORY_USAGE) {
    await sendAlert('HIGH_MEMORY_USAGE', memoryUsage);
  }

  // Check Error Rate
  if (errorRate > alertThresholds.ERROR_RATE) {
    await sendAlert('HIGH_ERROR_RATE', errorRate);
  }

  // Check Response Time
  if (avgResponseTime > alertThresholds.RESPONSE_TIME) {
    await sendAlert('SLOW_RESPONSE_TIME', avgResponseTime);
  }
}

async function sendAlert(alertType, value) {
  // Send email alert
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ALERT_EMAIL,
      pass: process.env.ALERT_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: `⚠️ Alert: ${alertType}`,
    html: `<p>Alert: ${alertType}</p><p>Value: ${value}</p>`,
  });

  // Send Slack notification
  await axios.post(process.env.SLACK_WEBHOOK, {
    text: `⚠️ Alert: ${alertType}`,
    attachments: [
      {
        color: 'danger',
        fields: [
          {
            title: 'Alert Type',
            value: alertType,
            short: true,
          },
          {
            title: 'Value',
            value: value,
            short: true,
          },
        ],
      },
    ],
  });
}
```

---

## 🖥️ Grafana Dashboard

### grafana-dashboard.json

```json
{
  "dashboard": {
    "title": "AlAwael ERP Monitoring",
    "panels": [
      {
        "title": "CPU Usage",
        "targets": [{ "expr": "rate(process_cpu_seconds_total[1m])" }]
      },
      {
        "title": "Memory Usage",
        "targets": [{ "expr": "process_resident_memory_bytes / 1024 / 1024" }]
      },
      {
        "title": "HTTP Requests",
        "targets": [{ "expr": "rate(http_requests_total[5m])" }]
      },
      {
        "title": "Error Rate",
        "targets": [{ "expr": "rate(http_requests_total{status_code=~'5..'}[5m])" }]
      },
      {
        "title": "Average Response Time",
        "targets": [{ "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)" }]
      },
      {
        "title": "Database Connections",
        "targets": [{ "expr": "mysql_global_status_threads_connected" }]
      },
      {
        "title": "Active Users",
        "targets": [{ "expr": "active_users_total" }]
      }
    ]
  }
}
```

---

## 📊 Health Check Endpoint

```javascript
// routes/health.js

router.get('/health', async (req, res) => {
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: require('../package.json').version,
      services: {},
    };

    // Check Database
    try {
      await db.query('SELECT 1');
      healthData.services.database = 'connected';
    } catch (err) {
      healthData.services.database = 'disconnected';
      healthData.status = 'degraded';
    }

    // Check Redis
    try {
      await redis.ping();
      healthData.services.redis = 'connected';
    } catch (err) {
      healthData.services.redis = 'disconnected';
    }

    // Check Email Service
    try {
      await mailService.checkConnection();
      healthData.services.email = 'operational';
    } catch (err) {
      healthData.services.email = 'unavailable';
    }

    // Memory Usage
    const memUsage = process.memoryUsage();
    healthData.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    };

    // Return response
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

---

## ✅ Monitoring Checklist

```
Setup:
☐ PM2 مثبت وعامل
☐ Winston logging معروف
☐ Prometheus metrics مجموعة
☐ Grafana dashboard معد
☐ Alerts محددة

المراقبة:
☐ CPU usage مراقب
☐ Memory usage مراقب
☐ Disk usage مراقب
☐ Database connections مراقب
☐ HTTP requests مراقب
☐ Error rates مراقب
☐ Response times مراقب

الإخطارات:
☐ Email alerts معد
☐ Slack alerts معد
☐ PagerDuty integration (اختياري)
☐ Alert thresholds محدد

السجلات:
☐ Log rotation معد
☐ Log files مؤمنة
☐ Log levels مناسبة
☐ Sensitive data لا تُسجل
```

---

**الحالة**: ✅ جاهز للاستخدام  
**آخر تحديث**: يناير 17, 2026
