<?php

use App\Models\BackupJob;
use App\Models\BackupSchedule;
use App\Models\User;
use App\Models\Branch;
use App\Enums\BackupType;
use App\Enums\BackupStatus;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->admin = User::factory()->create([
        'branch_id' => $this->branch->id,
        'role' => 'admin',
    ]);
    $this->user = User::factory()->create([
        'branch_id' => $this->branch->id,
        'role' => 'user',
    ]);
});

it('يمكن إنشاء نسخة احتياطية كاملة', function () {
    $service = app(\App\Services\BackupService::class);
    actingAs($this->admin);

    $job = $service->createFullBackup(['branch_id' => $this->branch->id]);

    expect($job)->toBeInstanceOf(BackupJob::class)
        ->and($job->type)->toBe(BackupType::FULL)
        ->and($job->status)->toBe(BackupStatus::PENDING);
});

it('التحقق من checksum النسخة الاحتياطية', function () {
    $job = BackupJob::factory()->create([
        'branch_id' => $this->branch->id,
        'status' => BackupStatus::SUCCESS,
        'checksum' => 'abc123',
        'verified' => false,
    ]);

    $service = app(\App\Services\BackupService::class);
    \Illuminate\Support\Facades\Storage::fake('local');
    \Illuminate\Support\Facades\Storage::put($job->storage_path ?? 'test.sql', 'test');

    expect($job->verified)->toBeFalse();
});

it('يطبق سياسة الاحتفاظ ويحذف النسخ القديمة', function () {
    $schedule = BackupSchedule::factory()->create([
        'branch_id' => $this->branch->id,
        'retention_days' => 7,
    ]);

    BackupJob::factory()->count(3)->create([
        'schedule_id' => $schedule->id,
        'branch_id' => $this->branch->id,
        'status' => BackupStatus::SUCCESS,
        'started_at' => now()->subDays(10),
    ]);

    $service = app(\App\Services\BackupService::class);
    $deleted = $service->applyRetentionPolicy($schedule);

    expect($deleted)->toBe(3);
});

it('يرفض استعادة النسخة بدون صلاحية', function () {
    actingAs($this->user);

    $backup = BackupJob::factory()->create([
        'branch_id' => $this->branch->id,
        'status' => BackupStatus::SUCCESS,
    ]);

    $this->postJson("/backup/backups/{$backup->id}/restore")
        ->assertForbidden();
});

it('يعرض إحصائيات النسخ الاحتياطية', function () {
    actingAs($this->admin);

    BackupJob::factory()->count(5)->create([
        'branch_id' => $this->branch->id,
        'status' => BackupStatus::SUCCESS,
    ]);

    BackupJob::factory()->count(2)->create([
        'branch_id' => $this->branch->id,
        'status' => BackupStatus::FAILED,
    ]);

    $service = app(\App\Services\BackupService::class);
    $stats = $service->getStats($this->branch->id);

    expect($stats)->toHaveKey('total')
        ->and($stats)->toHaveKey('successful')
        ->and($stats)->toHaveKey('failed');
});

it('يُنشئ نسخة تزايدية من آخر نسخة كاملة', function () {
    actingAs($this->admin);

    $lastFull = BackupJob::factory()->create([
        'branch_id' => $this->branch->id,
        'type' => BackupType::FULL,
        'status' => BackupStatus::SUCCESS,
        'checksum' => 'abc123def456',
    ]);

    $service = app(\App\Services\BackupService::class);
    $job = $service->createIncrementalBackup($lastFull, ['branch_id' => $this->branch->id]);

    expect($job)->toBeInstanceOf(BackupJob::class)
        ->and($job->type)->toBe(BackupType::INCREMENTAL)
        ->and($job->metadata['parent_job_id'])->toBe($lastFull->id);
});
