<?php

namespace Database\Factories;

use App\Enums\AlertCondition;
use App\Enums\AlertSeverity;
use App\Models\Branch;
use App\Models\PerformanceAlert;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PerformanceAlertFactory extends Factory
{
    protected $model = PerformanceAlert::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'name' => $this->faker->words(3, true),
            'metric_type' => $this->faker->randomElement(['cpu', 'memory', 'disk', 'response_time']),
            'condition' => $this->faker->randomElement(AlertCondition::cases())->value,
            'threshold' => $this->faker->randomFloat(4, 50, 99),
            'severity' => $this->faker->randomElement(AlertSeverity::cases())->value,
            'duration_minutes' => 5,
            'notification_channels' => ['email'],
            'notify_users' => null,
            'is_active' => true,
            'is_silenced' => false,
            'silenced_until' => null,
            'last_triggered_at' => null,
            'trigger_count' => 0,
        ];
    }

    public function critical(): static
    {
        return $this->state(fn(array $attributes) => [
            'severity' => AlertSeverity::CRITICAL->value,
            'threshold' => 90.0000,
            'condition' => AlertCondition::GREATER_THAN->value,
            'metric_type' => 'cpu',
        ]);
    }

    public function warning(): static
    {
        return $this->state(fn(array $attributes) => [
            'severity' => AlertSeverity::WARNING->value,
            'threshold' => 75.0000,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn(array $attributes) => [
            'is_active' => false,
        ]);
    }
}
