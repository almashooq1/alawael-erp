<?php

namespace App\Models;

use App\Enums\StorageType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class BackupDestination extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'backup_destinations';

    protected $fillable = [
        'name',
        'type',
        'config',
        'is_active',
        'is_primary',
        'region',
        'country_code',
        'max_size_gb',
        'last_tested_at',
        'last_test_passed',
        'metadata',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_primary' => 'boolean',
        'last_test_passed' => 'boolean',
        'config' => 'encrypted:array',
        'metadata' => 'array',
        'last_tested_at' => 'datetime',
    ];

    // === العلاقات ===

    public function backupJobs(): HasMany
    {
        return $this->hasMany(BackupJob::class);
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

    public function scopePrimary(Builder $query): Builder
    {
        return $query->where('is_primary', true);
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
