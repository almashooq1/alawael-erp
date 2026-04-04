<?php

use App\Models\ChatbotConversation;
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

it('يمكن إنشاء محادثة جديدة', function () {
    $conversation = ChatbotConversation::factory()->create([
        'branch_id' => $this->branch->id,
        'session_id' => 'test_' . uniqid(),
        'channel' => 'web',
        'status' => 'active',
        'language' => 'ar',
    ]);
    expect($conversation->exists)->toBeTrue()
        ->and($conversation->status->value ?? $conversation->status)->toBe('active');
});

it('يمكن معالجة رسالة واردة', function () {
    $service = app(\App\Services\ChatbotService::class);
    $result = $service->processMessage(
        'test_session_' . uniqid(),
        'مرحبا',
        ['branch_id' => $this->branch->id, 'language' => 'ar']
    );
    expect($result)->toHaveKey('conversation_id')
        ->and($result)->toHaveKey('message')
        ->and($result['message']->sender_type->value ?? $result['message']->sender_type)->toBe('bot');
});

it('يمكن تقييم المحادثة', function () {
    $conversation = ChatbotConversation::factory()->create([
        'branch_id' => $this->branch->id,
        'session_id' => 'rate_test_' . uniqid(),
        'status' => 'resolved',
    ]);
    $service = app(\App\Services\ChatbotService::class);
    $service->rateSatisfaction($conversation->session_id, 5, 'خدمة ممتازة');
    expect($conversation->fresh()->satisfaction_rating)->toBe(5);
});

it('يمكن تحويل المحادثة لموظف', function () {
    $conversation = ChatbotConversation::factory()->create([
        'branch_id' => $this->branch->id,
        'session_id' => 'handoff_' . uniqid(),
        'status' => 'active',
    ]);
    $service = app(\App\Services\ChatbotService::class);
    $service->handleHumanHandoff($conversation);
    expect($conversation->fresh()->status->value ?? $conversation->fresh()->status)->toBe('handed_off');
});

it('يمكن الحصول على إحصاءات الشات بوت', function () {
    ChatbotConversation::factory()->count(3)->create([
        'branch_id' => $this->branch->id,
        'status' => 'resolved',
        'channel' => 'web',
    ]);
    $service = app(\App\Services\ChatbotService::class);
    $stats = $service->getStats($this->branch->id, 'today');
    expect($stats)->toHaveKey('total_conversations')
        ->and($stats)->toHaveKey('resolved')
        ->and($stats)->toHaveKey('by_channel');
});

it('يتم إغلاق المحادثات المتروكة تلقائياً', function () {
    $conversation = ChatbotConversation::factory()->create([
        'branch_id' => $this->branch->id,
        'session_id' => 'abandoned_' . uniqid(),
        'status' => 'active',
        'last_message_at' => now()->subHours(25),
    ]);

    \Artisan::call('chatbot:close-abandoned');

    expect($conversation->fresh()->status->value ?? $conversation->fresh()->status)->toBe('abandoned');
});
