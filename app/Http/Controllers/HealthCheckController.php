<?php

namespace App\Http\Controllers;

use App\Services\MonitoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class HealthCheckController extends Controller
{
    public function __construct(
        private readonly MonitoringService $monitoring,
    ) {
    }

    public function __invoke(): JsonResponse
    {
        $checks = [
            'app' => $this->checkApp(),
            'database' => $this->checkDatabase(),
            'redis' => $this->checkRedis(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
        ];

        $healthy = collect($checks)->every(fn($c) => $c['status'] === 'ok');

        return response()->json([
            'status' => $healthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toISOString(),
            'version' => config('app.version', '1.0.0'),
            'checks' => $checks,
        ], $healthy ? 200 : 503);
    }

    private function checkApp(): array
    {
        return [
            'status' => 'ok',
            'environment' => config('app.env'),
            'php_version' => PHP_VERSION,
        ];
    }

    private function checkDatabase(): array
    {
        try {
            DB::connection()->getPdo();
            $latency = $this->measureLatency(fn() => DB::select('SELECT 1'));

            return ['status' => 'ok', 'latency_ms' => $latency];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Database connection failed'];
        }
    }

    private function checkRedis(): array
    {
        try {
            Redis::ping();

            return ['status' => 'ok'];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => 'Redis connection failed'];
        }
    }

    private function checkQueue(): array
    {
        try {
            $failedJobs = DB::table('failed_jobs')->count();
            $pendingJobs = DB::table('jobs')->count();

            return [
                'status' => 'ok',
                'failed_jobs' => $failedJobs,
                'pending_jobs' => $pendingJobs,
            ];
        } catch (\Throwable $e) {
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    private function checkStorage(): array
    {
        $path = storage_path();
        $free = disk_free_space($path);
        $total = disk_total_space($path);
        $usedPct = round((($total - $free) / $total) * 100, 1);

        return [
            'status' => $usedPct < 90 ? 'ok' : 'warning',
            'used_pct' => $usedPct,
            'free_gb' => round($free / 1024 / 1024 / 1024, 2),
        ];
    }

    private function measureLatency(callable $fn): float
    {
        $start = microtime(true);
        $fn();

        return round((microtime(true) - $start) * 1000, 2);
    }
}
