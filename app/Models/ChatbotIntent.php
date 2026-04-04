<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ChatbotIntent extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'chatbot_intents';

    protected $fillable = [
        'branch_id',
        'name',
        'code',
        'description',
        'training_phrases',
        'responses',
        'action',
        'flow_id',
        'is_active',
        'priority',
        'language',
        'match_count',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'training_phrases' => 'array',
        'responses' => 'array',
        'is_active' => 'boolean',
    ];

    // النوايا النشطة
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderByDesc('priority');
    }

    // النوايا بلغة محددة
    public function scopeForLanguage(Builder $query, string $lang): Builder
    {
        return $query->where('language', $lang);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected static function booted(): void
    {
        static::creating(function (self $m) {
            $m->fill([
                'uuid' => $m->uuid ?? (string) Str::uuid(),
                'created_by' => $m->created_by ?? auth()->id(),
                'branch_id' => $m->branch_id ?? session('current_branch_id'),
            ]);
        });
        static::updating(fn(self $m) => $m->updated_by = auth()->id());
    }
}
