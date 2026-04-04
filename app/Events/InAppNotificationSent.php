<?php

namespace App\Events;

use App\Models\NotificationLog;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class InAppNotificationSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly NotificationLog $notificationlog,
        public ?int $userId = null,
    ) {
        $this->userId = $userId ?? auth()->id();
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('branch.' . $this->notificationlog->branch_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notificationlog->id,
            'uuid' => $this->notificationlog->uuid,
            'type' => 'InAppNotificationSent',
            'message' => 'إشعار داخلي جديد',
        ];
    }
}
