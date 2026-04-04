<?php

namespace App\Services;

use App\Enums\ArticleStatus;
use App\Enums\ArticleType;
use App\Models\KbArticle;
use App\Models\KbArticleRating;
use App\Models\KbArticleVersion;
use App\Models\KbCategory;
use App\Models\KbSearchLog;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class KnowledgeBaseService
{
    // البحث في قاعدة المعرفة
    public function search(string $query, int $branchId, int $limit = 10, bool $publicOnly = true): Collection
    {
        $results = KbArticle::where('branch_id', $branchId)
            ->where('status', ArticleStatus::PUBLISHED)
            ->when($publicOnly, fn($q) => $q->where('is_public', true))
            ->where(function ($q) use ($query) {
                $q->whereFullText(['title', 'content', 'excerpt'], $query)
                    ->orWhere('title', 'like', "%{$query}%")
                    ->orWhere('excerpt', 'like', "%{$query}%")
                    ->orWhereJsonContains('tags', $query);
            })
            ->orderByDesc('view_count')
            ->limit($limit)
            ->get();

        $this->logSearch($query, $branchId, $results->count());

        return $results;
    }

    // جلب قائمة المقالات مع فلترة
    public function list(array $filters, int $branchId): LengthAwarePaginator
    {
        return KbArticle::where('branch_id', $branchId)
            ->when($filters['search'] ?? null, fn($q, $s) => $q->where(function ($q2) use ($s) {
                $q2->where('title', 'like', "%{$s}%")->orWhere('excerpt', 'like', "%{$s}%");
            }))
            ->when($filters['category_id'] ?? null, fn($q, $c) => $q->where('category_id', $c))
            ->when($filters['status'] ?? null, fn($q, $s) => $q->where('status', $s))
            ->when($filters['type'] ?? null, fn($q, $t) => $q->where('type', $t))
            ->when($filters['is_public'] ?? null, fn($q, $p) => $q->where('is_public', $p))
            ->when($filters['is_faq'] ?? null, fn($q) => $q->where('is_faq', true))
            ->with(['category', 'creator'])
            ->orderByDesc('published_at')
            ->paginate($filters['per_page'] ?? 15);
    }

    // إنشاء مقالة جديدة
    public function create(array $data): KbArticle
    {
        return DB::transaction(function () use ($data) {
            $data['slug'] = $data['slug'] ?? Str::slug($data['title']) . '-' . Str::random(6);
            $data['version'] = 1;

            $article = KbArticle::create($data);
            $this->saveVersion($article, 'إنشاء المقالة');
            KbCategory::where('id', $article->category_id)->increment('article_count');
            Cache::forget("kb_featured_{$article->branch_id}");
            Cache::forget("kb_faqs_{$article->branch_id}");

            return $article;
        });
    }

    // تحديث مقالة
    public function update(KbArticle $article, array $data): KbArticle
    {
        return DB::transaction(function () use ($article, $data) {
            $data['version'] = $article->version + 1;
            $article->update($data);
            $this->saveVersion($article, $data['change_summary'] ?? 'تحديث المقالة');
            Cache::forget("kb_article_{$article->slug}");

            return $article->fresh();
        });
    }

    // نشر مقالة
    public function publish(KbArticle $article): KbArticle
    {
        $article->update([
            'status' => ArticleStatus::PUBLISHED,
            'published_at' => now(),
            'published_by' => auth()->id(),
        ]);
        Cache::forget("kb_article_{$article->slug}");
        return $article;
    }

    // تقييم مقالة
    public function rateArticle(int $articleId, bool $isHelpful, ?string $feedback, ?int $userId, ?string $sessionId): void
    {
        $existing = KbArticleRating::where('article_id', $articleId)
            ->where(function ($q) use ($userId, $sessionId) {
                $q->when($userId, fn($q2) => $q2->where('user_id', $userId))
                    ->orWhen($sessionId, fn($q2) => $q2->where('session_id', $sessionId));
            })
            ->first();

        if ($existing) {
            $existing->update(['is_helpful' => $isHelpful, 'feedback' => $feedback]);
        } else {
            KbArticleRating::create([
                'branch_id' => session('current_branch_id'),
                'article_id' => $articleId,
                'user_id' => $userId,
                'session_id' => $sessionId,
                'is_helpful' => $isHelpful,
                'feedback' => $feedback,
                'ip_address' => request()->ip(),
            ]);
        }

        $article = KbArticle::find($articleId);
        $article->update([
            'helpful_count' => KbArticleRating::where('article_id', $articleId)->where('is_helpful', true)->count(),
            'not_helpful_count' => KbArticleRating::where('article_id', $articleId)->where('is_helpful', false)->count(),
        ]);
    }

    // زيادة عداد المشاهدة
    public function incrementView(KbArticle $article): void
    {
        $viewKey = "kb_view_{$article->id}_" . request()->ip();
        if (!Cache::has($viewKey)) {
            $article->increment('view_count');
            Cache::put($viewKey, true, 3600);
        }
    }

    // جلب المقالات المشابهة
    public function getRelated(KbArticle $article, int $limit = 5): Collection
    {
        return Cache::remember("kb_related_{$article->id}", 3600, function () use ($article, $limit) {
            if ($article->related_article_ids) {
                $manual = KbArticle::whereIn('id', $article->related_article_ids)
                    ->where('status', ArticleStatus::PUBLISHED)
                    ->limit($limit)
                    ->get();
                if ($manual->count() >= $limit) {
                    return $manual;
                }
            }

            return KbArticle::where('category_id', $article->category_id)
                ->where('id', '!=', $article->id)
                ->where('status', ArticleStatus::PUBLISHED)
                ->orderByDesc('view_count')
                ->limit($limit)
                ->get();
        });
    }

    // جلب الأسئلة الشائعة
    public function getFaqs(int $branchId, ?int $categoryId = null): Collection
    {
        $cacheKey = "kb_faqs_{$branchId}" . ($categoryId ? "_{$categoryId}" : '');
        return Cache::remember($cacheKey, 3600, function () use ($branchId, $categoryId) {
            return KbArticle::where('branch_id', $branchId)
                ->where('is_faq', true)
                ->where('status', ArticleStatus::PUBLISHED)
                ->when($categoryId, fn($q) => $q->where('category_id', $categoryId))
                ->orderByDesc('view_count')
                ->get();
        });
    }

    // حفظ إصدار من المقالة
    private function saveVersion(KbArticle $article, string $summary = ''): void
    {
        KbArticleVersion::create([
            'branch_id' => $article->branch_id,
            'article_id' => $article->id,
            'version_number' => $article->version,
            'title' => $article->title,
            'content' => $article->content,
            'change_summary' => $summary,
            'created_by_user' => auth()->id(),
        ]);
    }

    // تسجيل البحث
    private function logSearch(string $query, int $branchId, int $count): void
    {
        KbSearchLog::create([
            'branch_id' => $branchId,
            'query' => $query,
            'results_count' => $count,
            'found_result' => $count > 0,
            'user_id' => auth()->id(),
            'session_id' => session()->getId(),
            'ip_address' => request()->ip(),
        ]);
    }

    // إحصاءات قاعدة المعرفة
    public function getStats(int $branchId): array
    {
        return Cache::remember("kb_stats_{$branchId}", 600, function () use ($branchId) {
            return [
                'total_articles' => KbArticle::where('branch_id', $branchId)->count(),
                'published' => KbArticle::where('branch_id', $branchId)->where('status', 'published')->count(),
                'total_views' => KbArticle::where('branch_id', $branchId)->sum('view_count'),
                'total_ratings' => KbArticleRating::where('branch_id', $branchId)->count(),
                'helpful_percentage' => KbArticleRating::where('branch_id', $branchId)->count() > 0
                    ? round(KbArticleRating::where('branch_id', $branchId)->where('is_helpful', true)->count()
                        / KbArticleRating::where('branch_id', $branchId)->count() * 100, 1)
                    : 0,
                'top_searched' => KbSearchLog::where('branch_id', $branchId)
                    ->select('query', DB::raw('count(*) as count'))
                    ->groupBy('query')
                    ->orderByDesc('count')
                    ->limit(10)
                    ->pluck('count', 'query'),
                'top_articles' => KbArticle::where('branch_id', $branchId)
                    ->orderByDesc('view_count')
                    ->limit(5)
                    ->get(['id', 'title', 'view_count']),
            ];
        });
    }

    // الحصول على Form Options
    public function getFormOptions(): array
    {
        return [
            'categories' => KbCategory::where('is_active', true)->get(['id', 'name']),
            'statuses' => collect(ArticleStatus::cases())->map(fn($s) => ['value' => $s->value, 'label' => $s->label()]),
            'types' => collect(ArticleType::cases())->map(fn($t) => ['value' => $t->value, 'label' => $t->label()]),
        ];
    }

    // حذف مقالة
    public function delete(KbArticle $article): void
    {
        KbCategory::where('id', $article->category_id)->decrement('article_count');
        Cache::forget("kb_stats_{$article->branch_id}");
        $article->delete();
    }

    // جلب العلاقات
    public function getRelations(): array
    {
        return ['category', 'creator', 'ratings', 'versions'];
    }
}
