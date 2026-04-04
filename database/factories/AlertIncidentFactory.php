<?php

namespace Database\Factories;

use App\Models\AlertIncident;
use App\Models\Branch;
use App\Models\PerformanceAlert;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AlertIncidentFactory extends Factory
{
    protected $model = AlertIncident::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'alert_id' => PerformanceAlert::factory(),
            'status' => 'open',
            'triggered_value' => $this->faker->randomFloat(4, 80, 100),
            'started_at' => now(),
            'acknowledged_at' => null,
            'resolved_at' => null,
            'duration_minutes' => null,
            'notes' => null,
            'acknowledged_by' => null,
        ];
    }

    public function acknowledged(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
        ]);
    }

    public function resolved(): static
    {
        return $this->state(fn(array $attributes) => [
            'status' => 'resolved',
            'acknowledged_at' => now()->subMinutes(10),
            'resolved_at' => now(),
            'duration_minutes' => $this->faker->numberBetween(5, 120),
        ]);
    }
}
