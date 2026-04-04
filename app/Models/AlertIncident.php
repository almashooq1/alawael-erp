<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class AlertIncident extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'alert_incidents';

    protected $fillable = [
        'alert_id',
        'status',
        'triggered_value',
        'started_at',
        'acknowledged_at',
        'resolved_at',
        'duration_minutes',
        'notes',
        'acknowledged_by',
    ];

    protected $casts = [
        'triggered_value' => 'decimal:4',
        'started_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    // === العلاقات ===

    public function alert(): BelongsTo
    {
        return $this->belongsTo(PerformanceAlert::class, 'alert_id');
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
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

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('status', 'open');
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
