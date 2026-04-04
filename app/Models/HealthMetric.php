<?php

namespace App\Models;

use App\Enums\MetricType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class HealthMetric extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'health_metrics';

    protected $fillable = [
        'metric_type',
        'host',
        'value',
        'unit',
        'metadata',
        'recorded_at',
        'environment',
    ];

    protected $casts = [
        'metadata' => 'array',
        'recorded_at' => 'datetime',
        'value' => 'decimal:4',
        'metric_type' => MetricType::class,
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

    public function scopeForType(Builder $query, string $type): Builder
    {
        return $query->where('metric_type', $type);
    }

    public function scopeRecent(Builder $query, int $hours = 24): Builder
    {
        return $query->where('recorded_at', '>=', now()->subHours($hours));
    }

    public function scopeInPeriod(Builder $query, \Carbon\Carbon $from, \Carbon\Carbon $to): Builder
    {
        return $query->whereBetween('recorded_at', [$from, $to]);
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
