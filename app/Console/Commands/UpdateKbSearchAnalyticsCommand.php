<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UpdateKbSearchAnalyticsCommand extends Command
{
    protected $signature = 'kb:update-analytics';

    protected $description = 'تحديث تحليلات البحث وإحصاءات قاعدة المعرفة';

    public function handle(): int
    {
        $this->info('بدء تنفيذ UpdateKbSearchAnalytics...');
        $startTime = microtime(true);

        try {
            $noResultSearches = \App\Models\KbSearchLog::where('found_result', false)
                ->whereDate('created_at', '>=', now()->subDays(7))
                ->select('query', DB::raw('count(*) as count'))
                ->groupBy('query')
                ->orderByDesc('count')
                ->limit(50)
                ->get();

            $reportPath = storage_path('app/kb-analytics-' . date('Y-m-d') . '.json');
            file_put_contents($reportPath, $noResultSearches->toJson(JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            $this->info("تم حفظ تقرير التحليلات في: {$reportPath}");

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("تم التنفيذ بنجاح في {$elapsed} ثانية");
            Log::info('UpdateKbSearchAnalytics completed', ['elapsed' => $elapsed]);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("خطأ: {$e->getMessage()}");
            Log::error('UpdateKbSearchAnalytics failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
