<?php

namespace App\Services;

use App\Enums\BackupStatus;
use App\Enums\BackupType;
use App\Models\BackupDestination;
use App\Models\BackupJob;
use App\Models\BackupSchedule;
use App\Models\RestoreJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BackupService
{
    public function __construct(
        private readonly BackupJob $model,
    ) {
    }

    // إنشاء نسخة احتياطية كاملة
    public function createFullBackup(array $options = []): BackupJob
    {
        $job = BackupJob::create([
            'type' => BackupType::FULL,
            'status' => BackupStatus::PENDING,
            'encrypted' => $options['encrypt'] ?? true,
            'compressed' => $options['compress'] ?? true,
            'branch_id' => $options['branch_id'] ?? session('current_branch_id'),
            'triggered_by' => auth()->id(),
            'schedule_id' => $options['schedule_id'] ?? null,
        ]);

        dispatch(new \App\Jobs\RunBackupJob($job));

        Log::info('Full backup initiated', ['job_id' => $job->id]);

        return $job;
    }

    // إنشاء نسخة احتياطية تزايدية منذ آخر نسخة كاملة
    public function createIncrementalBackup(BackupJob $lastFull, array $options = []): BackupJob
    {
        $job = BackupJob::create([
            'type' => BackupType::INCREMENTAL,
            'status' => BackupStatus::PENDING,
            'metadata' => ['parent_job_id' => $lastFull->id, 'parent_checksum' => $lastFull->checksum],
            'branch_id' => $options['branch_id'] ?? session('current_branch_id'),
            'triggered_by' => auth()->id(),
        ]);

        dispatch(new \App\Jobs\RunBackupJob($job, ['since' => $lastFull->completed_at]));

        return $job;
    }

    // تنفيذ نسخ قاعدة البيانات مع mysqldump
    public function runDatabaseBackup(BackupJob $job): string
    {
        $filename = sprintf(
            'db_%s_%s.sql.gz',
            config('app.name'),
            now()->format('Y-m-d_H-i-s')
        );

        $tmpPath = storage_path("backups/tmp/{$filename}");

        $command = sprintf(
            'mysqldump --single-transaction --quick --lock-tables=false -h %s -u %s -p%s %s | gzip > %s',
            escapeshellarg(config('database.connections.mysql.host')),
            escapeshellarg(config('database.connections.mysql.username')),
            escapeshellarg(config('database.connections.mysql.password')),
            escapeshellarg(config('database.connections.mysql.database')),
            escapeshellarg($tmpPath)
        );

        exec($command, $output, $returnCode);

        if ($returnCode !== 0) {
            throw new \RuntimeException('mysqldump failed with code: ' . $returnCode);
        }

        // تشفير AES-256 إذا مطلوب
        if ($job->encrypted ?? true) {
            $encryptedPath = $tmpPath . '.enc';
            $key = config('backup.encryption_key');
            exec("openssl enc -aes-256-cbc -salt -in {$tmpPath} -out {$encryptedPath} -k {$key}");
            unlink($tmpPath);
            $tmpPath = $encryptedPath;
        }

        $checksum = hash_file('sha256', $tmpPath);
        $job->update(['checksum' => $checksum, 'filename' => basename($tmpPath)]);

        return $tmpPath;
    }

    // رفع النسخة الاحتياطية إلى جميع الوجهات المكوّنة
    public function uploadToDestinations(BackupJob $job, string $localPath): array
    {
        $destinations = BackupDestination::where('is_active', true)->get();
        $results = [];

        foreach ($destinations as $destination) {
            try {
                $disk = Storage::disk($destination->type);
                $remotePath = "backups/{$job->branch_id}/" . basename($localPath);

                $disk->put($remotePath, file_get_contents($localPath));

                $results[$destination->id] = [
                    'status' => 'success',
                    'path' => $remotePath,
                    'size' => filesize($localPath),
                    'uploaded_at' => now()->toISOString(),
                ];
            } catch (\Throwable $e) {
                Log::error("Upload to {$destination->type} failed", [
                    'job_id' => $job->id,
                    'error' => $e->getMessage(),
                ]);

                $results[$destination->id] = ['status' => 'failed', 'error' => $e->getMessage()];
            }
        }

        $job->update(['destination_statuses' => $results]);

        return $results;
    }

    // استعادة نسخة احتياطية إلى البيئة المستهدفة
    public function restore(BackupJob $backupJob, array $options = []): RestoreJob
    {
        return DB::transaction(function () use ($backupJob, $options) {
            $restoreJob = RestoreJob::create([
                'backup_job_id' => $backupJob->id,
                'status' => 'pending',
                'restore_type' => $options['type'] ?? 'full',
                'target_environment' => $options['environment'] ?? 'staging',
                'is_test_restore' => $options['test'] ?? false,
                'branch_id' => $backupJob->branch_id,
                'approved_by' => auth()->id(),
                'approved_at' => now(),
            ]);

            dispatch(new \App\Jobs\RunRestoreJob($restoreJob));

            Log::warning('Restore initiated', [
                'backup_job_id' => $backupJob->id,
                'restore_job_id' => $restoreJob->id,
                'initiated_by' => auth()->id(),
            ]);

            return $restoreJob;
        });
    }

    // التحقق من سلامة النسخة الاحتياطية
    public function verifyBackup(BackupJob $job): bool
    {
        try {
            $disk = Storage::disk('local');
            if (!$disk->exists($job->storage_path)) {
                return false;
            }

            $localPath = storage_path('app/' . $job->storage_path);
            $actualChecksum = hash_file('sha256', $localPath);

            if ($actualChecksum !== $job->checksum) {
                Log::error('Backup checksum mismatch', [
                    'job_id' => $job->id,
                    'expected' => $job->checksum,
                    'actual' => $actualChecksum,
                ]);

                return false;
            }

            $job->update(['verified' => true, 'verified_at' => now()]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Backup verification failed', ['job_id' => $job->id, 'error' => $e->getMessage()]);

            return false;
        }
    }

    // تطبيق سياسة الاحتفاظ وحذف النسخ القديمة
    public function applyRetentionPolicy(BackupSchedule $schedule): int
    {
        $deleted = 0;

        if ($schedule->retention_days) {
            $expiredJobs = BackupJob::where('schedule_id', $schedule->id)
                ->where('status', BackupStatus::SUCCESS)
                ->where('started_at', '<', now()->subDays($schedule->retention_days))
                ->get();

            foreach ($expiredJobs as $job) {
                $this->deleteBackupFiles($job);
                $job->update(['status' => BackupStatus::EXPIRED, 'expires_at' => now()]);
                $deleted++;
            }
        }

        if ($schedule->retention_count) {
            $oldJobs = BackupJob::where('schedule_id', $schedule->id)
                ->where('status', BackupStatus::SUCCESS)
                ->orderBy('started_at', 'desc')
                ->skip($schedule->retention_count)
                ->get();

            foreach ($oldJobs as $job) {
                $this->deleteBackupFiles($job);
                $job->delete();
                $deleted++;
            }
        }

        Log::info('Retention policy applied', [
            'schedule_id' => $schedule->id,
            'deleted' => $deleted,
        ]);

        return $deleted;
    }

    // حذف ملفات النسخة الاحتياطية من جميع الوجهات
    public function deleteBackupFiles(BackupJob $job): void
    {
        foreach ($job->destination_statuses ?? [] as $destId => $info) {
            if (($info['status'] ?? '') === 'success' && isset($info['path'])) {
                try {
                    $dest = BackupDestination::find($destId);
                    if ($dest) {
                        Storage::disk($dest->type)->delete($info['path']);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete backup file', [
                        'job_id' => $job->id,
                        'dest_id' => $destId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }
    }

    // إحصائيات النسخ الاحتياطية للوحة التحكم
    public function getStats(?int $branchId = null): array
    {
        $query = BackupJob::query();
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return [
            'total' => ['title' => 'إجمالي النسخ', 'value' => $query->clone()->count()],
            'successful' => ['title' => 'ناجحة', 'value' => $query->clone()->where('status', BackupStatus::SUCCESS)->count()],
            'failed' => ['title' => 'فاشلة', 'value' => $query->clone()->where('status', BackupStatus::FAILED)->count()],
            'total_size' => ['title' => 'الحجم الكلي', 'value' => $this->formatBytes((int) $query->clone()->sum('size_bytes'))],
            'last_backup' => ['title' => 'آخر نسخة', 'value' => BackupJob::latest()->value('started_at')?->diffForHumans()],
            'last_restore' => ['title' => 'آخر استعادة', 'value' => RestoreJob::latest()->value('started_at')?->diffForHumans()],
        ];
    }

    // تنسيق حجم الملفات للعرض
    public function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    // قائمة النسخ مع فلترة
    public function list(array $filters = [])
    {
        $query = BackupJob::with(['schedule', 'branch', 'triggeredBy'])
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where('filename', 'like', "%{$search}%");
            })
            ->when($filters['status'] ?? null, fn($q, $v) => $q->where('status', $v))
            ->when($filters['branch_id'] ?? null, fn($q, $v) => $q->where('branch_id', $v))
            ->when($filters['date_from'] ?? null, fn($q, $v) => $q->whereDate('started_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn($q, $v) => $q->whereDate('started_at', '<=', $v))
            ->latest('started_at');

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function getRelations(): array
    {
        return ['schedule', 'branch', 'triggeredBy'];
    }

    public function getFormOptions(): array
    {
        return [
            'backupTypes' => collect(BackupType::cases())->map(fn($e) => ['value' => $e->value, 'label' => $e->label()]),
            'schedules' => BackupSchedule::active()->get(['id', 'name'])->map(fn($s) => ['value' => $s->id, 'label' => $s->name]),
        ];
    }

    public function create(array $data): BackupJob
    {
        return $this->createFullBackup($data);
    }

    public function update(BackupJob $job, array $data): BackupJob
    {
        $job->update($data);

        return $job->fresh();
    }

    public function delete(BackupJob $job): void
    {
        $this->deleteBackupFiles($job);
        $job->delete();
    }
}
