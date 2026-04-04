<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class TestRestoreBackup extends Command
{
    protected $signature = 'backup:test-restore {--latest : اختبار أحدث نسخة}';
    protected $description = 'اختبار تلقائي لعملية الاستعادة على بيئة مؤقتة';

    public function handle(): int
    {
        $this->info('بدء تنفيذ TestRestoreBackup...');
        $startTime = microtime(true);

        try {
            $service = app(\App\Services\BackupService::class);

            $backup = \App\Models\BackupJob::where('status', \App\Enums\BackupStatus::SUCCESS)
                ->where('type', \App\Enums\BackupType::FULL)
                ->latest()
                ->firstOrFail();

            $this->info("Testing restore from backup #{$backup->id}...");

            $restoreJob = $service->restore($backup, [
                'type' => 'full',
                'environment' => 'test',
                'test' => true,
            ]);

            $this->info("Restore job #{$restoreJob->id} dispatched to test environment.");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('TestRestoreBackup completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('TestRestoreBackup failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
