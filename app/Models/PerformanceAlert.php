<?php

namespace App\Models;

use App\Enums\AlertCondition;
use App\Enums\AlertSeverity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PerformanceAlert extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'performance_alerts';

    protected $fillable = [
        'name',
        'metric_type',
        'condition',
        'threshold',
        'severity',
        'duration_minutes',
        'notification_channels',
        'notify_users',
        'is_active',
        'is_silenced',
        'silenced_until',
        'last_triggered_at',
        'trigger_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_silenced' => 'boolean',
        'notification_channels' => 'array',
        'notify_users' => 'array',
        'threshold' => 'decimal:4',
        'silenced_until' => 'datetime',
        'last_triggered_at' => 'datetime',
        'severity' => AlertSeverity::class,
        'condition' => AlertCondition::class,
    ];

    // === العلاقات ===

    public function incidents(): HasMany
    {
        return $this->hasMany(AlertIncident::class, 'alert_id');
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
        return $query->where('is_active', true)->where(function ($q) {
            $q->where('is_silenced', false)->orWhere('silenced_until', '<', now());
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
