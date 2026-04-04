<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendDigestNotificationsCommand extends Command
{
    protected $signature = 'notifications:send-digest';

    protected $description = 'إرسال ملخص الإشعارات اليومي';

    public function handle(): int
    {
        $this->info('بدء تنفيذ SendDigestNotifications...');
        $startTime = microtime(true);

        try {
            $users = \App\Models\User::whereHas('notificationPreferences', function ($q) {
                $q->where('frequency', 'digest_daily')->where('is_enabled', true);
            })->get();

            foreach ($users as $user) {
                $pending = \App\Models\NotificationLog::where('recipient_id', $user->id)
                    ->whereDate('created_at', today())
                    ->where('status', 'pending')
                    ->get();

                if ($pending->isNotEmpty()) {
                    \App\Jobs\SendDigestEmailJob::dispatch($user, $pending);
                }
            }
            $this->info("تم إرسال ملخص {$users->count()} مستخدم");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('SendDigestNotifications completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('SendDigestNotifications failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
