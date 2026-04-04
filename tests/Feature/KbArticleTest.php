<?php

use App\Models\KbArticle;
use App\Models\User;
use App\Models\Branch;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->admin = User::factory()->create([
        'branch_id' => $this->branch->id,
        'role' => 'admin',
    ]);
    $this->user = User::factory()->create([
        'branch_id' => $this->branch->id,
        'role' => 'user',
    ]);
});

it('يمكن إنشاء مقالة جديدة', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    $article = KbArticle::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'title' => 'مقالة اختبارية',
        'status' => 'draft',
    ]);
    expect($article->exists)->toBeTrue()
        ->and($article->uuid)->not->toBeNull()
        ->and($article->status->value ?? $article->status)->toBe('draft');
});

it('يمكن نشر مقالة', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    $article = KbArticle::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'status' => 'draft',
    ]);
    $service = app(\App\Services\KnowledgeBaseService::class);
    $service->publish($article);
    expect($article->fresh()->status->value ?? $article->fresh()->status)->toBe('published')
        ->and($article->fresh()->published_at)->not->toBeNull();
});

it('يمكن البحث في المقالات', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    KbArticle::factory()->count(3)->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'status' => 'published',
        'is_public' => true,
        'title' => 'تعليمات الاستخدام',
        'content' => 'محتوى تعليمي مفيد للمستخدمين',
    ]);
    $service = app(\App\Services\KnowledgeBaseService::class);
    $results = $service->search('تعليمات', $this->branch->id);
    expect($results->count())->toBeGreaterThan(0);
});

it('يمكن تقييم مقالة', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    $article = KbArticle::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'status' => 'published',
    ]);
    $service = app(\App\Services\KnowledgeBaseService::class);
    $service->rateArticle($article->id, true, 'مفيدة جداً', $this->user->id, null);
    expect($article->fresh()->helpful_count)->toBe(1);
});

it('يمكن جلب الأسئلة الشائعة', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    KbArticle::factory()->count(5)->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'status' => 'published',
        'is_faq' => true,
    ]);
    $service = app(\App\Services\KnowledgeBaseService::class);
    $faqs = $service->getFaqs($this->branch->id);
    expect($faqs->count())->toBeGreaterThanOrEqual(5);
});

it('يتم تتبع إصدارات المقالة', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    $article = KbArticle::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'version' => 1,
    ]);
    $service = app(\App\Services\KnowledgeBaseService::class);
    $service->update($article, ['title' => 'عنوان محدث', 'change_summary' => 'تحديث العنوان']);
    expect($article->fresh()->version)->toBe(2)
        ->and(\App\Models\KbArticleVersion::where('article_id', $article->id)->count())->toBeGreaterThanOrEqual(1);
});

it('يمكن الحصول على المقالات المشابهة', function () {
    $category = \App\Models\KbCategory::factory()->create(['branch_id' => $this->branch->id]);
    $article = KbArticle::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'status' => 'published',
    ]);
    KbArticle::factory()->count(3)->create([
        'branch_id' => $this->branch->id,
        'category_id' => $category->id,
        'status' => 'published',
    ]);
    $service = app(\App\Services\KnowledgeBaseService::class);
    $related = $service->getRelated($article);
    expect($related)->not->toBeNull();
});
