<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessScheduledNotificationsCommand extends Command
{
    protected $signature = 'notifications:process-scheduled';

    protected $description = 'معالجة الإشعارات المجدولة وإرسالها';

    public function handle(): int
    {
        $this->info('بدء تنفيذ ProcessScheduledNotifications...');
        $startTime = microtime(true);

        try {
            $pending = \App\Models\NotificationLog::where('status', 'pending')
                ->where('scheduled_at', '<=', now())
                ->limit(100)
                ->get();

            $sent = 0;
            foreach ($pending as $log) {
                $job = match ($log->channel->value ?? $log->channel) {
                    'sms' => \App\Jobs\SendSmsNotificationJob::class,
                    'push' => \App\Jobs\SendPushNotificationJob::class,
                    'email' => \App\Jobs\SendEmailNotificationJob::class,
                    'whatsapp' => \App\Jobs\SendWhatsAppNotificationJob::class,
                    default => null,
                };
                if ($job) {
                    dispatch(new $job($log));
                    $sent++;
                }
            }
            $this->info("تم إرسال {$sent} إشعار");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('ProcessScheduledNotifications completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('ProcessScheduledNotifications failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
