<?php

namespace App\Services;

use App\Enums\ConversationStatus;
use App\Enums\MessageSenderType;
use App\Enums\MessageType;
use App\Models\ChatbotConversation;
use App\Models\ChatbotFlow;
use App\Models\ChatbotMessage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ChatbotService
{
    public function __construct(
        private readonly AiNlpService $nlpService,
        private readonly KnowledgeBaseService $kbService,
    ) {
    }

    // معالجة رسالة واردة من المستخدم
    public function processMessage(string $sessionId, string $content, array $context = []): array
    {
        $conversation = $this->getOrCreateConversation($sessionId, $context);

        $userMessage = ChatbotMessage::create([
            'branch_id' => $conversation->branch_id,
            'conversation_id' => $conversation->id,
            'sender_type' => MessageSenderType::USER,
            'content' => $content,
            'message_type' => MessageType::TEXT,
        ]);

        $intentResult = $this->nlpService->detectIntent($content, $conversation->language);
        $userMessage->update([
            'intent' => $intentResult['intent'] ?? null,
            'confidence' => $intentResult['confidence'] ?? null,
        ]);

        $response = $this->executeIntent($conversation, $intentResult, $content);

        $botMessage = ChatbotMessage::create([
            'branch_id' => $conversation->branch_id,
            'conversation_id' => $conversation->id,
            'sender_type' => MessageSenderType::BOT,
            'content' => $response['text'],
            'message_type' => $response['type'] ?? MessageType::TEXT,
            'buttons' => $response['buttons'] ?? null,
            'metadata' => $response['metadata'] ?? null,
        ]);

        $conversation->increment('message_count');
        $conversation->update(['last_message_at' => now(), 'intent' => $intentResult['intent'] ?? null]);

        return [
            'conversation_id' => $conversation->id,
            'session_id' => $sessionId,
            'message' => $botMessage,
            'response' => $response,
        ];
    }

    // تنفيذ النية المكتشفة
    private function executeIntent(ChatbotConversation $conversation, array $intentResult, string $input): array
    {
        $intent = $intentResult['intent'] ?? 'fallback';
        $confidence = $intentResult['confidence'] ?? 0;

        if ($confidence < 0.7) {
            return $this->getAiResponse($conversation, $input);
        }

        return match ($intent) {
            'book_appointment' => $this->handleAppointmentBooking($conversation, $intentResult),
            'check_status' => $this->handleStatusInquiry($conversation, $intentResult),
            'faq' => $this->handleFaqQuery($conversation, $input),
            'human_handoff' => $this->handleHumanHandoff($conversation),
            'greeting' => $this->handleGreeting($conversation),
            default => $this->getAiResponse($conversation, $input),
        };
    }

    // الرد بالذكاء الاصطناعي
    private function getAiResponse(ChatbotConversation $conversation, string $input): array
    {
        try {
            $kbResults = $this->kbService->search($input, $conversation->branch_id, 3);
            $systemPrompt = $this->buildSystemPrompt($conversation, $kbResults);
            $response = $this->nlpService->getAiResponse($input, $systemPrompt, $conversation->context ?? []);

            return [
                'text' => $response,
                'type' => MessageType::TEXT,
                'metadata' => ['source' => 'ai', 'kb_used' => count($kbResults) > 0],
            ];
        } catch (\Throwable $e) {
            Log::error('AI response failed', ['error' => $e->getMessage()]);
            return $this->getFallbackResponse($conversation->language);
        }
    }

    // التعامل مع طلب حجز موعد
    private function handleAppointmentBooking(ChatbotConversation $conversation, array $intent): array
    {
        $conversation->update(['current_flow' => 'appointment_booking']);
        return [
            'text' => 'سأساعدك في حجز موعد. ما هو التخصص المطلوب؟',
            'type' => MessageType::QUICK_REPLY,
            'buttons' => [
                ['title' => 'تأهيل حركي', 'payload' => 'specialty_physio'],
                ['title' => 'تأهيل نطق', 'payload' => 'specialty_speech'],
                ['title' => 'تأهيل وظيفي', 'payload' => 'specialty_occupational'],
            ],
        ];
    }

    // معالجة الاستعلام عن الحالة
    private function handleStatusInquiry(ChatbotConversation $conversation, array $intent): array
    {
        return [
            'text' => 'يرجى إدخال رقم الطلب أو الهوية الوطنية للاستعلام عن الحالة:',
            'type' => MessageType::TEXT,
            'buttons' => [
                ['title' => 'استعلام برقم الطلب', 'payload' => 'inquiry_by_order'],
                ['title' => 'استعلام بالهوية', 'payload' => 'inquiry_by_id'],
            ],
        ];
    }

    // البحث في الأسئلة الشائعة
    private function handleFaqQuery(ChatbotConversation $conversation, string $query): array
    {
        $articles = $this->kbService->search($query, $conversation->branch_id, 5);

        if ($articles->isEmpty()) {
            return $this->getFallbackResponse($conversation->language);
        }

        $article = $articles->first();
        return [
            'text' => $article->excerpt ?? Str::limit($article->content, 500),
            'type' => MessageType::CARD,
            'metadata' => [
                'article_id' => $article->id,
            ],
            'buttons' => [
                ['title' => 'قراءة المزيد', 'url' => route('knowledge-base.articles.publicShow', $article->slug)],
            ],
        ];
    }

    // ترحيب
    private function handleGreeting(ChatbotConversation $conversation): array
    {
        return [
            'text' => 'أهلاً وسهلاً! كيف يمكنني مساعدتك اليوم؟',
            'type' => MessageType::QUICK_REPLY,
            'buttons' => [
                ['title' => 'حجز موعد', 'payload' => 'book_appointment'],
                ['title' => 'استعلام', 'payload' => 'check_status'],
                ['title' => 'أسئلة شائعة', 'payload' => 'faq'],
            ],
        ];
    }

    // تحويل للموظف البشري
    public function handleHumanHandoff(ChatbotConversation $conversation): array
    {
        $conversation->update(['status' => ConversationStatus::HANDED_OFF, 'handed_off_at' => now()]);

        \App\Models\ChatbotHandoff::create([
            'branch_id' => $conversation->branch_id,
            'conversation_id' => $conversation->id,
            'reason' => 'طلب مستخدم',
            'status' => 'pending',
        ]);

        broadcast(new \App\Events\ChatHandoffRequested($conversation));

        return [
            'text' => 'تم تحويل محادثتك لأحد موظفينا. سيتواصل معك في أقرب وقت ممكن.',
            'type' => MessageType::TEXT,
        ];
    }

    // إنشاء أو استرجاع محادثة
    private function getOrCreateConversation(string $sessionId, array $context): ChatbotConversation
    {
        return ChatbotConversation::firstOrCreate(
            ['session_id' => $sessionId],
            [
                'branch_id' => $context['branch_id'] ?? session('current_branch_id'),
                'user_id' => $context['user_id'] ?? auth()->id(),
                'channel' => $context['channel'] ?? 'web',
                'language' => $context['language'] ?? 'ar',
                'status' => ConversationStatus::ACTIVE,
                'context' => $context,
            ]
        );
    }

    // بناء System Prompt
    private function buildSystemPrompt(ChatbotConversation $conversation, $kbResults): string
    {
        $kbContext = $kbResults->map(fn($a) => "العنوان: {$a->title}\nالمحتوى: " . Str::limit($a->content, 300))->join("\n\n");

        return "أنت مساعد ذكي لمركز تأهيل ذوي الإعاقة. مهمتك مساعدة المستخدمين باللغة العربية.\nتحدث بلغة {$conversation->language}.\nكن لطيفاً ومحترفاً ومختصراً.\nاستخدم المعلومات التالية من قاعدة المعرفة إذا كانت ذات صلة:\n{$kbContext}";
    }

    // رد احتياطي
    private function getFallbackResponse(string $lang): array
    {
        $text = $lang === 'ar'
            ? 'عذراً، لم أفهم سؤالك. هل تريد التحدث مع موظف؟'
            : 'Sorry, I did not understand. Would you like to speak with an agent?';

        return [
            'text' => $text,
            'type' => MessageType::QUICK_REPLY,
            'buttons' => [
                ['title' => 'نعم', 'payload' => 'human_handoff'],
                ['title' => 'لا، شكراً', 'payload' => 'end_conversation'],
            ],
        ];
    }

    // تقييم المحادثة
    public function rateSatisfaction(string $sessionId, int $rating, ?string $comment = null): void
    {
        ChatbotConversation::where('session_id', $sessionId)->update([
            'satisfaction_rating' => $rating,
            'satisfaction_comment' => $comment,
        ]);
    }

    // إحصاءات الشات بوت
    public function getStats(int $branchId, string $period = 'today'): array
    {
        $query = ChatbotConversation::where('branch_id', $branchId);
        if ($period === 'today') {
            $query->whereDate('created_at', today());
        }

        return [
            'total_conversations' => $query->count(),
            'resolved' => (clone $query)->where('status', 'resolved')->count(),
            'handed_off' => (clone $query)->where('status', 'handed_off')->count(),
            'avg_satisfaction' => (clone $query)->whereNotNull('satisfaction_rating')->avg('satisfaction_rating'),
            'avg_messages' => (clone $query)->avg('message_count'),
            'by_channel' => (clone $query)->select('channel', DB::raw('count(*) as count'))->groupBy('channel')->pluck('count', 'channel'),
        ];
    }
}
