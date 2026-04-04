<?php

namespace App\Models;

use App\Enums\ArticleStatus;
use App\Enums\ArticleType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class KbArticle extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kb_articles';

    protected $fillable = [
        'branch_id',
        'category_id',
        'title',
        'title_en',
        'slug',
        'excerpt',
        'excerpt_en',
        'content',
        'content_en',
        'type',
        'video_url',
        'status',
        'is_public',
        'is_featured',
        'is_faq',
        'tags',
        'related_article_ids',
        'view_count',
        'helpful_count',
        'not_helpful_count',
        'meta_title',
        'meta_description',
        'meta_keywords',
        'published_at',
        'published_by',
        'version',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tags' => 'array',
        'related_article_ids' => 'array',
        'is_public' => 'boolean',
        'is_featured' => 'boolean',
        'is_faq' => 'boolean',
        'published_at' => 'datetime',
        'status' => ArticleStatus::class,
        'type' => ArticleType::class,
    ];

    // الفئة
    public function category(): BelongsTo
    {
        return $this->belongsTo(KbCategory::class);
    }

    // التقييمات
    public function ratings(): HasMany
    {
        return $this->hasMany(KbArticleRating::class, 'article_id');
    }

    // الإصدارات
    public function versions(): HasMany
    {
        return $this->hasMany(KbArticleVersion::class, 'article_id');
    }

    // الناشر
    public function publisher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    // المقالات المنشورة
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', ArticleStatus::PUBLISHED);
    }

    // المقالات العامة
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_public', true)->where('status', ArticleStatus::PUBLISHED);
    }

    // الأسئلة الشائعة
    public function scopeFaq(Builder $query): Builder
    {
        return $query->where('is_faq', true)->where('status', ArticleStatus::PUBLISHED);
    }

    // البحث النصي الكامل
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->whereFullText(['title', 'content', 'excerpt'], $term)
            ->orWhere('title', 'like', "%{$term}%");
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
