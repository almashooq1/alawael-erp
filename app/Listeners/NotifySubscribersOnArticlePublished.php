<?php

namespace App\Listeners;

use App\Events\KbArticlePublished;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class NotifySubscribersOnArticlePublished implements ShouldQueue
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {
    }

    public function handle(KbArticlePublished $event): void
    {
        try {
            $this->notificationService->send(
                type: 'KbArticlePublished',
                data: [
                    'model_id' => $event->kbarticle->id,
                    'branch_id' => $event->kbarticle->branch_id,
                    'message' => 'تم نشر مقالة جديدة في قاعدة المعرفة',
                ],
                userIds: [],
            );

            Log::info('KbArticlePublished handled', ['id' => $event->kbarticle->id]);
        } catch (\Throwable $e) {
            Log::error('KbArticlePublished listener failed', ['error' => $e->getMessage()]);
        }
    }
}
