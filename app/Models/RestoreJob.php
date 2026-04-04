<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class RestoreJob extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'restore_jobs';

    protected $fillable = [
        'backup_job_id',
        'status',
        'restore_type',
        'target_environment',
        'restore_options',
        'is_test_restore',
        'notes',
        'started_at',
        'completed_at',
        'duration_seconds',
        'error_message',
        'restore_log',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'is_test_restore' => 'boolean',
        'restore_options' => 'array',
        'restore_log' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    // === العلاقات ===

    public function backupJob(): BelongsTo
    {
        return $this->belongsTo(BackupJob::class, 'backup_job_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // === Boot ===

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            $model->uuid = $model->uuid ?? (string) Str::uuid();
            $model->created_by = $model->created_by ?? auth()->id();
            $model->branch_id = $model->branch_id ?? session('current_branch_id');
        });

        static::updating(function (self $model) {
            $model->updated_by = auth()->id();
        });
    }
}
