<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\SlaRecord;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class SlaRecordFactory extends Factory
{
    protected $model = SlaRecord::class;

    public function definition(): array
    {
        $totalMinutes = 10080; // أسبوع كامل بالدقائق (7 * 24 * 60)
        $downtimeMinutes = $this->faker->numberBetween(0, 100);
        $uptimePercentage = round((($totalMinutes - $downtimeMinutes) / $totalMinutes) * 100, 2);
        $targetUptime = 99.9;
        $slaMet = $uptimePercentage >= $targetUptime;

        return [
            'uuid' => (string) Str::uuid(),
            'branch_id' => Branch::factory(),
            'service_name' => $this->faker->randomElement(['api', 'web', 'database', 'queue']),
            'period_date' => now()->startOfMonth()->toDateString(),
            'uptime_percentage' => $uptimePercentage,
            'total_minutes' => $totalMinutes,
            'downtime_minutes' => $downtimeMinutes,
            'incident_count' => $this->faker->numberBetween(0, 5),
            'avg_response_ms' => $this->faker->numberBetween(50, 500),
            'target_uptime' => $targetUptime,
            'sla_met' => $slaMet,
            'incidents' => null,
        ];
    }

    public function met(): static
    {
        return $this->state(fn(array $attributes) => [
            'downtime_minutes' => 0,
            'uptime_percentage' => 100.00,
            'sla_met' => true,
        ]);
    }

    public function breached(): static
    {
        return $this->state(fn(array $attributes) => [
            'downtime_minutes' => 500,
            'uptime_percentage' => 95.00,
            'sla_met' => false,
        ]);
    }
}
