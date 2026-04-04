<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ApplyNotificationEscalationCommand extends Command
{
    protected $signature = 'notifications:escalate';

    protected $description = 'تطبيق قواعد التصعيد للإشعارات غير المقروءة';

    public function handle(): int
    {
        $this->info('بدء تنفيذ ApplyEscalationRules...');
        $startTime = microtime(true);

        try {
            $service = app(\App\Services\NotificationService::class);
            $service->applyEscalationRules();
            $this->info('تم تطبيق قواعد التصعيد');

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('ApplyEscalationRules completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('ApplyEscalationRules failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
