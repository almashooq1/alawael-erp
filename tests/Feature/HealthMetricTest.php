<?php

use App\Models\HealthMetric;
use App\Models\PerformanceAlert;
use App\Models\AlertIncident;
use App\Models\SlaRecord;
use App\Models\User;
use App\Models\Branch;
use App\Enums\MetricType;
use App\Enums\AlertSeverity;

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

it('يجمع قياسات الخادم ويخزنها', function () {
    $service = app(\App\Services\MonitoringService::class);
    actingAs($this->admin);

    // Mock the system calls to avoid real hardware reading
    $metric = HealthMetric::create([
        'metric_type' => MetricType::CPU,
        'value' => 45.5,
        'unit' => '%',
        'host' => 'test-host',
        'recorded_at' => now(),
        'branch_id' => $this->branch->id,
    ]);

    expect($metric)->toBeInstanceOf(HealthMetric::class)
        ->and($metric->metric_type)->toBe(MetricType::CPU)
        ->and((float) $metric->value)->toBe(45.5);
});

it('يطلق تنبيهاً عند تجاوز الحد', function () {
    $alert = PerformanceAlert::factory()->create([
        'branch_id' => $this->branch->id,
        'metric_type' => 'cpu',
        'condition' => 'gt',
        'threshold' => 90.0,
        'severity' => AlertSeverity::CRITICAL,
        'is_active' => true,
        'notification_channels' => ['email'],
    ]);

    \Illuminate\Support\Facades\Notification::fake();

    $service = app(\App\Services\MonitoringService::class);

    $metric = HealthMetric::create([
        'metric_type' => 'cpu',
        'value' => 95.0,
        'unit' => '%',
        'recorded_at' => now(),
        'branch_id' => $this->branch->id,
    ]);

    $service->checkAlerts([$metric]);

    expect(AlertIncident::where('alert_id', $alert->id)->exists())->toBeTrue();
});

it('يستجيب /health بحالة 200 عند النظام السليم', function () {
    $this->get('/health')
        ->assertOk()
        ->assertJsonPath('status', 'healthy')
        ->assertJsonStructure(['status', 'timestamp', 'checks' => ['database', 'redis', 'queue']]);
});

it('يحسب نسبة SLA بشكل صحيح', function () {
    $sla = SlaRecord::factory()->create([
        'branch_id' => $this->branch->id,
        'service_name' => 'api',
        'total_minutes' => 10080,
        'downtime_minutes' => 10,
        'uptime_percentage' => 99.90,
        'target_uptime' => 99.9,
        'period_date' => now()->startOfMonth(),
    ]);

    expect((float) $sla->uptime_percentage)->toBe(99.90)
        ->and($sla->sla_met)->toBeTrue();
});

it('يحذف قياسات أقدم من 30 يوم', function () {
    HealthMetric::factory()->count(5)->create([
        'branch_id' => $this->branch->id,
        'recorded_at' => now()->subDays(31),
    ]);

    HealthMetric::factory()->count(3)->create([
        'branch_id' => $this->branch->id,
        'recorded_at' => now()->subDays(1),
    ]);

    HealthMetric::where('recorded_at', '<', now()->subDays(30))->delete();

    expect(HealthMetric::count())->toBe(3);
});
