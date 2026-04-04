<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CloseAbandonedChatsCommand extends Command
{
    protected $signature = 'chatbot:close-abandoned';

    protected $description = 'إغلاق المحادثات المتروكة';

    public function handle(): int
    {
        $this->info('بدء تنفيذ CloseAbandonedChats...');
        $startTime = microtime(true);

        try {
            $count = \App\Models\ChatbotConversation::where('status', 'active')
                ->where('last_message_at', '<', now()->subHours(24))
                ->update(['status' => 'abandoned']);
            $this->info("تم إغلاق {$count} محادثة متروكة");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('CloseAbandonedChats completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('CloseAbandonedChats failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
