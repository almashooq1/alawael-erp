<?php

namespace App\Events;

use App\Models\KbArticle;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class KbArticleRated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly KbArticle $kbarticle,
        public readonly ?int $userId = null,
    ) {
        $this->userId = $userId ?? auth()->id();
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('branch.' . $this->kbarticle->branch_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->kbarticle->id,
            'uuid' => $this->kbarticle->uuid,
            'type' => 'KbArticleRated',
            'message' => 'تم تقييم مقالة',
        ];
    }
}
