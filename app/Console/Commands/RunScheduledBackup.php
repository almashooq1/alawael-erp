<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RunScheduledBackup extends Command
{
    protected $signature = 'backup:run {--type=full : نوع النسخة full|incremental} {--branch= : معرف الفرع}';

    protected $description = 'تشغيل النسخ الاحتياطي المجدول';

    public function handle(): int
    {
        $this->info('بدء تنفيذ RunScheduledBackup...');
        $startTime = microtime(true);

        try {
            $type = $this->option('type');
            $branchId = $this->option('branch');

            $schedules = \App\Models\BackupSchedule::active()
                ->due()
                ->when($branchId, fn($q) => $q->where('branch_id', $branchId))
                ->get();

            $this->info("Found {$schedules->count()} due schedules.");

            $service = app(\App\Services\BackupService::class);

            foreach ($schedules as $schedule) {
                $this->info("Running schedule: {$schedule->name}");

                if ($type === 'incremental') {
                    $lastFull = \App\Models\BackupJob::where('schedule_id', $schedule->id)
                        ->where('type', \App\Enums\BackupType::FULL)
                        ->where('status', \App\Enums\BackupStatus::SUCCESS)
                        ->latest()
                        ->first();

                    if ($lastFull) {
                        $job = $service->createIncrementalBackup($lastFull);
                    } else {
                        $job = $service->createFullBackup(['schedule_id' => $schedule->id]);
                    }
                } else {
                    $job = $service->createFullBackup(['schedule_id' => $schedule->id]);
                }

                $schedule->update(['last_run_at' => now(), 'last_run_status' => 'running']);
                $this->info("Dispatched job ID: {$job->id}");
            }

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('RunScheduledBackup completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('RunScheduledBackup failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
