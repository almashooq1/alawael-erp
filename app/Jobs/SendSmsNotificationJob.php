<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Services\Notifications\SmsNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendSmsNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        private readonly NotificationLog $log
    ) {
    }

    public function handle(SmsNotificationService $service): void
    {
        $phone = $this->log->recipient_contact
            ?? $this->log->recipient?->phone;

        if (!$phone) {
            $this->log->update(['status' => 'failed', 'failure_reason' => 'لا يوجد رقم هاتف']);
            return;
        }

        $provider = config('notifications.sms_provider', 'unifonic');

        match ($provider) {
            'unifonic' => $service->sendViaUnifonic($this->log, $phone),
            'msegat' => $service->sendViaMsegat($this->log, $phone),
            'twilio' => $service->sendViaTwilio($this->log, $phone),
            default => $service->sendViaUnifonic($this->log, $phone),
        };
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
