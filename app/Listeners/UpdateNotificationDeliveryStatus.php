<?php

namespace App\Listeners;

use App\Events\NotificationDelivered;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class UpdateNotificationDeliveryStatus implements ShouldQueue
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {
    }

    public function handle(NotificationDelivered $event): void
    {
        try {
            $this->notificationService->send(
                type: 'NotificationDelivered',
                data: [
                    'model_id' => $event->notificationlog->id,
                    'branch_id' => $event->notificationlog->branch_id,
                    'message' => 'تم تسليم الإشعار',
                ],
                userIds: [],
            );

            Log::info('NotificationDelivered handled', ['id' => $event->notificationlog->id]);
        } catch (\Throwable $e) {
            Log::error('NotificationDelivered listener failed', ['error' => $e->getMessage()]);
        }
    }
}
