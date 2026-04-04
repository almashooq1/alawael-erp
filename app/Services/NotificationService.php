<?php

namespace App\Services;

use App\Enums\NotificationChannel;
use App\Enums\NotificationStatus;
use App\Jobs\SendEmailNotificationJob;
use App\Jobs\SendPushNotificationJob;
use App\Jobs\SendSmsNotificationJob;
use App\Jobs\SendWhatsAppNotificationJob;
use App\Models\NotificationLog;
use App\Models\NotificationTemplate;
use App\Models\UserNotificationPreference;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class NotificationService
{
    // إرسال إشعار عبر قناة محددة
    public function send(string $type, array $data, array $userIds, ?string $channelOverride = null): void
    {
        // التحقق من Rate Limiting
        $rateLimitKey = 'notif_rate:' . $type . ':' . implode(',', $userIds);
        if (Redis::exists($rateLimitKey)) {
            Log::warning("Rate limit hit for notification type: {$type}");
            return;
        }
        Redis::setex($rateLimitKey, 60, 1);

        foreach ($userIds as $userId) {
            $prefs = $this->getUserPreferences($userId, $type);

            foreach ($prefs as $pref) {
                $channel = $channelOverride ?? $pref->channel->value;

                if (!$pref->is_enabled) {
                    continue;
                }

                $scheduledAt = $this->calculateScheduleTime($pref);
                $template = $this->resolveTemplate($type, $channel);

                if (!$template) {
                    continue;
                }

                $body = $this->renderTemplate($template, $data);

                $log = NotificationLog::create([
                    'branch_id' => $data['branch_id'] ?? session('current_branch_id'),
                    'channel' => $channel,
                    'event_type' => $type,
                    'recipient_id' => $userId,
                    'template_id' => $template->id,
                    'subject' => $template->subject,
                    'body' => $body,
                    'status' => NotificationStatus::PENDING,
                    'metadata' => $data,
                    'scheduled_at' => $scheduledAt,
                    'group_key' => $type . ':' . $userId,
                ]);

                $this->dispatchJob($channel, $log);
            }
        }
    }

    // إرسال عبر قناة محددة
    private function dispatchJob(string $channel, NotificationLog $log): void
    {
        match ($channel) {
            'sms' => SendSmsNotificationJob::dispatch($log)->onQueue('notifications'),
            'email' => SendEmailNotificationJob::dispatch($log)->onQueue('notifications'),
            'push' => SendPushNotificationJob::dispatch($log)->onQueue('notifications'),
            'whatsapp' => SendWhatsAppNotificationJob::dispatch($log)->onQueue('notifications'),
            'in_app' => $this->sendInApp($log),
            default => Log::warning("Unknown channel: {$channel}"),
        };
    }

    // إشعار داخلي عبر WebSocket
    private function sendInApp(NotificationLog $log): void
    {
        $log->update(['status' => NotificationStatus::SENT, 'sent_at' => now()]);
        broadcast(new \App\Events\InAppNotificationSent($log))->toOthers();
    }

    // تحديد القالب المناسب
    private function resolveTemplate(string $type, string $channel): ?NotificationTemplate
    {
        $locale = app()->getLocale();
        return Cache::remember("notif_tpl:{$type}:{$channel}:{$locale}", 3600, function () use ($type, $channel, $locale) {
            return NotificationTemplate::where('event_type', $type)
                ->where('channel', $channel)
                ->where('locale', $locale)
                ->where('is_active', true)
                ->first()
                ?? NotificationTemplate::where('event_type', $type)
                    ->where('channel', $channel)
                    ->where('is_active', true)
                    ->first();
        });
    }

    // تحويل القالب بالمتغيرات
    public function renderTemplate(NotificationTemplate $template, array $data): string
    {
        $body = $template->body;
        foreach ($data as $key => $value) {
            if (is_scalar($value)) {
                $body = str_replace('{{' . $key . '}}', $value, $body);
            }
        }
        return $body;
    }

    // جلب تفضيلات المستخدم
    private function getUserPreferences(int $userId, string $eventType): \Illuminate\Database\Eloquent\Collection
    {
        return Cache::remember("user_prefs:{$userId}:{$eventType}", 600, function () use ($userId, $eventType) {
            return UserNotificationPreference::where('user_id', $userId)
                ->where('event_type', $eventType)
                ->where('is_enabled', true)
                ->get();
        });
    }

    // حساب وقت الجدولة
    private function calculateScheduleTime(UserNotificationPreference $pref): \Carbon\Carbon
    {
        if ($pref->frequency === 'immediate') {
            return now();
        }
        if ($pref->frequency === 'digest_daily') {
            return now()->endOfDay()->subHour();
        }
        return now()->endOfWeek()->subHours(2);
    }

    // تطبيق قواعد التصعيد
    public function applyEscalationRules(): void
    {
        $rules = \App\Models\NotificationEscalationRule::where('is_active', true)->get();

        foreach ($rules as $rule) {
            $unread = NotificationLog::where('channel', $rule->trigger_channel)
                ->where('event_type', $rule->event_type)
                ->whereNull('read_at')
                ->where('status', NotificationStatus::DELIVERED)
                ->where('sent_at', '<=', now()->subMinutes($rule->wait_minutes))
                ->get();

            foreach ($unread as $log) {
                $this->send(
                    $log->event_type,
                    $log->metadata ?? [],
                    [$log->recipient_id],
                    $rule->escalate_to_channel
                );
            }
        }
    }

    // إحصاءات الإشعارات
    public function getStats(int $branchId, string $period = 'today'): array
    {
        $query = NotificationLog::where('branch_id', $branchId);
        if ($period === 'today') {
            $query->whereDate('created_at', today());
        }
        if ($period === 'week') {
            $query->whereBetween('created_at', [now()->startOfWeek(), now()]);
        }

        return [
            'total' => $query->count(),
            'sent' => (clone $query)->where('status', NotificationStatus::SENT)->count(),
            'delivered' => (clone $query)->where('status', NotificationStatus::DELIVERED)->count(),
            'read' => (clone $query)->where('status', NotificationStatus::READ)->count(),
            'failed' => (clone $query)->where('status', NotificationStatus::FAILED)->count(),
            'by_channel' => (clone $query)->select('channel', DB::raw('count(*) as count'))
                ->groupBy('channel')->pluck('count', 'channel'),
        ];
    }

    // تحديد كمقروء
    public function markAsRead(int $logId, int $userId): void
    {
        NotificationLog::where('id', $logId)
            ->where('recipient_id', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'status' => NotificationStatus::READ]);
    }

    // تحديد جميع كمقروءة
    public function markAllAsRead(int $userId): int
    {
        return NotificationLog::where('recipient_id', $userId)
            ->where('channel', NotificationChannel::IN_APP)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'status' => NotificationStatus::READ]);
    }

    // جلب إشعارات المستخدم
    public function getUserNotifications(int $userId, int $perPage = 20): \Illuminate\Pagination\LengthAwarePaginator
    {
        return NotificationLog::where('recipient_id', $userId)
            ->where('channel', NotificationChannel::IN_APP)
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    // عدد الإشعارات غير المقروءة
    public function getUnreadCount(int $userId): int
    {
        return NotificationLog::where('recipient_id', $userId)
            ->where('channel', NotificationChannel::IN_APP)
            ->whereNull('read_at')
            ->count();
    }

    // حفظ تفضيلات المستخدم
    public function saveUserPreferences(int $userId, array $preferences): void
    {
        foreach ($preferences as $pref) {
            UserNotificationPreference::updateOrCreate(
                [
                    'user_id' => $userId,
                    'channel' => $pref['channel'],
                    'event_type' => $pref['event_type'],
                ],
                [
                    'is_enabled' => $pref['is_enabled'],
                    'frequency' => $pref['frequency'] ?? 'immediate',
                    'branch_id' => session('current_branch_id'),
                ]
            );
        }
        Cache::forget("user_prefs:{$userId}:*");
    }
}
