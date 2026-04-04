<?php

namespace App\Http\Controllers;

use App\Services\KnowledgeBaseService;
use App\Models\KbArticle;
use App\Models\KbCategory;
use App\Http\Requests\KbArticle\StoreKbArticleRequest;
use App\Http\Requests\KbArticle\UpdateKbArticleRequest;
use App\Http\Resources\KbArticleResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeBaseController extends Controller
{
    public function __construct(
        private readonly KnowledgeBaseService $service,
    ) {
    }

    // عرض القائمة مع الفلترة والبحث
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', KbArticle::class);

        $filters = $request->only(['search', 'status', 'category_id', 'type', 'is_faq', 'per_page']);
        $articles = $this->service->list($filters, session('current_branch_id'));

        return Inertia::render('KnowledgeBase/Index', [
            'articles' => KbArticleResource::collection($articles),
            'filters' => $filters,
            'stats' => $this->service->getStats(session('current_branch_id')),
            'options' => $this->service->getFormOptions(),
        ]);
    }

    // عرض نموذج الإنشاء
    public function create(): Response
    {
        $this->authorize('create', KbArticle::class);

        return Inertia::render('KnowledgeBase/Create', [
            'options' => $this->service->getFormOptions(),
        ]);
    }

    // حفظ سجل جديد
    public function store(StoreKbArticleRequest $request): JsonResponse
    {
        $this->authorize('create', KbArticle::class);

        $article = $this->service->create($request->validated());

        return response()->json([
            'message' => __('تم الإنشاء بنجاح'),
            'data' => new KbArticleResource($article),
        ], 201);
    }

    // عرض التفاصيل
    public function show(KbArticle $article): Response
    {
        $this->authorize('view', $article);

        $article->load(['category', 'ratings', 'versions', 'publisher']);

        return Inertia::render('KnowledgeBase/Show', [
            'article' => new KbArticleResource($article),
            'related' => KbArticleResource::collection($this->service->getRelated($article)),
        ]);
    }

    // عرض نموذج التعديل
    public function edit(KbArticle $article): Response
    {
        $this->authorize('update', $article);

        return Inertia::render('KnowledgeBase/Edit', [
            'article' => new KbArticleResource($article),
            'options' => $this->service->getFormOptions(),
        ]);
    }

    // تحديث السجل
    public function update(UpdateKbArticleRequest $request, KbArticle $article): JsonResponse
    {
        $this->authorize('update', $article);

        $article = $this->service->update($article, $request->validated());

        return response()->json([
            'message' => __('تم التحديث بنجاح'),
            'data' => new KbArticleResource($article),
        ]);
    }

    // حذف السجل
    public function destroy(KbArticle $article): JsonResponse
    {
        $this->authorize('delete', $article);

        $article->delete();

        return response()->json([
            'message' => __('تم الحذف بنجاح'),
        ]);
    }

    // عرض المقالة العامة
    public function publicShow(Request $request, string $slug): Response|JsonResponse
    {
        $article = KbArticle::where('slug', $slug)
            ->where('status', 'published')
            ->where('is_public', true)
            ->with(['category', 'ratings'])
            ->firstOrFail();

        $this->service->incrementView($article);
        $related = $this->service->getRelated($article);

        return Inertia::render('KnowledgeBase/PublicShow', [
            'article' => new KbArticleResource($article),
            'related' => KbArticleResource::collection($related),
        ]);
    }

    // تقييم مقالة
    public function rate(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'is_helpful' => 'required|boolean',
            'feedback' => 'nullable|string|max:500',
        ]);

        $this->service->rateArticle(
            $id,
            $data['is_helpful'],
            $data['feedback'] ?? null,
            auth()->id(),
            session()->getId()
        );

        return response()->json(['message' => 'شكراً على تقييمك']);
    }

    // نشر مقالة
    public function publish(Request $request, KbArticle $article): JsonResponse
    {
        $this->authorize('update', $article);
        $this->service->publish($article);

        return response()->json(['message' => 'تم النشر بنجاح']);
    }

    // عرض الأسئلة الشائعة
    public function faqs(Request $request): Response|JsonResponse
    {
        $faqs = $this->service->getFaqs(
            session('current_branch_id'),
            $request->get('category_id')
        );

        $categories = KbCategory::where('branch_id', session('current_branch_id'))
            ->where('is_active', true)
            ->get();

        return Inertia::render('KnowledgeBase/Faqs', [
            'faqs' => KbArticleResource::collection($faqs),
            'categories' => $categories,
        ]);
    }

    // البحث في قاعدة المعرفة
    public function search(Request $request): JsonResponse
    {
        $query = $request->get('q', '');
        $results = $this->service->search($query, session('current_branch_id'));

        return response()->json([
            'results' => KbArticleResource::collection($results),
            'query' => $query,
        ]);
    }

    // إحصاءات قاعدة المعرفة
    public function analytics(Request $request): Response|JsonResponse
    {
        $this->authorize('viewAny', KbArticle::class);

        $stats = $this->service->getStats(session('current_branch_id'));

        if ($request->wantsJson()) {
            return response()->json(['stats' => $stats]);
        }

        return Inertia::render('KnowledgeBase/Analytics', ['stats' => $stats]);
    }
}
