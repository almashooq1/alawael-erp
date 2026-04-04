<?php

namespace App\Models;

use App\Enums\FlagStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class FeatureFlag extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'feature_flags';

    protected $fillable = [
        'key',
        'name',
        'description',
        'status',
        'rollout_percentage',
        'allowed_users',
        'allowed_branches',
        'allowed_environments',
        'enabled_at',
        'disabled_at',
        'expires_at',
        'type',
    ];

    protected $casts = [
        'allowed_users' => 'array',
        'allowed_branches' => 'array',
        'allowed_environments' => 'array',
        'enabled_at' => 'datetime',
        'disabled_at' => 'datetime',
        'expires_at' => 'datetime',
        'status' => FlagStatus::class,
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', '!=', FlagStatus::DISABLED)->where(function ($q) {
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
