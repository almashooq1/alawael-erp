<?php

namespace App\Listeners;

use App\Events\KbArticleRated;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class UpdateArticleRatingStats implements ShouldQueue
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {
    }

    public function handle(KbArticleRated $event): void
    {
        try {
            $this->notificationService->send(
                type: 'KbArticleRated',
                data: [
                    'model_id' => $event->kbarticle->id,
                    'branch_id' => $event->kbarticle->branch_id,
                    'message' => 'تم تقييم مقالة',
                ],
                userIds: [],
            );

            Log::info('KbArticleRated handled', ['id' => $event->kbarticle->id]);
        } catch (\Throwable $e) {
            Log::error('KbArticleRated listener failed', ['error' => $e->getMessage()]);
        }
    }
}
