<?php

namespace App\Services;

use App\Enums\MetricType;
use App\Models\AlertIncident;
use App\Models\HealthMetric;
use App\Models\PerformanceAlert;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class MonitoringService
{
    public function __construct(
        private readonly HealthMetric $model,
    ) {
    }

    // جمع قياسات الخادم (CPU، RAM، Disk، Network)
    public function collectServerMetrics(): array
    {
        $metrics = [];

        $cpuUsage = $this->getCpuUsage();
        $metrics[] = HealthMetric::create([
            'metric_type' => MetricType::CPU,
            'value' => $cpuUsage,
            'unit' => '%',
            'host' => gethostname(),
            'recorded_at' => now(),
        ]);

        $memInfo = $this->getMemoryInfo();
        $metrics[] = HealthMetric::create([
            'metric_type' => MetricType::MEMORY,
            'value' => $memInfo['used_percent'],
            'unit' => '%',
            'metadata' => $memInfo,
            'host' => gethostname(),
            'recorded_at' => now(),
        ]);

        $diskInfo = $this->getDiskInfo();
        $metrics[] = HealthMetric::create([
            'metric_type' => MetricType::DISK,
            'value' => $diskInfo['used_percent'],
            'unit' => '%',
            'metadata' => $diskInfo,
            'host' => gethostname(),
            'recorded_at' => now(),
        ]);

        $this->checkAlerts($metrics);

        return $metrics;
    }

    // قراءة استخدام المعالج من النظام
    public function getCpuUsage(): float
    {
        if (PHP_OS_FAMILY === 'Linux') {
            $load = sys_getloadavg();
            $cpuCount = (int) shell_exec('nproc');

            return round(($load[0] / max($cpuCount, 1)) * 100, 2);
        }

        return 0.0;
    }

    // قراءة معلومات الذاكرة من /proc/meminfo
    public function getMemoryInfo(): array
    {
        if (!file_exists('/proc/meminfo')) {
            return ['used_percent' => 0, 'total' => 0, 'available' => 0];
        }

        $memData = file_get_contents('/proc/meminfo');
        preg_match('/MemTotal:\s+(\d+)/', $memData, $total);
        preg_match('/MemAvailable:\s+(\d+)/', $memData, $available);

        $totalKb = (int) ($total[1] ?? 0);
        $availableKb = (int) ($available[1] ?? 0);
        $usedKb = $totalKb - $availableKb;

        return [
            'total' => $totalKb * 1024,
            'used' => $usedKb * 1024,
            'available' => $availableKb * 1024,
            'used_percent' => $totalKb > 0 ? round(($usedKb / $totalKb) * 100, 2) : 0,
        ];
    }

    // قراءة معلومات الأقراص
    public function getDiskInfo(): array
    {
        $total = disk_total_space('/');
        $free = disk_free_space('/');
        $used = $total - $free;

        return [
            'total' => $total,
            'free' => $free,
            'used' => $used,
            'used_percent' => $total > 0 ? round(($used / $total) * 100, 2) : 0,
        ];
    }

    // جمع إحصائيات Redis
    public function collectRedisMetrics(): array
    {
        $redis = Redis::connection();
        $info = $redis->info();

        $hitRate = 0;
        $hits = (int) ($info['keyspace_hits'] ?? 0);
        $misses = (int) ($info['keyspace_misses'] ?? 0);
        $total = $hits + $misses;
        if ($total > 0) {
            $hitRate = round(($hits / $total) * 100, 2);
        }

        $metrics = [];

        $metrics[] = HealthMetric::create([
            'metric_type' => MetricType::CACHE_HIT_RATE,
            'value' => $hitRate,
            'unit' => '%',
            'metadata' => [
                'hits' => $hits,
                'misses' => $misses,
                'memory_used' => $info['used_memory_human'] ?? 'N/A',
                'connected_clients' => $info['connected_clients'] ?? 0,
            ],
            'recorded_at' => now(),
        ]);

        return $metrics;
    }

    // جمع إحصائيات قاعدة البيانات
    public function collectDatabaseMetrics(): array
    {
        $metrics = [];

        $slowQueries = DB::select("
            SELECT COUNT(*) as count
            FROM information_schema.PROCESSLIST
            WHERE TIME > 1 AND COMMAND != 'Sleep'
        ");

        $slowCount = $slowQueries[0]->count ?? 0;

        $connections = DB::select("SHOW STATUS LIKE 'Threads_connected'");
        $connCount = $connections[0]->Value ?? 0;

        $metrics[] = HealthMetric::create([
            'metric_type' => MetricType::DB_CONNECTIONS,
            'value' => (float) $connCount,
            'unit' => 'connections',
            'metadata' => ['slow_queries' => $slowCount],
            'recorded_at' => now(),
        ]);

        return $metrics;
    }

    // التحقق من قواعد التنبيه وإطلاق التنبيهات عند تجاوز الحدود
    public function checkAlerts(array $metrics): void
    {
        $alerts = PerformanceAlert::active()->get();

        foreach ($metrics as $metric) {
            foreach ($alerts as $alert) {
                if ($alert->metric_type !== $metric->metric_type->value) {
                    continue;
                }

                $triggered = match ($alert->condition->value) {
                    'gt' => $metric->value > $alert->threshold,
                    'lt' => $metric->value < $alert->threshold,
                    'gte' => $metric->value >= $alert->threshold,
                    'lte' => $metric->value <= $alert->threshold,
                    'eq' => $metric->value == $alert->threshold,
                    default => false,
                };

                if ($triggered) {
                    $this->fireAlert($alert, $metric);
                }
            }
        }
    }

    // إطلاق التنبيه وإرسال الإشعارات
    public function fireAlert(PerformanceAlert $alert, HealthMetric $metric): void
    {
        AlertIncident::create([
            'alert_id' => $alert->id,
            'status' => 'open',
            'triggered_value' => $metric->value,
            'started_at' => now(),
            'branch_id' => $alert->branch_id,
        ]);

        $alert->increment('trigger_count');
        $alert->update(['last_triggered_at' => now()]);

        foreach ($alert->notification_channels ?? [] as $channel) {
            match ($channel) {
                'email' => $this->sendEmailAlert($alert, $metric),
                'slack' => $this->sendSlackAlert($alert, $metric),
                default => null,
            };
        }

        Log::warning('Performance alert fired', [
            'alert' => $alert->name,
            'metric' => $metric->metric_type,
            'value' => $metric->value,
            'threshold' => $alert->threshold,
        ]);
    }

    // إرسال التنبيه عبر Slack Webhook
    public function sendSlackAlert(PerformanceAlert $alert, HealthMetric $metric): void
    {
        $webhook = config('services.slack.monitoring_webhook');
        if (!$webhook) {
            return;
        }

        $emoji = match ($alert->severity->value) {
            'critical' => ':rotating_light:',
            'warning' => ':warning:',
            default => ':information_source:',
        };

        $payload = [
            'text' => "{$emoji} *{$alert->name}*",
            'attachments' => [
                [
                    'color' => $alert->severity->value === 'critical' ? 'danger' : 'warning',
                    'fields' => [
                        ['title' => 'المقياس', 'value' => $metric->metric_type->value, 'short' => true],
                        ['title' => 'القيمة', 'value' => $metric->value . ' ' . $metric->unit, 'short' => true],
                        ['title' => 'الحد المسموح', 'value' => $alert->threshold, 'short' => true],
                        ['title' => 'الوقت', 'value' => now()->format('Y-m-d H:i:s'), 'short' => true],
                    ],
                ]
            ],
        ];

        Http::post($webhook, $payload);
    }

    // إرسال التنبيه عبر البريد الإلكتروني
    public function sendEmailAlert(PerformanceAlert $alert, HealthMetric $metric): void
    {
        \Illuminate\Support\Facades\Notification::route('mail', config('monitoring.alert_email'))
            ->notify(new \App\Notifications\PerformanceAlertNotification($alert, $metric));
    }

    // إحصائيات المراقبة للوحة التحكم
    public function getStats(?int $branchId = null): array
    {
        $openIncidents = AlertIncident::where('status', 'open')->count();
        $lastCpu = HealthMetric::where('metric_type', MetricType::CPU)->latest('recorded_at')->value('value');
        $lastMem = HealthMetric::where('metric_type', MetricType::MEMORY)->latest('recorded_at')->value('value');
        $lastDisk = HealthMetric::where('metric_type', MetricType::DISK)->latest('recorded_at')->value('value');

        return [
            'cpu' => ['title' => 'استخدام المعالج', 'value' => $lastCpu . '%', 'icon' => 'cpu'],
            'memory' => ['title' => 'استخدام الذاكرة', 'value' => $lastMem . '%', 'icon' => 'memory'],
            'disk' => ['title' => 'استخدام القرص', 'value' => $lastDisk . '%', 'icon' => 'disk'],
            'incidents' => ['title' => 'حوادث مفتوحة', 'value' => $openIncidents, 'icon' => 'alert'],
        ];
    }
}
