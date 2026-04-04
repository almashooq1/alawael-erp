<?php

namespace App\Events;

use App\Models\ChatbotConversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatHandoffRequested implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ChatbotConversation $conversation,
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('branch.' . $this->conversation->branch_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->conversation->id,
            'session_id' => $this->conversation->session_id,
            'type' => 'ChatHandoffRequested',
            'message' => 'طلب تحويل محادثة للموظف',
        ];
    }
}
