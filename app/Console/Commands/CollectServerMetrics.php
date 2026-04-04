<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CollectServerMetrics extends Command
{
    protected $signature = 'monitor:collect {--env=production}';

    protected $description = 'جمع قياسات صحة الخادم وتخزينها';

    public function handle(): int
    {
        $this->info('بدء تنفيذ CollectServerMetrics...');
        $startTime = microtime(true);

        try {
            $service = app(\App\Services\MonitoringService::class);

            $service->collectServerMetrics();
            $service->collectRedisMetrics();
            $service->collectDatabaseMetrics();

            // تنظيف البيانات القديمة (أكثر من 30 يوم)
            \App\Models\HealthMetric::where('recorded_at', '<', now()->subDays(30))->delete();

            $this->info('Metrics collected and stored.');

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('CollectServerMetrics completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('CollectServerMetrics failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
