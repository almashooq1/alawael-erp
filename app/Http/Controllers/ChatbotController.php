<?php

namespace App\Http\Controllers;

use App\Services\ChatbotService;
use App\Models\ChatbotConversation;
use App\Http\Resources\ChatbotConversationResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class ChatbotController extends Controller
{
    public function __construct(
        private readonly ChatbotService $service,
    ) {
    }

    // عرض القائمة مع الفلترة والبحث
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ChatbotConversation::class);

        $filters = $request->only(['search', 'status', 'channel', 'date_from', 'date_to', 'per_page']);
        $conversations = ChatbotConversation::where('branch_id', session('current_branch_id'))
            ->when($filters['status'] ?? null, fn($q, $s) => $q->where('status', $s))
            ->when($filters['channel'] ?? null, fn($q, $c) => $q->where('channel', $c))
            ->with(['user', 'agent'])
            ->orderByDesc('last_message_at')
            ->paginate($filters['per_page'] ?? 15);

        return Inertia::render('Chatbot/Index', [
            'conversations' => ChatbotConversationResource::collection($conversations),
            'filters' => $filters,
            'stats' => $this->service->getStats(session('current_branch_id')),
        ]);
    }

    // عرض التفاصيل
    public function show(ChatbotConversation $conversation): Response
    {
        $this->authorize('view', $conversation);

        $conversation->load(['messages', 'user', 'agent', 'handoff']);

        return Inertia::render('Chatbot/Show', [
            'conversation' => new ChatbotConversationResource($conversation),
        ]);
    }

    // حذف السجل
    public function destroy(ChatbotConversation $conversation): JsonResponse
    {
        $this->authorize('delete', $conversation);

        $conversation->delete();

        return response()->json([
            'message' => __('تم الحذف بنجاح'),
        ]);
    }

    // معالجة رسالة واردة
    public function sendMessage(Request $request): JsonResponse
    {
        $request->validate([
            'session_id' => 'required|string',
            'content' => 'required|string|max:2000',
            'channel' => 'nullable|string',
            'language' => 'nullable|string|in:ar,en',
        ]);

        $response = $this->service->processMessage(
            $request->session_id,
            $request->content,
            [
                'branch_id' => session('current_branch_id'),
                'user_id' => auth()->id(),
                'channel' => $request->get('channel', 'web'),
                'language' => $request->get('language', 'ar'),
            ]
        );

        return response()->json($response);
    }

    // تقييم المحادثة
    public function rateSatisfaction(Request $request, string $sessionId): JsonResponse
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500',
        ]);

        $this->service->rateSatisfaction($sessionId, $data['rating'], $data['comment'] ?? null);

        return response()->json(['message' => 'شكراً على تقييمك']);
    }

    // إحصاءات الشات بوت
    public function analytics(Request $request): Response|JsonResponse
    {
        $this->authorize('viewAny', ChatbotConversation::class);

        $stats = $this->service->getStats(
            session('current_branch_id'),
            $request->get('period', 'today')
        );

        if ($request->wantsJson()) {
            return response()->json(['stats' => $stats]);
        }

        return Inertia::render('Chatbot/Analytics', ['stats' => $stats]);
    }

    // طلب التحويل للموظف
    public function requestHandoff(Request $request, string $sessionId): JsonResponse
    {
        $conversation = ChatbotConversation::where('session_id', $sessionId)->firstOrFail();
        $response = $this->service->handleHumanHandoff($conversation);

        return response()->json($response);
    }
}
