<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class DrPlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'dr_plans';

    protected $fillable = [
        'name',
        'scenario',
        'rto_minutes',
        'rpo_minutes',
        'description',
        'steps',
        'contacts',
        'resources_needed',
        'last_tested_date',
        'last_test_passed',
        'test_notes',
        'is_active',
        'priority',
        'owner_id',
    ];

    protected $casts = [
        'steps' => 'array',
        'contacts' => 'array',
        'resources_needed' => 'array',
        'is_active' => 'boolean',
        'last_test_passed' => 'boolean',
        'last_tested_date' => 'date',
    ];

    // === العلاقات ===

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
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
