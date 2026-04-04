<?php

namespace App\Services\Notifications;

use App\Enums\NotificationStatus;
use App\Models\NotificationLog;
use App\Models\PushSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private const FCM_URL = 'https://fcm.googleapis.com/v1/projects/{project}/messages:send';

    // إرسال إشعار Push عبر Firebase
    public function send(NotificationLog $log): bool
    {
        $tokens = PushSubscription::where('user_id', $log->recipient_id)
            ->where('is_active', true)
            ->pluck('fcm_token')
            ->toArray();

        if (empty($tokens)) {
            $this->markFailed($log, 'لا توجد أجهزة مسجلة');
            return false;
        }

        $projectId = config('services.firebase.project_id');
        $accessToken = $this->getAccessToken();

        $sent = 0;
        foreach ($tokens as $token) {
            $payload = [
                'message' => [
                    'token' => $token,
                    'notification' => [
                        'title' => $log->subject ?? 'إشعار جديد',
                        'body' => $log->body,
                    ],
                    'data' => [
                        'event_type' => $log->event_type ?? '',
                        'log_id' => (string) $log->id,
                    ],
                    'android' => ['priority' => 'high'],
                    'apns' => ['headers' => ['apns-priority' => '10']],
                ],
            ];

            $url = str_replace('{project}', $projectId, self::FCM_URL);
            $response = Http::withToken($accessToken)->post($url, $payload);

            if ($response->successful()) {
                $sent++;
            } else {
                Log::warning('FCM send failed', ['token' => substr($token, 0, 20), 'error' => $response->body()]);
                if (str_contains($response->body(), 'UNREGISTERED')) {
                    PushSubscription::where('fcm_token', $token)->update(['is_active' => false]);
                }
            }
        }

        if ($sent > 0) {
            $log->update(['status' => NotificationStatus::SENT, 'sent_at' => now()]);
            return true;
        }

        $this->markFailed($log, 'فشل الإرسال لجميع الأجهزة');
        return false;
    }

    // الحصول على Access Token من Firebase
    private function getAccessToken(): string
    {
        return cache()->remember('firebase_access_token', 3500, function () {
            $credentials = json_decode(file_get_contents(storage_path('app/firebase-credentials.json')), true);
            $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $now = time();
            $payload = base64_encode(json_encode([
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => $now,
                'exp' => $now + 3600,
            ]));
            $unsigned = $header . '.' . $payload;
            openssl_sign($unsigned, $sig, $credentials['private_key'], 'SHA256');
            $jwt = $unsigned . '.' . base64_encode($sig);
            $res = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);
            return $res->json('access_token');
        });
    }

    private function markFailed(NotificationLog $log, string $reason): void
    {
        $log->update([
            'status' => NotificationStatus::FAILED,
            'failed_at' => now(),
            'failure_reason' => $reason,
        ]);
    }
}
