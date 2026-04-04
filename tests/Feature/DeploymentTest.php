<?php

use App\Models\Deployment;
use App\Models\FeatureFlag;
use App\Models\User;
use App\Models\Branch;
use App\Enums\DeploymentStatus;
use App\Enums\FlagStatus;

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

it('يمكن إنشاء سجل نشر جديد', function () {
    $service = app(\App\Services\DeploymentService::class);
    actingAs($this->admin);

    $deployment = $service->createDeployment([
        'version' => '1.5.0',
        'environment' => 'staging',
        'commit_hash' => str_repeat('a', 40),
        'branch_id' => $this->branch->id,
    ]);

    expect($deployment)->toBeInstanceOf(Deployment::class)
        ->and($deployment->version)->toBe('1.5.0')
        ->and($deployment->status)->toBe(DeploymentStatus::PENDING);
});

it('يمكن تفعيل علم ميزة', function () {
    $flag = FeatureFlag::factory()->create([
        'branch_id' => $this->branch->id,
        'key' => 'new_dashboard',
        'status' => FlagStatus::DISABLED,
    ]);

    $service = app(\App\Services\FeatureFlagService::class);
    $service->enable('new_dashboard');

    expect($flag->fresh()->status)->toBe(FlagStatus::ENABLED);
});

it('يضبط نسبة الطرح التدريجي', function () {
    $flag = FeatureFlag::factory()->create([
        'branch_id' => $this->branch->id,
        'key' => 'test_flag',
        'status' => FlagStatus::DISABLED,
    ]);

    $service = app(\App\Services\FeatureFlagService::class);
    $service->setRollout('test_flag', 50);

    expect($flag->fresh()->status)->toBe(FlagStatus::ROLLOUT)
        ->and($flag->fresh()->rollout_percentage)->toBe(50);
});

it('يُعيد قائمة الأعلام النشطة للمستخدم', function () {
    FeatureFlag::factory()->create([
        'branch_id' => $this->branch->id,
        'key' => 'flag_a',
        'status' => FlagStatus::ENABLED,
    ]);
    FeatureFlag::factory()->create([
        'branch_id' => $this->branch->id,
        'key' => 'flag_b',
        'status' => FlagStatus::DISABLED,
    ]);

    $service = app(\App\Services\FeatureFlagService::class);
    $active = $service->allEnabled($this->user);

    expect($active)->toContain('flag_a')
        ->and($active)->not->toContain('flag_b');
});

it('يُسجّل نشراً ويُكمله بنجاح', function () {
    $service = app(\App\Services\DeploymentService::class);
    actingAs($this->admin);

    $deployment = $service->createDeployment([
        'version' => '2.0.0',
        'environment' => 'production',
        'branch_id' => $this->branch->id,
    ]);

    $service->startDeployment($deployment);
    expect($deployment->fresh()->status)->toBe(DeploymentStatus::RUNNING);

    $service->completeDeployment($deployment, ['migrations_run' => true]);
    expect($deployment->fresh()->status)->toBe(DeploymentStatus::SUCCESS);
});

it('يرفض الوصول لتعديل النشر من مستخدم عادي', function () {
    actingAs($this->user);

    $deployment = Deployment::factory()->create([
        'branch_id' => $this->branch->id,
        'status' => DeploymentStatus::SUCCESS,
    ]);

    $this->postJson("/devops/deployments/{$deployment->id}/rollback")
        ->assertForbidden();
});
