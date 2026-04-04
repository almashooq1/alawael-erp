<?php

namespace App\Models;

use App\Enums\BackupStatus;
use App\Enums\BackupType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BackupJob extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'backup_jobs';

    protected $fillable = [
        'schedule_id',
        'type',
        'status',
        'storage_path',
        'filename',
        'size_bytes',
        'checksum',
        'encryption_key_id',
        'encrypted',
        'compressed',
        'destinations',
        'destination_statuses',
        'started_at',
        'completed_at',
        'duration_seconds',
        'error_message',
        'metadata',
        'expires_at',
        'verified',
        'verified_at',
        'triggered_by',
    ];

    protected $casts = [
        'encrypted' => 'boolean',
        'compressed' => 'boolean',
        'verified' => 'boolean',
        'destinations' => 'array',
        'destination_statuses' => 'array',
        'metadata' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
        'type' => BackupType::class,
        'status' => BackupStatus::class,
    ];

    // === العلاقات ===

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(BackupSchedule::class, 'schedule_id');
    }

    public function restoreJobs(): HasMany
    {
        return $this->hasMany(RestoreJob::class, 'backup_job_id');
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // === Scopes ===

    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->where('status', BackupStatus::SUCCESS);
    }

    public function scopeRecent(Builder $query, int $days = 7): Builder
    {
        return $query->where('started_at', '>=', now()->subDays($days));
    }

    public function scopeNotExpired(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        });
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
