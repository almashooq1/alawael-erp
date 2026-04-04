<?php

namespace Database\Factories;

use App\Enums\MetricType;
use App\Models\Branch;
use App\Models\HealthMetric;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class HealthMetricFactory extends Factory
{
    protected $model = HealthMetric::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'metric_type' => $this->faker->randomElement(MetricType::cases()),
            'host' => $this->faker->domainName(),
            'value' => $this->faker->randomFloat(2, 0, 100),
            'unit' => '%',
            'environment' => 'production',
            'metadata' => [],
            'recorded_at' => now(),
        ];
    }

    public function cpu(): static
    {
        return $this->state(fn(array $attributes) => [
            'metric_type' => MetricType::CPU,
            'unit' => '%',
        ]);
    }

    public function memory(): static
    {
        return $this->state(fn(array $attributes) => [
            'metric_type' => MetricType::MEMORY,
            'unit' => 'MB',
        ]);
    }
}
