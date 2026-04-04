<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class VerifyBackups extends Command
{
    protected $signature = 'backup:verify {--days=1 : التحقق من نسخ آخر N أيام}';

    protected $description = 'التحقق من سلامة النسخ الاحتياطية الحديثة';

    public function handle(): int
    {
        $this->info('بدء تنفيذ VerifyBackups...');
        $startTime = microtime(true);

        try {
            $days = (int) $this->option('days');
            $service = app(\App\Services\BackupService::class);

            $jobs = \App\Models\BackupJob::where('status', \App\Enums\BackupStatus::SUCCESS)
                ->where('verified', false)
                ->where('started_at', '>=', now()->subDays($days))
                ->get();

            $this->info("Verifying {$jobs->count()} backups...");

            $passed = 0;
            $failed = 0;

            foreach ($jobs as $job) {
                if ($service->verifyBackup($job)) {
                    $passed++;
                    $this->line(" ✓ Job #{$job->id} verified");
                } else {
                    $failed++;
                    $this->error(" ✗ Job #{$job->id} FAILED verification");

                    Notification::route('mail', config('backup.alert_email'))
                        ->notify(new \App\Notifications\BackupVerificationFailed($job));
                }
            }

            $this->info("Verification complete: {$passed} passed, {$failed} failed.");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('VerifyBackups completed', ['elapsed' => $elapsed, 'passed' => $passed, 'failed' => $failed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('VerifyBackups failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
