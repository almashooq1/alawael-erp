<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class KbCategory extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kb_categories';

    protected $fillable = [
        'branch_id',
        'name',
        'name_en',
        'slug',
        'description',
        'description_en',
        'icon',
        'color',
        'parent_id',
        'sort_order',
        'is_public',
        'is_active',
        'article_count',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'is_active' => 'boolean',
    ];

    // المقالات في هذه الفئة
    public function articles(): HasMany
    {
        return $this->hasMany(KbArticle::class, 'category_id');
    }

    // الفئة الأب
    public function parent(): BelongsTo
    {
        return $this->belongsTo(KbCategory::class, 'parent_id');
    }

    // الفئات الفرعية
    public function children(): HasMany
    {
        return $this->hasMany(KbCategory::class, 'parent_id');
    }

    // الفئات العامة فقط
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_public', true)->where('is_active', true);
    }

    // الفئات الجذرية
    public function scopeRoot(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
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
