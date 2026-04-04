<?php

namespace App\Models;

use App\Enums\DeploymentEnvironment;
use App\Enums\DeploymentStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Deployment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'deployments';

    protected $fillable = [
        'version',
        'environment',
        'status',
        'commit_hash',
        'branch',
        'deployed_by',
        'release_notes',
        'changelog',
        'started_at',
        'completed_at',
        'duration_seconds',
        'deployment_log',
        'error_message',
        'migrations_run',
        'health_check_results',
        'rolled_back',
        'rolled_back_at',
        'previous_version',
        'approved_by',
    ];

    protected $casts = [
        'migrations_run' => 'boolean',
        'rolled_back' => 'boolean',
        'health_check_results' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'rolled_back_at' => 'datetime',
        'status' => DeploymentStatus::class,
        'environment' => DeploymentEnvironment::class,
    ];

    // === العلاقات ===

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

    // === Scopes ===

    public function scopeForEnvironment(Builder $query, string $env): Builder
    {
        return $query->where('environment', $env);
    }

    public function scopeSuccessful(Builder $query): Builder
    {
        return $query->where('status', DeploymentStatus::SUCCESS);
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderBy('started_at', 'desc');
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
