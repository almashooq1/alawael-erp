<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class GenerateWeeklyPerformanceReport extends Command
{
    protected $signature = 'monitor:weekly-report';

    protected $description = 'توليد تقرير الأداء الأسبوعي';

    public function handle(): int
    {
        $this->info('بدء تنفيذ GenerateWeeklyPerformanceReport...');
        $startTime = microtime(true);

        try {
            $report = [
                'period' => now()->subWeek()->format('Y-m-d') . ' to ' . now()->format('Y-m-d'),
                'avg_cpu' => \App\Models\HealthMetric::recent(7)->where('metric_type', 'cpu')->avg('value'),
                'max_cpu' => \App\Models\HealthMetric::recent(7)->where('metric_type', 'cpu')->max('value'),
                'avg_memory' => \App\Models\HealthMetric::recent(7)->where('metric_type', 'memory')->avg('value'),
                'avg_response' => \App\Models\HealthMetric::recent(7)->where('metric_type', 'response_time')->avg('value'),
                'total_alerts' => \App\Models\AlertIncident::where('started_at', '>=', now()->subWeek())->count(),
                'open_alerts' => \App\Models\AlertIncident::where('status', 'open')->count(),
            ];

            Notification::route('mail', config('monitoring.report_email'))
                ->notify(new \App\Notifications\WeeklyPerformanceReport($report));

            $this->info('Weekly performance report sent.');

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('GenerateWeeklyPerformanceReport completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('GenerateWeeklyPerformanceReport failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
