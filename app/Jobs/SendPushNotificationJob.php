<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Services\Notifications\PushNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendPushNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        private readonly NotificationLog $log
    ) {
    }

    public function handle(PushNotificationService $service): void
    {
        $service->send($this->log);
    }

    public function failed(\Throwable $exception): void
    {
        $this->log->update([
            'status' => 'failed',
            'failed_at' => now(),
            'failure_reason' => $exception->getMessage(),
        ]);
    }
}
