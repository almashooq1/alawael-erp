<?php

use App\Models\NotificationLog;
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

it('يمكن إنشاء إشعار جديد', function () {
    $log = NotificationLog::factory()->create([
        'branch_id' => $this->branch->id,
        'channel' => 'in_app',
        'status' => 'pending',
        'recipient_id' => $this->user->id,
        'body' => 'رسالة اختبار',
    ]);
    expect($log->exists)->toBeTrue()
        ->and($log->uuid)->not->toBeNull()
        ->and($log->channel->value ?? $log->channel)->toBe('in_app');
});

it('يمكن تحديد إشعار كمقروء', function () {
    $log = NotificationLog::factory()->create([
        'branch_id' => $this->branch->id,
        'recipient_id' => $this->user->id,
        'channel' => 'in_app',
        'status' => 'delivered',
        'read_at' => null,
    ]);
    $service = app(\App\Services\NotificationService::class);
    $service->markAsRead($log->id, $this->user->id);
    expect($log->fresh()->read_at)->not->toBeNull()
        ->and($log->fresh()->status->value ?? $log->fresh()->status)->toBe('read');
});

it('يمكن تتبع تفضيلات الإشعارات', function () {
    $pref = \App\Models\UserNotificationPreference::factory()->create([
        'branch_id' => $this->branch->id,
        'user_id' => $this->user->id,
        'channel' => 'sms',
        'event_type' => 'appointment.reminder',
        'is_enabled' => true,
    ]);
    expect($pref->is_enabled)->toBeTrue()
        ->and($pref->channel->value ?? $pref->channel)->toBe('sms');
});

it('يمكن تسجيل اشتراك Push', function () {
    $sub = \App\Models\PushSubscription::factory()->create([
        'branch_id' => $this->branch->id,
        'user_id' => $this->user->id,
        'fcm_token' => 'test-fcm-token-' . uniqid(),
        'device_type' => 'android',
        'is_active' => true,
    ]);
    expect($sub->exists)->toBeTrue()
        ->and($sub->user_id)->toBe($this->user->id);
});

it('يتحقق من الإحصاءات', function () {
    NotificationLog::factory()->count(5)->create([
        'branch_id' => $this->branch->id,
        'status' => 'sent',
        'channel' => 'sms',
    ]);
    $service = app(\App\Services\NotificationService::class);
    $stats = $service->getStats($this->branch->id, 'today');
    expect($stats['total'])->toBeGreaterThanOrEqual(5)
        ->and($stats)->toHaveKey('by_channel');
});

it('يمكن تحديد جميع الإشعارات كمقروءة', function () {
    NotificationLog::factory()->count(3)->create([
        'branch_id' => $this->branch->id,
        'recipient_id' => $this->user->id,
        'channel' => 'in_app',
        'status' => 'delivered',
        'read_at' => null,
    ]);
    $service = app(\App\Services\NotificationService::class);
    $count = $service->markAllAsRead($this->user->id);
    expect($count)->toBeGreaterThanOrEqual(3);
});
