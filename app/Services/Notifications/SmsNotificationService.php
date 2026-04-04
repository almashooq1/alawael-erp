<?php

namespace App\Services\Notifications;

use App\Enums\NotificationStatus;
use App\Models\NotificationLog;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsNotificationService
{
    // إرسال SMS عبر Unifonic
    public function sendViaUnifonic(NotificationLog $log, string $phone): bool
    {
        try {
            $response = Http::post('https://api.unifonic.com/rest/SMS/messages', [
                'AppSid' => Config::get('services.unifonic.app_sid'),
                'Recipient' => $phone,
                'Body' => $log->body,
                'SenderID' => Config::get('services.unifonic.sender_id'),
            ]);

            if ($response->successful() && $response->json('Status') === 'Success') {
                $log->update([
                    'status' => NotificationStatus::SENT,
                    'sent_at' => now(),
                    'external_id' => $response->json('MessageID'),
                ]);
                return true;
            }

            $this->markFailed($log, $response->body());
            return false;
        } catch (\Throwable $e) {
            $this->markFailed($log, $e->getMessage());
            Log::error('Unifonic SMS failed', ['error' => $e->getMessage(), 'log_id' => $log->id]);
            return false;
        }
    }

    // إرسال SMS عبر MSEGAT
    public function sendViaMsegat(NotificationLog $log, string $phone): bool
    {
        try {
            $response = Http::post('https://www.msegat.com/gw/sendsms.php', [
                'userName' => Config::get('services.msegat.username'),
                'apiKey' => Config::get('services.msegat.api_key'),
                'numbers' => $phone,
                'userSender' => Config::get('services.msegat.sender'),
                'msg' => $log->body,
                'msgEncoding' => 'UTF8',
            ]);

            if ($response->successful()) {
                $log->update([
                    'status' => NotificationStatus::SENT,
                    'sent_at' => now(),
                ]);
                return true;
            }
            $this->markFailed($log, $response->body());
            return false;
        } catch (\Throwable $e) {
            $this->markFailed($log, $e->getMessage());
            return false;
        }
    }

    // إرسال SMS عبر Twilio
    public function sendViaTwilio(NotificationLog $log, string $phone): bool
    {
        try {
            $client = new \Twilio\Rest\Client(
                Config::get('services.twilio.account_sid'),
                Config::get('services.twilio.auth_token')
            );

            $message = $client->messages->create($phone, [
                'from' => Config::get('services.twilio.from'),
                'body' => $log->body,
            ]);

            $log->update([
                'status' => NotificationStatus::SENT,
                'sent_at' => now(),
                'external_id' => $message->sid,
            ]);
            return true;
        } catch (\Throwable $e) {
            $this->markFailed($log, $e->getMessage());
            return false;
        }
    }

    // تحديد الرسالة كفاشلة
    private function markFailed(NotificationLog $log, string $reason): void
    {
        $log->update([
            'status' => NotificationStatus::FAILED,
            'failed_at' => now(),
            'failure_reason' => $reason,
            'retry_count' => $log->retry_count + 1,
        ]);
    }
}
