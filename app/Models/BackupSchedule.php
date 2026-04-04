<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BackupSchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'backup_schedules';

    protected $fillable = [
        'name',
        'type',
        'frequency',
        'cron_expression',
        'run_at',
        'days_of_week',
        'day_of_month',
        'backup_database',
        'backup_files',
        'backup_config',
        'destination_ids',
        'retention_days',
        'retention_count',
        'encrypt',
        'compress',
        'verify_after',
        'is_active',
        'notify_on_failure',
        'notify_on_success',
        'notification_channels',
        'last_run_at',
        'next_run_at',
        'last_run_status',
    ];

    protected $casts = [
        'backup_database' => 'boolean',
        'backup_files' => 'boolean',
        'backup_config' => 'boolean',
        'encrypt' => 'boolean',
        'compress' => 'boolean',
        'verify_after' => 'boolean',
        'is_active' => 'boolean',
        'notify_on_failure' => 'boolean',
        'notify_on_success' => 'boolean',
        'days_of_week' => 'array',
        'destination_ids' => 'array',
        'notification_channels' => 'array',
        'last_run_at' => 'datetime',
        'next_run_at' => 'datetime',
    ];

    // === العلاقات ===

    public function jobs(): HasMany
    {
        return $this->hasMany(BackupJob::class, 'schedule_id');
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query->where('next_run_at', '<=', now())->where('is_active', true);
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
