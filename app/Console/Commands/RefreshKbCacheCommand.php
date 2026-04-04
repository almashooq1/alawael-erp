<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class RefreshKbCacheCommand extends Command
{
    protected $signature = 'kb:refresh-cache';

    protected $description = 'تحديث كاش قاعدة المعرفة';

    public function handle(): int
    {
        $this->info('بدء تنفيذ RefreshKbCache...');
        $startTime = microtime(true);

        try {
            $branches = \App\Models\Branch::pluck('id');
            foreach ($branches as $branchId) {
                Cache::forget("kb_faqs_{$branchId}");
                Cache::forget("kb_stats_{$branchId}");
                Cache::forget("kb_featured_{$branchId}");
            }
            $this->info('تم تحديث كاش ' . $branches->count() . ' فرع');

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('RefreshKbCache completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('RefreshKbCache failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
