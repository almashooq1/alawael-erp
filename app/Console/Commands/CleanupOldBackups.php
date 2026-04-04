<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanupOldBackups extends Command
{
    protected $signature = 'backup:cleanup';

    protected $description = 'تنظيف النسخ الاحتياطية المنتهية الصلاحية';

    public function handle(): int
    {
        $this->info('بدء تنفيذ CleanupOldBackups...');
        $startTime = microtime(true);

        try {
            $service = app(\App\Services\BackupService::class);
            $schedules = \App\Models\BackupSchedule::where('is_active', true)->get();

            $totalDeleted = 0;
            foreach ($schedules as $schedule) {
                $deleted = $service->applyRetentionPolicy($schedule);
                $totalDeleted += $deleted;
                $this->line("Schedule '{$schedule->name}': deleted {$deleted} old backups.");
            }

            $this->info("Total cleaned: {$totalDeleted} backups.");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('CleanupOldBackups completed', ['elapsed' => $elapsed, 'deleted' => $totalDeleted]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('CleanupOldBackups failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
