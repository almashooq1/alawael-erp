<?php

namespace App\Services;

use App\Models\ChatbotIntent;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiNlpService
{
    // تحديد نية المستخدم
    public function detectIntent(string $text, string $language = 'ar'): array
    {
        $localMatch = $this->matchLocalIntent($text, $language);
        if ($localMatch && $localMatch['confidence'] >= 0.85) {
            return $localMatch;
        }
        return $this->detectWithOpenAI($text, $language);
    }

    // مطابقة النية محلياً
    private function matchLocalIntent(string $text, string $language): ?array
    {
        $intents = Cache::remember("chatbot_intents:{$language}", 3600, function () use ($language) {
            return ChatbotIntent::where('is_active', true)
                ->where('language', $language)
                ->orderByDesc('priority')
                ->get();
        });

        $bestMatch = null;
        $bestScore = 0;

        foreach ($intents as $intent) {
            foreach ($intent->training_phrases ?? [] as $phrase) {
                $score = $this->calculateSimilarity($text, $phrase);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestMatch = $intent;
                }
            }
        }

        if ($bestMatch && $bestScore >= 0.7) {
            $bestMatch->increment('match_count');
            return [
                'intent' => $bestMatch->code,
                'confidence' => $bestScore,
                'action' => $bestMatch->action,
                'responses' => $bestMatch->responses,
            ];
        }

        return null;
    }

    // تحديد النية باستخدام OpenAI
    private function detectWithOpenAI(string $text, string $language): array
    {
        try {
            $intents = ChatbotIntent::where('is_active', true)->pluck('code')->implode(', ');

            $response = Http::withToken(config('services.openai.api_key'))
                ->timeout(10)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => "Detect the intent from this text. Available intents: {$intents}. Return JSON: {intent: string, confidence: float}",
                        ],
                        ['role' => 'user', 'content' => $text],
                    ],
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens' => 100,
                ]);

            $result = json_decode($response->json('choices.0.message.content'), true);
            return [
                'intent' => $result['intent'] ?? 'fallback',
                'confidence' => $result['confidence'] ?? 0.5,
            ];
        } catch (\Throwable $e) {
            Log::error('OpenAI intent detection failed', ['error' => $e->getMessage()]);
            return ['intent' => 'fallback', 'confidence' => 0];
        }
    }

    // الحصول على رد من الذكاء الاصطناعي
    public function getAiResponse(string $userMessage, string $systemPrompt, array $history = []): string
    {
        try {
            $messages = [['role' => 'system', 'content' => $systemPrompt]];

            foreach (array_slice($history, -10) as $msg) {
                $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
            }
            $messages[] = ['role' => 'user', 'content' => $userMessage];

            $response = Http::withToken(config('services.openai.api_key'))
                ->timeout(15)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'messages' => $messages,
                    'max_tokens' => 500,
                    'temperature' => 0.7,
                ]);

            return $response->json('choices.0.message.content') ?? 'عذراً، لا أستطيع الإجابة الآن.';
        } catch (\Throwable $e) {
            Log::error('OpenAI response failed', ['error' => $e->getMessage()]);
            return 'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.';
        }
    }

    // حساب التشابه بين نصين
    private function calculateSimilarity(string $a, string $b): float
    {
        similar_text(mb_strtolower($a), mb_strtolower($b), $percent);
        return $percent / 100;
    }
}
