/**
 * Prometheus Metrics Endpoint — AlAwael ERP Backend
 *
 * Exposes key Node.js and application metrics in Prometheus text format.
 * Mount on /metrics for scraping by Prometheus.
 *
 * @module backend/middleware/metrics.middleware
 */

const os = require('os');

// ─── Counters ────────────────────────────────────────────────────────────────
const httpRequestsTotal = {}; // { "GET:/api/users:200": count }
let httpRequestDurations = []; // Array of { method, path, status, duration }
const MAX_DURATIONS = 10000;

// ─── Middleware: Record Request Metrics ──────────────────────────────────────
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;
    const route = req.route ? req.route.path : req.path;
    const key = `${req.method}:${route}:${res.statusCode}`;

    httpRequestsTotal[key] = (httpRequestsTotal[key] || 0) + 1;

    httpRequestDurations.push({
      method: req.method,
      path: route,
      status: res.statusCode,
      duration: durationSec,
    });

    // Keep bounded
    if (httpRequestDurations.length > MAX_DURATIONS) {
      httpRequestDurations = httpRequestDurations.slice(-MAX_DURATIONS / 2);
    }
  });

  next();
};

// ─── Metrics Endpoint Handler ────────────────────────────────────────────────
const metricsHandler = (req, res) => {
  const lines = [];
  const now = Date.now();

  // --- Process metrics ---
  const mem = process.memoryUsage();
  lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes.');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${mem.rss} ${now}`);

  lines.push('# HELP process_heap_bytes Heap memory usage in bytes.');
  lines.push('# TYPE process_heap_bytes gauge');
  lines.push(`process_heap_bytes{type="used"} ${mem.heapUsed} ${now}`);
  lines.push(`process_heap_bytes{type="total"} ${mem.heapTotal} ${now}`);

  lines.push('# HELP process_cpu_seconds_total Total CPU time spent.');
  lines.push('# TYPE process_cpu_seconds_total counter');
  const cpu = process.cpuUsage();
  lines.push(`process_cpu_seconds_total ${(cpu.user + cpu.system) / 1e6} ${now}`);

  lines.push('# HELP process_uptime_seconds Process uptime.');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${process.uptime()} ${now}`);

  lines.push('# HELP nodejs_active_handles_total Number of active handles.');
  lines.push('# TYPE nodejs_active_handles_total gauge');
  lines.push(`nodejs_active_handles_total ${process._getActiveHandles?.()?.length || 0} ${now}`);

  lines.push('# HELP nodejs_active_requests_total Number of active requests.');
  lines.push('# TYPE nodejs_active_requests_total gauge');
  lines.push(`nodejs_active_requests_total ${process._getActiveRequests?.()?.length || 0} ${now}`);

  // --- OS metrics ---
  lines.push('# HELP os_load_average System load averages.');
  lines.push('# TYPE os_load_average gauge');
  const load = os.loadavg();
  lines.push(`os_load_average{period="1m"} ${load[0]} ${now}`);
  lines.push(`os_load_average{period="5m"} ${load[1]} ${now}`);
  lines.push(`os_load_average{period="15m"} ${load[2]} ${now}`);

  // --- HTTP request counters ---
  lines.push('# HELP http_requests_total Total HTTP requests.');
  lines.push('# TYPE http_requests_total counter');
  for (const [key, count] of Object.entries(httpRequestsTotal)) {
    const [method, path, status] = key.split(':');
    lines.push(
      `http_requests_total{method="${method}",path="${path}",status="${status}"} ${count} ${now}`
    );
  }

  // --- HTTP request duration histogram (simplified buckets) ---
  const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds.');
  lines.push('# TYPE http_request_duration_seconds histogram');

  let sum = 0;
  let count = 0;
  const bucketCounts = buckets.map(() => 0);

  for (const entry of httpRequestDurations) {
    sum += entry.duration;
    count++;
    for (let i = 0; i < buckets.length; i++) {
      if (entry.duration <= buckets[i]) bucketCounts[i]++;
    }
  }

  for (let i = 0; i < buckets.length; i++) {
    lines.push(
      `http_request_duration_seconds_bucket{le="${buckets[i]}"} ${bucketCounts[i]} ${now}`
    );
  }
  lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${count} ${now}`);
  lines.push(`http_request_duration_seconds_sum ${sum.toFixed(6)} ${now}`);
  lines.push(`http_request_duration_seconds_count ${count} ${now}`);

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(lines.join('\n') + '\n');
};

module.exports = { metricsMiddleware, metricsHandler };
