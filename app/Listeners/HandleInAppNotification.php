<?php

namespace App\Listeners;

use App\Events\InAppNotificationSent;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class HandleInAppNotification implements ShouldQueue
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {
    }

    public function handle(InAppNotificationSent $event): void
    {
        try {
            $this->notificationService->send(
                type: 'InAppNotificationSent',
                data: [
                    'model_id' => $event->notificationlog->id,
                    'branch_id' => $event->notificationlog->branch_id,
                    'message' => 'إشعار داخلي جديد',
                ],
                userIds: [$event->notificationlog->recipient_id],
            );

            Log::info('InAppNotificationSent handled', ['id' => $event->notificationlog->id]);
        } catch (\Throwable $e) {
            Log::error('InAppNotificationSent listener failed', ['error' => $e->getMessage()]);
        }
    }
}
