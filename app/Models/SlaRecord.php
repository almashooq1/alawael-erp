<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SlaRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'sla_records';

    protected $fillable = [
        'service_name',
        'period_date',
        'uptime_percentage',
        'total_minutes',
        'downtime_minutes',
        'incident_count',
        'avg_response_ms',
        'target_uptime',
        'sla_met',
        'incidents',
    ];

    protected $casts = [
        'uptime_percentage' => 'decimal:2',
        'target_uptime' => 'decimal:2',
        'sla_met' => 'boolean',
        'incidents' => 'array',
        'period_date' => 'date',
    ];

    // === العلاقات ===

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // === Scopes ===

    public function scopeForService(Builder $query, string $service): Builder
    {
        return $query->where('service_name', $service);
    }

    public function scopeCurrentMonth(Builder $query): Builder
    {
        return $query->whereYear('period_date', now()->year)
            ->whereMonth('period_date', now()->month);
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
